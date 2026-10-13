/**
 * Video Frame Extractor Core Library
 * Provides native HTML5 Video + Canvas frame extraction, seeking,
 * timestamp utilities, batch processing, and ZIP archive generation.
 */

export interface ExtractedFrame {
  id: string;
  timestamp: number;
  formattedTimestamp: string;
  blob: Blob;
  url: string;
  width: number;
  height: number;
  format: "png" | "jpg";
  sizeBytes: number;
}

export interface BatchExtractionOptions {
  mode: "interval" | "count";
  startTime: number;
  endTime: number;
  intervalSeconds?: number;
  frameCount?: number;
  maxFrames?: number;
  format?: "png" | "jpg";
  quality?: number;
}

export interface BatchProgress {
  current: number;
  total: number;
  percentage: number;
  currentTimestamp: number;
}

export const MAX_BATCH_FRAMES = 60;

/**
 * Format seconds into HH:MM:SS.mmm or MM:SS.mmm string
 */
export function formatTimestamp(seconds: number, showMs = true): string {
  if (isNaN(seconds) || seconds < 0) return showMs ? "00:00.000" : "00:00";
  const totalMs = Math.round(seconds * 1000);
  const ms = totalMs % 1000;
  const totalSec = Math.floor(totalMs / 1000);
  const s = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const m = totalMin % 60;
  const h = Math.floor(totalMin / 60);

  const pad = (n: number, z = 2) => n.toString().padStart(z, "0");

  if (h > 0) {
    return showMs
      ? `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms, 3)}`
      : `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  return showMs
    ? `${pad(m)}:${pad(s)}.${pad(ms, 3)}`
    : `${pad(m)}:${pad(s)}`;
}

/**
 * Format timestamp into safe filename friendly string (e.g. 01m23s450ms)
 */
export function formatTimestampForFilename(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00s000ms";
  const totalMs = Math.round(seconds * 1000);
  const ms = totalMs % 1000;
  const totalSec = Math.floor(totalMs / 1000);
  const s = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const m = totalMin % 60;
  const h = Math.floor(totalMin / 60);

  const pad = (n: number, z = 2) => n.toString().padStart(z, "0");

  if (h > 0) {
    return `${pad(h)}h${pad(m)}m${pad(s)}s${pad(ms, 3)}ms`;
  }
  return `${pad(m)}m${pad(s)}s${pad(ms, 3)}ms`;
}

/**
 * Parse input string (seconds, MM:SS, HH:MM:SS, etc.) into seconds
 */
export function parseTimestamp(input: string): number | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Plain number of seconds (e.g. "45", "12.345")
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const val = parseFloat(trimmed);
    return isNaN(val) ? null : Math.max(0, val);
  }

  // MM:SS or MM:SS.mmm
  const parts = trimmed.split(":");
  if (parts.length === 2) {
    const mins = parseFloat(parts[0]);
    const secs = parseFloat(parts[1]);
    if (isNaN(mins) || isNaN(secs) || mins < 0 || secs < 0 || secs >= 60) return null;
    return mins * 60 + secs;
  }

  // HH:MM:SS or HH:MM:SS.mmm
  if (parts.length === 3) {
    const hours = parseFloat(parts[0]);
    const mins = parseFloat(parts[1]);
    const secs = parseFloat(parts[2]);
    if (
      isNaN(hours) ||
      isNaN(mins) ||
      isNaN(secs) ||
      hours < 0 ||
      mins < 0 ||
      mins >= 60 ||
      secs < 0 ||
      secs >= 60
    ) {
      return null;
    }
    return hours * 3600 + mins * 60 + secs;
  }

  return null;
}

/**
 * Calculates deterministic timestamp array for batch extraction
 */
export function calculateBatchTimestamps(options: {
  mode: "interval" | "count";
  startTime: number;
  endTime: number;
  intervalSeconds?: number;
  frameCount?: number;
  maxFrames?: number;
}): number[] {
  const { mode, startTime, endTime, intervalSeconds, frameCount, maxFrames = MAX_BATCH_FRAMES } =
    options;

  const start = Math.max(0, Math.min(startTime, endTime));
  const end = Math.max(start, endTime);
  const duration = end - start;

  if (duration <= 0.001) {
    return [start];
  }

  const timestamps: number[] = [];

  if (mode === "count") {
    const count = Math.max(1, Math.min(maxFrames, Math.round(frameCount || 10)));
    if (count === 1) {
      timestamps.push(start);
    } else {
      const step = duration / (count - 1);
      for (let i = 0; i < count; i++) {
        const t = Math.min(end, start + i * step);
        timestamps.push(parseFloat(t.toFixed(4)));
      }
    }
  } else {
    // Mode interval
    const interval = Math.max(0.1, intervalSeconds || 1);
    let current = start;
    while (current <= end && timestamps.length < maxFrames) {
      timestamps.push(parseFloat(current.toFixed(4)));
      current += interval;
    }
  }

  // Ensure unique and sorted
  return Array.from(new Set(timestamps)).sort((a, b) => a - b);
}

/**
 * Accurately seeks a video element to a specific timestamp and waits until
 * the frame is fully decoded and ready for canvas rendering.
 */
export async function seekVideoToTime(
  video: HTMLVideoElement,
  time: number,
  timeoutMs = 4000
): Promise<void> {
  const targetTime = Math.max(0, Math.min(video.duration || 0, time));

  // If already at target within a few milliseconds and ready, no need to seek
  if (
    Math.abs(video.currentTime - targetTime) < 0.005 &&
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
  ) {
    return;
  }

  return new Promise<void>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let frameCallbackId: number | null = null;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      if (
        frameCallbackId !== null &&
        "cancelVideoFrameCallback" in video &&
        typeof video.cancelVideoFrameCallback === "function"
      ) {
        video.cancelVideoFrameCallback(frameCallbackId);
      }
    };

    const onSeeked = () => {
      // In modern browsers, requestVideoFrameCallback guarantees that the frame
      // is actually decoded and presented for drawing.
      if (
        "requestVideoFrameCallback" in video &&
        typeof video.requestVideoFrameCallback === "function"
      ) {
        frameCallbackId = video.requestVideoFrameCallback(() => {
          cleanup();
          resolve();
        });
      } else {
        cleanup();
        resolve();
      }
    };

    const onError = () => {
      cleanup();
      const err = video.error;
      const message = err ? `Video error: ${err.message || err.code}` : "Failed to seek video.";
      reject(new Error(message));
    };

    timer = setTimeout(() => {
      cleanup();
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        resolve();
      } else {
        reject(new Error(`Timeout while seeking to ${targetTime.toFixed(2)}s.`));
      }
    }, timeoutMs);

    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);

    try {
      video.currentTime = targetTime;
    } catch (err) {
      cleanup();
      reject(err);
    }
  });
}

/**
 * Draws the current video frame onto a Canvas and exports it as a Blob.
 */
export async function captureVideoCanvas(
  video: HTMLVideoElement,
  format: "png" | "jpg" = "png",
  quality = 0.95
): Promise<{ blob: Blob; width: number; height: number }> {
  const width = video.videoWidth;
  const height = video.videoHeight;

  if (!width || !height) {
    throw new Error("Video frame dimensions not available. The video may not be decoded yet.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { willReadFrequently: false });
  if (!ctx) {
    throw new Error("Failed to acquire 2D rendering context.");
  }

  // Draw the current decoded video frame
  ctx.drawImage(video, 0, 0, width, height);

  const mimeType = format === "png" ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), mimeType, quality);
  });

  // Clear canvas context to release graphic memory
  ctx.clearRect(0, 0, width, height);
  canvas.width = 0;
  canvas.height = 0;

  if (!blob) {
    throw new Error(`Failed to encode video frame as ${format.toUpperCase()}.`);
  }

  return { blob, width, height };
}

/**
 * Captures a single frame from an active video element at its current time.
 */
export async function captureCurrentFrame(
  video: HTMLVideoElement,
  format: "png" | "jpg" = "png",
  quality = 0.95
): Promise<ExtractedFrame> {
  const currentTime = video.currentTime;
  const { blob, width, height } = await captureVideoCanvas(video, format, quality);
  const url = URL.createObjectURL(blob);

  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `frame_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  return {
    id,
    timestamp: currentTime,
    formattedTimestamp: formatTimestamp(currentTime),
    blob,
    url,
    width,
    height,
    format,
    sizeBytes: blob.size,
  };
}

/**
 * Performs sequential batch extraction of video frames across timestamps.
 */
export async function extractBatchFrames(
  file: File,
  options: BatchExtractionOptions,
  onProgress?: (progress: BatchProgress) => void,
  signal?: AbortSignal
): Promise<ExtractedFrame[]> {
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = objectUrl;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";

  try {
    // Wait for video metadata
    await new Promise<void>((resolve, reject) => {
      const onLoadedMetadata = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error("Failed to load video metadata. The format or codec may be unsupported."));
      };
      const cleanup = () => {
        video.removeEventListener("loadedmetadata", onLoadedMetadata);
        video.removeEventListener("error", onError);
      };
      if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
        resolve();
      } else {
        video.addEventListener("loadedmetadata", onLoadedMetadata);
        video.addEventListener("error", onError);
      }
    });

    const format = options.format || "png";
    const quality = options.quality ?? 0.95;
    const timestamps = calculateBatchTimestamps({
      mode: options.mode,
      startTime: options.startTime,
      endTime: Math.min(options.endTime, video.duration || options.endTime),
      intervalSeconds: options.intervalSeconds,
      frameCount: options.frameCount,
      maxFrames: options.maxFrames ?? MAX_BATCH_FRAMES,
    });

    const results: ExtractedFrame[] = [];
    const total = timestamps.length;

    for (let i = 0; i < total; i++) {
      if (signal?.aborted) {
        throw new DOMException("Batch extraction was cancelled by user.", "AbortError");
      }

      const t = timestamps[i];
      await seekVideoToTime(video, t);

      const { blob, width, height } = await captureVideoCanvas(video, format, quality);
      const url = URL.createObjectURL(blob);

      const id =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `frame_${Date.now()}_${i}`;

      results.push({
        id,
        timestamp: t,
        formattedTimestamp: formatTimestamp(t),
        blob,
        url,
        width,
        height,
        format,
        sizeBytes: blob.size,
      });

      if (onProgress) {
        onProgress({
          current: i + 1,
          total,
          percentage: Math.round(((i + 1) / total) * 100),
          currentTimestamp: t,
        });
      }
    }

    return results;
  } finally {
    video.pause();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Creates a ZIP archive containing all extracted frames.
 */
export async function createFramesZipArchive(
  frames: ExtractedFrame[],
  baseFileName: string
): Promise<Blob> {
  if (frames.length === 0) {
    throw new Error("No frames to package into ZIP.");
  }

  const JSZipModule = await import("jszip");
  const JSZip = JSZipModule.default;
  const zip = new JSZip();

  const sanitizedBase = baseFileName.replace(/\.[^/.]+$/, "").replace(/[^\w.-]/g, "_");

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const timeLabel = formatTimestampForFilename(frame.timestamp);
    const indexStr = (i + 1).toString().padStart(frames.length >= 100 ? 3 : 2, "0");
    const filename = `${sanitizedBase}_frame_${indexStr}_${timeLabel}.${frame.format}`;
    zip.file(filename, frame.blob);
  }

  return await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

// Singleton FFmpeg instance
let ffmpegInstance: FFmpeg | null = null;
let isLoading = false;

/**
 * Lazily loads and returns the FFmpeg instance.
 * Loads the WebAssembly core from a CDN to bypass CORS/COOP/COEP issues on Vercel.
 */
export async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) {
    return ffmpegInstance;
  }
  
  if (isLoading) {
    // Basic spin wait if already loading in another call
    while (isLoading && !ffmpegInstance) {
      await new Promise(r => setTimeout(r, 100));
    }
    if (ffmpegInstance) return ffmpegInstance;
  }

  isLoading = true;
  try {
    ffmpegInstance = new FFmpeg();
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
    
    await ffmpegInstance.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      // workerURL is optional, for multi-threading which requires COOP/COEP
    });
    
    return ffmpegInstance;
  } finally {
    isLoading = false;
  }
}

/**
 * Terminates the singleton FFmpeg instance and resets state.
 * Useful for cancelling in-flight operations or recovering from errors.
 */
export function terminateFFmpeg(): void {
  if (ffmpegInstance) {
    try {
      ffmpegInstance.terminate();
    } catch {
      // ignore
    }
    ffmpegInstance = null;
  }
  isLoading = false;
}

/**
 * Extracts audio from a given video file.
 */
export async function extractAudioFromVideo(
  file: File,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const ffmpeg = await getFFmpeg();
  
  const inputFileName = "input" + getExtension(file.name);
  const outputFileName = "output.mp3";
  
  ffmpeg.on("progress", ({ progress }) => {
    if (onProgress) {
      onProgress(Math.max(0, Math.min(100, progress * 100)));
    }
  });

  // Write the file to FFmpeg virtual file system
  await ffmpeg.writeFile(inputFileName, await fetchFile(file));
  
  // Run FFmpeg command to extract audio without re-encoding if possible, 
  // but to guarantee mp3 output we just re-encode to mp3.
  await ffmpeg.exec([
    "-i", inputFileName,
    "-q:a", "0", 
    "-map", "a", 
    outputFileName
  ]);
  
  // Read the result
  const data = await ffmpeg.readFile(outputFileName);
  
  // Clean up
  await ffmpeg.deleteFile(inputFileName);
  await ffmpeg.deleteFile(outputFileName);
  
  // Remove listeners to avoid memory leaks
  ffmpeg.off("progress", () => {});
  
  return new Blob([new Uint8Array(data as Uint8Array)], { type: "audio/mpeg" });
}

function getExtension(filename: string): string {
  const parts = filename.split(".");
  if (parts.length > 1) {
    return "." + parts.pop();
  }
  return "";
}

/**
 * Converts an audio file to a target format.
 */
export async function convertAudio(
  file: File,
  targetFormat: string,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const ffmpeg = await getFFmpeg();
  
  const inputFileName = "input" + getExtension(file.name);
  const outputFileName = `output.${targetFormat}`;
  
  ffmpeg.on("progress", ({ progress }) => {
    if (onProgress) {
      onProgress(Math.max(0, Math.min(100, progress * 100)));
    }
  });

  await ffmpeg.writeFile(inputFileName, await fetchFile(file));
  
  const args = ["-i", inputFileName];
  if (targetFormat === "mp3") {
    args.push("-q:a", "0");
  } else if (targetFormat === "wav") {
    args.push("-c:a", "pcm_s16le");
  } else if (targetFormat === "ogg") {
    args.push("-c:a", "libvorbis", "-q:a", "4");
  } else if (targetFormat === "flac") {
    args.push("-c:a", "flac");
  } else if (targetFormat === "aac") {
    args.push("-c:a", "aac", "-b:a", "192k");
  }
  
  args.push(outputFileName);

  await ffmpeg.exec(args);
  
  const data = await ffmpeg.readFile(outputFileName);
  
  await ffmpeg.deleteFile(inputFileName);
  await ffmpeg.deleteFile(outputFileName);
  
  ffmpeg.off("progress", () => {});
  
  let mimeType = `audio/${targetFormat}`;
  if (targetFormat === "mp3") mimeType = "audio/mpeg";
  
  return new Blob([new Uint8Array(data as Uint8Array)], { type: mimeType });
}

/**
 * Trims an audio file from startTime to endTime (in seconds).
 */
export async function trimAudio(
  file: File,
  startTime: number,
  endTime: number,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const ffmpeg = await getFFmpeg();
  
  const ext = getExtension(file.name).toLowerCase();
  const inputFileName = "input" + ext;
  const targetExt = [".mp3", ".wav", ".aac", ".ogg", ".flac"].includes(ext) ? ext : ".mp3";
  const outputFileName = `output${targetExt}`;
  
  ffmpeg.on("progress", ({ progress }) => {
    if (onProgress) {
      onProgress(Math.max(0, Math.min(100, progress * 100)));
    }
  });

  await ffmpeg.writeFile(inputFileName, await fetchFile(file));
  
  const args = [
    "-ss", startTime.toString(),
    "-i", inputFileName,
    "-t", (endTime - startTime).toString(),
  ];

  if (targetExt === ".mp3") {
    args.push("-q:a", "0");
  } else if (targetExt === ".wav") {
    args.push("-c:a", "pcm_s16le");
  } else if (targetExt === ".ogg") {
    args.push("-c:a", "libvorbis", "-q:a", "4");
  } else if (targetExt === ".flac") {
    args.push("-c:a", "flac");
  } else if (targetExt === ".aac") {
    args.push("-c:a", "aac", "-b:a", "192k");
  }
  
  args.push(outputFileName);

  await ffmpeg.exec(args);
  
  const data = await ffmpeg.readFile(outputFileName);
  
  await ffmpeg.deleteFile(inputFileName);
  await ffmpeg.deleteFile(outputFileName);
  
  ffmpeg.off("progress", () => {});
  
  let mimeType = `audio/${targetExt.slice(1)}`;
  if (targetExt === ".mp3") mimeType = "audio/mpeg";
  
  return new Blob([new Uint8Array(data as Uint8Array)], { type: mimeType });
}

/**
 * Trims a video file from startTime to endTime (in seconds).
 * Uses stream copying (-c copy) for speed, which may cut at the nearest keyframe.
 */
export async function trimVideo(
  file: File,
  startTime: number,
  endTime: number,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const ffmpeg = await getFFmpeg();
  
  const ext = getExtension(file.name).toLowerCase();
  const inputFileName = "input" + ext;
  // If it's a known format, use it, else fallback to mp4
  const targetExt = [".mp4", ".webm", ".mov", ".mkv", ".avi"].includes(ext) ? ext : ".mp4";
  const outputFileName = `output${targetExt}`;
  
  ffmpeg.on("progress", ({ progress }) => {
    if (onProgress) {
      onProgress(Math.max(0, Math.min(100, progress * 100)));
    }
  });

  await ffmpeg.writeFile(inputFileName, await fetchFile(file));
  
  // For video, we use stream copy (-c copy) because re-encoding in WASM is extremely slow.
  // Placing -ss before -i makes it fast.
  const args = [
    "-ss", startTime.toString(),
    "-i", inputFileName,
    "-t", (endTime - startTime).toString(),
    "-c", "copy",
    outputFileName
  ];

  await ffmpeg.exec(args);
  
  const data = await ffmpeg.readFile(outputFileName);
  
  await ffmpeg.deleteFile(inputFileName);
  await ffmpeg.deleteFile(outputFileName);
  
  ffmpeg.off("progress", () => {});
  
  let mimeType = `video/${targetExt.slice(1)}`;
  if (targetExt === ".mp4") mimeType = "video/mp4";
  else if (targetExt === ".webm") mimeType = "video/webm";
  else if (targetExt === ".mov") mimeType = "video/quicktime";
  
  return new Blob([new Uint8Array(data as Uint8Array)], { type: mimeType });
}

export interface VideoConversionOptions {
  targetFormat: "mp4" | "webm" | "mov";
  quality?: "high" | "medium" | "low";
  resolution?: "original" | "1080p" | "720p" | "480p";
  preserveAudio?: boolean;
}

/**
 * Builds deterministic FFmpeg command arguments for converting video files.
 */
export function buildVideoConversionArgs(
  inputFileName: string,
  outputFileName: string,
  options: VideoConversionOptions
): string[] {
  const { targetFormat, quality = "medium", resolution = "original", preserveAudio = true } = options;
  const args: string[] = ["-i", inputFileName];

  // Stream mapping: preserve audio if present, gracefully ignore if silent video
  if (preserveAudio) {
    args.push("-map", "0:v:0", "-map", "0:a?");
  } else {
    args.push("-map", "0:v:0", "-an");
  }

  // Resolution scaling filter
  if (resolution === "1080p") {
    args.push("-vf", "scale=-2:1080");
  } else if (resolution === "720p") {
    args.push("-vf", "scale=-2:720");
  } else if (resolution === "480p") {
    args.push("-vf", "scale=-2:480");
  }

  // Format and codec specific arguments
  if (targetFormat === "mp4") {
    args.push("-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "ultrafast");
    if (quality === "high") {
      args.push("-crf", "20");
    } else if (quality === "low") {
      args.push("-crf", "28");
    } else {
      args.push("-crf", "24");
    }
    if (preserveAudio) {
      args.push("-c:a", "aac", "-b:a", "128k");
    }
    args.push("-movflags", "+faststart");
  } else if (targetFormat === "webm") {
    args.push("-c:v", "libvpx", "-deadline", "realtime");
    if (quality === "high") {
      args.push("-b:v", "2500k", "-crf", "10");
    } else if (quality === "low") {
      args.push("-b:v", "600k", "-crf", "22");
    } else {
      args.push("-b:v", "1200k", "-crf", "15");
    }
    if (preserveAudio) {
      args.push("-c:a", "libvorbis", "-b:a", "128k");
    }
  } else if (targetFormat === "mov") {
    args.push("-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "ultrafast");
    if (quality === "high") {
      args.push("-crf", "20");
    } else if (quality === "low") {
      args.push("-crf", "28");
    } else {
      args.push("-crf", "24");
    }
    if (preserveAudio) {
      args.push("-c:a", "aac", "-b:a", "128k");
    }
  }

  args.push(outputFileName);
  return args;
}

/**
 * Converts a video file to MP4, WebM, or MOV locally using the FFmpeg WASM engine.
 */
export async function convertVideo(
  file: File,
  options: VideoConversionOptions,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal
): Promise<Blob> {
  if (signal?.aborted) {
    throw new DOMException("Conversion cancelled by user.", "AbortError");
  }

  const ffmpeg = await getFFmpeg();

  const ext = getExtension(file.name).toLowerCase() || ".mp4";
  const inputFileName = "input" + ext;
  const targetExt = "." + options.targetFormat;
  const outputFileName = `output${targetExt}`;

  let abortHandler: (() => void) | null = null;
  if (signal) {
    abortHandler = () => {
      terminateFFmpeg();
    };
    signal.addEventListener("abort", abortHandler, { once: true });
  }

  const progressHandler = ({ progress }: { progress: number }) => {
    if (onProgress) {
      onProgress(Math.max(0, Math.min(100, Math.round(progress * 100))));
    }
  };

  ffmpeg.on("progress", progressHandler);

  try {
    await ffmpeg.writeFile(inputFileName, await fetchFile(file));

    if (signal?.aborted) {
      throw new DOMException("Conversion cancelled by user.", "AbortError");
    }

    const args = buildVideoConversionArgs(inputFileName, outputFileName, options);
    const exitCode = await ffmpeg.exec(args);

    if (signal?.aborted) {
      throw new DOMException("Conversion cancelled by user.", "AbortError");
    }

    if (exitCode !== 0) {
      throw new Error(`FFmpeg exited with error code ${exitCode}. Check that the video file codec is supported.`);
    }

    const data = await ffmpeg.readFile(outputFileName);
    if (!data || (data as Uint8Array).length === 0) {
      throw new Error("Conversion generated an empty output file.");
    }

    let mimeType = `video/${options.targetFormat}`;
    if (options.targetFormat === "mov") mimeType = "video/quicktime";

    return new Blob([new Uint8Array(data as Uint8Array)], { type: mimeType });
  } finally {
    if (abortHandler && signal) {
      signal.removeEventListener("abort", abortHandler);
    }
    ffmpeg.off("progress", progressHandler);
    try {
      await ffmpeg.deleteFile(inputFileName);
    } catch {
      // ignore
    }
    try {
      await ffmpeg.deleteFile(outputFileName);
    } catch {
      // ignore
    }
  }
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  aspectRatio: string;
  fileSize: number;
  fileName: string;
  mimeType: string;
}

/**
 * Extracts basic video metadata using native browser APIs without heavy FFmpeg overhead.
 */
export async function getVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = url;

    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("error", onError);
      URL.revokeObjectURL(url);
    };

    const onLoaded = () => {
      const duration = video.duration || 0;
      const width = video.videoWidth || 0;
      const height = video.videoHeight || 0;

      let aspectRatio = "Unknown";
      if (width > 0 && height > 0) {
        const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
        const divisor = gcd(width, height);
        const rW = width / divisor;
        const rH = height / divisor;
        if (
          (rW === 16 && rH === 9) ||
          (rW === 4 && rH === 3) ||
          (rW === 1 && rH === 1) ||
          (rW === 21 && rH === 9)
        ) {
          aspectRatio = `${rW}:${rH}`;
        } else {
          aspectRatio = `${(width / height).toFixed(2)}:1`;
        }
      }

      cleanup();
      resolve({
        duration,
        width,
        height,
        aspectRatio,
        fileSize: file.size,
        fileName: file.name,
        mimeType: file.type || "video/*",
      });
    };

    const onError = () => {
      cleanup();
      resolve({
        duration: 0,
        width: 0,
        height: 0,
        aspectRatio: "Unknown",
        fileSize: file.size,
        fileName: file.name,
        mimeType: file.type || "video/*",
      });
    };

    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("error", onError);
  });
}

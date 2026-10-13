"use client";

import * as React from "react";
import { ToolPageLayout } from "@/components/tools/ToolPageLayout";
import { FileDropzone } from "@/components/file-upload/FileDropzone";
import { Button } from "@/components/ui/Button";
import { SelectedFileItem } from "@/lib/file/types";
import { downloadBlob } from "@/lib/download/download";
import { formatFileSize } from "@/lib/file/validation";
import {
  ExtractedFrame,
  BatchProgress,
  MAX_BATCH_FRAMES,
  formatTimestamp,
  parseTimestamp,
  seekVideoToTime,
  captureCurrentFrame,
  extractBatchFrames,
  createFramesZipArchive,
  calculateBatchTimestamps,
} from "@/lib/media/frameExtractor";
import {
  Camera,
  Play,
  Pause,
  RotateCcw,
  Download,
  Trash2,
  Eye,
  Film,
  Layers,
  Clock,
  Sparkles,
  Archive,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Zap,
  Sliders,
} from "lucide-react";

const BREADCRUMBS = [
  { label: "Home", href: "/" },
  { label: "Audio & Video", href: "/#tools" },
  { label: "Video Frame Extractor" },
];

export function VideoFrameExtractorPage() {
  const [files, setFiles] = React.useState<SelectedFileItem[]>([]);
  const [videoUrl, setVideoUrl] = React.useState<string | null>(null);
  const [duration, setDuration] = React.useState<number>(0);
  const [currentTime, setCurrentTime] = React.useState<number>(0);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [videoDimensions, setVideoDimensions] = React.useState<{ width: number; height: number } | null>(null);

  // Settings
  const [outputFormat, setOutputFormat] = React.useState<"png" | "jpg">("png");
  const [jpgQuality, setJpgQuality] = React.useState<number>(0.92);

  // Precise Seek Input
  const [manualTimeInput, setManualTimeInput] = React.useState<string>("");
  const [manualTimeError, setManualTimeError] = React.useState<string | null>(null);

  // Batch Extraction State
  const [batchMode, setBatchMode] = React.useState<"interval" | "count">("interval");
  const [batchInterval, setBatchInterval] = React.useState<number>(1.0);
  const [batchCount, setBatchCount] = React.useState<number>(10);
  const [batchStartTime, setBatchStartTime] = React.useState<string>("0");
  const [batchEndTime, setBatchEndTime] = React.useState<string>("");
  const [isBatchExtracting, setIsBatchExtracting] = React.useState(false);
  const [batchProgress, setBatchProgress] = React.useState<BatchProgress | null>(null);

  // Frame List & Preview Modal
  const [frames, setFrames] = React.useState<ExtractedFrame[]>([]);
  const [activePreviewFrame, setActivePreviewFrame] = React.useState<ExtractedFrame | null>(null);
  const [isCapturingSingle, setIsCapturingSingle] = React.useState(false);
  const [isZipping, setIsZipping] = React.useState(false);

  // General Status & Feedback
  const [error, setError] = React.useState<string | null>(null);
  const [feedbackNotice, setFeedbackNotice] = React.useState<string | null>(null);

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const readyFiles = files.filter((f) => f.status === "ready");
  const currentFile = readyFiles[0]?.file;

  // Sync object URL for video
  React.useEffect(() => {
    let isSubscribed = true;

    if (!currentFile) {
      Promise.resolve().then(() => {
        if (!isSubscribed) return;
        setVideoUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        setDuration(0);
        setCurrentTime(0);
        setVideoDimensions(null);
        setBatchEndTime("");
      });
      return;
    }

    const url = URL.createObjectURL(currentFile);
    Promise.resolve().then(() => {
      if (!isSubscribed) {
        URL.revokeObjectURL(url);
        return;
      }
      setVideoUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setError(null);
      setDuration(0);
      setCurrentTime(0);
      setManualTimeInput("");
    });

    return () => {
      isSubscribed = false;
      URL.revokeObjectURL(url);
    };
  }, [currentFile]);

  // Clean up extracted frame object URLs on unmount
  React.useEffect(() => {
    return () => {
      frames.forEach((f) => URL.revokeObjectURL(f.url));
    };
  }, [frames]);

  // Handle Video Metadata Loaded
  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const d = videoRef.current.duration;
    const w = videoRef.current.videoWidth;
    const h = videoRef.current.videoHeight;
    setDuration(d);
    setVideoDimensions({ width: w, height: h });
    setBatchEndTime(formatTimestamp(d));
    setError(null);
  };

  // Video playback time updates
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  // Seek handler via range input
  const handleSliderSeek = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = parseFloat(e.target.value);
    setCurrentTime(target);
    if (videoRef.current) {
      try {
        await seekVideoToTime(videoRef.current, target);
      } catch (err: unknown) {
        console.error("Slider seek failed:", err);
      }
    }
  };

  // Step seek by offset seconds (e.g. -1s, +1s, -0.1s, +0.1s)
  const handleStepSeek = async (offset: number) => {
    if (!videoRef.current) return;
    const target = Math.max(0, Math.min(duration, videoRef.current.currentTime + offset));
    try {
      await seekVideoToTime(videoRef.current, target);
      setCurrentTime(target);
    } catch (err: unknown) {
      console.error("Step seek failed:", err);
    }
  };

  // Manual precise time seek
  const handleManualSeek = async () => {
    setManualTimeError(null);
    const parsed = parseTimestamp(manualTimeInput);
    if (parsed === null) {
      setManualTimeError("Please enter a valid time (e.g. 12.5, 01:23.45).");
      return;
    }
    if (parsed < 0 || (duration > 0 && parsed > duration)) {
      setManualTimeError(`Time must be between 0 and ${formatTimestamp(duration)}.`);
      return;
    }

    if (videoRef.current) {
      try {
        await seekVideoToTime(videoRef.current, parsed);
        setCurrentTime(parsed);
        setManualTimeInput("");
      } catch {
        setManualTimeError("Failed to seek to this timestamp.");
      }
    }
  };

  // Play / Pause toggle
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          // Playback error or autoplay prevented
        });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Capture Single Frame
  const handleCaptureCurrent = async () => {
    if (!videoRef.current) return;
    setIsCapturingSingle(true);
    setError(null);

    try {
      // Pause playback while capturing
      if (!videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
      }

      const frame = await captureCurrentFrame(videoRef.current, outputFormat, jpgQuality);
      setFrames((prev) => [frame, ...prev]);

      setFeedbackNotice(`Captured frame at ${frame.formattedTimestamp}`);
      setTimeout(() => setFeedbackNotice(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to capture frame.";
      setError(msg);
    } finally {
      setIsCapturingSingle(false);
    }
  };

  // Batch Extraction
  const handleStartBatchExtraction = async () => {
    if (!currentFile || !videoRef.current) return;

    const startSec = parseTimestamp(batchStartTime) ?? 0;
    const endSec = parseTimestamp(batchEndTime) ?? duration;

    if (startSec < 0 || endSec <= startSec) {
      setError("Batch start time must be less than end time.");
      return;
    }

    setIsBatchExtracting(true);
    setError(null);
    setBatchProgress(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const extracted = await extractBatchFrames(
        currentFile,
        {
          mode: batchMode,
          startTime: startSec,
          endTime: endSec,
          intervalSeconds: batchInterval,
          frameCount: batchCount,
          format: outputFormat,
          quality: jpgQuality,
          maxFrames: MAX_BATCH_FRAMES,
        },
        (progress) => {
          setBatchProgress(progress);
        },
        controller.signal
      );

      setFrames((prev) => [...extracted, ...prev]);
      setFeedbackNotice(`Successfully extracted ${extracted.length} frames!`);
      setTimeout(() => setFeedbackNotice(null), 4000);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setFeedbackNotice("Batch extraction cancelled.");
        setTimeout(() => setFeedbackNotice(null), 3000);
      } else {
        const msg = err instanceof Error ? err.message : "Batch extraction failed.";
        setError(msg);
      }
    } finally {
      setIsBatchExtracting(false);
      setBatchProgress(null);
      abortControllerRef.current = null;
    }
  };

  const handleCancelBatch = () => {
    abortControllerRef.current?.abort();
  };

  // Remove a frame
  const handleRemoveFrame = (id: string) => {
    setFrames((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) {
        URL.revokeObjectURL(target.url);
      }
      return prev.filter((f) => f.id !== id);
    });
    if (activePreviewFrame?.id === id) {
      setActivePreviewFrame(null);
    }
  };

  // Clear all frames
  const handleClearAllFrames = () => {
    if (frames.length === 0) return;
    if (window.confirm("Are you sure you want to remove all extracted frames?")) {
      frames.forEach((f) => URL.revokeObjectURL(f.url));
      setFrames([]);
      setActivePreviewFrame(null);
    }
  };

  // Single Frame Download
  const handleDownloadSingleFrame = (frame: ExtractedFrame) => {
    const baseName = (currentFile?.name || "video").replace(/\.[^/.]+$/, "");
    const timeLabel = formatTimestamp(frame.timestamp).replace(/:/g, "-").replace(/\./g, "-");
    const filename = `${baseName}_frame_${timeLabel}.${frame.format}`;
    downloadBlob(frame.blob, filename);
  };

  // Download All as ZIP
  const handleDownloadAllZip = async () => {
    if (frames.length === 0) return;
    setIsZipping(true);
    setError(null);

    try {
      const baseName = (currentFile?.name || "video").replace(/\.[^/.]+$/, "");
      const zipBlob = await createFramesZipArchive(frames, baseName);
      downloadBlob(zipBlob, `${baseName}_frames.zip`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create ZIP archive.";
      setError(msg);
    } finally {
      setIsZipping(false);
    }
  };

  // Reset video selection
  const handleResetVideo = () => {
    setFiles([]);
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }
    setDuration(0);
    setCurrentTime(0);
    setVideoDimensions(null);
    setError(null);
  };

  // Calculate planned batch frames count
  const plannedBatchCount = React.useMemo(() => {
    const start = parseTimestamp(batchStartTime) ?? 0;
    const end = parseTimestamp(batchEndTime) ?? duration;
    if (end <= start) return 0;
    const list = calculateBatchTimestamps({
      mode: batchMode,
      startTime: start,
      endTime: end,
      intervalSeconds: batchInterval,
      frameCount: batchCount,
      maxFrames: MAX_BATCH_FRAMES,
    });
    return list.length;
  }, [batchMode, batchStartTime, batchEndTime, duration, batchInterval, batchCount]);

  return (
    <>
      <ToolPageLayout
        breadcrumbs={BREADCRUMBS}
        title="Video Frame Extractor"
        description="Extract crystal-clear image frames from your videos at any timestamp or in batches. Runs completely client-side in your browser."
        badge="100% Client-Side"
        workspace={
          <div className="flex flex-col gap-6">
            {/* 1. File Upload Dropzone (if no video selected) */}
            {!currentFile && (
              <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  <Film className="h-5 w-5 text-indigo-500" />
                  Select Video File
                </h2>
                <FileDropzone
                  value={files}
                  onChange={setFiles}
                  accept={["video/*", ".mp4", ".webm", ".mov", ".mkv", ".avi", ".ogv"]}
                  multiple={false}
                  maxSize={500 * 1024 * 1024}
                />
                <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                  Supports MP4, WebM, MOV, and standard video formats. Max size 500 MB. Processed entirely locally.
                </p>
              </div>
            )}

            {/* 2. Video Player & Seeking Controls */}
            {currentFile && videoUrl && (
              <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6 dark:border-neutral-800 dark:bg-neutral-900">
                {/* File details bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3 dark:border-neutral-800">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                      <Film className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {formatFileSize(currentFile.size)}
                        {videoDimensions && ` • ${videoDimensions.width} × ${videoDimensions.height}`}
                        {duration > 0 && ` • Duration: ${formatTimestamp(duration, false)}`}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetVideo}
                    className="text-xs"
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    Change Video
                  </Button>
                </div>

                {/* Video Player Display */}
                <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-neutral-950 flex items-center justify-center">
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    preload="auto"
                    playsInline
                    onLoadedMetadata={handleLoadedMetadata}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={() => setIsPlaying(false)}
                    onError={() => {
                      setError("The browser failed to decode this video file or the codec is unsupported.");
                    }}
                    className="h-full w-full object-contain"
                  />

                  {/* Feedback Toast Overlay */}
                  {feedbackNotice && (
                    <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-neutral-900/90 px-4 py-2 text-xs font-medium text-white shadow-xl backdrop-blur transition-all dark:bg-neutral-100 dark:text-neutral-900">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 dark:text-emerald-600" />
                      <span>{feedbackNotice}</span>
                    </div>
                  )}
                </div>

                {/* Scrubber Timeline */}
                <div className="flex flex-col gap-2 pt-2">
                  <div className="flex items-center justify-between text-xs font-medium text-neutral-600 dark:text-neutral-400">
                    <span className="font-mono">{formatTimestamp(currentTime)}</span>
                    <span className="font-mono">{formatTimestamp(duration)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.01}
                    value={currentTime}
                    onChange={handleSliderSeek}
                    aria-label="Video timeline scrubber"
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-neutral-200 accent-indigo-600 dark:bg-neutral-800"
                  />
                </div>

                {/* Playback Controls & Frame Stepping */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStepSeek(-1.0)}
                      title="Rewind 1 second"
                      className="px-2"
                    >
                      -1s
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStepSeek(-0.04)}
                      title="Step backward 1 frame"
                      className="px-2"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={togglePlay}
                      title={isPlaying ? "Pause" : "Play"}
                      className="px-3 font-semibold"
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      <span className="ml-1 text-xs">{isPlaying ? "Pause" : "Play"}</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStepSeek(0.04)}
                      title="Step forward 1 frame"
                      className="px-2"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStepSeek(1.0)}
                      title="Forward 1 second"
                      className="px-2"
                    >
                      +1s
                    </Button>
                  </div>

                  {/* Primary Extract Current Frame Button */}
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleCaptureCurrent}
                    disabled={isCapturingSingle || isBatchExtracting}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20"
                  >
                    {isCapturingSingle ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="mr-2 h-4 w-4" />
                    )}
                    Extract Current Frame
                  </Button>
                </div>

                {/* Precise Time Jump Input */}
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-neutral-100 bg-neutral-50 p-2.5 dark:border-neutral-800/80 dark:bg-neutral-800/50">
                  <Clock className="h-4 w-4 text-neutral-500" />
                  <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Exact Timestamp:
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. 01:23.45 or 45.2"
                    value={manualTimeInput}
                    onChange={(e) => {
                      setManualTimeInput(e.target.value);
                      setManualTimeError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleManualSeek();
                    }}
                    className="h-8 w-36 rounded-md border border-neutral-200 bg-white px-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                  />
                  <Button variant="secondary" size="sm" onClick={handleManualSeek} className="h-8 text-xs">
                    Seek
                  </Button>
                  {manualTimeError && (
                    <span className="text-xs text-red-500 dark:text-red-400">{manualTimeError}</span>
                  )}
                </div>
              </div>
            )}

            {/* 3. Error Banner */}
            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold">Error</p>
                  <p className="text-xs mt-0.5">{error}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-red-500 hover:text-red-700 dark:hover:text-red-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* 4. Extracted Frames Gallery */}
            <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-indigo-500" />
                  <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                    Extracted Frames
                  </h2>
                  <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                    {frames.length}
                  </span>
                </div>

                {frames.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearAllFrames}
                      className="text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Clear All
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleDownloadAllZip}
                      disabled={isZipping}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs shadow-sm shadow-emerald-600/20"
                    >
                      {isZipping ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Archive className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Download All as ZIP
                    </Button>
                  </div>
                )}
              </div>

              {frames.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-800/80">
                    <Camera className="h-7 w-7" />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                    No frames extracted yet
                  </h3>
                  <p className="mt-1 max-w-sm text-xs text-neutral-500 dark:text-neutral-400">
                    Play the video to any frame and click &ldquo;Extract Current Frame&rdquo;, or run a batch extraction to collect multiple frames.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                  {frames.map((frame) => (
                    <div
                      key={frame.id}
                      className="group relative flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 transition-all hover:border-neutral-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700"
                    >
                      {/* Thumbnail Image */}
                      <div className="relative aspect-video w-full overflow-hidden bg-black/10 dark:bg-black/40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={frame.url}
                          alt={`Frame at ${frame.formattedTimestamp}`}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />

                        {/* Quick Hover Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-neutral-950/60 opacity-0 backdrop-blur-xs transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => setActivePreviewFrame(frame)}
                            title="Preview full size"
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40 transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadSingleFrame(frame)}
                            title="Download frame"
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40 transition-colors"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveFrame(frame.id)}
                            title="Remove frame"
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/30 text-red-200 hover:bg-red-500/50 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Timestamp Badge */}
                        <div className="absolute bottom-1.5 left-1.5 rounded-md bg-neutral-900/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white backdrop-blur-xs">
                          {frame.formattedTimestamp}
                        </div>

                        {/* Format Badge */}
                        <div className="absolute top-1.5 right-1.5 rounded-md bg-neutral-900/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-neutral-300 backdrop-blur-xs">
                          {frame.format}
                        </div>
                      </div>

                      {/* Metadata & Actions Footer */}
                      <div className="flex flex-col gap-2 p-3">
                        <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
                          <span>
                            {frame.width} × {frame.height}
                          </span>
                          <span>{formatFileSize(frame.sizeBytes)}</span>
                        </div>

                        <div className="flex items-center gap-1.5 pt-1 border-t border-neutral-200/60 dark:border-neutral-800">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleDownloadSingleFrame(frame)}
                            className="flex-1 text-xs h-7"
                          >
                            <Download className="mr-1 h-3 w-3" />
                            Download
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFrame(frame.id)}
                            className="text-xs h-7 px-2 text-neutral-400 hover:text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        }
        settings={
          <div className="flex flex-col gap-6">
            {/* Format Settings Card */}
            <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                <Sliders className="h-4 w-4 text-indigo-500" />
                Frame Export Format
              </h2>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOutputFormat("png")}
                  className={`rounded-lg border py-2 text-xs font-medium transition-all ${outputFormat === "png"
                      ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                      : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
                    }`}
                >
                  PNG (Lossless)
                </button>
                <button
                  type="button"
                  onClick={() => setOutputFormat("jpg")}
                  className={`rounded-lg border py-2 text-xs font-medium transition-all ${outputFormat === "jpg"
                      ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                      : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
                    }`}
                >
                  JPG (Compressed)
                </button>
              </div>

              {outputFormat === "jpg" && (
                <div className="mt-2 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
                    <span>JPEG Quality</span>
                    <span className="font-semibold">{Math.round(jpgQuality * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={1.0}
                    step={0.05}
                    value={jpgQuality}
                    onChange={(e) => setJpgQuality(parseFloat(e.target.value))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-neutral-200 accent-indigo-600 dark:bg-neutral-800"
                  />
                </div>
              )}
            </div>

            {/* Automated Batch Extraction Card */}
            <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                Batch Frame Extraction
              </h2>

              {/* Mode selection tabs */}
              <div className="grid grid-cols-2 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
                <button
                  type="button"
                  onClick={() => setBatchMode("interval")}
                  className={`rounded-md py-1.5 text-xs font-medium transition-all ${batchMode === "interval"
                      ? "bg-white text-neutral-900 shadow-xs dark:bg-neutral-900 dark:text-neutral-100"
                      : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
                    }`}
                >
                  By Interval
                </button>
                <button
                  type="button"
                  onClick={() => setBatchMode("count")}
                  className={`rounded-md py-1.5 text-xs font-medium transition-all ${batchMode === "count"
                      ? "bg-white text-neutral-900 shadow-xs dark:bg-neutral-900 dark:text-neutral-100"
                      : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
                    }`}
                >
                  By Frame Count
                </button>
              </div>

              {/* Mode Parameters */}
              {batchMode === "interval" ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Interval (seconds per frame):
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[0.5, 1.0, 2.0, 5.0].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setBatchInterval(sec)}
                        className={`rounded-md border py-1.5 text-xs font-medium transition-colors ${batchInterval === sec
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/50 dark:text-indigo-300"
                            : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400"
                          }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Total Frames:
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[5, 10, 20, 30].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setBatchCount(cnt)}
                        className={`rounded-md border py-1.5 text-xs font-medium transition-colors ${batchCount === cnt
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/50 dark:text-indigo-300"
                            : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400"
                          }`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Range Selection */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                    Start Time
                  </label>
                  <input
                    type="text"
                    value={batchStartTime}
                    onChange={(e) => setBatchStartTime(e.target.value)}
                    placeholder="00:00"
                    className="h-8 rounded-md border border-neutral-200 bg-white px-2.5 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                    End Time
                  </label>
                  <input
                    type="text"
                    value={batchEndTime}
                    onChange={(e) => setBatchEndTime(e.target.value)}
                    placeholder={formatTimestamp(duration)}
                    className="h-8 rounded-md border border-neutral-200 bg-white px-2.5 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                  />
                </div>
              </div>

              {/* Estimate & Batch Limit Warning */}
              <div className="rounded-xl bg-neutral-50 p-3 text-xs text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-400">
                <p className="font-medium text-neutral-900 dark:text-neutral-200">
                  Will extract: ~{plannedBatchCount} frames
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                  Maximum {MAX_BATCH_FRAMES} frames per batch to guarantee smooth browser performance and zero out-of-memory errors.
                </p>
              </div>

              {/* Batch Progress Bar */}
              {isBatchExtracting && batchProgress && (
                <div className="flex flex-col gap-2 rounded-xl bg-indigo-50/70 p-3 dark:bg-indigo-950/40">
                  <div className="flex items-center justify-between text-xs font-medium text-indigo-900 dark:text-indigo-200">
                    <span>Extracting frame {batchProgress.current} of {batchProgress.total}...</span>
                    <span>{batchProgress.percentage}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-indigo-200 dark:bg-indigo-900">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-200"
                      style={{ width: `${batchProgress.percentage}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-indigo-700 dark:text-indigo-300 font-mono">
                    Current: {formatTimestamp(batchProgress.currentTimestamp)}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              {isBatchExtracting ? (
                <Button
                  variant="destructive"
                  size="md"
                  onClick={handleCancelBatch}
                  className="w-full text-xs"
                >
                  <X className="mr-1.5 h-4 w-4" />
                  Cancel Extraction
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleStartBatchExtraction}
                  disabled={!currentFile || plannedBatchCount === 0}
                  className="w-full bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 text-xs font-semibold"
                >
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  Start Batch Extraction
                </Button>
              )}
            </div>

            {/* Quick Stats & Download Card */}
            {frames.length > 0 && (
              <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Bulk Download
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  You have {frames.length} extracted frames ready. Download them all packaged into a single clean ZIP archive.
                </p>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleDownloadAllZip}
                  disabled={isZipping}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20"
                >
                  {isZipping ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Packaging ZIP Archive...
                    </>
                  ) : (
                    <>
                      <Archive className="mr-2 h-4 w-4" />
                      Download All as ZIP ({frames.length})
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        }
        supportingInfo={
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                100% Client-Side Privacy
              </h3>
              <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                Your video files and captured frames never leave your computer. All decoding, seeking, and image generation are executed securely within your local browser sandbox.
              </p>
            </div>

            <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Hardware-Accelerated Speed
              </h3>
              <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                Leverages your browser&apos;s native GPU-accelerated video decoding engine and Canvas 2D API for instantaneous frame snapshots at full source resolution.
              </p>
            </div>

            <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                <Sliders className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Frame-Accurate Seeking
              </h3>
              <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                Use single-frame step buttons, timeline scrubbing, or direct timestamp inputs to capture the exact split second you need for thumbnails, analysis, or presentation slides.
              </p>
            </div>
          </div>
        }
      />

      {/* Lightbox / Preview Modal */}
      {activePreviewFrame && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setActivePreviewFrame(null)}
        >
          <div
            className="relative flex max-h-[90vh] max-w-4xl flex-col overflow-hidden rounded-2xl bg-neutral-900 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-semibold text-indigo-400">
                  {activePreviewFrame.formattedTimestamp}
                </span>
                <span className="text-xs text-neutral-400">
                  {activePreviewFrame.width} × {activePreviewFrame.height} • {formatFileSize(activePreviewFrame.sizeBytes)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleDownloadSingleFrame(activePreviewFrame)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-xs"
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Download
                </Button>
                <button
                  type="button"
                  onClick={() => setActivePreviewFrame(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Image */}
            <div className="relative flex max-h-[75vh] items-center justify-center overflow-auto p-4 bg-neutral-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activePreviewFrame.url}
                alt={`Preview of frame at ${activePreviewFrame.formattedTimestamp}`}
                className="max-h-full max-w-full rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

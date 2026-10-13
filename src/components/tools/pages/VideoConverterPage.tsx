"use client";

import * as React from "react";
import { ToolPageLayout } from "@/components/tools/ToolPageLayout";
import { FileDropzone } from "@/components/file-upload/FileDropzone";
import { Button } from "@/components/ui/Button";
import { SelectedFileItem } from "@/lib/file/types";
import { downloadBlob } from "@/lib/download/download";
import { formatFileSize } from "@/lib/file/validation";
import {
  convertVideo,
  getVideoMetadata,
  VideoMetadata,
  VideoConversionOptions,
} from "@/lib/media/ffmpeg";
import { formatTimestamp } from "@/lib/media/frameExtractor";
import {
  Clapperboard,
  RotateCcw,
  Download,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Film,
  Sliders,
  ShieldCheck,
  Zap,
  Volume2,
  VolumeX,
  X,
  ArrowRight,
  Info,
} from "lucide-react";

const BREADCRUMBS = [
  { label: "Home", href: "/" },
  { label: "Audio & Video", href: "/categories/audio-video" },
  { label: "Video Converter" },
];

const FORMAT_OPTIONS: {
  id: "mp4" | "webm" | "mov";
  label: string;
  badge: string;
  description: string;
}[] = [
    {
      id: "mp4",
      label: "MP4",
      badge: "Most Compatible",
      description: "H.264 video + AAC audio. Plays everywhere across browsers, phones, and TVs.",
    },
    {
      id: "webm",
      label: "WebM",
      badge: "Web Standard",
      description: "VP8 video + Vorbis audio. Open format optimized for modern HTML5 web playback.",
    },
    {
      id: "mov",
      label: "MOV",
      badge: "Apple QuickTime",
      description: "H.264 video + AAC audio in QuickTime container for Apple ecosystem & editing.",
    },
  ];

const QUALITY_OPTIONS: {
  id: "medium" | "high" | "low";
  label: string;
  description: string;
}[] = [
    { id: "high", label: "High Quality", description: "Lower compression, crisp details, larger file" },
    { id: "medium", label: "Balanced", description: "Recommended balance between quality and file size" },
    { id: "low", label: "Compact Size", description: "Higher compression, smaller file, faster export" },
  ];

const RESOLUTION_OPTIONS: {
  id: "original" | "1080p" | "720p" | "480p";
  label: string;
}[] = [
    { id: "original", label: "Original" },
    { id: "1080p", label: "1080p (FHD)" },
    { id: "720p", label: "720p (HD)" },
    { id: "480p", label: "480p (SD)" },
  ];

export function VideoConverterPage() {
  const [files, setFiles] = React.useState<SelectedFileItem[]>([]);
  const [sourceUrl, setSourceUrl] = React.useState<string | null>(null);
  const [metadata, setMetadata] = React.useState<VideoMetadata | null>(null);

  // Conversion Settings
  const [targetFormat, setTargetFormat] = React.useState<"mp4" | "webm" | "mov">("mp4");
  const [quality, setQuality] = React.useState<"high" | "medium" | "low">("medium");
  const [resolution, setResolution] = React.useState<"original" | "1080p" | "720p" | "480p">("original");
  const [preserveAudio, setPreserveAudio] = React.useState<boolean>(true);

  // Processing State
  const [isConverting, setIsConverting] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{
    blob: Blob;
    url: string;
    outputFileName: string;
    sizeBytes: number;
  } | null>(null);

  const abortControllerRef = React.useRef<AbortController | null>(null);

  const readyFiles = files.filter((f) => f.status === "ready");
  const currentFile = readyFiles[0]?.file;

  // Sync Source File and Object URL
  React.useEffect(() => {
    let isSubscribed = true;

    if (!currentFile) {
      Promise.resolve().then(() => {
        if (!isSubscribed) return;
        setSourceUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        setMetadata(null);
        setResult((prev) => {
          if (prev) URL.revokeObjectURL(prev.url);
          return null;
        });
        setError(null);
        setProgress(0);
      });
      return;
    }

    const url = URL.createObjectURL(currentFile);
    Promise.resolve().then(() => {
      if (!isSubscribed) {
        URL.revokeObjectURL(url);
        return;
      }
      setSourceUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setResult((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return null;
      });
      setError(null);
      setProgress(0);
    });

    getVideoMetadata(currentFile).then((meta) => {
      if (isSubscribed) {
        setMetadata(meta);
      }
    });

    return () => {
      isSubscribed = false;
      URL.revokeObjectURL(url);
    };
  }, [currentFile]);

  // Clean up Result URL on unmount
  React.useEffect(() => {
    return () => {
      if (result) {
        URL.revokeObjectURL(result.url);
      }
    };
  }, [result]);

  const handleConvert = async () => {
    if (!currentFile) return;

    setIsConverting(true);
    setError(null);
    setProgress(0);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const options: VideoConversionOptions = {
      targetFormat,
      quality,
      resolution,
      preserveAudio,
    };

    try {
      const outputBlob = await convertVideo(
        currentFile,
        options,
        (p) => {
          setProgress(p);
        },
        controller.signal
      );

      const baseName = currentFile.name.replace(/\.[^/.]+$/, "");
      const outputFileName = `${baseName}_converted.${targetFormat}`;
      const url = URL.createObjectURL(outputBlob);

      setResult({
        blob: outputBlob,
        url,
        outputFileName,
        sizeBytes: outputBlob.size,
      });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Conversion was cancelled by user.");
      } else {
        const msg = err instanceof Error ? err.message : "Video conversion failed.";
        setError(msg);
      }
    } finally {
      setIsConverting(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
  };

  const handleDownload = () => {
    if (!result) return;
    downloadBlob(result.blob, result.outputFileName);
  };

  const handleReset = () => {
    setFiles([]);
    if (sourceUrl) {
      URL.revokeObjectURL(sourceUrl);
      setSourceUrl(null);
    }
    if (result) {
      URL.revokeObjectURL(result.url);
      setResult(null);
    }
    setMetadata(null);
    setError(null);
    setProgress(0);
  };

  return (
    <ToolPageLayout
      breadcrumbs={BREADCRUMBS}
      title="Video Format Converter"
      description="Convert videos between MP4, WebM, and MOV directly in your browser. Hardware-accelerated WebAssembly processing with zero server uploads."
      badge="Client-Side WASM"
      workspace={
        <div className="flex flex-col gap-6">
          {/* 1. File Upload Dropzone */}
          {!currentFile && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">
                <Film className="h-5 w-5 text-indigo-500" />
                Select Video File to Convert
              </h2>
              <FileDropzone
                value={files}
                onChange={setFiles}
                accept={["video/*", ".mp4", ".webm", ".mov", ".avi", ".mkv", ".flv", ".wmv", ".m4v", ".ogv"]}
                multiple={false}
                maxSize={500 * 1024 * 1024}
              />
              <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                Supports MP4, WebM, MOV, AVI, MKV, and standard video containers up to 500 MB.
              </p>
            </div>
          )}

          {/* 2. Source Video Information & Preview Card */}
          {currentFile && !result && (
            <div className="flex flex-col gap-5 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                    <Clapperboard className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="max-w-260px truncate text-sm font-semibold text-neutral-900 sm:max-w-md dark:text-neutral-100">
                      {currentFile.name}
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {formatFileSize(currentFile.size)} • {currentFile.type || "Video File"}
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  disabled={isConverting}
                  className="text-xs"
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Change File
                </Button>
              </div>

              {/* Source Video Preview */}
              {sourceUrl && (
                <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-neutral-950 flex items-center justify-center">
                  <video
                    src={sourceUrl}
                    controls
                    playsInline
                    className="h-full w-full object-contain"
                  />
                </div>
              )}

              {/* Metadata Info Grid */}
              {metadata && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-xl bg-neutral-50 p-3.5 text-xs dark:bg-neutral-800/50">
                  <div>
                    <span className="text-neutral-400 block text-[11px]">Duration</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {metadata.duration > 0 ? formatTimestamp(metadata.duration, false) : "Unknown"}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[11px]">Resolution</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {metadata.width > 0 ? `${metadata.width} × ${metadata.height}` : "Source Native"}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[11px]">Aspect Ratio</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {metadata.aspectRatio}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[11px]">File Size</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {formatFileSize(metadata.fileSize)}
                    </span>
                  </div>
                </div>
              )}

              {/* In-Progress Conversion Card */}
              {isConverting && (
                <div className="flex flex-col gap-3 rounded-xl bg-indigo-50/70 p-4 border border-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-900/40">
                  <div className="flex items-center justify-between text-xs font-semibold text-indigo-950 dark:text-indigo-200">
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                      Converting video frames with WebAssembly...
                    </span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-indigo-200 dark:bg-indigo-900">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                      Please keep this browser tab active. All encoding runs locally on your machine.
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleCancel}
                      className="text-xs h-7 px-3"
                    >
                      <X className="mr-1 h-3 w-3" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. Converted Result Card */}
          {result && (
            <div className="flex flex-col gap-5 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {result.outputFileName}
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Ready to download • {formatFileSize(result.sizeBytes)}
                      {currentFile && (
                        <span className="ml-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          ({result.sizeBytes <= currentFile.size
                            ? `${Math.round(((currentFile.size - result.sizeBytes) / currentFile.size) * 100)}% smaller`
                            : `${Math.round(((result.sizeBytes - currentFile.size) / currentFile.size) * 100)}% larger`}
                          )
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    className="text-xs"
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    Convert Another
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleDownload}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm shadow-emerald-600/20"
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Download Video
                  </Button>
                </div>
              </div>

              {/* Converted Output Video Preview */}
              <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-neutral-950 flex items-center justify-center">
                <video
                  src={result.url}
                  controls
                  playsInline
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
          )}

          {/* 4. Error Card */}
          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">Conversion Error</p>
                <p className="text-xs mt-0.5">{error}</p>
                <p className="text-[11px] mt-1 text-red-600/80 dark:text-red-400/80">
                  Tip: WebAssembly runs within browser memory boundaries. If conversion fails, try selecting the &ldquo;Compact Size&rdquo; preset or 720p scaling.
                </p>
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
        </div>
      }
      settings={
        <div className="flex flex-col gap-6">
          {/* Target Format Selector */}
          <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              <Film className="h-4 w-4 text-indigo-500" />
              Target Output Format
            </h2>

            <div className="flex flex-col gap-2">
              {FORMAT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTargetFormat(opt.id)}
                  disabled={isConverting}
                  className={`flex flex-col rounded-xl border p-3 text-left transition-all ${targetFormat === opt.id
                      ? "border-indigo-600 bg-indigo-50/60 dark:border-indigo-500 dark:bg-indigo-950/40"
                      : "border-neutral-200 bg-white hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800/60"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      {opt.label}
                    </span>
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                      {opt.badge}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                    {opt.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Encoding Quality & Resolution Settings */}
          <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              <Sliders className="h-4 w-4 text-indigo-500" />
              Quality & Scaling
            </h2>

            {/* Quality Preset */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Quality Preset
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {QUALITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setQuality(opt.id)}
                    disabled={isConverting}
                    className={`rounded-lg border py-2 text-xs font-medium transition-all ${quality === opt.id
                        ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                        : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution Scaling */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Resolution Scaling
              </label>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {RESOLUTION_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setResolution(opt.id)}
                    disabled={isConverting}
                    className={`rounded-lg border py-2 text-xs font-medium transition-all ${resolution === opt.id
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/50 dark:text-indigo-300"
                        : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400"
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Audio Track Option */}
            <div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                {preserveAudio ? (
                  <Volume2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <VolumeX className="h-4 w-4 text-neutral-400" />
                )}
                <div>
                  <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 block">
                    Preserve Audio Track
                  </span>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                    {preserveAudio ? "Encodes audio with synchronization" : "Mutes & strips audio stream"}
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={preserveAudio}
                onChange={(e) => setPreserveAudio(e.target.checked)}
                disabled={isConverting}
                className="h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-900"
              />
            </div>
          </div>

          {/* Configuration Summary Box */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
              <Info className="h-4 w-4 text-indigo-500" />
              Estimated Output Configuration
            </h2>
            <div className="flex flex-col gap-2 text-xs text-neutral-600 dark:text-neutral-400">
              <div className="flex justify-between">
                <span>Output Container:</span>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100 uppercase">
                  {targetFormat}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Video Codec:</span>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {targetFormat === "webm" ? "VP8 (libvpx)" : "H.264 (libx264, yuv420p)"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Audio Codec:</span>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {!preserveAudio
                    ? "None (Muted)"
                    : targetFormat === "webm"
                      ? "Vorbis (128 kbps)"
                      : "AAC (128 kbps)"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Scaling:</span>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {resolution === "original" ? "Original Dimensions" : resolution}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Quality Mode:</span>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100 capitalize">
                  {quality}
                </span>
              </div>
            </div>

            <p className="mt-4 text-[11px] leading-relaxed text-neutral-400 dark:text-neutral-500">
              * Exact output file size depends on input frame motion and complexity. Re-encoding runs locally via FFmpeg WebAssembly.
            </p>

            <Button
              type="button"
              variant="primary"
              size="lg"
              disabled={!currentFile || isConverting}
              onClick={handleConvert}
              className="mt-4 w-full bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 text-sm font-semibold shadow-md"
            >
              {isConverting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Converting Video ({progress}%)...
                </>
              ) : (
                <>
                  <Clapperboard className="mr-2 h-4 w-4" />
                  Convert to {targetFormat.toUpperCase()}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
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
              Your video files never leave your computer. Processing runs entirely in browser memory through WebAssembly, keeping personal and sensitive media private.
            </p>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Universal Codec Compatibility
            </h3>
            <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              Output files are converted with standard `yuv420p` pixel format and web-safe audio codecs, ensuring smooth playback in QuickTime, Chrome, Safari, and mobile players.
            </p>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <Sliders className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Optimized WASM Presets
            </h3>
            <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              Leverages high-efficiency CPU presets (`ultrafast` / `realtime`) and bounded CRF values to prevent tab slowdowns while maintaining excellent picture fidelity.
            </p>
          </div>
        </div>
      }
    />
  );
}

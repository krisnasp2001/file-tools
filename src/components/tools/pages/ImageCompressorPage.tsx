"use client";

import * as React from "react";
import { ToolPageLayout } from "@/components/tools/ToolPageLayout";
import { FileDropzone } from "@/components/file-upload/FileDropzone";
import { ImagePreview } from "@/components/tools/ImagePreview";
import { Button } from "@/components/ui/Button";
import { SelectedFileItem } from "@/lib/file/types";
import { ImageDimensions } from "@/lib/file/imageTypes";
import { getImageDimensions } from "@/lib/file/imageConverter";
import { compressImage, ImageCompressionResult } from "@/lib/file/imageCompressor";
import { downloadBlob } from "@/lib/download/download";
import { formatFileSize } from "@/lib/file/validation";
import {
  Loader2,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Minimize2,
  Zap,
} from "lucide-react";

export function ImageCompressorPage() {
  const [files, setFiles] = React.useState<SelectedFileItem[]>([]);
  const [dimensions, setDimensions] = React.useState<ImageDimensions | null>(null);
  const [isReadingDims, setIsReadingDims] = React.useState(false);
  const [dimError, setDimError] = React.useState<string | null>(null);

  // Settings
  const [compressionMode, setCompressionMode] = React.useState<"lossy" | "lossless">("lossy");
  const [quality, setQuality] = React.useState<number>(0.75);

  // Execution states
  const [isCompressing, setIsCompressing] = React.useState(false);
  const [result, setResult] = React.useState<ImageCompressionResult | null>(null);
  const [resultPreviewUrl, setResultPreviewUrl] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const validFiles = files.filter((f) => f.status === "ready");
  const currentFile = validFiles[0]?.file;

  // Extract dimensions and validate whenever file changes
  React.useEffect(() => {
    if (!currentFile) {
      Promise.resolve().then(() => {
        setDimensions(null);
        setDimError(null);
        setResult(null);
        setError(null);
        if (resultPreviewUrl) {
          URL.revokeObjectURL(resultPreviewUrl);
          setResultPreviewUrl(null);
        }
      });
      return;
    }

    let isCancelled = false;
    Promise.resolve().then(() => {
      setIsReadingDims(true);
      setDimError(null);
      setResult(null);
      setError(null);
    });

    getImageDimensions(currentFile)
      .then((dims) => {
        if (!isCancelled) {
          setDimensions(dims);
          setIsReadingDims(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setDimensions(null);
          setDimError(err?.message || "Could not read image dimensions.");
          setIsReadingDims(false);
        }
      });

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFile]);

  // Clean up result object URL on unmount or reset
  React.useEffect(() => {
    return () => {
      if (resultPreviewUrl) {
        URL.revokeObjectURL(resultPreviewUrl);
      }
    };
  }, [resultPreviewUrl]);

  const handleCompress = async () => {
    if (!currentFile) return;

    setIsCompressing(true);
    setError(null);

    try {
      const res = await compressImage(currentFile, {
        mode: compressionMode,
        quality,
      });

      const previewUrl = URL.createObjectURL(res.blob);
      setResult(res);
      setResultPreviewUrl(previewUrl);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred during compression."
      );
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    downloadBlob({
      blob: result.blob,
      filename: result.outputFilename,
    });
  };

  const handleReset = () => {
    setFiles([]);
    setDimensions(null);
    setDimError(null);
    setResult(null);
    setError(null);
    if (resultPreviewUrl) {
      URL.revokeObjectURL(resultPreviewUrl);
      setResultPreviewUrl(null);
    }
  };

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Image", href: "/categories/image" },
    { label: "Image Compressor", href: "/tools/image-compressor" },
  ];

  const canCompress =
    Boolean(currentFile) &&
    !isReadingDims &&
    !dimError &&
    !isCompressing &&
    !result;

  return (
    <ToolPageLayout
      breadcrumbs={breadcrumbs}
      title="Image Compressor"
      description="Compress JPEG, PNG, and WebP images directly in your browser with smart lossy and lossless modes."
      badge="Client-Side"
      workspace={
        <div className="flex flex-col gap-6">
          {!currentFile ? (
            <FileDropzone
              accept={[".jpg", ".jpeg", ".png", ".webp", "image/jpeg", "image/png", "image/webp"]}
              maxSize={40 * 1024 * 1024}
              multiple={false}
              value={files}
              onChange={setFiles}
            />
          ) : (
            <div className="flex flex-col gap-6">
              {!result ? (
                <>
                  <ImagePreview
                    file={currentFile}
                    dimensions={dimensions}
                    alt={`Preview of ${currentFile.name}`}
                  />
                  {dimError && (
                    <div
                      role="alert"
                      className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
                    >
                      <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
                      <div>
                        <span className="font-semibold">Unable to process file:</span> {dimError}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Compressed Result Card */
                <div className="flex flex-col gap-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                      Compressed Successfully
                    </div>
                    {result.savingsPercentage > 0 ? (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                        {result.savingsPercentage}% Smaller
                      </span>
                    ) : (
                      <span className="rounded-full bg-neutral-200 px-3 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                        Optimized
                      </span>
                    )}
                  </div>

                  {resultPreviewUrl && (
                    <div className="relative flex aspect-video max-h-90 w-full items-center justify-center overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-900">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resultPreviewUrl}
                        alt="Compressed image result"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-lg bg-white/80 p-3 text-xs dark:bg-neutral-900/80">
                    <div>
                      <div className="text-neutral-500 dark:text-neutral-400">Original Size</div>
                      <div className="font-semibold text-neutral-800 dark:text-neutral-200">
                        {formatFileSize(result.originalSizeBytes)}
                      </div>
                    </div>
                    <div>
                      <div className="text-neutral-500 dark:text-neutral-400">Compressed Size</div>
                      <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatFileSize(result.compressedSizeBytes)}
                      </div>
                    </div>
                    <div>
                      <div className="text-neutral-500 dark:text-neutral-400">Dimensions</div>
                      <div className="font-semibold text-neutral-800 dark:text-neutral-200">
                        {result.width} × {result.height} px
                      </div>
                    </div>
                    <div>
                      <div className="text-neutral-500 dark:text-neutral-400">Reduction</div>
                      <div className="font-semibold text-neutral-800 dark:text-neutral-200">
                        {result.savingsPercentage > 0
                          ? `-${result.savingsPercentage}%`
                          : "No size change"}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
                  <div>
                    <span className="font-semibold">Compression Error:</span> {error}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      }
      settings={
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Compression Mode
            </h2>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCompressionMode("lossy")}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  compressionMode === "lossy"
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                    : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
                }`}
              >
                <div className="text-xs font-semibold">Smart Lossy</div>
                <div
                  className={`mt-1 text-[11px] leading-tight ${
                    compressionMode === "lossy"
                      ? "text-neutral-300 dark:text-neutral-600"
                      : "text-neutral-400"
                  }`}
                >
                  High reduction, visually near-identical
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCompressionMode("lossless")}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  compressionMode === "lossless"
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                    : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
                }`}
              >
                <div className="text-xs font-semibold">Lossless</div>
                <div
                  className={`mt-1 text-[11px] leading-tight ${
                    compressionMode === "lossless"
                      ? "text-neutral-300 dark:text-neutral-600"
                      : "text-neutral-400"
                  }`}
                >
                  Preserves every exact pixel value
                </div>
              </button>
            </div>

            {compressionMode === "lossless" && (
              <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                Notice: Lossless compression removes metadata and restructures data without changing pixels. Photos that are already compressed may show minimal size change.
              </p>
            )}

            {compressionMode === "lossy" && (
              <div className="mt-5 flex flex-col gap-2 border-t border-neutral-100 pt-4 dark:border-neutral-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">
                    Quality Level
                  </span>
                  <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                    {Math.round(quality * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="0.95"
                  step="0.05"
                  value={quality}
                  onChange={(e) => setQuality(parseFloat(e.target.value))}
                  className="w-full accent-neutral-900 dark:accent-neutral-100"
                  aria-label="Compression quality slider"
                />
                <div className="flex justify-between text-[10px] text-neutral-400">
                  <span>Smallest File</span>
                  <span>Balanced (75%)</span>
                  <span>Highest Quality</span>
                </div>
              </div>
            )}
          </div>

          {!result ? (
            <Button
              type="button"
              variant="primary"
              size="lg"
              disabled={!canCompress}
              onClick={handleCompress}
              className="inline-flex w-full items-center justify-center gap-2"
            >
              {isCompressing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Compressing...
                </>
              ) : isReadingDims ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Reading image...
                </>
              ) : (
                <>
                  <Minimize2 className="h-4 w-4" aria-hidden="true" />
                  Compress Image
                </>
              )}
            </Button>
          ) : (
            <div className="flex flex-col gap-3">
              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={handleDownload}
                className="inline-flex w-full items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Download {result.outputFilename}
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleReset}
                className="inline-flex w-full items-center justify-center gap-2"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Compress Another Image
              </Button>
            </div>
          )}

          {currentFile && !result && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400"
            >
              Choose a different file
            </Button>
          )}

          <div className="rounded-lg bg-neutral-50 p-4 text-xs text-neutral-600 dark:bg-neutral-900/40 dark:text-neutral-400">
            <span className="flex items-center gap-1.5 font-medium text-neutral-900 dark:text-neutral-100">
              <Zap className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" /> 100% Private Compression
            </span>
            <p className="mt-1 leading-relaxed">
              Unlike cloud-based tools like TinyPNG, your photos are never uploaded to any third-party server. All compression algorithms execute inside your web browser.
            </p>
          </div>
        </div>
      }
    />
  );
}

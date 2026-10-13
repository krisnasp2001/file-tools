"use client";

import * as React from "react";
import { ToolPageLayout } from "@/components/tools/ToolPageLayout";
import { FileDropzone } from "@/components/file-upload/FileDropzone";
import { ImagePreview } from "@/components/tools/ImagePreview";
import { Button } from "@/components/ui/Button";
import { SelectedFileItem } from "@/lib/file/types";
import { ImageDimensions } from "@/lib/file/imageTypes";
import { getImageDimensions } from "@/lib/file/imageConverter";
import { enhanceImage, ImageEnhancementResult } from "@/lib/file/imageEnhancer";
import { downloadBlob } from "@/lib/download/download";
import { formatFileSize } from "@/lib/file/validation";
import {
  Loader2,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Sliders,
  ZoomIn,
} from "lucide-react";

export function ImageEnhancerPage() {
  const [files, setFiles] = React.useState<SelectedFileItem[]>([]);
  const [dimensions, setDimensions] = React.useState<ImageDimensions | null>(null);
  const [isReadingDims, setIsReadingDims] = React.useState(false);
  const [dimError, setDimError] = React.useState<string | null>(null);

  // Settings
  const [mode, setMode] = React.useState<"enhance" | "upscale">("enhance");
  const [scaleFactor, setScaleFactor] = React.useState<2 | 4>(2);
  const [contrast, setContrast] = React.useState<number>(15);
  const [saturation, setSaturation] = React.useState<number>(10);
  const [sharpen, setSharpen] = React.useState<number>(20);

  // Execution states
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [result, setResult] = React.useState<ImageEnhancementResult | null>(null);
  const [resultPreviewUrl, setResultPreviewUrl] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const validFiles = files.filter((f) => f.status === "ready");
  const currentFile = validFiles[0]?.file;

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

  React.useEffect(() => {
    return () => {
      if (resultPreviewUrl) {
        URL.revokeObjectURL(resultPreviewUrl);
      }
    };
  }, [resultPreviewUrl]);

  const handleEnhance = async () => {
    if (!currentFile) return;

    setIsProcessing(true);
    setError(null);

    try {
      const res = await enhanceImage(currentFile, {
        mode,
        scaleFactor,
        contrast,
        saturation,
        sharpen,
      });

      const previewUrl = URL.createObjectURL(res.blob);
      setResult(res);
      setResultPreviewUrl(previewUrl);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred during enhancement."
      );
    } finally {
      setIsProcessing(false);
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
    { label: "Image Enhancer", href: "/tools/image-enhancer" },
  ];

  const canProcess =
    Boolean(currentFile) &&
    !isReadingDims &&
    !dimError &&
    !isProcessing &&
    !result;

  return (
    <ToolPageLayout
      breadcrumbs={breadcrumbs}
      title="Image Enhancer & Upscaler"
      description="Enhance clarity, color depth, contrast, and super-sample images with sharp local filtering."
      badge="Client-Side"
      workspace={
        <div className="flex flex-col gap-6">
          {!currentFile ? (
            <FileDropzone
              accept={[".jpg", ".jpeg", ".png", ".webp", "image/jpeg", "image/png", "image/webp"]}
              maxSize={30 * 1024 * 1024}
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
                /* Enhanced Result Display */
                <div className="flex flex-col gap-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                      Enhanced Successfully
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                      {mode === "upscale" ? `${scaleFactor}× Super-Sampled` : "Auto-Enhanced"}
                    </span>
                  </div>

                  {resultPreviewUrl && (
                    <div className="relative flex aspect-video max-h-[360px] w-full items-center justify-center overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-900">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resultPreviewUrl}
                        alt="Enhanced image result"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-lg bg-white/80 p-3 text-xs dark:bg-neutral-900/80">
                    <div>
                      <div className="text-neutral-500 dark:text-neutral-400">Original Dimensions</div>
                      <div className="font-semibold text-neutral-800 dark:text-neutral-200">
                        {result.originalWidth} × {result.originalHeight} px
                      </div>
                    </div>
                    <div>
                      <div className="text-neutral-500 dark:text-neutral-400">New Dimensions</div>
                      <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {result.width} × {result.height} px
                      </div>
                    </div>
                    <div>
                      <div className="text-neutral-500 dark:text-neutral-400">Output Size</div>
                      <div className="font-semibold text-neutral-800 dark:text-neutral-200">
                        {formatFileSize(result.fileSizeBytes)}
                      </div>
                    </div>
                    <div>
                      <div className="text-neutral-500 dark:text-neutral-400">Filename</div>
                      <div className="truncate font-semibold text-neutral-800 dark:text-neutral-200">
                        {result.outputFilename}
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
                    <span className="font-semibold">Processing Error:</span> {error}
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
              Enhancement Mode
            </h2>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("enhance")}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  mode === "enhance"
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                    : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  Clarity & Detail
                </div>
                <div
                  className={`mt-1 text-[11px] leading-tight ${
                    mode === "enhance"
                      ? "text-neutral-300 dark:text-neutral-600"
                      : "text-neutral-400"
                  }`}
                >
                  Sharpen, balance contrast and colors
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode("upscale")}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  mode === "upscale"
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                    : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
                  Super-Sample
                </div>
                <div
                  className={`mt-1 text-[11px] leading-tight ${
                    mode === "upscale"
                      ? "text-neutral-300 dark:text-neutral-600"
                      : "text-neutral-400"
                  }`}
                >
                  Increase resolution 2× or 4×
                </div>
              </button>
            </div>

            {mode === "upscale" ? (
              <div className="mt-5 flex flex-col gap-3 border-t border-neutral-100 pt-4 dark:border-neutral-800">
                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Upscale Factor
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {[2, 4].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setScaleFactor(f as 2 | 4)}
                      className={`rounded-md border py-2 text-xs font-semibold transition-colors ${
                        scaleFactor === f
                          ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                          : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400"
                      }`}
                    >
                      {f}× ({dimensions ? `${dimensions.width * f}×${dimensions.height * f}px` : "Larger"})
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Super-sampling performs high-order bicubic interpolation with unsharp masking for cleaner enlargement.
                </p>
              </div>
            ) : (
              <div className="mt-5 flex flex-col gap-4 border-t border-neutral-100 pt-4 dark:border-neutral-800">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                  <Sliders className="h-3.5 w-3.5" aria-hidden="true" /> Tuning Controls
                </div>

                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                    <span>Edge Sharpening</span>
                    <span className="font-mono font-medium">{sharpen}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    value={sharpen}
                    onChange={(e) => setSharpen(parseInt(e.target.value))}
                    className="w-full accent-neutral-900 dark:accent-neutral-100"
                    aria-label="Sharpening level"
                  />
                </div>

                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                    <span>Dynamic Contrast</span>
                    <span className="font-mono font-medium">+{contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={contrast}
                    onChange={(e) => setContrast(parseInt(e.target.value))}
                    className="w-full accent-neutral-900 dark:accent-neutral-100"
                    aria-label="Contrast level"
                  />
                </div>

                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                    <span>Vibrance & Color</span>
                    <span className="font-mono font-medium">+{saturation}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={saturation}
                    onChange={(e) => setSaturation(parseInt(e.target.value))}
                    className="w-full accent-neutral-900 dark:accent-neutral-100"
                    aria-label="Saturation level"
                  />
                </div>
              </div>
            )}
          </div>

          {!result ? (
            <Button
              type="button"
              variant="primary"
              size="lg"
              disabled={!canProcess}
              onClick={handleEnhance}
              className="inline-flex w-full items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Processing image...
                </>
              ) : isReadingDims ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Reading image...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  {mode === "upscale" ? `Upscale Image ${scaleFactor}×` : "Enhance Image"}
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
                Enhance Another Image
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
        </div>
      }
    />
  );
}

"use client";

import * as React from "react";
import { ToolPageLayout } from "@/components/tools/ToolPageLayout";
import { FileDropzone } from "@/components/file-upload/FileDropzone";
import { ImagePreview } from "@/components/tools/ImagePreview";
import { Button } from "@/components/ui/Button";
import { SelectedFileItem } from "@/lib/file/types";
import { ImageDimensions } from "@/lib/file/imageTypes";
import { getImageDimensions } from "@/lib/file/imageConverter";
import { convertRasterToSvg, RasterToSvgResult } from "@/lib/file/rasterToSvg";
import { downloadBlob } from "@/lib/download/download";
import { formatFileSize } from "@/lib/file/validation";
import {
  Loader2,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Code,
} from "lucide-react";

export interface GenericRasterToSvgPageProps {
  toolSlug: string;
  sourceFormatName: string;
  accept: string[];
  maxSizeBytes?: number;
  description: string;
  hideHeader?: boolean;
}

export function GenericRasterToSvgPage({
  toolSlug,
  sourceFormatName,
  accept,
  maxSizeBytes = 30 * 1024 * 1024,
  description,
  hideHeader, }: GenericRasterToSvgPageProps) {
  const [files, setFiles] = React.useState<SelectedFileItem[]>([]);
  const [dimensions, setDimensions] = React.useState<ImageDimensions | null>(null);
  const [isReadingDims, setIsReadingDims] = React.useState(false);
  const [dimError, setDimError] = React.useState<string | null>(null);

  // Settings
  const [vectorMode, setVectorMode] = React.useState<"vectorize" | "embed">("vectorize");
  const [colors, setColors] = React.useState<number>(16);

  // Execution states
  const [isConverting, setIsConverting] = React.useState(false);
  const [conversionResult, setConversionResult] =
    React.useState<RasterToSvgResult | null>(null);
  const [resultPreviewUrl, setResultPreviewUrl] = React.useState<string | null>(null);
  const [conversionError, setConversionError] = React.useState<string | null>(null);

  const validFiles = files.filter((f) => f.status === "ready");
  const currentFile = validFiles[0]?.file;

  React.useEffect(() => {
    if (!currentFile) {
      Promise.resolve().then(() => {
        setDimensions(null);
        setDimError(null);
        setConversionResult(null);
        setConversionError(null);
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
      setConversionResult(null);
      setConversionError(null);
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

  const handleConvert = async () => {
    if (!currentFile) return;

    setIsConverting(true);
    setConversionError(null);

    try {
      const result = await convertRasterToSvg(currentFile, {
        mode: vectorMode,
        colors,
      });

      const previewUrl = URL.createObjectURL(result.blob);
      setConversionResult(result);
      setResultPreviewUrl(previewUrl);
    } catch (err: unknown) {
      setConversionError(
        err instanceof Error ? err.message : "An unexpected error occurred during SVG conversion."
      );
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownload = () => {
    if (!conversionResult) return;
    downloadBlob({
      blob: conversionResult.blob,
      filename: conversionResult.outputFilename,
    });
  };

  const handleReset = () => {
    setFiles([]);
    setDimensions(null);
    setDimError(null);
    setConversionResult(null);
    setConversionError(null);
    if (resultPreviewUrl) {
      URL.revokeObjectURL(resultPreviewUrl);
      setResultPreviewUrl(null);
    }
  };

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Image", href: "/categories/image" },
    { label: `${sourceFormatName} to SVG`, href: `/tools/${toolSlug}` },
  ];

  const canConvert =
    Boolean(currentFile) &&
    !isReadingDims &&
    !dimError &&
    !isConverting &&
    !conversionResult;

  return (
    <ToolPageLayout hideHeader={hideHeader}
      breadcrumbs={breadcrumbs}
      title={`${sourceFormatName} to SVG`}
      description={description}
      badge="Client-Side"
      workspace={
        <div className="flex flex-col gap-6">
          {!currentFile ? (
            <FileDropzone
              accept={accept}
              maxSize={maxSizeBytes}
              multiple={false}
              value={files}
              onChange={setFiles}
            />
          ) : (
            <div className="flex flex-col gap-6">
              {!conversionResult ? (
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
                /* Converted Result Display */
                <div className="flex flex-col gap-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                      Converted to Vector SVG
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                      SVG Vector
                    </span>
                  </div>

                  {resultPreviewUrl && (
                    <div className="relative flex aspect-video max-h-360px w-full items-center justify-center overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-900">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resultPreviewUrl}
                        alt="Converted SVG result"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-lg bg-white/80 p-3 text-xs dark:bg-neutral-900/80">
                    <div>
                      <div className="text-neutral-500 dark:text-neutral-400">Filename</div>
                      <div className="truncate font-semibold text-neutral-800 dark:text-neutral-200">
                        {conversionResult.outputFilename}
                      </div>
                    </div>
                    <div>
                      <div className="text-neutral-500 dark:text-neutral-400">Format</div>
                      <div className="font-semibold text-neutral-800 dark:text-neutral-200 uppercase">
                        SVG (XML)
                      </div>
                    </div>
                    <div>
                      <div className="text-neutral-500 dark:text-neutral-400">Dimensions</div>
                      <div className="font-semibold text-neutral-800 dark:text-neutral-200">
                        {conversionResult.width} × {conversionResult.height} px
                      </div>
                    </div>
                    <div>
                      <div className="text-neutral-500 dark:text-neutral-400">Output Size</div>
                      <div className="font-semibold text-neutral-800 dark:text-neutral-200">
                        {formatFileSize(conversionResult.fileSizeBytes)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {conversionError && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
                  <div>
                    <span className="font-semibold">Conversion Error:</span> {conversionError}
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
              Conversion Overview
            </h2>
            <div className="mt-4 flex items-center justify-between rounded-lg bg-neutral-50 p-3 text-xs dark:bg-neutral-800/60">
              <span className="font-medium text-neutral-700 dark:text-neutral-300">
                {sourceFormatName}
              </span>
              <ArrowRight className="h-4 w-4 text-neutral-400" aria-hidden="true" />
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                Scalable Vector (SVG)
              </span>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Vectorization Mode
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVectorMode("vectorize")}
                  className={`rounded-lg border p-2.5 text-left text-xs transition-colors ${vectorMode === "vectorize"
                      ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                      : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
                    }`}
                >
                  <div className="font-semibold">Vector Tracing</div>
                  <div
                    className={`mt-0.5 text-[10px] ${vectorMode === "vectorize"
                        ? "text-neutral-300 dark:text-neutral-600"
                        : "text-neutral-400"
                      }`}
                  >
                    Color-quantized paths
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setVectorMode("embed")}
                  className={`rounded-lg border p-2.5 text-left text-xs transition-colors ${vectorMode === "embed"
                      ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                      : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
                    }`}
                >
                  <div className="font-semibold">Hi-Fi Container</div>
                  <div
                    className={`mt-0.5 text-[10px] ${vectorMode === "embed"
                        ? "text-neutral-300 dark:text-neutral-600"
                        : "text-neutral-400"
                      }`}
                  >
                    Embedded XML image
                  </div>
                </button>
              </div>
            </div>

            {vectorMode === "vectorize" && (
              <div className="mt-4 flex flex-col gap-1.5 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                <div className="flex justify-between text-xs text-neutral-600 dark:text-neutral-400">
                  <span>Color Precision</span>
                  <span className="font-mono font-medium">{colors} colors</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="32"
                  step="4"
                  value={colors}
                  onChange={(e) => setColors(parseInt(e.target.value))}
                  className="w-full accent-neutral-900 dark:accent-neutral-100"
                  aria-label="Color count slider"
                />
              </div>
            )}
          </div>

          {!conversionResult ? (
            <Button
              type="button"
              variant="primary"
              size="lg"
              disabled={!canConvert}
              onClick={handleConvert}
              className="inline-flex w-full items-center justify-center gap-2"
            >
              {isConverting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Generating SVG...
                </>
              ) : isReadingDims ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Reading image...
                </>
              ) : (
                <>
                  <Code className="h-4 w-4" aria-hidden="true" />
                  Convert to SVG
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
                Download {conversionResult.outputFilename}
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleReset}
                className="inline-flex w-full items-center justify-center gap-2"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Convert Another Image
              </Button>
            </div>
          )}

          {currentFile && !conversionResult && (
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

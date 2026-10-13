"use client";

import * as React from "react";
import { formatFileSize } from "@/lib/file/validation";
import { ImageDimensions } from "@/lib/file/imageTypes";
import { Image as ImageIcon, AlertCircle, Eye } from "lucide-react";

export interface ImagePreviewProps {
  file?: File;
  previewUrl?: string;
  dimensions?: ImageDimensions | null;
  className?: string;
  alt?: string;
}

export function ImagePreview({
  file,
  previewUrl: externalPreviewUrl,
  dimensions,
  className = "",
  alt = "Selected image preview",
}: ImagePreviewProps) {
  const [internalUrl, setInternalUrl] = React.useState<string | null>(null);
  const [isBroken, setIsBroken] = React.useState(false);

  // Generate object URL safely and clean up automatically
  React.useEffect(() => {
    if (externalPreviewUrl) {
      Promise.resolve().then(() => {
        setInternalUrl(externalPreviewUrl);
        setIsBroken(false);
      });
      return;
    }

    if (!file) {
      Promise.resolve().then(() => {
        setInternalUrl(null);
      });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    Promise.resolve().then(() => {
      setInternalUrl(objectUrl);
      setIsBroken(false);
    });

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file, externalPreviewUrl]);

  if (!file && !externalPreviewUrl) {
    return null;
  }

  return (
    <div
      className={`overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 transition-all dark:border-neutral-800 dark:bg-neutral-900/40 ${className}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          Preview
        </span>
        {file && (
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {formatFileSize(file.size)}
          </span>
        )}
      </div>

      <div className="relative flex aspect-video max-h-90 w-full items-center justify-center overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-950">
        {isBroken ? (
          <div className="flex flex-col items-center gap-2 p-6 text-center text-neutral-400">
            <AlertCircle className="h-8 w-8 text-neutral-400 dark:text-neutral-600" aria-hidden="true" />
            <p className="text-xs">Preview unavailable for this format.</p>
          </div>
        ) : internalUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={internalUrl}
            alt={alt}
            onError={() => setIsBroken(true)}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-neutral-400">
            <ImageIcon className="h-8 w-8 text-neutral-300 dark:text-neutral-700" aria-hidden="true" />
            <p className="text-xs">Loading image...</p>
          </div>
        )}
      </div>

      {/* Image metadata footer */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200/80 pt-3 text-xs text-neutral-600 dark:border-neutral-800/80 dark:text-neutral-400">
        <div className="truncate font-medium text-neutral-800 dark:text-neutral-200">
          {file?.name || "Image"}
        </div>
        {dimensions && dimensions.width > 0 && (
          <div className="rounded bg-neutral-200/70 px-2 py-0.5 font-mono text-[11px] font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
            {dimensions.width} × {dimensions.height} px
          </div>
        )}
      </div>
    </div>
  );
}

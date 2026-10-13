"use client";

import * as React from "react";
import { ImageFittingOption, PageOrientation, getPageDimensions } from "@/lib/pdf/pageSizes";

export interface ImageFitPreviewProps {
  /** Object URL or data URL of the first selected image for preview */
  imageUrl?: string;
  /** Original image natural width in pixels */
  imageNaturalWidth?: number;
  /** Original image natural height in pixels */
  imageNaturalHeight?: number;
  pageSizeId: string;
  orientation: PageOrientation;
  fitting: ImageFittingOption;
  marginMm: number;
  className?: string;
}

/**
 * ImageFitPreview
 *
 * Renders a visual preview of how the image will be placed on the selected paper size.
 * Uses proportional CSS layout — no actual PDF rendering needed at this stage.
 */
export function ImageFitPreview({
  imageUrl,
  imageNaturalWidth,
  imageNaturalHeight,
  pageSizeId,
  orientation,
  fitting,
  marginMm,
  className = "",
}: ImageFitPreviewProps) {
  const pageDims = getPageDimensions(pageSizeId, orientation);

  // Max preview container dimension
  const PREVIEW_MAX = 220;
  const pageAspect = pageDims.widthMm / pageDims.heightMm;

  let previewW: number;
  let previewH: number;
  if (pageAspect >= 1) {
    previewW = PREVIEW_MAX;
    previewH = PREVIEW_MAX / pageAspect;
  } else {
    previewH = PREVIEW_MAX;
    previewW = PREVIEW_MAX * pageAspect;
  }

  // Margin as fraction of page width/height
  const marginFracW = (marginMm / pageDims.widthMm);
  const marginFracH = (marginMm / pageDims.heightMm);
  const safeW = previewW * (1 - 2 * marginFracW);
  const safeH = previewH * (1 - 2 * marginFracH);

  // Compute image placement
  let imgStyle: React.CSSProperties = {};

  if (imageUrl && imageNaturalWidth && imageNaturalHeight) {
    const imgAspect = imageNaturalWidth / imageNaturalHeight;

    if (fitting === "fit-to-page") {
      // Scale image to fit inside safe area, preserving aspect ratio
      let scaledW: number;
      let scaledH: number;
      if (imgAspect >= safeW / safeH) {
        scaledW = safeW;
        scaledH = safeW / imgAspect;
      } else {
        scaledH = safeH;
        scaledW = safeH * imgAspect;
      }
      imgStyle = { width: scaledW, height: scaledH };
    } else {
      // "original-size": Treat 1px = ~0.264mm. Scale so the image is proportional to page.
      // Represent the image at its natural mm size relative to page dims.
      const imgMmW = imageNaturalWidth * 0.264;
      const imgMmH = imageNaturalHeight * 0.264;
      // Clamp to safe area if needed
      const scaleW = Math.min(1, safeW / ((imgMmW / pageDims.widthMm) * previewW));
      const scaleH = Math.min(1, safeH / ((imgMmH / pageDims.heightMm) * previewH));
      const clamp = Math.min(scaleW, scaleH);
      const renderW = (imgMmW / pageDims.widthMm) * previewW * clamp;
      const renderH = (imgMmH / pageDims.heightMm) * previewH * clamp;
      imgStyle = { width: renderW, height: renderH };
    }
  } else if (imageUrl) {
    // Image loaded but dimensions unknown yet — fill safe area
    imgStyle = { width: safeW, height: safeH };
  }

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div
        role="img"
        aria-label={`Preview: ${pageDims.name} paper, ${orientation}, ${fitting === "fit-to-page" ? "fit to page" : "original size"}`}
        className="relative shrink-0 overflow-hidden rounded-sm border border-neutral-300 bg-white shadow-sm dark:border-neutral-600"
        style={{ width: previewW, height: previewH }}
      >
        {/* Margin indicator lines */}
        {marginMm > 0 && (
          <div
            className="pointer-events-none absolute inset-0 border border-dashed border-neutral-200 dark:border-neutral-600"
            style={{
              left: previewW * marginFracW,
              top: previewH * marginFracH,
              right: previewW * marginFracW,
              bottom: previewH * marginFracH,
              width: "auto",
              height: "auto",
            }}
            aria-hidden="true"
          />
        )}

        {/* Image preview */}
        {imageUrl ? (
          <div className="absolute inset-0 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Image preview"
              style={imgStyle}
              className="object-contain"
            />
          </div>
        ) : (
          /* Empty page placeholder */
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-neutral-200 dark:text-neutral-700">
            <div className="h-10 w-8 rounded-sm border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800" />
            <p className="text-[10px] text-neutral-300 dark:text-neutral-600">
              Add an image to preview
            </p>
          </div>
        )}
      </div>

      {/* Dimensions label */}
      <p className="text-xs text-neutral-400 dark:text-neutral-500">
        {pageDims.name} — {orientation} — {fitting === "fit-to-page" ? "Fit to page" : "Original size"}
        {marginMm > 0 ? `, ${marginMm}mm margin` : ", no margin"}
      </p>
    </div>
  );
}

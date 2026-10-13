"use client";

import * as React from "react";
import { GenericImageConvertPage } from "./GenericImageConvertPage";
import { GenericRasterToSvgPage } from "./GenericRasterToSvgPage";

export function JpgToPngPage({ hideHeader }: { hideHeader?: boolean }) {
  return (
    <GenericImageConvertPage hideHeader={hideHeader}
      toolSlug="jpg-to-png"
      sourceFormatName="JPG"
      targetFormatName="PNG"
      targetFormat="png"
      accept={[".jpg", ".jpeg", "image/jpeg"]}
      description="Convert JPG and JPEG images to lossless PNG format directly in your browser with no compression artifacts."
    />
  );
}

export function PngToJpgPage({ hideHeader }: { hideHeader?: boolean }) {
  return (
    <GenericImageConvertPage hideHeader={hideHeader}
      toolSlug="png-to-jpg"
      sourceFormatName="PNG"
      targetFormatName="JPG"
      targetFormat="jpeg"
      accept={[".png", "image/png"]}
      description="Convert PNG graphics to universally compatible JPG images with clean background blending."
    />
  );
}

export function JpgToWebpPage({ hideHeader }: { hideHeader?: boolean }) {
  return (
    <GenericImageConvertPage hideHeader={hideHeader}
      toolSlug="jpg-to-webp"
      sourceFormatName="JPG"
      targetFormatName="WebP"
      targetFormat="webp"
      accept={[".jpg", ".jpeg", "image/jpeg"]}
      description="Convert JPG images to modern WebP format for faster web page load times."
    />
  );
}

export function PngToWebpPage({ hideHeader }: { hideHeader?: boolean }) {
  return (
    <GenericImageConvertPage hideHeader={hideHeader}
      toolSlug="png-to-webp"
      sourceFormatName="PNG"
      targetFormatName="WebP"
      targetFormat="webp"
      accept={[".png", "image/png"]}
      description="Convert PNG images to modern WebP format while preserving transparency and crisp quality."
    />
  );
}

export function WebpToJpgPage({ hideHeader }: { hideHeader?: boolean }) {
  return (
    <GenericImageConvertPage hideHeader={hideHeader}
      toolSlug="webp-to-jpg"
      sourceFormatName="WebP"
      targetFormatName="JPG"
      targetFormat="jpeg"
      accept={[".webp", "image/webp"]}
      description="Convert WebP images to standard JPG format for maximum compatibility across older software."
    />
  );
}

export function WebpToPngPage({ hideHeader }: { hideHeader?: boolean }) {
  return (
    <GenericImageConvertPage hideHeader={hideHeader}
      toolSlug="webp-to-png"
      sourceFormatName="WebP"
      targetFormatName="PNG"
      targetFormat="png"
      accept={[".webp", "image/webp"]}
      description="Convert WebP images to lossless PNG format with transparent channels intact."
    />
  );
}

export function SvgToPngPage({ hideHeader }: { hideHeader?: boolean }) {
  return (
    <GenericImageConvertPage hideHeader={hideHeader}
      toolSlug="svg-to-png"
      sourceFormatName="SVG"
      targetFormatName="PNG"
      targetFormat="png"
      accept={[".svg", "image/svg+xml"]}
      description="Safely rasterize scalable vector SVG graphics into crisp, transparent PNG images."
    />
  );
}

export function SvgToJpgPage({ hideHeader }: { hideHeader?: boolean }) {
  return (
    <GenericImageConvertPage hideHeader={hideHeader}
      toolSlug="svg-to-jpg"
      sourceFormatName="SVG"
      targetFormatName="JPG"
      targetFormat="jpeg"
      accept={[".svg", "image/svg+xml"]}
      description="Convert vector SVG files into standard JPG images with clean neutral background fills."
    />
  );
}

export function SvgToWebpPage({ hideHeader }: { hideHeader?: boolean }) {
  return (
    <GenericImageConvertPage hideHeader={hideHeader}
      toolSlug="svg-to-webp"
      sourceFormatName="SVG"
      targetFormatName="WebP"
      targetFormat="webp"
      accept={[".svg", "image/svg+xml"]}
      description="Rasterize SVG files into lightweight modern WebP format directly in your browser."
    />
  );
}

export function HeicToJpgPage({ hideHeader }: { hideHeader?: boolean }) {
  return (
    <GenericImageConvertPage hideHeader={hideHeader}
      toolSlug="heic-to-jpg"
      sourceFormatName="HEIC"
      targetFormatName="JPG"
      targetFormat="jpeg"
      accept={[".heic", ".heif", "image/heic", "image/heif"]}
      description="Convert Apple HEIC / HEIF camera photos to standard JPG images right in your browser."
    />
  );
}

export function HeicToPngPage({ hideHeader }: { hideHeader?: boolean }) {
  return (
    <GenericImageConvertPage hideHeader={hideHeader}
      toolSlug="heic-to-png"
      sourceFormatName="HEIC"
      targetFormatName="PNG"
      targetFormat="png"
      accept={[".heic", ".heif", "image/heic", "image/heif"]}
      description="Convert Apple HEIC photos into high-fidelity lossless PNG images locally."
    />
  );
}

export function HeicToWebpPage({ hideHeader }: { hideHeader?: boolean }) {
  return (
    <GenericImageConvertPage hideHeader={hideHeader}
      toolSlug="heic-to-webp"
      sourceFormatName="HEIC"
      targetFormatName="WebP"
      targetFormat="webp"
      accept={[".heic", ".heif", "image/heic", "image/heif"]}
      description="Convert HEIC and HEIF photos to modern WebP format with small file footprint."
    />
  );
}

// ─── Raster to SVG Converters ──────────────────────────────────────────────────

export function JpgToSvgPage({ hideHeader }: { hideHeader?: boolean }) {
  return (
    <GenericRasterToSvgPage hideHeader={hideHeader}
      toolSlug="jpg-to-svg"
      sourceFormatName="JPG"
      accept={[".jpg", ".jpeg", "image/jpeg"]}
      description="Convert raster JPG and JPEG images into clean, scalable SVG vector graphics directly in your browser."
    />
  );
}

export function PngToSvgPage({ hideHeader }: { hideHeader?: boolean }) {
  return (
    <GenericRasterToSvgPage hideHeader={hideHeader}
      toolSlug="png-to-svg"
      sourceFormatName="PNG"
      accept={[".png", "image/png"]}
      description="Transform raster PNG graphics and logos into scalable SVG vector shapes with transparent background support."
    />
  );
}

export function WebpToSvgPage({ hideHeader }: { hideHeader?: boolean }) {
  return (
    <GenericRasterToSvgPage hideHeader={hideHeader}
      toolSlug="webp-to-svg"
      sourceFormatName="WebP"
      accept={[".webp", "image/webp"]}
      description="Convert WebP images into lightweight scalable SVG graphics client-side."
    />
  );
}

export function HeicToSvgPage({ hideHeader }: { hideHeader?: boolean }) {
  return (
    <GenericRasterToSvgPage hideHeader={hideHeader}
      toolSlug="heic-to-svg"
      sourceFormatName="HEIC"
      accept={[".heic", ".heif", "image/heic", "image/heif"]}
      description="Convert Apple HEIC and HEIF camera pictures into scalable SVG format locally on your device."
    />
  );
}

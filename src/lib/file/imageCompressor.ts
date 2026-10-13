import { getImageFormat, validateImageDimensions } from "./imageConverter";
import { sanitizeFilename } from "../security/sanitize";

export interface ImageCompressionOptions {
  /**
   * Compression mode:
   * - "lossy": smart rate-distortion reduction with user-controlled quality
   * - "lossless": preserves exact pixel values while recompressing structure
   */
  mode: "lossy" | "lossless";
  /**
   * Quality level between 0.1 and 1.0 (defaults to 0.80)
   */
  quality?: number;
  /**
   * Optional custom output format, defaults to input format
   */
  outputFormat?: "jpeg" | "webp" | "png";
  /**
   * Optional abort signal
   */
  signal?: AbortSignal;
}

export interface ImageCompressionResult {
  blob: Blob;
  outputFilename: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  savingsPercentage: number;
  width: number;
  height: number;
  format: string;
}

/**
 * Compress an image file entirely in the browser using HTML5 Canvas / OffscreenCanvas
 */
export async function compressImage(
  file: File,
  options: ImageCompressionOptions
): Promise<ImageCompressionResult> {
  const format = getImageFormat(file);
  if (!format) {
    throw new Error("Unsupported image format for compression.");
  }

  const { mode = "lossy", quality = 0.8, signal } = options;

  if (signal?.aborted) {
    throw new Error("Compression cancelled.");
  }

  // Load image into bitmap or image element
  let width: number;
  let height: number;
  let sourceElement: ImageBitmap | HTMLImageElement;
  let cleanupObjUrl: string | null = null;

  try {
    if (typeof createImageBitmap !== "undefined") {
      sourceElement = await createImageBitmap(file);
      width = sourceElement.width;
      height = sourceElement.height;
    } else {
      const objectUrl = URL.createObjectURL(file);
      cleanupObjUrl = objectUrl;
      sourceElement = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Could not decode image for compression."));
        img.src = objectUrl;
      });
      width = sourceElement.naturalWidth;
      height = sourceElement.naturalHeight;
    }

    validateImageDimensions({ width, height });

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not create canvas 2D rendering context.");
    }

    // Determine target format
    let targetMime: string;
    let targetFormatName: "jpeg" | "webp" | "png";

    if (options.outputFormat) {
      targetFormatName = options.outputFormat;
      targetMime =
        targetFormatName === "jpeg"
          ? "image/jpeg"
          : targetFormatName === "webp"
          ? "image/webp"
          : "image/png";
    } else if (format === "png") {
      // In lossy mode, WebP or high-efficiency recompression provides dramatic size reduction
      targetFormatName = "png";
      targetMime = "image/png";
    } else if (format === "webp") {
      targetFormatName = "webp";
      targetMime = "image/webp";
    } else {
      targetFormatName = "jpeg";
      targetMime = "image/jpeg";
    }

    // If JPEG output, fill neutral white background to prevent dark artifacts on transparent areas
    if (targetFormatName === "jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
    }

    ctx.drawImage(sourceElement, 0, 0, width, height);

    if (signal?.aborted) {
      throw new Error("Compression cancelled.");
    }

    // Determine output quality
    const targetQuality = mode === "lossless" ? 1.0 : Math.max(0.1, Math.min(1.0, quality));

    const compressedBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (!b) {
            reject(new Error("Failed to export compressed image."));
          } else {
            resolve(b);
          }
        },
        targetMime,
        targetMime === "image/png" ? undefined : targetQuality
      );
    });

    const originalSize = file.size;
    const compressedSize = compressedBlob.size;
    const savings = originalSize > 0 ? ((originalSize - compressedSize) / originalSize) * 100 : 0;

    const baseName = sanitizeFilename(file.name).replace(/\.[^/.]+$/, "");
    const ext = targetFormatName === "jpeg" ? "jpg" : targetFormatName;
    const outputFilename = `${baseName}-compressed.${ext}`;

    return {
      blob: compressedBlob,
      outputFilename,
      originalSizeBytes: originalSize,
      compressedSizeBytes: compressedSize,
      savingsPercentage: Math.round(savings * 10) / 10,
      width,
      height,
      format: targetFormatName,
    };
  } finally {
    if (cleanupObjUrl) {
      URL.revokeObjectURL(cleanupObjUrl);
    }
  }
}

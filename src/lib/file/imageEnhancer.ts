import { getImageFormat, validateImageDimensions } from "./imageConverter";
import { sanitizeFilename } from "../security/sanitize";

export interface ImageEnhancementOptions {
  /**
   * Enhancement operation mode:
   * - "enhance": adjusts contrast, saturation, sharpness, and brightness via 2D convolution & pixel passes
   * - "upscale": super-sample bicubic / sharp-scale 2x or 4x with high quality interpolation
   */
  mode: "enhance" | "upscale";
  /**
   * Scale factor for upscaling: 2 or 4
   */
  scaleFactor?: 2 | 4;
  /**
   * Brightness adjustment (-100 to 100, default 0)
   */
  brightness?: number;
  /**
   * Contrast adjustment (-100 to 100, default 15 for auto-enhance)
   */
  contrast?: number;
  /**
   * Saturation adjustment (-100 to 100, default 10 for auto-enhance)
   */
  saturation?: number;
  /**
   * Sharpen level: 0 to 100 (default 20 for auto-enhance)
   */
  sharpen?: number;
  /**
   * Output quality for lossy export (0.1 to 1.0, default 0.95)
   */
  quality?: number;
  /**
   * Optional custom abort signal
   */
  signal?: AbortSignal;
}

export interface ImageEnhancementResult {
  blob: Blob;
  outputFilename: string;
  originalWidth: number;
  originalHeight: number;
  width: number;
  height: number;
  fileSizeBytes: number;
}

/**
 * Apply a 3x3 convolution kernel (used for unsharp masking / sharpness enhancement)
 */
function applyConvolution(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  kernel: number[],
  weight: number
) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const copy = new Uint8ClampedArray(data);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let r = 0,
        g = 0,
        b = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pixelOffset = ((y + ky) * width + (x + kx)) * 4;
          const kVal = kernel[(ky + 1) * 3 + (kx + 1)];
          r += copy[pixelOffset] * kVal;
          g += copy[pixelOffset + 1] * kVal;
          b += copy[pixelOffset + 2] * kVal;
        }
      }

      const dstOffset = (y * width + x) * 4;
      data[dstOffset] = Math.min(255, Math.max(0, r / weight));
      data[dstOffset + 1] = Math.min(255, Math.max(0, g / weight));
      data[dstOffset + 2] = Math.min(255, Math.max(0, b / weight));
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Perform client-side image enhancement and upscaling
 */
export async function enhanceImage(
  file: File,
  options: ImageEnhancementOptions
): Promise<ImageEnhancementResult> {
  const format = getImageFormat(file);
  if (!format) {
    throw new Error("Unsupported image format for enhancement.");
  }

  const {
    mode = "enhance",
    scaleFactor = 2,
    brightness = 0,
    contrast = 15,
    saturation = 10,
    sharpen = 20,
    quality = 0.95,
    signal,
  } = options;

  if (signal?.aborted) {
    throw new Error("Enhancement cancelled.");
  }

  let origWidth: number;
  let origHeight: number;
  let sourceElement: ImageBitmap | HTMLImageElement;
  let cleanupObjUrl: string | null = null;

  try {
    if (typeof createImageBitmap !== "undefined") {
      sourceElement = await createImageBitmap(file);
      origWidth = sourceElement.width;
      origHeight = sourceElement.height;
    } else {
      const objectUrl = URL.createObjectURL(file);
      cleanupObjUrl = objectUrl;
      sourceElement = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Could not decode image for enhancement."));
        img.src = objectUrl;
      });
      origWidth = sourceElement.naturalWidth;
      origHeight = sourceElement.naturalHeight;
    }

    validateImageDimensions({ width: origWidth, height: origHeight });

    const targetWidth = mode === "upscale" ? origWidth * scaleFactor : origWidth;
    const targetHeight = mode === "upscale" ? origHeight * scaleFactor : origHeight;

    validateImageDimensions({ width: targetWidth, height: targetHeight });

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      throw new Error("Unable to create canvas 2D context.");
    }

    // High quality bicubic image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Setup CSS filter pipeline for color grading, brightness, contrast, and saturation
    const bFactor = 100 + brightness;
    const cFactor = 100 + contrast;
    const sFactor = 100 + saturation;

    if (mode === "enhance") {
      ctx.filter = `brightness(${bFactor}%) contrast(${cFactor}%) saturate(${sFactor}%)`;
    }

    ctx.drawImage(sourceElement, 0, 0, targetWidth, targetHeight);
    ctx.filter = "none"; // reset filter

    // Apply smart sharpening convolution kernel if requested
    if (sharpen > 0) {
      const strength = sharpen / 100;
      // Kernel matrix for edge sharpness enhancement
      const center = 1 + 4 * strength;
      const side = -strength;
      const kernel = [
        0, side, 0,
        side, center, side,
        0, side, 0,
      ];
      applyConvolution(ctx, targetWidth, targetHeight, kernel, 1);
    }

    if (signal?.aborted) {
      throw new Error("Enhancement cancelled.");
    }

    // Export as high quality PNG or JPEG based on original
    const targetMime = format === "png" ? "image/png" : "image/jpeg";
    const exportQuality = format === "png" ? undefined : quality;

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (!b) {
            reject(new Error("Failed to export enhanced image."));
          } else {
            resolve(b);
          }
        },
        targetMime,
        exportQuality
      );
    });

    const baseName = sanitizeFilename(file.name).replace(/\.[^/.]+$/, "");
    const ext = format === "png" ? "png" : "jpg";
    const suffix = mode === "upscale" ? `${scaleFactor}x` : "enhanced";
    const outputFilename = `${baseName}-${suffix}.${ext}`;

    return {
      blob,
      outputFilename,
      originalWidth: origWidth,
      originalHeight: origHeight,
      width: targetWidth,
      height: targetHeight,
      fileSizeBytes: blob.size,
    };
  } finally {
    if (cleanupObjUrl) {
      URL.revokeObjectURL(cleanupObjUrl);
    }
  }
}

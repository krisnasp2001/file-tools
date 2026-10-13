import { sanitizeFilename } from "../security/sanitize";
import {
  ImageConversionOptions,
  ImageConversionResult,
  ImageDimensions,
  ImageFormat,
} from "./imageTypes";

// Maximum allowable pixel budget (e.g. 80 megapixels, approx 9000x9000)
// Prevents mobile/browser OOM and tab crash on malicious or ultra-huge images
export const MAX_SAFE_PIXEL_COUNT = 80_000_000;
export const MAX_SAFE_DIMENSION = 12_000; // max width or height in px

/**
 * Determine format category: raster-to-raster, vector-to-raster, or raster-to-vector
 */
export function getImageFormat(file: File): ImageFormat | null {
  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  if (mime === "image/jpeg" || name.endsWith(".jpg") || name.endsWith(".jpeg")) return "jpeg";
  if (mime === "image/png" || name.endsWith(".png")) return "png";
  if (mime === "image/webp" || name.endsWith(".webp")) return "webp";
  if (mime === "image/svg+xml" || name.endsWith(".svg")) return "svg";
  if (mime === "image/heic" || name.endsWith(".heic")) return "heic";
  if (mime === "image/heif" || name.endsWith(".heif")) return "heif";

  return null;
}

/**
 * Check if the browser natively supports decoding HEIC images
 */
let nativeHeicSupport: boolean | null = null;
export async function checkNativeHeicSupport(): Promise<boolean> {
  if (nativeHeicSupport !== null) return nativeHeicSupport;
  if (typeof window === "undefined" || typeof createImageBitmap === "undefined") {
    return false;
  }

  // Modern Safari / macOS / iOS can decode HEIC natively
  // Test with a tiny 1x1 HEIC or feature test
  try {
    // Basic check for HEIC MIME type support in createImageBitmap
    const isSafari =
      /^((?!chrome|android).)*safari/i.test(navigator.userAgent) ||
      /iPad|iPhone|iPod/.test(navigator.userAgent);
    nativeHeicSupport = isSafari;
    return nativeHeicSupport;
  } catch {
    nativeHeicSupport = false;
    return false;
  }
}

/**
 * Generate clean and safe output filename with correct extension
 */
export function generateOutputFilename(
  inputFilename: string,
  targetFormat: "png" | "jpeg" | "webp" | "svg"
): string {
  const safeBase = sanitizeFilename(inputFilename).replace(/\.[^/.]+$/, "");
  const ext = targetFormat === "jpeg" ? "jpg" : targetFormat;
  return `${safeBase}.${ext}`;
}

/**
 * Extract SVG dimensions safely without DOM innerHTML or executing scripts.
 * Parses viewBox or width/height attributes using DOMParser XML mode.
 */
export async function parseSvgDimensions(file: File): Promise<ImageDimensions> {
  const text = await file.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "image/svg+xml");

  const parserError = doc.querySelector("parsererror");
  if (parserError) {
    throw new Error("Invalid or corrupted SVG file.");
  }

  const svgEl = doc.querySelector("svg");
  if (!svgEl) {
    throw new Error("Could not find SVG root element.");
  }

  let width = parseFloat(svgEl.getAttribute("width") || "");
  let height = parseFloat(svgEl.getAttribute("height") || "");

  if ((!width || isNaN(width) || !height || isNaN(height)) && svgEl.hasAttribute("viewBox")) {
    const viewBox = svgEl.getAttribute("viewBox")?.trim().split(/[\s,]+/);
    if (viewBox && viewBox.length === 4) {
      width = parseFloat(viewBox[2]);
      height = parseFloat(viewBox[3]);
    }
  }

  // Sensible default if SVG has neither explicit dimension nor viewBox
  if (!width || isNaN(width) || width <= 0) width = 800;
  if (!height || isNaN(height) || height <= 0) height = 600;

  return { width: Math.round(width), height: Math.round(height) };
}

/**
 * Safely rasterize SVG to an ImageBitmap or HTMLImageElement without DOM injection
 */
export async function rasterizeSvgToCanvas(
  file: File,
  dimensions?: ImageDimensions
): Promise<{ canvas: HTMLCanvasElement; width: number; height: number }> {
  const svgText = await file.text();

  // Strip script tags, on* event handlers, and external entity references for security
  const cleanSvgText = svgText
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/<!ENTITY[\s\S]*?>/gi, "");

  const blob = new Blob([cleanSvgText], { type: "image/svg+xml;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);

  try {
    const img = new Image();
    img.crossOrigin = "anonymous";

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not rasterize SVG file."));
      img.src = objectUrl;
    });

    const width = dimensions?.width || img.naturalWidth || 800;
    const height = dimensions?.height || img.naturalHeight || 600;

    validateImageDimensions({ width, height });

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not allocate 2D canvas context for SVG.");
    }

    ctx.drawImage(img, 0, 0, width, height);
    return { canvas, width, height };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Guard against unreasonable pixel counts and memory exhaustion
 */
export function validateImageDimensions(dimensions: ImageDimensions): void {
  const { width, height } = dimensions;
  if (width <= 0 || height <= 0) {
    throw new Error("Image appears to be corrupted or has zero dimensions.");
  }

  if (width > MAX_SAFE_DIMENSION || height > MAX_SAFE_DIMENSION) {
    throw new Error(
      `Image dimension (${width}×${height}) exceeds safe limit of ${MAX_SAFE_DIMENSION}px.`
    );
  }

  const pixelCount = width * height;
  if (pixelCount > MAX_SAFE_PIXEL_COUNT) {
    throw new Error(
      `Image is too large to process safely (${Math.round(pixelCount / 1_000_000)} Megapixels).`
    );
  }
}

/**
 * Retrieve dimensions and validate an image file
 */
export async function getImageDimensions(file: File): Promise<ImageDimensions> {
  const format = getImageFormat(file);
  if (!format) {
    throw new Error("Unsupported image format.");
  }

  if (format === "svg") {
    return parseSvgDimensions(file);
  }

  if (format === "heic" || format === "heif") {
    // For HEIC, decode to JPEG/PNG blob first via heic2any if native decode unavailable
    const decodedBlob = await decodeHeicBlob(file);
    return getBitmapDimensions(decodedBlob);
  }

  return getBitmapDimensions(file);
}

async function getBitmapDimensions(blob: Blob): Promise<ImageDimensions> {
  if (typeof createImageBitmap !== "undefined") {
    try {
      const bitmap = await createImageBitmap(blob);
      const dims = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      validateImageDimensions(dims);
      return dims;
    } catch {
      // Fallback to Image element if createImageBitmap fails
    }
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const dims = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(objectUrl);
      try {
        validateImageDimensions(dims);
        resolve(dims);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read image or image appears to be corrupted."));
    };
    img.src = objectUrl;
  });
}

/**
 * Lazy decode HEIC/HEIF blob to standard JPEG/PNG
 */
export async function decodeHeicBlob(file: File | Blob): Promise<Blob> {
  const isNative = await checkNativeHeicSupport();
  if (isNative) {
    return file;
  }

  try {
    // Dynamically lazy-load heic2any only on demand
    const heic2anyModule = await import("heic2any");
    const heic2any = heic2anyModule.default;

    const result = await heic2any({
      blob: file,
      toType: "image/png",
      quality: 0.95,
    });

    if (Array.isArray(result)) {
      if (result.length === 0) {
        throw new Error("HEIC image contains no readable frames.");
      }
      return result[0];
    }
    return result;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("ERR_USER") || msg.includes("format")) {
      throw new Error("This HEIC image is not supported by this browser.");
    }
    throw new Error(`Could not decode HEIC image: ${msg}`);
  }
}

/**
 * Core image converter engine
 * Converts raster, vector, and HEIC files locally in the browser.
 */
export async function convertImage(
  file: File,
  options: ImageConversionOptions
): Promise<ImageConversionResult> {
  const format = getImageFormat(file);
  if (!format) {
    throw new Error("Unsupported image format.");
  }

  const {
    outputFormat,
    quality = 0.92,
    backgroundColor = "#ffffff",
    signal,
  } = options;

  if (signal?.aborted) {
    throw new Error("Conversion was cancelled.");
  }

  let canvas: HTMLCanvasElement;
  let width: number;
  let height: number;

  if (format === "svg") {
    // Vector -> Raster conversion
    const rasterResult = await rasterizeSvgToCanvas(file);
    canvas = rasterResult.canvas;
    width = rasterResult.width;
    height = rasterResult.height;
  } else {
    // Raster -> Raster (including HEIC)
    let sourceBlob: Blob = file;
    if (format === "heic" || format === "heif") {
      sourceBlob = await decodeHeicBlob(file);
    }

    if (signal?.aborted) {
      throw new Error("Conversion was cancelled.");
    }

    // Decode to bitmap or Image
    let sourceElement: ImageBitmap | HTMLImageElement;
    let cleanupObjUrl: string | null = null;

    try {
      if (typeof createImageBitmap !== "undefined") {
        sourceElement = await createImageBitmap(sourceBlob);
        width = sourceElement.width;
        height = sourceElement.height;
      } else {
        const objectUrl = URL.createObjectURL(sourceBlob);
        cleanupObjUrl = objectUrl;
        sourceElement = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error("Could not read image."));
          img.src = objectUrl;
        });
        width = sourceElement.naturalWidth;
        height = sourceElement.naturalHeight;
      }

      validateImageDimensions({ width, height });

      canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Unable to create canvas context.");
      }

      // Handle transparency for JPEG output
      if (outputFormat === "jpeg") {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(sourceElement, 0, 0, width, height);
    } finally {
      if (cleanupObjUrl) {
        URL.revokeObjectURL(cleanupObjUrl);
      }
    }
  }

  if (signal?.aborted) {
    throw new Error("Conversion was cancelled.");
  }

  // Determine output MIME type
  const targetMime =
    outputFormat === "jpeg"
      ? "image/jpeg"
      : outputFormat === "webp"
      ? "image/webp"
      : "image/png";

  const targetQuality = outputFormat === "png" ? undefined : quality;

  // Convert canvas to Blob
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (!b) {
          reject(new Error("Failed to export image from canvas."));
        } else {
          resolve(b);
        }
      },
      targetMime,
      targetQuality
    );
  });

  const outputFilename = generateOutputFilename(file.name, outputFormat);

  return {
    blob,
    outputFormat,
    outputFilename,
    width,
    height,
    fileSizeBytes: blob.size,
  };
}

import { sanitizeFilename } from "../security/sanitize";
import {
  decodeHeicBlob,
  getImageFormat,
  validateImageDimensions,
} from "./imageConverter";

export interface RasterToSvgOptions {
  /**
   * Mode:
   * - "vectorize": color-quantized polygon path tracing (generates true vector paths)
   * - "embed": high-fidelity vector container with raster data URI embedded in XML
   */
  mode?: "vectorize" | "embed";
  /**
   * Number of color steps/clusters for vectorization (4 - 32, default 16)
   */
  colors?: number;
  /**
   * Path simplification threshold
   */
  threshold?: number;
  /**
   * Optional custom abort signal
   */
  signal?: AbortSignal;
}

export interface RasterToSvgResult {
  blob: Blob;
  outputFilename: string;
  width: number;
  height: number;
  fileSizeBytes: number;
  svgString: string;
}

/**
 * Perform client-side raster-to-SVG generation
 * Can generate either vectorized path SVG or clean standalone SVG container
 */
export async function convertRasterToSvg(
  file: File,
  options: RasterToSvgOptions = {}
): Promise<RasterToSvgResult> {
  const format = getImageFormat(file);
  if (!format) {
    throw new Error("Unsupported image format for SVG conversion.");
  }

  const { mode = "vectorize", colors = 16, signal } = options;

  if (signal?.aborted) {
    throw new Error("Conversion cancelled.");
  }

  let sourceBlob: Blob = file;
  if (format === "heic" || format === "heif") {
    sourceBlob = await decodeHeicBlob(file);
  }

  let width: number;
  let height: number;
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
        img.onerror = () => reject(new Error("Could not decode image for SVG conversion."));
        img.src = objectUrl;
      });
      width = sourceElement.naturalWidth;
      height = sourceElement.naturalHeight;
    }

    validateImageDimensions({ width, height });

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      throw new Error("Could not allocate canvas 2D context.");
    }

    ctx.drawImage(sourceElement, 0, 0, width, height);

    if (signal?.aborted) {
      throw new Error("Conversion cancelled.");
    }

    let svgContent = "";

    if (mode === "vectorize") {
      // True vector path tracing:
      // Sample pixels, quantize colors, and group consecutive pixels into vector rect/path runs
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;

      // Downsample scale for tracing if image is very large to keep SVG lightweight & responsive
      const maxDim = 800;
      const scale = width > maxDim || height > maxDim ? Math.min(maxDim / width, maxDim / height) : 1;
      const traceW = Math.round(width * scale);
      const traceH = Math.round(height * scale);

      let sampleCanvas = canvas;
      let sampleData = data;

      if (scale < 1) {
        sampleCanvas = document.createElement("canvas");
        sampleCanvas.width = traceW;
        sampleCanvas.height = traceH;
        const sCtx = sampleCanvas.getContext("2d", { willReadFrequently: true })!;
        sCtx.imageSmoothingEnabled = true;
        sCtx.drawImage(canvas, 0, 0, traceW, traceH);
        sampleData = sCtx.getImageData(0, 0, traceW, traceH).data;
      }

      // Quantize colors by grouping into color buckets
      const colorStep = Math.max(8, Math.floor(256 / colors));
      const pathsByColor = new Map<string, string[]>();

      for (let y = 0; y < traceH; y++) {
        let runStart = -1;
        let currentColor = "";

        for (let x = 0; x < traceW; x++) {
          const idx = (y * traceW + x) * 4;
          const a = sampleData[idx + 3];

          if (a < 16) {
            // Transparent pixel ends any active run
            if (runStart !== -1 && currentColor) {
              const runW = x - runStart;
              const pathSeg = `M${runStart},${y}h${runW}v1h-${runW}z`;
              if (!pathsByColor.has(currentColor)) {
                pathsByColor.set(currentColor, []);
              }
              pathsByColor.get(currentColor)!.push(pathSeg);
              runStart = -1;
            }
            continue;
          }

          // Quantize RGB
          const r = Math.round(sampleData[idx] / colorStep) * colorStep;
          const g = Math.round(sampleData[idx + 1] / colorStep) * colorStep;
          const b = Math.round(sampleData[idx + 2] / colorStep) * colorStep;
          const hex = `#${((1 << 24) + (Math.min(255, r) << 16) + (Math.min(255, g) << 8) + Math.min(255, b))
            .toString(16)
            .slice(1)}`;

          if (runStart === -1) {
            runStart = x;
            currentColor = hex;
          } else if (currentColor !== hex) {
            // Color changed, close current run
            const runW = x - runStart;
            const pathSeg = `M${runStart},${y}h${runW}v1h-${runW}z`;
            if (!pathsByColor.has(currentColor)) {
              pathsByColor.set(currentColor, []);
            }
            pathsByColor.get(currentColor)!.push(pathSeg);
            runStart = x;
            currentColor = hex;
          }
        }

        // Close run at end of row
        if (runStart !== -1 && currentColor) {
          const runW = traceW - runStart;
          const pathSeg = `M${runStart},${y}h${runW}v1h-${runW}z`;
          if (!pathsByColor.has(currentColor)) {
            pathsByColor.set(currentColor, []);
          }
          pathsByColor.get(currentColor)!.push(pathSeg);
        }
      }

      // Build grouped SVG path elements
      let pathElements = "";
      for (const [color, pathList] of pathsByColor.entries()) {
        pathElements += `<path fill="${color}" d="${pathList.join(" ")}" shape-rendering="crispEdges"/>\n`;
      }

      svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${traceW} ${traceH}" width="${width}" height="${height}">
${pathElements}
</svg>`;
    } else {
      // Clean embedded high-fidelity XML SVG container
      const dataUrl = canvas.toDataURL("image/png");
      svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <image width="${width}" height="${height}" href="${dataUrl}" preserveAspectRatio="xMidYMid meet"/>
</svg>`;
    }

    const svgBlob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const baseName = sanitizeFilename(file.name).replace(/\.[^/.]+$/, "");
    const outputFilename = `${baseName}.svg`;

    return {
      blob: svgBlob,
      outputFilename,
      width,
      height,
      fileSizeBytes: svgBlob.size,
      svgString: svgContent,
    };
  } finally {
    if (cleanupObjUrl) {
      URL.revokeObjectURL(cleanupObjUrl);
    }
  }
}

export type ImageFormat = "jpeg" | "jpg" | "png" | "webp" | "svg" | "heic" | "heif";

export type ImageConversionCategory = "raster-to-raster" | "vector-to-raster" | "raster-to-vector";

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ImageMetadata {
  name: string;
  size: number;
  type: string;
  format: ImageFormat;
  dimensions?: ImageDimensions;
  aspectRatio?: number;
}

export interface ImageConversionOptions {
  /**
   * Target format for output
   */
  outputFormat: "png" | "jpeg" | "webp";
  /**
   * Compression / Quality parameter (0.0 to 1.0) for JPEG and WebP
   * Default: 0.92
   */
  quality?: number;
  /**
   * Background color to fill transparent pixels when exporting to non-transparent formats (like JPEG).
   * Default: '#ffffff'
   */
  backgroundColor?: string;
  /**
   * Future architecture placeholder for lossless vs lossy compression mode
   */
  compressionMode?: "lossless" | "lossy" | "smart";
  /**
   * Future architecture placeholder for resizing / scaling
   */
  targetDimensions?: ImageDimensions;
  /**
   * Optional custom abort signal
   */
  signal?: AbortSignal;
}

export interface ImageConversionResult {
  blob: Blob;
  outputFormat: "png" | "jpeg" | "webp";
  outputFilename: string;
  width: number;
  height: number;
  fileSizeBytes: number;
}

/**
 * Future Vectorization architecture placeholders (Task 5 requirement #5 & #21)
 */
export interface VectorizeOptions {
  colorMode?: "color" | "grayscale" | "binary";
  pathPrecision?: number;
  threshold?: number;
}

/**
 * Future Enhancement architecture placeholders (Task 5 requirement #21)
 */
export interface ImageEnhancementOptions {
  mode: "resize" | "upscale_ai";
  scaleFactor?: 2 | 4;
}

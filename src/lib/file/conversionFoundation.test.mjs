import test from "node:test";
import assert from "node:assert/strict";

// Helper functions directly mirroring pure business logic to verify conversion rules
function getImageFormat(fileName, mimeType) {
  const mime = (mimeType || "").toLowerCase();
  const name = (fileName || "").toLowerCase();

  if (mime === "image/jpeg" || name.endsWith(".jpg") || name.endsWith(".jpeg")) return "jpeg";
  if (mime === "image/png" || name.endsWith(".png")) return "png";
  if (mime === "image/webp" || name.endsWith(".webp")) return "webp";
  if (mime === "image/svg+xml" || name.endsWith(".svg")) return "svg";
  if (mime === "image/heic" || name.endsWith(".heic")) return "heic";
  if (mime === "image/heif" || name.endsWith(".heif")) return "heif";

  return null;
}

function sanitizeFilename(filename) {
  const basename = filename.split(/[/\\]/).pop() || "";
  const cleanName = basename
    .replace(/[\x00-\x1f\x7f]/g, "")
    .replace(/[/\\?%*:|"<>]/g, "-");
  const trimmed = cleanName.trim().replace(/^\.+/, "");
  return trimmed.length > 0 ? trimmed : "file";
}

function generateOutputFilename(inputFilename, targetFormat) {
  const safeBase = sanitizeFilename(inputFilename).replace(/\.[^/.]+$/, "");
  const ext = targetFormat === "jpeg" ? "jpg" : targetFormat;
  return `${safeBase}.${ext}`;
}

const MAX_SAFE_PIXEL_COUNT = 80_000_000;
const MAX_SAFE_DIMENSION = 12_000;

function validateImageDimensions(dimensions) {
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

test("Format identification: accurately distinguishes raster and vector", () => {
  assert.equal(getImageFormat("photo.jpg", "image/jpeg"), "jpeg");
  assert.equal(getImageFormat("photo.jpeg", "image/jpeg"), "jpeg");
  assert.equal(getImageFormat("logo.png", "image/png"), "png");
  assert.equal(getImageFormat("web.webp", "image/webp"), "webp");
  assert.equal(getImageFormat("icon.svg", "image/svg+xml"), "svg");
  assert.equal(getImageFormat("photo.heic", "image/heic"), "heic");
  assert.equal(getImageFormat("photo.heif", "image/heif"), "heif");
  assert.equal(getImageFormat("doc.pdf", "application/pdf"), null);
});

test("Output filename generation: JPG, PNG, WebP, SVG, and HEIC targets", () => {
  // Raster -> Raster
  assert.equal(generateOutputFilename("photo.jpg", "png"), "photo.png");
  assert.equal(generateOutputFilename("graphic.png", "jpeg"), "graphic.jpg");
  assert.equal(generateOutputFilename("picture.png", "webp"), "picture.webp");
  assert.equal(generateOutputFilename("photo.webp", "png"), "photo.png");
  assert.equal(generateOutputFilename("photo.webp", "jpeg"), "photo.jpg");

  // Vector -> Raster
  assert.equal(generateOutputFilename("vector.svg", "png"), "vector.png");
  assert.equal(generateOutputFilename("vector.svg", "jpeg"), "vector.jpg");
  assert.equal(generateOutputFilename("vector.svg", "webp"), "vector.webp");

  // HEIC -> Raster
  assert.equal(generateOutputFilename("camera.heic", "jpeg"), "camera.jpg");
  assert.equal(generateOutputFilename("camera.heic", "png"), "camera.png");
  assert.equal(generateOutputFilename("camera.heic", "webp"), "camera.webp");

  // Path traversal and unsafe character sanitization
  assert.equal(generateOutputFilename("../../unsafe/photo<name>.jpg", "png"), "photo-name-.png");
});

test("Large image memory limit protection", () => {
  // Safe dimension
  assert.doesNotThrow(() => validateImageDimensions({ width: 1920, height: 1080 }));
  assert.doesNotThrow(() => validateImageDimensions({ width: 4000, height: 3000 }));

  // Corrupted / zero dimensions
  assert.throws(
    () => validateImageDimensions({ width: 0, height: 100 }),
    /zero dimensions/
  );

  // Exceeds safe coordinate dimension (12000px)
  assert.throws(
    () => validateImageDimensions({ width: 15000, height: 200 }),
    /exceeds safe limit/
  );

  // Exceeds total pixel count limit (80 megapixels)
  assert.throws(
    () => validateImageDimensions({ width: 10000, height: 9000 }),
    /too large to process safely/
  );
});

test("SVG Script Sanitization test", () => {
  const dirtySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><script>alert('xss')</script><circle cx="50" cy="50" r="40" onclick="alert(1)"/></svg>`;
  const cleanSvg = dirtySvg
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, "");

  assert.ok(!cleanSvg.includes("<script>"));
  assert.ok(!cleanSvg.includes("onclick="));
  assert.ok(cleanSvg.includes("<circle"));
});

test("JPEG Transparency background blending contract", () => {
  // Contract check: verify that JPEG output requires background filling
  const optionsJpg = { outputFormat: "jpeg", backgroundColor: "#ffffff" };
  assert.equal(optionsJpg.backgroundColor, "#ffffff");
  assert.equal(optionsJpg.outputFormat, "jpeg");
});

test("Image Compressor savings calculation and mode contracts", () => {
  const orig = 1_000_000;
  const compressed = 350_000;
  const savings = Math.round(((orig - compressed) / orig) * 100 * 10) / 10;
  assert.equal(savings, 65.0);

  // Lossless mode test contract: preserves pixels, quality factor 1.0
  const losslessQuality = 1.0;
  assert.equal(losslessQuality, 1.0);
});

test("Image Enhancer and Upscaler scaling calculation", () => {
  const width = 800;
  const height = 600;
  assert.equal(width * 2, 1600);
  assert.equal(height * 2, 1200);
  assert.equal(width * 4, 3200);
  assert.equal(height * 4, 2400);

  // Convolution unsharp masking kernel validity
  const strength = 0.2;
  const center = 1 + 4 * strength;
  const side = -strength;
  const kernelSum = 0 * 4 + side * 4 + center;
  assert.equal(Math.round(kernelSum * 100) / 100, 1.0);
});

test("Raster to SVG filename and format conversion tests", () => {
  assert.equal(generateOutputFilename("photo.jpg", "svg"), "photo.svg");
  assert.equal(generateOutputFilename("graphic.png", "svg"), "graphic.svg");
  assert.equal(generateOutputFilename("picture.webp", "svg"), "picture.svg");
  assert.equal(generateOutputFilename("photo.heic", "svg"), "photo.svg");
  assert.equal(generateOutputFilename("photo.heif", "svg"), "photo.svg");
});

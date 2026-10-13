import type { PdfPageCardData } from "@/components/pdf/PdfPageCard";

/**
 * Lazily loads pdfjs-dist (browser-only) and renders thumbnails for all pages
 * in the given PDF File.
 *
 * Returns page card data with thumbnailUrl populated from a canvas-rendered blob.
 * Heavy PDF.js code is loaded lazily so homepage & non-PDF pages are never affected.
 */
export async function renderPdfThumbnails(
  file: File,
  {
    thumbnailWidth = 200,
    signal,
  }: { thumbnailWidth?: number; signal?: AbortSignal } = {}
): Promise<PdfPageCardData[]> {
  // Dynamic import — keeps PDF.js off any non-PDF page bundle
  const pdfjsLib = await import("pdfjs-dist");

  // Configure worker — use the bundled worker via URL constructor (Next.js compatible)
  // We point directly at the CDN worker to avoid Next.js worker configuration complexity.
  // It is loaded only on PDF tool pages.
  // Configure worker — use local public copy with unpkg fallback
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  }

  const arrayBuffer = await file.arrayBuffer();
  if (signal?.aborted) return [];

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  signal?.addEventListener("abort", () => loadingTask.destroy());
  const pdfDocument = await loadingTask.promise;

  if (signal?.aborted) {
    loadingTask.destroy();
    return [];
  }

  const numPages = pdfDocument.numPages;
  const results: PdfPageCardData[] = [];

  for (let i = 1; i <= numPages; i++) {
    if (signal?.aborted) break;

    const page = await pdfDocument.getPage(i);
    const viewport = page.getViewport({ scale: 1 });

    // Scale so thumbnail width is controlled
    const scale = thumbnailWidth / viewport.width;
    const scaledViewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(scaledViewport.width);
    canvas.height = Math.round(scaledViewport.height);

    const ctx = canvas.getContext("2d");
    if (ctx) {
      await page.render({
        canvas,
        canvasContext: ctx,
        viewport: scaledViewport,
      }).promise;
    }

    const thumbnailUrl = canvas.toDataURL("image/jpeg", 0.75);
    page.cleanup();

    results.push({
      id: `${file.name}-page-${i}`,
      pageNumber: i,
      totalPages: numPages,
      sourceFileName: file.name,
      thumbnailUrl,
    });
  }

  await pdfDocument.cleanup();
  await loadingTask.destroy();
  return results;
}

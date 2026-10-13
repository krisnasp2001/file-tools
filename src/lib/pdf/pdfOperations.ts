import { PDFDocument } from "pdf-lib";

export interface JpgToPdfOptions {
  pageSizeId: string;
  orientation: "portrait" | "landscape";
  fitting: "fit-page" | "fill-page" | "original";
  marginMm: number;
}

// Map dimensions in points (1 mm = 2.83465 pt)
const MM_TO_PT = 2.83465;

const STANDARD_PAGE_SIZES: Record<string, [number, number]> = {
  a4: [595.28, 841.89], // pt
  letter: [612.0, 792.0],
  legal: [612.0, 1008.0],
};

/**
 * Converts an array of image files (JPG/PNG) into a single PDF Document and returns its Uint8Array.
 */
export async function convertImagesToPdf(
  files: File[],
  options: JpgToPdfOptions
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    let embeddedImage;
    const isPng = file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
    if (isPng) {
      embeddedImage = await pdfDoc.embedPng(bytes);
    } else {
      embeddedImage = await pdfDoc.embedJpg(bytes);
    }

    const imgWidth = embeddedImage.width;
    const imgHeight = embeddedImage.height;

    let targetWidth: number;
    let targetHeight: number;

    if (options.pageSizeId === "fit-to-image") {
      targetWidth = imgWidth;
      targetHeight = imgHeight;
    } else {
      const base = STANDARD_PAGE_SIZES[options.pageSizeId] || STANDARD_PAGE_SIZES.a4;
      if (options.orientation === "landscape") {
        targetWidth = Math.max(base[0], base[1]);
        targetHeight = Math.min(base[0], base[1]);
      } else {
        targetWidth = Math.min(base[0], base[1]);
        targetHeight = Math.max(base[0], base[1]);
      }
    }

    const page = pdfDoc.addPage([targetWidth, targetHeight]);
    const marginPt = options.pageSizeId === "fit-to-image" ? 0 : options.marginMm * MM_TO_PT;

    const printableWidth = Math.max(10, targetWidth - marginPt * 2);
    const printableHeight = Math.max(10, targetHeight - marginPt * 2);

    let drawWidth = printableWidth;
    let drawHeight = printableHeight;
    let drawX = marginPt;
    let drawY = marginPt;

    if (options.pageSizeId === "fit-to-image") {
      drawWidth = imgWidth;
      drawHeight = imgHeight;
      drawX = 0;
      drawY = 0;
    } else if (options.fitting === "fit-page") {
      const scale = Math.min(printableWidth / imgWidth, printableHeight / imgHeight);
      drawWidth = imgWidth * scale;
      drawHeight = imgHeight * scale;
      drawX = marginPt + (printableWidth - drawWidth) / 2;
      drawY = marginPt + (printableHeight - drawHeight) / 2;
    } else if (options.fitting === "fill-page") {
      const scale = Math.max(printableWidth / imgWidth, printableHeight / imgHeight);
      drawWidth = imgWidth * scale;
      drawHeight = imgHeight * scale;
      drawX = marginPt + (printableWidth - drawWidth) / 2;
      drawY = marginPt + (printableHeight - drawHeight) / 2;
    } else {
      // original
      drawWidth = Math.min(imgWidth, printableWidth);
      drawHeight = Math.min(imgHeight, printableHeight);
      drawX = marginPt + (printableWidth - drawWidth) / 2;
      drawY = marginPt + (printableHeight - drawHeight) / 2;
    }

    page.drawImage(embeddedImage, {
      x: drawX,
      y: drawY,
      width: drawWidth,
      height: drawHeight,
    });
  }

  return await pdfDoc.save();
}

/**
 * Triggers browser download for a Uint8Array or Blob as a file.
 */
export function downloadBlob(data: Uint8Array | Blob, filename: string, mimeType = "application/pdf") {
  let blob: Blob;
  if (data instanceof Blob) {
    blob = data;
  } else {
    // Ensure standard ArrayBuffer chunk
    const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    blob = new Blob([buffer as BlobPart], { type: mimeType });
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = filename;
  a.rel = "noopener noreferrer";

  document.body.appendChild(a);
  a.click();

  // Defer cleanup to ensure browser initiates file download
  setTimeout(() => {
    if (document.body.contains(a)) {
      document.body.removeChild(a);
    }
    URL.revokeObjectURL(url);
  }, 10000);
}


/**
 * Merges multiple PDF files in the specified order and returns the merged PDF bytes.
 */
export async function mergePdfFiles(files: File[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  return await mergedPdf.save();
}

/**
 * Extracts specific pages (1-indexed page numbers) from a PDF file.
 */
export async function extractPdfPages(
  file: File,
  pageNumbers: number[]
): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const srcPdf = await PDFDocument.load(arrayBuffer);
  const destPdf = await PDFDocument.create();

  // Convert 1-indexed to 0-indexed and filter valid indices
  const pageIndices = pageNumbers
    .map((p) => p - 1)
    .filter((idx) => idx >= 0 && idx < srcPdf.getPageCount());

  const copiedPages = await destPdf.copyPages(srcPdf, pageIndices);
  copiedPages.forEach((page) => destPdf.addPage(page));

  return await destPdf.save();
}

import type JSZipType from "jszip";

/**
 * Splits each page of a PDF into individual PDF files packaged into a zip file.
 */
export async function splitAllPdfPagesToZip(
  file: File,
  JSZipClass: typeof JSZipType
): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const srcPdf = await PDFDocument.load(arrayBuffer);
  const pageCount = srcPdf.getPageCount();
  const zip = new JSZipClass();

  const baseName = file.name.replace(/\.[^/.]+$/, "");

  for (let i = 0; i < pageCount; i++) {
    const singlePdf = await PDFDocument.create();
    const [copiedPage] = await singlePdf.copyPages(srcPdf, [i]);
    singlePdf.addPage(copiedPage);
    const pdfBytes = await singlePdf.save();
    zip.file(`${baseName}-page-${i + 1}.pdf`, pdfBytes);
  }

  return await zip.generateAsync({ type: "blob" });
}


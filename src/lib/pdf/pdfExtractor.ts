import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  PageBreak,
} from "docx";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { generateCsv } from "../document/converters/csv";
import Tesseract from "tesseract.js";

export interface ExtractedSpan {
  text: string;
  x: number;
  width: number;
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
}

export interface ExtractedRichLine {
  y: number;
  spans: ExtractedSpan[];
  text: string;
}

export interface ExtractedPdfImage {
  id: string;
  data: Uint8Array;
  width: number;
  height: number;
  displayPtWidth: number;
  displayPtHeight: number;
  x: number;
  y: number;
}

export interface ExtractedPdfPage {
  pageNumber: number;
  pageWidth?: number;
  pageHeight?: number;
  text: string;
  lines: string[];
  lineYCoords: number[]; // Y coordinate (PDF points) for each line — used for paragraph detection
  items: { x: number; width: number; str: string }[][];
  tables: string[][][]; // pages of detected tables
  richLines?: ExtractedRichLine[];
  images?: ExtractedPdfImage[];
}

export interface PdfTextExtractionResult {
  pages: ExtractedPdfPage[];
  fullText: string;
  isScannedOrImageOnly: boolean;
  totalWords: number;
}

/**
 * Configure worker safely for pdfjs-dist
 */
async function getPdfJs() {
  const pdfjsLib = await import("pdfjs-dist");
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc && typeof window !== "undefined") {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  }
  return pdfjsLib;
}

/**
 * 2D Affine Matrix multiplication for tracking PDF Current Transformation Matrix (CTM)
 */
function multiplyMatrix(m1: number[], m2: number[]): number[] {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

/**
 * Safely extracts raw image bytes from PDF.js objects and converts to PNG Uint8Array.
 */
async function extractImageBytes(
  page: unknown,
  imgName: string
): Promise<{ data: Uint8Array; width: number; height: number } | null> {
  try {
    const p = page as {
      objs?: { get: (id: string, cb: (obj: unknown) => void) => void };
      commonObjs?: { get: (id: string, cb: (obj: unknown) => void) => void };
    };

    interface RawPdfImageObj {
      width?: number;
      height?: number;
      bitmap?: ImageBitmap;
      data?: Uint8ClampedArray | Uint8Array;
    }

    const obj = await new Promise<RawPdfImageObj | null>((resolve) => {
      const timer = setTimeout(() => resolve(null), 3500);
      const cb = (res: unknown) => {
        clearTimeout(timer);
        resolve(res as RawPdfImageObj);
      };
      if (p.objs && typeof p.objs.get === "function") {
        p.objs.get(imgName, cb);
      } else if (p.commonObjs && typeof p.commonObjs.get === "function") {
        p.commonObjs.get(imgName, cb);
      } else {
        clearTimeout(timer);
        resolve(null);
      }
    });

    if (!obj || !obj.width || !obj.height) return null;

    if (typeof document !== "undefined") {
      const canvas = document.createElement("canvas");
      canvas.width = obj.width;
      canvas.height = obj.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      if (obj.bitmap && typeof ctx.drawImage === "function") {
        ctx.drawImage(obj.bitmap, 0, 0);
      } else if (obj.data) {
        const raw = obj.data as Uint8ClampedArray | Uint8Array;
        const imgData = ctx.createImageData(obj.width, obj.height);
        if (raw.length === obj.width * obj.height * 4) {
          imgData.data.set(raw);
        } else if (raw.length === obj.width * obj.height * 3) {
          let s = 0;
          let d = 0;
          for (let i = 0; i < obj.width * obj.height; i++) {
            imgData.data[d] = raw[s];
            imgData.data[d + 1] = raw[s + 1];
            imgData.data[d + 2] = raw[s + 2];
            imgData.data[d + 3] = 255;
            s += 3;
            d += 4;
          }
        } else if (raw.length === obj.width * obj.height) {
          let s = 0;
          let d = 0;
          for (let i = 0; i < obj.width * obj.height; i++) {
            const v = raw[s++];
            imgData.data[d++] = v;
            imgData.data[d++] = v;
            imgData.data[d++] = v;
            imgData.data[d++] = 255;
          }
        } else {
          imgData.data.set(raw.subarray(0, imgData.data.length));
        }
        ctx.putImageData(imgData, 0, 0);
      } else {
        return null;
      }

      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
      if (!blob) return null;
      const buf = await blob.arrayBuffer();
      return {
        data: new Uint8Array(buf),
        width: obj.width,
        height: obj.height,
      };
    }
  } catch (err) {
    console.warn("Could not extract image " + imgName, err);
  }
  return null;
}

/**
 * Extract structured text, styling, embedded images, and table data from a PDF file.
 */
export async function extractPdfContent(
  file: File,
  options: { useOcr?: boolean; onProgress?: (msg: string) => void } = {}
): Promise<PdfTextExtractionResult> {
  const pdfjsLib = await getPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  // pdfjs transfers (detaches) the ArrayBuffer to the worker — pass a copy to keep original intact
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
  const pdfDoc = await loadingTask.promise;

  const numPages = pdfDoc.numPages;
  const pages: ExtractedPdfPage[] = [];
  let totalLength = 0;

  for (let i = 1; i <= numPages; i++) {
    options.onProgress?.(`Processing page ${i} of ${numPages}...`);
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();
    const styles = (textContent.styles || {}) as Record<string, { fontFamily?: string }>;

    interface RawSpan {
      x: number;
      y: number;
      width: number;
      str: string;
      fontSize: number;
      isBold: boolean;
      isItalic: boolean;
    }
    const lineMap = new Map<number, RawSpan[]>();

    for (const item of textContent.items) {
      if ("str" in item && item.str.trim()) {
        const y = Math.round(item.transform[5]);
        const x = Math.round(item.transform[4]);
        const width = item.width || 0;
        const fontName = item.fontName || "";
        const styleInfo = styles[fontName];
        const fontFamily = styleInfo?.fontFamily || "";
        const isBold =
          /bold|black|heavy|700|800|900/i.test(fontName) ||
          /bold|black|heavy/i.test(fontFamily);
        const isItalic =
          /italic|oblique/i.test(fontName) ||
          /italic|oblique/i.test(fontFamily);
        const fontSize = Math.max(
          8,
          Math.round(Math.hypot(item.transform[0], item.transform[1]))
        );

        // Cluster Y coordinate within 3 points to eliminate baseline jitter
        let matchedY = y;
        for (const existingY of lineMap.keys()) {
          if (Math.abs(existingY - y) <= 3) {
            matchedY = existingY;
            break;
          }
        }

        if (!lineMap.has(matchedY)) {
          lineMap.set(matchedY, []);
        }
        lineMap.get(matchedY)!.push({
          x,
          y: matchedY,
          width,
          str: item.str,
          fontSize,
          isBold,
          isItalic,
        });
      }
    }

    // If useOcr is true and the page has very little text, try OCR
    if (options.useOcr && lineMap.size < 2 && typeof document !== "undefined") {
      options.onProgress?.(`Running OCR on page ${i}...`);
      try {
        const ocrViewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (context) {
          canvas.height = ocrViewport.height;
          canvas.width = ocrViewport.width;

          await page.render({
            canvasContext: context,
            viewport: ocrViewport,
          } as unknown as Parameters<typeof page.render>[0]).promise;

          const ocrResult = await Tesseract.recognize(canvas, "eng+ind", {
            logger: (m) => console.log(m),
          });

          interface OcrLineItem {
            text: string;
          }
          const ocrLines =
            ((ocrResult.data as unknown as { lines?: OcrLineItem[] }).lines) || [];
          ocrLines.forEach((line: OcrLineItem, idx: number) => {
            const ocrY = 1000 - idx * 20;
            lineMap.set(ocrY, [
              {
                x: 0,
                y: ocrY,
                width: 500,
                str: line.text,
                fontSize: 12,
                isBold: false,
                isItalic: false,
              },
            ]);
          });
        }
      } catch (e) {
        console.error("OCR failed on page " + i, e);
      }
    }

    // Sort descending by Y (PDF coordinates origin is bottom-left)
    const sortedY = Array.from(lineMap.keys()).sort((a, b) => b - a);
    const reconstructedLines: string[] = [];
    const reconstructedLineYCoords: number[] = [];
    const reconstructedItems: { x: number; width: number; str: string }[][] = [];
    const richLines: ExtractedRichLine[] = [];
    const tableCandidates: string[][] = [];

    for (const y of sortedY) {
      const itemsOnLine = lineMap.get(y)!.sort((a, b) => a.x - b.x);

      const mergedSpans: ExtractedSpan[] = [];
      const mergedLegacyItems: { x: number; width: number; str: string }[] = [];

      for (const item of itemsOnLine) {
        if (mergedSpans.length === 0) {
          mergedSpans.push({
            text: item.str,
            x: item.x,
            width: item.width,
            fontSize: item.fontSize,
            isBold: item.isBold,
            isItalic: item.isItalic,
          });
          mergedLegacyItems.push({ x: item.x, width: item.width, str: item.str });
        } else {
          const lastSpan = mergedSpans[mergedSpans.length - 1];
          const gap = item.x - (lastSpan.x + lastSpan.width);
          const sameStyle =
            lastSpan.isBold === item.isBold &&
            lastSpan.isItalic === item.isItalic &&
            Math.abs(lastSpan.fontSize - item.fontSize) <= 1;

          // If gap is <= 1.5, it is a single word or syllable (e.g. "reputabl" + "e")
          // If gap is between 1.5 and 18, it is a word boundary
          const needsSpace =
            gap > 1.5 &&
            !lastSpan.text.endsWith(" ") &&
            !item.str.startsWith(" ");

          if (gap <= 18 && sameStyle) {
            lastSpan.text += (needsSpace ? " " : "") + item.str;
            lastSpan.width = item.x + item.width - lastSpan.x;
          } else {
            mergedSpans.push({
              text: (needsSpace ? " " : "") + item.str,
              x: item.x,
              width: item.width,
              fontSize: item.fontSize,
              isBold: item.isBold,
              isItalic: item.isItalic,
            });
          }

          const lastLegacy = mergedLegacyItems[mergedLegacyItems.length - 1];
          if (gap <= 18) {
            lastLegacy.str += (needsSpace ? " " : "") + item.str;
            lastLegacy.width = item.x + item.width - lastLegacy.x;
          } else {
            mergedLegacyItems.push({ x: item.x, width: item.width, str: item.str });
          }
        }
      }

      const lineStr = mergedSpans.map((it) => it.text).join("").trim();
      if (lineStr) {
        reconstructedLines.push(lineStr);
        reconstructedLineYCoords.push(y);
        reconstructedItems.push(mergedLegacyItems);
        richLines.push({ y, spans: mergedSpans, text: lineStr });

        if (mergedLegacyItems.length >= 2) {
          tableCandidates.push(
            mergedLegacyItems.map((it) => it.str.trim()).filter(Boolean)
          );
        }
      }
    }

    // Extract embedded images from this page
    const pageImages: ExtractedPdfImage[] = [];
    try {
      if (typeof window !== "undefined" || typeof document !== "undefined") {
        const ops = await page.getOperatorList();
        const ctmStack: number[][] = [[1, 0, 0, 1, 0, 0]];
        let currentCtm = [1, 0, 0, 1, 0, 0];
        const paintOps = new Set([
          pdfjsLib.OPS.paintImageXObject,
          pdfjsLib.OPS.paintInlineImageXObject,
        ]);

        for (let opIdx = 0; opIdx < ops.fnArray.length; opIdx++) {
          const fn = ops.fnArray[opIdx];
          const args = ops.argsArray[opIdx];

          if (fn === pdfjsLib.OPS.save) {
            ctmStack.push([...currentCtm]);
          } else if (fn === pdfjsLib.OPS.restore) {
            if (ctmStack.length > 1) {
              currentCtm = ctmStack.pop()!;
            }
          } else if (fn === pdfjsLib.OPS.transform) {
            if (args && args.length === 6) {
              currentCtm = multiplyMatrix(currentCtm, args as number[]);
            }
          } else if (paintOps.has(fn) && args && args[0]) {
            const imgName = String(args[0]);
            const imgX = currentCtm[4];
            const imgY = currentCtm[5];
            const imgDispW = Math.hypot(currentCtm[0], currentCtm[1]);
            const imgDispH = Math.hypot(currentCtm[2], currentCtm[3]);

            // Filter out 1x1 color swatches, microscopic icons, or stretched tile masks
            if (imgDispW >= 30 && imgDispH >= 30) {
              const imgData = await extractImageBytes(page, imgName);
              // Ensure the underlying image has real resolution, not a 1x1 or tiny 16x16 gradient tile
              if (imgData && imgData.width >= 30 && imgData.height >= 30) {
                pageImages.push({
                  id: imgName,
                  data: imgData.data,
                  width: imgData.width,
                  height: imgData.height,
                  displayPtWidth: imgDispW,
                  displayPtHeight: imgDispH,
                  x: imgX,
                  y: imgY,
                });
              }
            }
          }
        }
      }
    } catch (imgErr) {
      console.warn("Could not extract images from page " + i, imgErr);
    }

    const pageText = reconstructedLines.join("\n");
    totalLength += pageText.trim().length;

    pages.push({
      pageNumber: i,
      pageWidth: viewport.width,
      pageHeight: viewport.height,
      text: pageText,
      lines: reconstructedLines,
      lineYCoords: reconstructedLineYCoords,
      items: reconstructedItems,
      richLines,
      images: pageImages,
      tables: tableCandidates.length > 1 ? [tableCandidates] : [],
    });

    page.cleanup();
  }

  await pdfDoc.cleanup();
  await loadingTask.destroy();

  const fullText = pages
    .map((p) => `--- Page ${p.pageNumber} ---\n${p.text}`)
    .join("\n\n");

  const totalWords = fullText.split(/\s+/).filter(Boolean).length;
  // If entire PDF has less than 15 characters and no extracted images, it's virtually empty/scanned
  const hasImages = pages.some((p) => (p.images?.length ?? 0) > 0);
  const isScannedOrImageOnly = totalLength < 15 && !hasImages;

  return {
    pages,
    fullText,
    isScannedOrImageOnly,
    totalWords,
  };
}

/**
 * Converts extracted PDF content into a structured, editable DOCX blob.
 * Preserves paragraphs, headings, fonts (bold/italic/size), embedded images, and tables.
 */
export async function convertPdfToDocx(
  extraction: PdfTextExtractionResult
): Promise<Blob> {
  const sectionsChildren: (Paragraph | Table)[] = [];

  for (let pageIdx = 0; pageIdx < extraction.pages.length; pageIdx++) {
    const page = extraction.pages[pageIdx];
    const pageWidth = page.pageWidth || 595; // default A4 width in pt
    const isFirstPage = pageIdx === 0;

    interface PageElement {
      y: number;
      element: Paragraph | Table;
    }
    const pageElements: PageElement[] = [];

    // --- 1. Process Embedded Images ---
    if (page.images && page.images.length > 0) {
      const maxDocWidth = 520;
      const maxDocHeight = 650;

      for (const img of page.images) {
        let targetW = Math.round(img.displayPtWidth || img.width);
        let targetH = Math.round(img.displayPtHeight || img.height);

        if (targetW > maxDocWidth) {
          targetH = Math.round((targetH * maxDocWidth) / targetW);
          targetW = maxDocWidth;
        }
        if (targetH > maxDocHeight) {
          targetW = Math.round((targetW * maxDocHeight) / targetH);
          targetH = maxDocHeight;
        }
        targetW = Math.max(30, targetW);
        targetH = Math.max(30, targetH);

        const imgPara = new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              type: "png",
              data: img.data,
              transformation: {
                width: targetW,
                height: targetH,
              },
            }),
          ],
          spacing: { before: 180, after: 180 },
        });

        // Top Y of image in PDF coordinate space is y + displayPtHeight
        pageElements.push({
          y: img.y + img.displayPtHeight,
          element: imgPara,
        });
      }
    }

    // --- 2. Process Tables and Rich Paragraphs ---
    const richLines = page.richLines || [];
    const lineYCoords =
      page.lineYCoords ?? richLines.map((l) => l.y);

    // Calculate vertical gaps between consecutive lines
    const gaps: number[] = [];
    for (let i = 1; i < lineYCoords.length; i++) {
      gaps.push(Math.abs(lineYCoords[i - 1] - lineYCoords[i]));
    }
    const sortedGaps = [...gaps].sort((a, b) => a - b);
    const medianGap = sortedGaps[Math.floor(sortedGaps.length / 2)] || 14;
    const paragraphThreshold = medianGap * 1.6;

    // Strict Table Detection:
    // A line is ONLY a table candidate if it has >= 2 columns separated by wide gaps (>= 30pt)
    const isStrictTableLine = (rl: ExtractedRichLine): boolean => {
      if (rl.spans.length < 2) return false;
      for (let sIdx = 1; sIdx < rl.spans.length; sIdx++) {
        const prev = rl.spans[sIdx - 1];
        const curr = rl.spans[sIdx];
        const gap = curr.x - (prev.x + prev.width);
        if (gap >= 30) return true;
      }
      return false;
    };

    const isTableLine: boolean[] = richLines.map(isStrictTableLine);
    const inTableGroup: number[] = new Array(richLines.length).fill(-1);
    let currentGroupId = 0;
    let tableLineStreak = 0;

    for (let idx = 0; idx < richLines.length; idx++) {
      if (isTableLine[idx]) {
        tableLineStreak++;
      } else {
        // Require at least 3 consecutive lines with wide gaps to form a table
        if (tableLineStreak >= 3) {
          for (let k = idx - tableLineStreak; k < idx; k++) {
            inTableGroup[k] = currentGroupId;
          }
          currentGroupId++;
        }
        tableLineStreak = 0;
      }
    }
    if (tableLineStreak >= 3) {
      for (let k = richLines.length - tableLineStreak; k < richLines.length; k++) {
        inTableGroup[k] = currentGroupId;
      }
      currentGroupId++;
    }

    // Group lines into either Tables or Paragraphs
    let lineIdx = 0;
    while (lineIdx < richLines.length) {
      const gId = inTableGroup[lineIdx];

      if (gId !== -1) {
        // Collect all lines belonging to this table
        const tableLines: ExtractedRichLine[] = [];
        const startY = richLines[lineIdx].y;
        while (lineIdx < richLines.length && inTableGroup[lineIdx] === gId) {
          tableLines.push(richLines[lineIdx]);
          lineIdx++;
        }

        // Render Table
        const tableRows = tableLines.map((rowLine, rIdx) => {
          return new TableRow({
            children: rowLine.spans.map((span) => {
              return new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: span.text.trim(),
                        bold: span.isBold || rIdx === 0,
                        italics: span.isItalic,
                        size: Math.max(16, Math.min(48, span.fontSize * 2)),
                      }),
                    ],
                    spacing: { before: 80, after: 80 },
                  }),
                ],
                shading: rIdx === 0 ? { fill: "F3F4F6" } : undefined,
              });
            }),
          });
        });

        const docxTable = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows,
        });

        pageElements.push({ y: startY, element: docxTable });
      } else {
        // Collect lines into a paragraph
        const paraLines: ExtractedRichLine[] = [richLines[lineIdx]];
        const startY = richLines[lineIdx].y;
        lineIdx++;

        while (
          lineIdx < richLines.length &&
          inTableGroup[lineIdx] === -1 &&
          (lineIdx - 1 < gaps.length && gaps[lineIdx - 1] <= paragraphThreshold)
        ) {
          paraLines.push(richLines[lineIdx]);
          lineIdx++;
        }

        // Merge spans for this paragraph
        const allSpans: ExtractedSpan[] = [];
        for (let pLineIdx = 0; pLineIdx < paraLines.length; pLineIdx++) {
          const lSpans = paraLines[pLineIdx].spans;
          if (pLineIdx > 0 && allSpans.length > 0 && lSpans.length > 0) {
            const last = allSpans[allSpans.length - 1];
            if (!last.text.endsWith(" ") && !lSpans[0].text.startsWith(" ")) {
              last.text += " ";
            }
          }
          allSpans.push(...lSpans);
        }

        const paraText = allSpans.map((s) => s.text).join("").trim();
        if (paraText) {
          const wordCount = paraText.split(/\s+/).length;
          const maxFontSize = Math.max(...allSpans.map((s) => s.fontSize));
          const hasBold = allSpans.some((s) => s.isBold);
          const isHeading =
            (maxFontSize >= 15 || (maxFontSize >= 13 && hasBold)) &&
            wordCount <= 14;

          // Detect center alignment
          const firstLine = paraLines[0];
          const totalLineWidth = firstLine.spans.reduce((acc, s) => acc + s.width, 0);
          const lineCenter = (firstLine.spans[0]?.x || 0) + totalLineWidth / 2;
          const isCenterAligned =
            totalLineWidth < pageWidth * 0.75 &&
            Math.abs(pageWidth / 2 - lineCenter) < 40;

          const textRuns: TextRun[] = allSpans.map((span) => {
            return new TextRun({
              text: span.text,
              bold: span.isBold || isHeading,
              italics: span.isItalic,
              size: Math.max(16, Math.min(72, (isHeading ? maxFontSize : span.fontSize) * 2)),
            });
          });

          const docxPara = new Paragraph({
            children: textRuns,
            alignment: isCenterAligned
              ? AlignmentType.CENTER
              : AlignmentType.LEFT,
            spacing: {
              before: isHeading ? 240 : 0,
              after: isHeading ? 120 : 180,
              line: 276,
              lineRule: "auto",
            },
          });

          pageElements.push({ y: startY, element: docxPara });
        }
      }
    }

    // Sort page elements descending by Y (PDF reading order: top of page to bottom)
    pageElements.sort((a, b) => b.y - a.y);

    if (pageElements.length > 0) {
      if (!isFirstPage) {
        sectionsChildren.push(
          new Paragraph({
            children: [new PageBreak()],
          })
        );
      }
      pageElements.forEach((item) => {
        sectionsChildren.push(item.element);
      });
    } else {
      // Empty page fallback
      if (!isFirstPage) {
        sectionsChildren.push(
          new Paragraph({
            children: [new PageBreak()],
          })
        );
      }
      sectionsChildren.push(new Paragraph({ text: "" }));
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children:
          sectionsChildren.length > 0
            ? sectionsChildren
            : [new Paragraph({ text: "" })],
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Converts detected PDF tables or lines into CSV string.
 */
export function convertPdfToCsv(extraction: PdfTextExtractionResult): string {
  const allRows: string[][] = [];

  for (const page of extraction.pages) {
    if (page.tables.length > 0) {
      for (const table of page.tables) {
        allRows.push([`# Page ${page.pageNumber}`]);
        allRows.push(...table);
        allRows.push([]); // blank separator
      }
    } else {
      // Fallback: line split by commas or whitespace
      allRows.push([`# Page ${page.pageNumber}`]);
      for (const line of page.lines) {
        if (line.includes("\t")) {
          allRows.push(line.split("\t"));
        } else if (line.includes(",")) {
          allRows.push(line.split(","));
        } else {
          allRows.push([line]);
        }
      }
      allRows.push([]);
    }
  }

  return generateCsv(allRows);
}

/**
 * Converts detected PDF tables into XLSX workbook blob.
 */
export function convertPdfToXlsx(extraction: PdfTextExtractionResult): Blob {
  const wb = XLSX.utils.book_new();

  let hasData = false;
  extraction.pages.forEach((page) => {
    let sheetData: string[][] = [];
    if (page.tables.length > 0) {
      sheetData = page.tables[0];
    } else {
      sheetData = page.lines.map(line => [line]);
    }

    if (sheetData.length > 0) {
      hasData = true;
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(wb, ws, `Page_${page.pageNumber}`);
    }
  });

  if (!hasData) {
    const ws = XLSX.utils.aoa_to_sheet([["No structured tabular data detected in PDF."]]);
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  }

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

/**
 * Converts PDF into PPTX slide deck where each page represents a slide with structured text blocks.
 */
export async function convertPdfToPptx(extraction: PdfTextExtractionResult): Promise<Blob> {
  const zip = new JSZip();

  // Basic openxml presentation skeleton
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  ${extraction.pages.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("\n  ")}
</Types>`);

  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`);

  const presRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${extraction.pages.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`).join("\n  ")}
</Relationships>`;
  zip.file("ppt/_rels/presentation.xml.rels", presRels);

  const presXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldIdLst>
    ${extraction.pages.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 1}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>`).join("\n    ")}
  </p:sldIdLst>
  <p:sldSz cx="9144000" cy="6858000"/>
</p:presentation>`;
  zip.file("ppt/presentation.xml", presXml);

  // Generate slide XMLs
  extraction.pages.forEach((page, i) => {
    const textLines = page.lines.slice(0, 15); // first 15 lines per slide
    const slideContent = textLines
      .map(
        line => `<a:p><a:r><a:rPr lang="en-US" sz="1600"/><a:t>${line.replace(/[<>&'"]/g, " ")}</a:t></a:r></a:p>`
      )
      .join("\n");

    const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr/>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="457200" y="274320"/><a:ext cx="8229600" cy="914400"/></a:xfrm></p:spPr>
        <p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="2800" b="1"/><a:t>Slide ${page.pageNumber}</a:t></a:r></a:p></p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="3" name="Content"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph idx="1"/></p:nvPr></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="457200" y="1371600"/><a:ext cx="8229600" cy="4572000"/></a:xfrm></p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          ${slideContent || '<a:p><a:r><a:t>(Scanned or image content)</a:t></a:r></a:p>'}
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`;

    zip.file(`ppt/slides/slide${i + 1}.xml`, slideXml);
  });

  const blob = await zip.generateAsync({ type: "blob" });
  return blob;
}

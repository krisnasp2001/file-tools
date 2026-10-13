import { Document, Packer, Paragraph, TextRun } from "docx";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { generateCsv } from "../document/converters/csv";
import Tesseract from "tesseract.js";

export interface ExtractedPdfPage {
  pageNumber: number;
  text: string;
  lines: string[];
  lineYCoords: number[]; // Y coordinate (PDF points) for each line — used for paragraph detection
  items: { x: number; width: number; str: string }[][];
  tables: string[][][]; // pages of detected tables
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
 * Extract structured text and rudimentary table data from a PDF file.
 */
export async function extractPdfContent(file: File, options: { useOcr?: boolean, onProgress?: (msg: string) => void } = {}): Promise<PdfTextExtractionResult> {
  const pdfjsLib = await getPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  // pdfjs transfers (detaches) the ArrayBuffer to the worker — pass a copy to keep original intact
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
  const pdfDoc = await loadingTask.promise;

  const numPages = pdfDoc.numPages;
  const pages: ExtractedPdfPage[] = [];
  let totalLength = 0;

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    
    // Group text items by roughly their Y coordinate to reconstruct lines
    const lineMap = new Map<number, { x: number; width: number; str: string }[]>();
    
      for (const item of textContent.items) {
        if ("str" in item && item.str.trim()) {
          const y = Math.round(item.transform[5]);
          const x = Math.round(item.transform[4]);
          const width = item.width || 0;
          if (!lineMap.has(y)) {
            lineMap.set(y, []);
          }
          lineMap.get(y)!.push({ x, width, str: item.str });
        }
      }

      // If useOcr is true and the page has very little text, try OCR
      if (options.useOcr && lineMap.size < 2) {
        options.onProgress?.(`Running OCR on page ${i}...`);
        try {
          const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (context) {
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({ canvasContext: context, viewport } as unknown as Parameters<typeof page.render>[0]).promise;
            
            // Perform OCR
            const ocrResult = await Tesseract.recognize(
              canvas,
              'eng+ind',
              { logger: m => console.log(m) }
            );
            
            // Reconstruct lines from OCR
            interface OcrLineItem {
              text: string;
            }
            const lines = ((ocrResult.data as unknown as { lines?: OcrLineItem[] }).lines) || [];
            lines.forEach((line: OcrLineItem, idx: number) => {
               lineMap.set(1000 - idx * 20, [{ x: 0, width: 500, str: line.text }]);
            });
          }
        } catch (e) {
          console.error("OCR failed on page " + i, e);
        }
      }

    // Sort descending by Y (PDF coordinates origin is bottom-left)
    const sortedY = Array.from(lineMap.keys()).sort((a, b) => b - a);
    const reconstructedLines: string[] = [];
    const reconstructedLineYCoords: number[] = []; // parallel to reconstructedLines
    const reconstructedItems: { x: number; width: number; str: string }[][] = [];
    const tableCandidates: string[][] = [];

    for (const y of sortedY) {
      const itemsOnLine = lineMap.get(y)!.sort((a, b) => a.x - b.x);
      
      // Merge adjacent items (gap <= 8 points)
      const mergedItems: typeof itemsOnLine = [];
      for (const item of itemsOnLine) {
        if (mergedItems.length === 0) {
          mergedItems.push({ ...item });
        } else {
          const last = mergedItems[mergedItems.length - 1];
          const gap = item.x - (last.x + last.width);
          if (gap <= 8) {
            // Usually words in a sentence. Add a space if gap is > 2, otherwise just concatenate (e.g. bold-to-regular transition)
            last.str += (gap > 2 ? " " : "") + item.str;
            last.width = (item.x + item.width) - last.x;
          } else {
            mergedItems.push({ ...item });
          }
        }
      }

      const lineStr = mergedItems.map(it => it.str).join(" ").trim();
      if (lineStr) {
        reconstructedLines.push(lineStr);
        reconstructedLineYCoords.push(y); // capture Y in sync with the line
        reconstructedItems.push(mergedItems);

        // If line has multiple spaced components, treat as table candidate
        if (mergedItems.length >= 2) {
          tableCandidates.push(mergedItems.map(it => it.str.trim()).filter(Boolean));
        }
      }
    }

    const pageText = reconstructedLines.join("\n");
    totalLength += pageText.trim().length;

    pages.push({
      pageNumber: i,
      text: pageText,
      lines: reconstructedLines,
      lineYCoords: reconstructedLineYCoords,
      items: reconstructedItems,
      tables: tableCandidates.length > 1 ? [tableCandidates] : [],
    });

    page.cleanup();
  }

  await pdfDoc.cleanup();
  await loadingTask.destroy();

  const fullText = pages
    .map(p => `--- Page ${p.pageNumber} ---\n${p.text}`)
    .join("\n\n");

  const totalWords = fullText.split(/\s+/).filter(Boolean).length;
  // If entire PDF has less than 15 characters, it's virtually guaranteed to be scanned or image-only
  const isScannedOrImageOnly = totalLength < 15;

  return {
    pages,
    fullText,
    isScannedOrImageOnly,
    totalWords,
  };
}

/**
 * Groups an array of lines and their Y-coordinates into paragraph blocks.
 * Lines that are close together (normal line spacing) are merged into one paragraph.
 * A larger gap indicates a paragraph break.
 */
function groupLinesIntoParagraphs(
  lines: string[],
  yCoords: number[]
): string[] {
  if (lines.length === 0) return [];
  if (lines.length === 1) return [lines[0]];

  // Calculate all vertical gaps between consecutive lines
  const gaps: number[] = [];
  for (let i = 1; i < yCoords.length; i++) {
    gaps.push(Math.abs(yCoords[i - 1] - yCoords[i]));
  }

  // Use median gap as baseline "normal" line spacing
  const sorted = [...gaps].sort((a, b) => a - b);
  const medianGap = sorted[Math.floor(sorted.length / 2)] || 14;

  // A gap more than 1.6x median = paragraph break
  const paragraphThreshold = medianGap * 1.6;

  const paragraphs: string[] = [];
  let currentLines: string[] = [lines[0]];

  for (let i = 1; i < lines.length; i++) {
    const gap = gaps[i - 1];
    if (gap > paragraphThreshold) {
      // Flush current paragraph
      const merged = currentLines.join(" ").replace(/\s+/g, " ").trim();
      if (merged) paragraphs.push(merged);
      currentLines = [lines[i]];
    } else {
      // Same paragraph — join with space
      currentLines.push(lines[i]);
    }
  }

  // Flush final paragraph
  const last = currentLines.join(" ").replace(/\s+/g, " ").trim();
  if (last) paragraphs.push(last);

  return paragraphs;
}

/**
 * Converts extracted PDF content into a structured editable DOCX blob.
 * Properly groups lines into paragraphs using vertical gap detection.
 */
export async function convertPdfToDocx(extraction: PdfTextExtractionResult): Promise<Blob> {
  const sectionsChildren: Paragraph[] = [];

  for (let pageIdx = 0; pageIdx < extraction.pages.length; pageIdx++) {
    const page = extraction.pages[pageIdx];

    // Add a page-separator paragraph between pages (not a visible "Page X" header)
    if (pageIdx > 0) {
      sectionsChildren.push(
        new Paragraph({
          children: [new TextRun({ text: "", break: 1 })],
          spacing: { before: 0, after: 0 },
        })
      );
    }

    // Group raw lines into logical paragraphs using Y-gap analysis
    const yCoords = page.lineYCoords ?? page.lines.map((_, i) => -i * 14);
    const paragraphs = groupLinesIntoParagraphs(page.lines, yCoords);

    for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
      const text = paragraphs[pIdx];
      if (!text) continue;

      // Heuristic: first paragraph on a page that is short (≤10 words) → treat as heading
      const wordCount = text.trim().split(/\s+/).length;
      const isLikelyHeading = pIdx === 0 && wordCount <= 10;

      sectionsChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text,
              bold: isLikelyHeading,
              size: isLikelyHeading ? 28 : 24, // heading=14pt, body=12pt
            }),
          ],
          spacing: {
            before: isLikelyHeading ? 240 : 0,
            after: isLikelyHeading ? 120 : 200,
            line: 276, // ~1.15 line spacing
            lineRule: "auto",
          },
        })
      );
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

/**
 * pdfParser.ts
 *
 * Parses a PDF file using pdfjs-dist entirely client-side and converts
 * the extracted content into typed EditorBlock structures suitable for
 * rendering inside a WYSIWYG rich-text editor.
 *
 * Design goals:
 *  - NO overlay / coordinate-patching approach.
 *  - Produce logical paragraph/heading blocks based on font-size heuristics.
 *  - Preserve per-page separators so large documents stay navigable.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BlockType =
  | "heading1"
  | "heading2"
  | "heading3"
  | "paragraph"
  | "table"
  | "page-break";

export interface TextBlock {
  id: string;
  type: "heading1" | "heading2" | "heading3" | "paragraph";
  content: string;
  /** Estimated font size in points, used for heading heuristics */
  fontSize?: number;
  bold?: boolean;
}

export interface TableBlock {
  id: string;
  type: "table";
  rows: string[][];
}

export interface PageBreakBlock {
  id: string;
  type: "page-break";
  pageNumber: number;
}

export type EditorBlock = TextBlock | TableBlock | PageBreakBlock;

export interface PdfParseResult {
  blocks: EditorBlock[];
  pageCount: number;
  isScanned: boolean;
  wordCount: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

let _blockCounter = 0;
function nextId(prefix: string): string {
  return `${prefix}-${++_blockCounter}-${Math.random().toString(36).slice(2, 6)}`;
}

async function getPdfJs() {
  const pdfjsLib = await import("pdfjs-dist");
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc && typeof window !== "undefined") {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  }
  return pdfjsLib;
}

/**
 * Given a set of items on the same Y-row, detect if they look like table
 * cells: multiple distinct X-buckets with roughly equal spacing.
 */
function looksLikeTableRow(items: { x: number; str: string }[]): boolean {
  if (items.length < 2) return false;
  const xs = items.map((i) => i.x).sort((a, b) => a - b);
  const gaps = xs.slice(1).map((x, i) => x - xs[i]);
  const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  // Consistent column spacing (all gaps within 50% of average)
  return gaps.every((g) => g > 30 && Math.abs(g - avgGap) < avgGap * 0.6);
}

/**
 * Determine block type based on font size relative to the page's median size.
 */
function classifyByFontSize(
  fontSize: number,
  medianSize: number
): TextBlock["type"] {
  const ratio = fontSize / medianSize;
  if (ratio >= 1.8) return "heading1";
  if (ratio >= 1.4) return "heading2";
  if (ratio >= 1.15) return "heading3";
  return "paragraph";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a PDF `File` and return structured `EditorBlock[]` ready for the editor.
 * All processing happens in the browser via pdfjs-dist.
 */
export async function parsePdfToBlocks(file: File): Promise<PdfParseResult> {
  _blockCounter = 0; // reset counter per parse

  const pdfjsLib = await getPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
  const pdfDoc = await loadingTask.promise;

  const pageCount = pdfDoc.numPages;
  const blocks: EditorBlock[] = [];
  let totalChars = 0;

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();

    // ------------------------------------------------------------------
    // Group items by Y coordinate (≈row) with a tolerance of ±3px
    // PDF coordinate origin is bottom-left, so higher Y = higher on page.
    // ------------------------------------------------------------------
    type RawItem = { x: number; str: string; fontSize: number; fontName: string };
    const rowMap = new Map<number, RawItem[]>();

    for (const item of textContent.items) {
      if (!("str" in item) || !item.str.trim()) continue;

      const y = item.transform[5];
      const x = item.transform[4];
      const fontSize: number =
        // pdfjs exposes height or font size in transform[0] / transform[3]
        Math.abs(item.transform[0]) || Math.abs(item.transform[3]) || 12;
      const fontName = (item as { fontName?: string }).fontName ?? "";

      // Bucket y to nearest 3-px slot to merge sub-pixel offsets
      const yBucket = Math.round(y / 3) * 3;
      if (!rowMap.has(yBucket)) rowMap.set(yBucket, []);
      rowMap.get(yBucket)!.push({ x, str: item.str, fontSize, fontName });
    }

    // Sort rows top-to-bottom (descending Y in PDF space)
    const sortedYs = Array.from(rowMap.keys()).sort((a, b) => b - a);

    // Compute median font size for heading classification
    const allSizes = sortedYs.flatMap((y) =>
      rowMap.get(y)!.map((i) => i.fontSize)
    );
    const sortedSizes = [...allSizes].sort((a, b) => a - b);
    const medianSize =
      sortedSizes.length > 0
        ? sortedSizes[Math.floor(sortedSizes.length / 2)]
        : 12;

    // ------------------------------------------------------------------
    // Detect table regions: consecutive rows that all look like table rows
    // ------------------------------------------------------------------
    const rowIsTable: boolean[] = sortedYs.map((y) =>
      looksLikeTableRow(rowMap.get(y)!)
    );

    let i = 0;
    while (i < sortedYs.length) {
      const y = sortedYs[i];
      const items = rowMap.get(y)!.sort((a, b) => a.x - b.x);

      if (rowIsTable[i]) {
        // Collect all consecutive table rows
        const tableRows: string[][] = [];
        while (i < sortedYs.length && rowIsTable[i]) {
          const rowItems = rowMap.get(sortedYs[i])!.sort((a, b) => a.x - b.x);
          tableRows.push(rowItems.map((it) => it.str.trim()));
          i++;
        }
        blocks.push({ id: nextId("tbl"), type: "table", rows: tableRows });
        continue;
      }

      // Text row — assemble line string
      const lineStr = items.map((it) => it.str).join(" ").trim();
      if (!lineStr) {
        i++;
        continue;
      }

      totalChars += lineStr.length;

      // Use the largest font size on this row for classification
      const rowFontSize = Math.max(...items.map((it) => it.fontSize));
      const isBold = items.some(
        (it) =>
          it.fontName.toLowerCase().includes("bold") ||
          it.fontName.toLowerCase().includes("heavy")
      );
      const blockType = classifyByFontSize(rowFontSize, medianSize);

      blocks.push({
        id: nextId("txt"),
        type: blockType,
        content: lineStr,
        fontSize: rowFontSize,
        bold: isBold || blockType !== "paragraph",
      });

      i++;
    }

    page.cleanup();

    // Add a page-break marker between pages (not after the last page)
    if (pageNum < pageCount) {
      blocks.push({ id: nextId("pb"), type: "page-break", pageNumber: pageNum });
    }
  }

  await pdfDoc.cleanup();
  await loadingTask.destroy();

  const isScanned = totalChars < 15;
  const fullText = blocks
    .filter((b): b is TextBlock => b.type !== "table" && b.type !== "page-break")
    .map((b) => b.content)
    .join(" ");
  const wordCount = fullText.split(/\s+/).filter(Boolean).length;

  return { blocks, pageCount, isScanned, wordCount };
}

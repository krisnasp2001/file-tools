/**
 * pdfExporter.ts
 *
 * Converts the WYSIWYG editor's DOM content back into a downloadable PDF
 * using `pdf-lib` (already a project dependency).
 *
 * Approach:
 *  - Serialize the editor HTML into plain structured text blocks.
 *  - Use pdf-lib to create a fresh PDF document and lay text out with
 *    proper word-wrapping and page breaks — no overlay / coordinate patching.
 *
 * Note: For the full "pixel-perfect HTML→PDF" path, html2pdf.js is a better
 * choice but adds ~300 kB. We use pdf-lib here to stay dependency-free while
 * still producing clean, reflowable output. The exported PDF will contain all
 * edited text with basic heading/paragraph distinction.
 */

import { PDFDocument, PDFFont, StandardFonts, rgb, PDFPage } from "pdf-lib";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExportBlock {
  type: "heading1" | "heading2" | "heading3" | "paragraph" | "table" | "page-break";
  /** Plain text content (headings / paragraphs) */
  content?: string;
  /** For table blocks */
  rows?: string[][];
}

// ---------------------------------------------------------------------------
// Constants / layout
// ---------------------------------------------------------------------------

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN = 60;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const FONT_SIZES: Record<string, number> = {
  heading1: 22,
  heading2: 18,
  heading3: 14,
  paragraph: 11,
  table: 10,
};

const LINE_GAP: Record<string, number> = {
  heading1: 14,
  heading2: 10,
  heading3: 8,
  paragraph: 5,
  table: 4,
};

const SPACE_BEFORE: Record<string, number> = {
  heading1: 24,
  heading2: 18,
  heading3: 12,
  paragraph: 6,
  table: 8,
};

// ---------------------------------------------------------------------------
// Character sanitizer — WinAnsi / Windows-1252 safe
// ---------------------------------------------------------------------------

/**
 * pdf-lib's built-in StandardFonts (Helvetica, etc.) use WinAnsi (cp1252)
 * encoding, which only covers characters up to U+00FF plus a few extras.
 * Any character outside that range will throw "WinAnsi cannot encode 'X'".
 *
 * This function transliterates common Unicode characters to their closest
 * WinAnsi/ASCII equivalents and strips anything it cannot map.
 */
function sanitizeForWinAnsi(text: string): string {
  return (
    text
      // ── Typographic punctuation ───────────────────────────────────
      .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'") // smart single quotes / primes
      .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"') // smart double quotes
      .replace(/\u2013/g, "-")          // en-dash
      .replace(/\u2014/g, "--")         // em-dash
      .replace(/\u2026/g, "...")        // ellipsis
      .replace(/\u00A0/g, " ")         // non-breaking space
      .replace(/\u2022/g, "*")         // bullet (we convert ul/li to "• item")
      .replace(/\u2023/g, ">")         // triangular bullet
      .replace(/\u2043/g, "-")         // hyphen bullet
      .replace(/\u2212/g, "-")         // minus sign
      .replace(/\u00B7/g, ".")         // middle dot
      .replace(/\u2027/g, ".")         // hyphenation point

      // ── Mathematical / special symbols ────────────────────────────
      .replace(/\u00D7/g, "x")         // multiplication sign
      .replace(/\u00F7/g, "/")         // division sign
      .replace(/\u2260/g, "!=")        // not equal
      .replace(/\u2264/g, "<=")        // less-than or equal
      .replace(/\u2265/g, ">=")        // greater-than or equal
      .replace(/\u221E/g, "inf")       // infinity
      .replace(/\u2248/g, "~=")        // approximately equal
      .replace(/\u2192/g, "->")        // rightward arrow
      .replace(/\u2190/g, "<-")        // leftward arrow
      .replace(/\u2194/g, "<->")       // left-right arrow
      .replace(/\u21D2/g, "=>")        // rightward double arrow
      .replace(/\u00B1/g, "+/-")       // plus-minus
      .replace(/\u221A/g, "sqrt")      // square root
      .replace(/\u2211/g, "sum")       // summation
      .replace(/\u222B/g, "int")       // integral
      .replace(/\u03C0/g, "pi")        // π (pi — very common)
      .replace(/\u03BC/g, "u")         // μ (mu / micro)
      .replace(/\u03A3/g, "Sigma")     // Σ
      .replace(/\u03B1/g, "a")         // α (alpha)
      .replace(/\u03B2/g, "b")         // β (beta)
      .replace(/\u03B3/g, "g")         // γ (gamma)
      .replace(/\u03B4/g, "d")         // δ (delta)
      .replace(/\u03B5/g, "e")         // ε (epsilon)
      .replace(/\u03B6/g, "z")         // ζ (zeta)
      .replace(/\u03B7/g, "e")         // η (eta)
      .replace(/\u03B8/g, "th")        // θ (theta)
      .replace(/\u03B9/g, "i")         // ι (iota)
      .replace(/\u03BA/g, "k")         // κ (kappa)
      .replace(/\u03BB/g, "l")         // λ (lambda)
      .replace(/\u03BD/g, "n")         // ν (nu)
      .replace(/\u03BE/g, "x")         // ξ (xi)
      .replace(/\u03BF/g, "o")         // ο (omicron)
      .replace(/\u03C1/g, "r")         // ρ (rho)
      .replace(/\u03C3/g, "s")         // σ (sigma)
      .replace(/\u03C4/g, "t")         // τ (tau)
      .replace(/\u03C5/g, "u")         // υ (upsilon)
      .replace(/\u03C6/g, "f")         // φ (phi)
      .replace(/\u03C7/g, "ch")        // χ (chi)
      .replace(/\u03C8/g, "ps")        // ψ (psi)
      .replace(/\u03C9/g, "o")         // ω (omega)
      // Uppercase Greek
      .replace(/\u0391/g, "A").replace(/\u0392/g, "B").replace(/\u0393/g, "G")
      .replace(/\u0394/g, "D").replace(/\u0395/g, "E").replace(/\u0396/g, "Z")
      .replace(/\u0397/g, "E").replace(/\u0398/g, "Th").replace(/\u0399/g, "I")
      .replace(/\u039A/g, "K").replace(/\u039B/g, "L").replace(/\u039C/g, "M")
      .replace(/\u039D/g, "N").replace(/\u039E/g, "X").replace(/\u039F/g, "O")
      .replace(/\u03A0/g, "P").replace(/\u03A1/g, "R").replace(/\u03A3/g, "S")
      .replace(/\u03A4/g, "T").replace(/\u03A5/g, "U").replace(/\u03A6/g, "Ph")
      .replace(/\u03A7/g, "Ch").replace(/\u03A8/g, "Ps").replace(/\u03A9/g, "O")

      // ── Accented / extended Latin (common in Indonesian academic refs) ─
      // Most of 0x00C0–0x00FF are already WinAnsi, but a few outside range:
      .replace(/[\u0100-\u017E]/g, (c) => {
        // Decompose accented letters to base ASCII
        const base = c.normalize("NFD").replace(/[\u0300-\u036F]/g, "");
        return base || "?";
      })

      // ── Quotation / bracket variants ──────────────────────────────
      .replace(/[\u2039\u203A]/g, "'")  // single angle quotes
      .replace(/[\u00AB\u00BB]/g, '"')  // double angle quotes (already WinAnsi but just in case)

      // ── Zero-width / invisible characters ─────────────────────────
      .replace(/[\u200B-\u200F\u2028\u2029\uFEFF]/g, "")

      // ── Final pass: strip anything still outside 0x00–0xFF ────────
      // (WinAnsi covers 0x20-0xFF with some gaps in 0x81,0x8D,0x8F,0x90,0x9D)
      .replace(/[^\x00-\xFF]/g, "?")
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Word-wrap text to fit within `maxWidth` at the given font size.
 * Returns an array of line strings.
 */
function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const words = sanitizeForWinAnsi(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    try {
      const width = font.widthOfTextAtSize(candidate, fontSize);
      if (width <= maxWidth) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    } catch {
      // If a word still can't be measured (shouldn't happen after sanitize),
      // push current and skip the problematic word
      if (current) lines.push(current);
      current = "";
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

// ---------------------------------------------------------------------------
// Core exporter
// ---------------------------------------------------------------------------

/**
 * Build a PDF from structured `ExportBlock[]` and return the raw bytes.
 *
 * @param blocks  - Ordered content blocks from the editor.
 * @param fileName - Original file name used as document metadata.
 */
export async function exportBlocksToPdf(
  blocks: ExportBlock[],
  fileName = "edited-document"
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(fileName.replace(/\.pdf$/i, ""));
  pdfDoc.setCreator("File Tools PDF Editor");

  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page: PDFPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN; // current Y cursor (top-down)

  /**
   * Ensure we have enough vertical space; if not, add a new page.
   */
  function ensureSpace(needed: number) {
    if (y - needed < MARGIN) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  }

  /**
   * Draw a single text line on the current page.
   */
  function drawLine(
    text: string,
    font: PDFFont,
    fontSize: number,
    color = rgb(0.08, 0.08, 0.08)
  ) {
    const safeText = sanitizeForWinAnsi(text);
    if (!safeText.trim()) {
      y -= fontSize + LINE_GAP[font === boldFont ? "heading1" : "paragraph"];
      return;
    }
    page.drawText(safeText, {
      x: MARGIN,
      y,
      size: fontSize,
      font,
      color,
      maxWidth: CONTENT_WIDTH,
    });
    y -= fontSize + LINE_GAP[font === boldFont ? "heading1" : "paragraph"];
  }

  for (const block of blocks) {
    if (block.type === "page-break") {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
      continue;
    }

    if (block.type === "table") {
      const rows = block.rows ?? [];
      if (rows.length === 0) continue;

      const colCount = Math.max(...rows.map((r) => r.length));
      const colWidth = CONTENT_WIDTH / colCount;
      const fontSize = FONT_SIZES.table;

      y -= SPACE_BEFORE.table;

      for (const row of rows) {
        ensureSpace(fontSize + LINE_GAP.table + 6);

        for (let c = 0; c < colCount; c++) {
          const cellText = sanitizeForWinAnsi(row[c] ?? "").slice(0, 60);
          if (!cellText) continue;
          const x = MARGIN + c * colWidth;
          page.drawText(cellText, {
            x,
            y,
            size: fontSize,
            font: regularFont,
            color: rgb(0.1, 0.1, 0.1),
            maxWidth: colWidth - 4,
          });
        }

        // Row divider
        page.drawLine({
          start: { x: MARGIN, y: y - 2 },
          end: { x: PAGE_WIDTH - MARGIN, y: y - 2 },
          thickness: 0.3,
          color: rgb(0.8, 0.8, 0.8),
        });

        y -= fontSize + LINE_GAP.table + 6;
      }

      continue;
    }

    // Text blocks (heading1 / heading2 / heading3 / paragraph)
    const content = (block.content ?? "").trim();
    if (!content) continue;

    const fontSize = FONT_SIZES[block.type] ?? FONT_SIZES.paragraph;
    const spaceBefore = SPACE_BEFORE[block.type] ?? SPACE_BEFORE.paragraph;
    const isHeading = block.type !== "paragraph";
    const font = isHeading ? boldFont : regularFont;

    y -= spaceBefore;
    ensureSpace(fontSize * 2 + spaceBefore);

    const lines = wrapText(content, font, fontSize, CONTENT_WIDTH);
    const lineHeight = fontSize + (LINE_GAP[block.type] ?? LINE_GAP.paragraph);

    for (const line of lines) {
      ensureSpace(lineHeight);
      drawLine(line, font, fontSize);
    }
  }

  return pdfDoc.save();
}

// ---------------------------------------------------------------------------
// DOM → ExportBlock conversion
// ---------------------------------------------------------------------------

/** Tags that map to semantic heading/paragraph types */
const BLOCK_TAG_MAP: Record<string, ExportBlock["type"]> = {
  h1: "heading1",
  h2: "heading2",
  h3: "heading3",
  h4: "heading3",
  h5: "heading3",
  h6: "heading3",
  p: "paragraph",
  li: "paragraph",
  pre: "paragraph",
  blockquote: "paragraph",
};

/**
 * Recursively walk an element, collecting ExportBlock[].
 *
 * Why recursive? When users type in a `contenteditable` div,
 * Chrome inserts `<div>` wrappers, Firefox inserts `<br>` elements,
 * and formatting commands nest spans inside block elements.
 * A shallow walk misses all user-typed content.
 */
function walkNode(node: Element, blocks: ExportBlock[]): void {
  const tag = node.tagName.toLowerCase();

  // ── Page-break marker ──────────────────────────────────────────────
  if (tag === "hr" || node.classList.contains("pdf-page-break")) {
    blocks.push({ type: "page-break" });
    return;
  }

  // ── Table ──────────────────────────────────────────────────────────
  if (tag === "table") {
    const rows: string[][] = [];
    for (const tr of Array.from(node.querySelectorAll("tr"))) {
      const cells = Array.from(tr.querySelectorAll("td, th")).map(
        (td) => (td as HTMLElement).innerText?.trim() ?? ""
      );
      if (cells.some((c) => c.length > 0)) rows.push(cells);
    }
    if (rows.length > 0) blocks.push({ type: "table", rows });
    return;
  }

  // ── Known block-level semantic tag → extract text directly ─────────
  if (BLOCK_TAG_MAP[tag]) {
    const text = (node as HTMLElement).innerText?.trim() ?? "";
    if (text) {
      blocks.push({ type: BLOCK_TAG_MAP[tag]!, content: text });
    }
    return;
  }

  // ── <div> (browser-inserted by contenteditable) → recurse or treat
  //    as a paragraph if it is a leaf div with direct text content ────
  if (tag === "div") {
    const containerTags = new Set(["div", "table", "hr", "ul", "ol", ...Object.keys(BLOCK_TAG_MAP)]);
    const hasBlockChild = Array.from(node.children).some((c) =>
      containerTags.has(c.tagName.toLowerCase())
    );

    if (hasBlockChild) {
      // Container div — recurse into its children
      for (const child of Array.from(node.children)) {
        walkNode(child, blocks);
      }
    } else {
      // Leaf div (Chrome's line wrapper for contenteditable) → paragraph
      const text = (node as HTMLElement).innerText?.trim() ?? "";
      if (text) {
        blocks.push({ type: "paragraph", content: text });
      }
    }
    return;
  }

  // ── List containers ────────────────────────────────────────────────
  if (tag === "ul" || tag === "ol") {
    for (const li of Array.from(node.querySelectorAll("li"))) {
      const text = (li as HTMLElement).innerText?.trim() ?? "";
      if (text) blocks.push({ type: "paragraph", content: `\u2022 ${text}` });
    }
    return;
  }

  // ── Any other element: recurse into its children ───────────────────
  for (const child of Array.from(node.children)) {
    walkNode(child, blocks);
  }
}

/**
 * Walk the editor's contenteditable DOM and produce ExportBlock[].
 * Handles browser-specific contenteditable output (Chrome <div> per line,
 * Firefox <br>, nested spans from execCommand formatting, etc.).
 */
export function domToExportBlocks(editorElement: HTMLElement): ExportBlock[] {
  const blocks: ExportBlock[] = [];
  for (const child of Array.from(editorElement.children)) {
    walkNode(child, blocks);
  }
  return blocks;
}

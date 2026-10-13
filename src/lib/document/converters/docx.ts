import { Document, Packer, Paragraph, TextRun } from "docx";
import mammoth from "mammoth";
import { sanitizeHtml } from "../security";

/**
 * Generate a DOCX blob from plain text.
 */
export async function txtToDocx(text: string): Promise<Blob> {
  const lines = text.split(/\r?\n/);
  const paragraphs = lines.map(
    line =>
      new Paragraph({
        children: [new TextRun(line)],
      })
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs.length > 0 ? paragraphs : [new Paragraph({ children: [] })],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return blob;
}

/**
 * Extract plain text from a DOCX ArrayBuffer using mammoth.
 */
export async function docxToTxt(arrayBuffer: ArrayBuffer): Promise<string> {
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.trim();
}

/**
 * Convert DOCX ArrayBuffer to clean, sanitized HTML.
 */
export async function docxToHtml(arrayBuffer: ArrayBuffer): Promise<string> {
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return sanitizeHtml(result.value);
}

"use client";

import * as React from "react";
import { GenericDocumentConvertPage } from "./GenericDocumentConvertPage";
import { txtToDocx, docxToTxt, docxToHtml } from "@/lib/document/converters/docx";
import { txtToRtf, rtfToTxt, txtToHtml } from "@/lib/document/converters/rtf";
import { parseOdt } from "@/lib/document/converters/odt";
import { parseEpub } from "@/lib/ebook/epub";
import { pptxToTxt } from "@/lib/document/converters/pptx";
import { csvToJson, jsonToCsv } from "@/lib/document/converters/csv";
import * as XLSX from "xlsx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// 1. TXT to DOCX
export function TxtToDocxPage() {
  return (
    <GenericDocumentConvertPage
      toolSlug="txt-to-docx"
      sourceFormatName="TXT"
      targetFormatName="DOCX"
      accept={[".txt", "text/plain"]}
      description="Convert plain text into an editable Microsoft Word (.docx) document while preserving paragraph breaks and Unicode formatting."
      onConvert={async (file) => {
        const text = await file.text();
        const blob = await txtToDocx(text);
        return {
          data: blob,
          outputFileName: file.name.replace(/\.[^/.]+$/, "") + ".docx",
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          previewText: text.slice(0, 1000) + (text.length > 1000 ? "\n..." : ""),
        };
      }}
    />
  );
}

// 2. TXT to PDF
export function TxtToPdfPage() {
  return (
    <GenericDocumentConvertPage
      toolSlug="txt-to-pdf"
      sourceFormatName="TXT"
      targetFormatName="PDF"
      accept={[".txt", "text/plain"]}
      description="Convert plain text directly into a clean, formatted PDF document with standard margins and pagination."
      onConvert={async (file) => {
        const text = await file.text();
        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontSize = 11;
        const lineHeight = 16;
        const margin = 50;
        const pageWidth = 595.28; // A4
        const pageHeight = 841.89;
        const maxLineWidth = pageWidth - margin * 2;

        const lines = text.split(/\r?\n/);
        let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        let y = pageHeight - margin;

        for (const rawLine of lines) {
          // Simple word wrap
          const words = rawLine.split(" ");
          let currentLine = "";
          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const textWidth = font.widthOfTextAtSize(testLine, fontSize);
            if (textWidth > maxLineWidth && currentLine) {
              if (y < margin + lineHeight) {
                currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
                y = pageHeight - margin;
              }
              currentPage.drawText(currentLine, { x: margin, y, size: fontSize, font, color: rgb(0.15, 0.15, 0.15) });
              y -= lineHeight;
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          }

          if (y < margin + lineHeight) {
            currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
            y = pageHeight - margin;
          }
          currentPage.drawText(currentLine, { x: margin, y, size: fontSize, font, color: rgb(0.15, 0.15, 0.15) });
          y -= lineHeight;
        }

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
        return {
          data: blob,
          outputFileName: file.name.replace(/\.[^/.]+$/, "") + ".pdf",
          mimeType: "application/pdf",
          previewText: text.slice(0, 1000) + (text.length > 1000 ? "\n..." : ""),
        };
      }}
    />
  );
}

// 3. TXT to HTML
export function TxtToHtmlPage() {
  return (
    <GenericDocumentConvertPage
      toolSlug="txt-to-html"
      sourceFormatName="TXT"
      targetFormatName="HTML"
      accept={[".txt", "text/plain"]}
      description="Convert plain text files into sanitized, styled HTML web pages with preserved paragraph breaks."
      onConvert={async (file) => {
        const text = await file.text();
        const html = txtToHtml(text, file.name.replace(/\.[^/.]+$/, ""));
        return {
          data: html,
          outputFileName: file.name.replace(/\.[^/.]+$/, "") + ".html",
          mimeType: "text/html",
          previewHtml: html,
        };
      }}
    />
  );
}

// 4. TXT to RTF
export function TxtToRtfPage() {
  return (
    <GenericDocumentConvertPage
      toolSlug="txt-to-rtf"
      sourceFormatName="TXT"
      targetFormatName="RTF"
      accept={[".txt", "text/plain"]}
      description="Transform plain text into Rich Text Format (.rtf) preserving Unicode characters and line breaks."
      onConvert={async (file) => {
        const text = await file.text();
        const rtf = txtToRtf(text);
        return {
          data: rtf,
          outputFileName: file.name.replace(/\.[^/.]+$/, "") + ".rtf",
          mimeType: "application/rtf",
          previewText: text.slice(0, 1000),
        };
      }}
    />
  );
}

// 5. RTF to TXT
export function RtfToTxtPage() {
  return (
    <GenericDocumentConvertPage
      toolSlug="rtf-to-txt"
      sourceFormatName="RTF"
      targetFormatName="TXT"
      accept={[".rtf", "application/rtf", "text/rtf"]}
      description="Strip control tags and extract clean, readable plain text from Rich Text Format (.rtf) documents."
      onConvert={async (file) => {
        const rtf = await file.text();
        const text = rtfToTxt(rtf);
        return {
          data: text,
          outputFileName: file.name.replace(/\.[^/.]+$/, "") + ".txt",
          mimeType: "text/plain",
          previewText: text,
        };
      }}
    />
  );
}

// 6. DOCX to TXT
export function DocxToTxtPage() {
  return (
    <GenericDocumentConvertPage
      toolSlug="docx-to-txt"
      sourceFormatName="DOCX"
      targetFormatName="TXT"
      accept={[".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]}
      description="Extract all plain text, headings, and paragraphs from Microsoft Word (.docx) files locally in your browser."
      onConvert={async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const text = await docxToTxt(arrayBuffer);
        return {
          data: text,
          outputFileName: file.name.replace(/\.[^/.]+$/, "") + ".txt",
          mimeType: "text/plain",
          previewText: text,
        };
      }}
    />
  );
}

// 7. DOCX to HTML
export function DocxToHtmlPage() {
  return (
    <GenericDocumentConvertPage
      toolSlug="docx-to-html"
      sourceFormatName="DOCX"
      targetFormatName="HTML"
      accept={[".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]}
      description="Convert Microsoft Word (.docx) documents into clean, sanitized HTML with headings, lists, and tables preserved."
      onConvert={async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const html = await docxToHtml(arrayBuffer);
        return {
          data: html,
          outputFileName: file.name.replace(/\.[^/.]+$/, "") + ".html",
          mimeType: "text/html",
          previewHtml: html,
        };
      }}
    />
  );
}

// 8. ODT to TXT
export function OdtToTxtPage() {
  return (
    <GenericDocumentConvertPage
      toolSlug="odt-to-txt"
      sourceFormatName="ODT"
      targetFormatName="TXT"
      accept={[".odt", "application/vnd.oasis.opendocument.text"]}
      description="Extract clean text from OpenDocument Text (.odt) documents without server uploads."
      onConvert={async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const { text } = await parseOdt(arrayBuffer);
        return {
          data: text,
          outputFileName: file.name.replace(/\.[^/.]+$/, "") + ".txt",
          mimeType: "text/plain",
          previewText: text,
        };
      }}
    />
  );
}

// 9. ODT to HTML
export function OdtToHtmlPage() {
  return (
    <GenericDocumentConvertPage
      toolSlug="odt-to-html"
      sourceFormatName="ODT"
      targetFormatName="HTML"
      accept={[".odt", "application/vnd.oasis.opendocument.text"]}
      description="Convert OpenDocument Text (.odt) to sanitized HTML with headings and paragraphs intact."
      onConvert={async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const { html, text } = await parseOdt(arrayBuffer);
        return {
          data: html,
          outputFileName: file.name.replace(/\.[^/.]+$/, "") + ".html",
          mimeType: "text/html",
          previewHtml: html || text,
        };
      }}
    />
  );
}

// 10. CSV to XLSX
export function CsvToXlsxPage() {
  return (
    <GenericDocumentConvertPage
      toolSlug="csv-to-xlsx"
      sourceFormatName="CSV"
      targetFormatName="XLSX"
      accept={[".csv", "text/csv"]}
      description="Convert comma-separated CSV spreadsheets into native Microsoft Excel (.xlsx) workbooks locally."
      onConvert={async (file) => {
        const text = await file.text();
        const wb = XLSX.read(text, { type: "string" });
        const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const blob = new Blob([wbout], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        return {
          data: blob,
          outputFileName: file.name.replace(/\.[^/.]+$/, "") + ".xlsx",
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          previewText: text.slice(0, 1000),
        };
      }}
    />
  );
}

// 11. XLSX to CSV
export function XlsxToCsvPage() {
  return (
    <GenericDocumentConvertPage
      toolSlug="xlsx-to-csv"
      sourceFormatName="XLSX"
      targetFormatName="CSV"
      accept={[".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]}
      description="Convert Microsoft Excel (.xlsx) spreadsheets into standard RFC 4180 CSV files."
      onConvert={async (file) => {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array" });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const csv = XLSX.utils.sheet_to_csv(ws);
        return {
          data: csv,
          outputFileName: file.name.replace(/\.[^/.]+$/, "") + ".csv",
          mimeType: "text/csv",
          previewText: csv.slice(0, 1500),
        };
      }}
    />
  );
}

// 12. CSV to JSON
export function CsvToJsonPage() {
  return (
    <GenericDocumentConvertPage
      toolSlug="csv-to-json"
      sourceFormatName="CSV"
      targetFormatName="JSON"
      accept={[".csv", "text/csv"]}
      description="Parse CSV files into structured JSON array of objects directly in the browser."
      onConvert={async (file) => {
        const text = await file.text();
        const json = csvToJson(text);
        return {
          data: json,
          outputFileName: file.name.replace(/\.[^/.]+$/, "") + ".json",
          mimeType: "application/json",
          previewText: json.slice(0, 1500),
        };
      }}
    />
  );
}

// 13. JSON to CSV
export function JsonToCsvPage() {
  return (
    <GenericDocumentConvertPage
      toolSlug="json-to-csv"
      sourceFormatName="JSON"
      targetFormatName="CSV"
      accept={[".json", "application/json"]}
      description="Transform JSON data arrays into standard CSV formatted tables with proper quotes and escaping."
      onConvert={async (file) => {
        const text = await file.text();
        const csv = jsonToCsv(text);
        return {
          data: csv,
          outputFileName: file.name.replace(/\.[^/.]+$/, "") + ".csv",
          mimeType: "text/csv",
          previewText: csv.slice(0, 1500),
        };
      }}
    />
  );
}

// 14. PPTX to TXT
export function PptxToTxtPage() {
  return (
    <GenericDocumentConvertPage
      toolSlug="pptx-to-txt"
      sourceFormatName="PPTX"
      targetFormatName="TXT"
      accept={[".pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"]}
      description="Extract slide text, titles, and bullet points from PowerPoint (.pptx) presentations."
      disclaimer="Extracts textual content slide-by-slide. Images, shapes, and complex animations are not converted."
      onConvert={async (file) => {
        const buffer = await file.arrayBuffer();
        const text = await pptxToTxt(buffer);
        return {
          data: text,
          outputFileName: file.name.replace(/\.[^/.]+$/, "") + ".txt",
          mimeType: "text/plain",
          previewText: text,
        };
      }}
    />
  );
}

// 15. EPUB to TXT
export function EpubToTxtPage() {
  return (
    <GenericDocumentConvertPage
      toolSlug="epub-to-txt"
      sourceFormatName="EPUB"
      targetFormatName="TXT"
      accept={[".epub", "application/epub+zip"]}
      description="Extract clean chapter text from non-DRM EPUB eBooks."
      disclaimer="Requires standard DRM-free EPUB files. Encrypted or DRM-protected eBooks cannot be processed."
      onConvert={async (file) => {
        const buffer = await file.arrayBuffer();
        const { text, title } = await parseEpub(buffer);
        return {
          data: text,
          outputFileName: (title || file.name.replace(/\.[^/.]+$/, "")) + ".txt",
          mimeType: "text/plain",
          previewText: text.slice(0, 1500),
        };
      }}
    />
  );
}

// 16. EPUB to HTML
export function EpubToHtmlPage() {
  return (
    <GenericDocumentConvertPage
      toolSlug="epub-to-html"
      sourceFormatName="EPUB"
      targetFormatName="HTML"
      accept={[".epub", "application/epub+zip"]}
      description="Convert non-DRM EPUB eBooks into sanitized, readable single-page HTML documents."
      disclaimer="Requires standard DRM-free EPUB files. Scripts and unsafe tags are removed for security."
      onConvert={async (file) => {
        const buffer = await file.arrayBuffer();
        const { html, title } = await parseEpub(buffer);
        return {
          data: html,
          outputFileName: (title || file.name.replace(/\.[^/.]+$/, "")) + ".html",
          mimeType: "text/html",
          previewHtml: html,
        };
      }}
    />
  );
}

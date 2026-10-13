"use client";

import * as React from "react";
import { ToolPageLayout } from "@/components/tools/ToolPageLayout";
import { FileDropzone } from "@/components/file-upload/FileDropzone";
import { Button } from "@/components/ui/Button";
import { SelectedFileItem } from "@/lib/file/types";
import {
  extractPdfContent,
  PdfTextExtractionResult,
  convertPdfToDocx,
  convertPdfToCsv,
  convertPdfToXlsx,
  convertPdfToPptx,
} from "@/lib/pdf/pdfExtractor";
import { downloadBlob, downloadFile } from "@/lib/download/download";
import {
  Loader2,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Eye,
  ArrowRight,
  Info,
} from "lucide-react";

export type PdfExtractionTarget = "txt" | "docx" | "xlsx" | "csv" | "pptx";

export interface GenericPdfExtractPageProps {
  toolSlug: string;
  targetFormatName: string;
  targetFormat: PdfExtractionTarget;
  description: string;
  disclaimerNote: string;
}

export function GenericPdfExtractPage({
  toolSlug,
  targetFormatName,
  targetFormat,
  description,
  disclaimerNote,
}: GenericPdfExtractPageProps) {
  const [files, setFiles] = React.useState<SelectedFileItem[]>([]);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [extraction, setExtraction] = React.useState<PdfTextExtractionResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [useOcr, setUseOcr] = React.useState(false);
  const [ocrProgress, setOcrProgress] = React.useState<string | null>(null);
  const [generatedResult, setGeneratedResult] = React.useState<{
    data: Blob | string;
    fileName: string;
  } | null>(null);

  const readyFiles = files.filter(f => f.status === "ready");
  const currentFile = readyFiles[0]?.file;

  const handleExtractAndConvert = async () => {
    if (!currentFile) return;
    setIsProcessing(true);
    setError(null);
    setExtraction(null);
    setGeneratedResult(null);
    setOcrProgress(null);

    try {
      const extracted = await extractPdfContent(currentFile, {
        useOcr,
        onProgress: (msg) => setOcrProgress(msg)
      });
      setExtraction(extracted);

      if (extracted.isScannedOrImageOnly) {
        setIsProcessing(false);
        return; // Don't generate empty document, prompt user about OCR
      }

      const baseName = currentFile.name.replace(/\.[^/.]+$/, "");
      let resultData: Blob | string;
      let outName: string;

      switch (targetFormat) {
        case "txt":
          resultData = extracted.fullText;
          outName = `${baseName}.txt`;
          break;
        case "docx":
          resultData = await convertPdfToDocx(extracted);
          outName = `${baseName}.docx`;
          break;
        case "csv":
          resultData = convertPdfToCsv(extracted);
          outName = `${baseName}.csv`;
          break;
        case "xlsx":
          resultData = convertPdfToXlsx(extracted);
          outName = `${baseName}.xlsx`;
          break;
        case "pptx":
          resultData = await convertPdfToPptx(extracted);
          outName = `${baseName}.pptx`;
          break;
        default:
          resultData = extracted.fullText;
          outName = `${baseName}.txt`;
      }

      setGeneratedResult({ data: resultData, fileName: outName });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to extract content from PDF.";
      setError(msg);
    } finally {
      setIsProcessing(false);
      setOcrProgress(null);
    }
  };

  const handleDownload = () => {
    if (!generatedResult) return;
    if (typeof generatedResult.data === "string") {
      downloadFile(
        generatedResult.data,
        generatedResult.fileName,
        targetFormat === "csv" ? "text/csv" : "text/plain"
      );
    } else {
      downloadBlob(generatedResult.data, generatedResult.fileName);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setExtraction(null);
    setGeneratedResult(null);
    setError(null);
    setOcrProgress(null);
    setUseOcr(false);
  };

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "PDF Tools", href: "/categories/pdf" },
    { label: `PDF to ${targetFormatName}`, href: `/tools/${toolSlug}` },
  ];

  return (
    <ToolPageLayout
      breadcrumbs={breadcrumbs}
      title={`PDF to ${targetFormatName}`}
      description={description}
      badge="Client-Side"
      workspace={
        <div className="space-y-6">
        {/* Step 1: Upload */}
        {!generatedResult && (!extraction?.isScannedOrImageOnly || useOcr) && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur">
            <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              Upload PDF Document
            </h2>

            <FileDropzone
              value={files}
              onChange={setFiles}
              accept={[".pdf", "application/pdf"]}
              multiple={false}
              maxSize={100 * 1024 * 1024}
            />

            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-xs text-amber-300">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{disclaimerNote}</span>
            </div>

            {currentFile && (
              <div className="mt-4 flex items-center gap-2 px-1">
                <input
                  type="checkbox"
                  id="useOcr"
                  checked={useOcr}
                  onChange={(e) => setUseOcr(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900"
                />
                <label htmlFor="useOcr" className="text-sm text-slate-300 select-none">
                  Enable OCR for scanned documents (Slower)
                </label>
              </div>
            )}

            {ocrProgress && (
              <div className="mt-2 px-1 text-xs text-indigo-400 font-medium animate-pulse">
                {ocrProgress}
              </div>
            )}

            {currentFile && (
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handleExtractAndConvert}
                  disabled={isProcessing}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 font-medium px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-600/25"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Extracting PDF Structure...
                    </>
                  ) : (
                    <>
                      Convert to {targetFormatName}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* OCR / Scanned Warning */}
        {extraction?.isScannedOrImageOnly && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur space-y-4">
            <div className="p-4 bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-start gap-3 text-amber-200">
              <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <h3 className="font-semibold text-base text-amber-100">
                  Scanned / Image-Only PDF Detected
                </h3>
                <p className="mt-1 text-sm text-amber-200/90 leading-relaxed">
                  This PDF does not appear to contain selectable digital text streams. The pages
                  are likely scanned images or flattened graphics. Optical Character Recognition
                  (OCR) is required to extract editable text from this document.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleReset}
                className="border-slate-700 text-slate-300"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Select Another File
              </Button>
            </div>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-3 text-sm text-red-300">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
            <div>
              <p className="font-semibold">Extraction Error</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Step 2: Conversion Success & Preview */}
        {generatedResult && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-100">{generatedResult.fileName}</h3>
                  <p className="text-xs text-slate-400">
                    Extracted {extraction?.pages.length} pages &bull; {extraction?.totalWords} words detected
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="border-slate-700 hover:bg-slate-800 text-slate-300 gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  Convert Another
                </Button>
                <Button
                  onClick={handleDownload}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-medium px-5 shadow-lg shadow-emerald-600/25"
                >
                  <Download className="w-4 h-4" />
                  Download {targetFormatName}
                </Button>
              </div>
            </div>

            {/* Extracted Text Preview */}
            {extraction && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium text-slate-400">
                  <span className="flex items-center gap-1.5 uppercase tracking-wider">
                    <Eye className="w-4 h-4" />
                    Detected Document Structure Preview
                  </span>
                  <span>{extraction.pages.length} Pages</span>
                </div>
                <div className="max-h-96 overflow-y-auto rounded-xl bg-slate-950 border border-slate-800/80 p-4 text-sm text-slate-300 font-mono">
                  <pre className="whitespace-pre-wrap font-sans text-slate-200">
                    {extraction.fullText.slice(0, 3000) + (extraction.fullText.length > 3000 ? "\n\n[... Remaining content included in download ...]" : "")}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      }
    />
  );
}

// 1. PDF to TXT
export function PdfToTxtPage() {
  return (
    <GenericPdfExtractPage
      toolSlug="pdf-to-txt"
      targetFormatName="TXT"
      targetFormat="txt"
      description="Extract pure readable text from PDF documents page by page with full client-side privacy."
      disclaimerNote="Preserves page boundaries and detected lines. Scanned documents will be flagged for OCR."
    />
  );
}



// 2. PDF to DOCX
export function PdfToDocxPage() {
  return (
    <GenericPdfExtractPage
      toolSlug="pdf-to-docx"
      targetFormatName="DOCX"
      targetFormat="docx"
      description="Extract selectable text and paragraphs from a text-based PDF into an editable Word (.docx) document. Best for simple PDFs with plain text."
      disclaimerNote="This tool extracts raw text from PDF files and organizes it into paragraphs in a Word document. Images, complex layouts, custom fonts, colors, and table formatting will NOT be preserved. For best results, use simple text-only PDFs."
    />
  );
}


export function PdfToCsvPage() {
  return (
    <GenericPdfExtractPage
      toolSlug="pdf-to-csv"
      targetFormatName="CSV"
      targetFormat="csv"
      description="Extract recognized tabular rows and columns from PDF documents into a clean CSV spreadsheet."
      disclaimerNote="PDF tables are visually positioned rather than semantically represented. Review extracted table preview prior to final export."
    />
  );
}

// 4. PDF to XLSX
export function PdfToXlsxPage() {
  return (
    <GenericPdfExtractPage
      toolSlug="pdf-to-xlsx"
      targetFormatName="XLSX"
      targetFormat="xlsx"
      description="Convert tabular PDF data into native Microsoft Excel (.xlsx) workbooks with per-page sheets."
      disclaimerNote="Identifies structured table rows and generates separate sheets per PDF page. Complex visual alignments may require formatting adjustment in Excel."
    />
  );
}

// 5. PDF to PPTX
export function PdfToPptxPage() {
  return (
    <GenericPdfExtractPage
      toolSlug="pdf-to-pptx"
      targetFormatName="PPTX"
      targetFormat="pptx"
      description="Convert PDF pages into PowerPoint (.pptx) presentation slides with editable text blocks."
      disclaimerNote="Generates presentation slides mapped to PDF pages with extracted text runs. Complex graphics and animations are not converted."
    />
  );
}

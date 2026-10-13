"use client";

import * as React from "react";
import { ToolPageLayout } from "@/components/tools/ToolPageLayout";
import { FileDropzone } from "@/components/file-upload/FileDropzone";
import { Button } from "@/components/ui/Button";
import { SelectedFileItem } from "@/lib/file/types";
import { downloadBlob, downloadFile } from "@/lib/download/download";
import { formatFileSize } from "@/lib/file/validation";
import {
  Loader2,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Eye,
  ArrowRight
} from "lucide-react";

export interface GenericDocumentConvertPageProps {
  toolSlug: string;
  sourceFormatName: string;
  targetFormatName: string;
  accept: string[];
  maxSizeBytes?: number;
  description: string;
  onConvert: (file: File) => Promise<{
    data: Blob | string;
    outputFileName: string;
    mimeType: string;
    previewText?: string;
    previewHtml?: string;
  }>;
  disclaimer?: string;
  hideHeader?: boolean;
}

export function GenericDocumentConvertPage({
  toolSlug,
  sourceFormatName,
  targetFormatName,
  accept,
  maxSizeBytes = 30 * 1024 * 1024,
  description,
  onConvert,
  disclaimer = "Converts detected content into an editable format. Complex layouts, fonts, tables, and styling may require manual adjustment.",
  hideHeader,
}: GenericDocumentConvertPageProps) {
  const [files, setFiles] = React.useState<SelectedFileItem[]>([]);
  const [isConverting, setIsConverting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{
    data: Blob | string;
    outputFileName: string;
    mimeType: string;
    previewText?: string;
    previewHtml?: string;
  } | null>(null);

  const readyFiles = files.filter(f => f.status === "ready");
  const currentFile = readyFiles[0]?.file;

  const handleConvert = async () => {
    if (!currentFile) return;
    setIsConverting(true);
    setError(null);
    try {
      const res = await onConvert(currentFile);
      setResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Document conversion failed.";
      setError(msg);
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    if (typeof result.data === "string") {
      downloadFile(result.data, result.outputFileName, result.mimeType);
    } else {
      downloadBlob(result.data, result.outputFileName);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setResult(null);
    setError(null);
  };

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Documents", href: "/categories/document" },
    { label: `${sourceFormatName} to ${targetFormatName}`, href: `/tools/${toolSlug}` },
  ];

  return (
    <ToolPageLayout hideHeader={hideHeader}
      breadcrumbs={breadcrumbs}
      title={`${sourceFormatName} to ${targetFormatName}`}
      description={description}
      badge="Client-Side"
      workspace={
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Step 1: Upload */}
          {!result && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur">
              <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                Upload {sourceFormatName} File
              </h2>
              <FileDropzone
                value={files}
                onChange={setFiles}
                accept={accept}
                multiple={false}
                maxSize={maxSizeBytes}
              />

              {disclaimer && (
                <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-xs text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{disclaimer}</span>
                </div>
              )}

              {currentFile && (
                <div className="mt-6 flex justify-end">
                  <Button
                    onClick={handleConvert}
                    disabled={isConverting}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 font-medium px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-600/25"
                  >
                    {isConverting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Converting...
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

          {/* Error notification */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-3 text-sm text-red-300">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
              <div>
                <p className="font-semibold">Conversion Error</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Step 2: Conversion Success & Preview */}
          {result && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-100">{result.outputFileName}</h3>
                    <p className="text-xs text-slate-400">
                      Ready to download &bull; {currentFile ? formatFileSize(currentFile.size) : ""}
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

              {/* Preview Box */}
              {(result.previewText || result.previewHtml) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    <Eye className="w-4 h-4" />
                    Document Content Preview
                  </div>
                  <div className="max-h-96 overflow-y-auto rounded-xl bg-slate-950 border border-slate-800/80 p-4 text-sm text-slate-300 font-mono">
                    {result.previewHtml ? (
                      <div
                        className="prose prose-invert max-w-none text-slate-300"
                        dangerouslySetInnerHTML={{ __html: result.previewHtml }}
                      />
                    ) : (
                      <pre className="whitespace-pre-wrap font-sans text-slate-200">
                        {result.previewText}
                      </pre>
                    )}
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

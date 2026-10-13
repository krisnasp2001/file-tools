"use client";

import * as React from "react";
import { ToolPageLayout } from "@/components/tools/ToolPageLayout";
import { Button } from "@/components/ui/Button";
import { downloadBlob } from "@/lib/download/download";
import {
  Braces,
  Copy,
  Download,
  Trash2,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Upload,
} from "lucide-react";

export function JsonFormatterPage({ hideHeader }: { hideHeader?: boolean }) {
  const [jsonInput, setJsonInput] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleFormat = () => {
    clearMessages();
    if (!jsonInput.trim()) return;
    try {
      const parsed = JSON.parse(jsonInput);
      setJsonInput(JSON.stringify(parsed, null, 2));
      setSuccess("JSON prettified successfully!");
    } catch (err) {
      setError((err as Error).message || "Invalid JSON");
    }
  };

  const handleMinify = () => {
    clearMessages();
    if (!jsonInput.trim()) return;
    try {
      const parsed = JSON.parse(jsonInput);
      setJsonInput(JSON.stringify(parsed));
      setSuccess("JSON minified successfully!");
    } catch (err) {
      setError((err as Error).message || "Invalid JSON");
    }
  };

  const handleValidate = () => {
    clearMessages();
    if (!jsonInput.trim()) {
      setError("Please enter some JSON to validate.");
      return;
    }
    try {
      JSON.parse(jsonInput);
      setSuccess("Valid JSON!");
    } catch (err) {
      setError((err as Error).message || "Invalid JSON");
    }
  };

  const handleCopy = async () => {
    clearMessages();
    if (!jsonInput) return;
    try {
      await navigator.clipboard.writeText(jsonInput);
      setSuccess("Copied to clipboard!");
    } catch {
      setError("Failed to copy to clipboard.");
    }
  };

  const handleDownload = () => {
    clearMessages();
    if (!jsonInput) return;
    try {
      // Validate before downloading
      JSON.parse(jsonInput);
      const blob = new Blob([jsonInput], { type: "application/json" });
      downloadBlob(blob, "formatted.json");
    } catch {
      // Download anyway but warn
      const blob = new Blob([jsonInput], { type: "application/json" });
      downloadBlob(blob, "data.json");
      setError("Downloaded, but the JSON is invalid.");
    }
  };

  const handleClear = () => {
    setJsonInput("");
    clearMessages();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonInput(content);
      clearMessages();
      // Reset input so the same file can be uploaded again if cleared
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.onerror = () => {
      setError("Failed to read file.");
    };
    reader.readAsText(file);
  };

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Data Tools", href: "/categories/data" },
    { label: "JSON Formatter", href: "/tools/json-formatter" },
  ];

  return (
    <ToolPageLayout hideHeader={hideHeader}
      breadcrumbs={breadcrumbs}
      title="JSON Formatter & Validator"
      description="Format, prettify, minify, and validate JSON data instantly in your browser."
      workspace={
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2 border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-300"
              >
                <Upload className="w-4 h-4" /> Upload JSON
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".json,application/json"
                className="hidden"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                className="gap-2 border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-red-400 hover:text-red-300"
                disabled={!jsonInput}
              >
                <Trash2 className="w-4 h-4" /> Clear
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-2 border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-300"
                disabled={!jsonInput}
              >
                <Copy className="w-4 h-4" /> Copy
              </Button>
              <Button
                size="sm"
                onClick={handleDownload}
                className="gap-2 bg-teal-600 hover:bg-teal-500 text-white"
                disabled={!jsonInput}
              >
                <Download className="w-4 h-4" /> Download
              </Button>
            </div>
          </div>

          <div className="relative">
            <textarea
              value={jsonInput}
              onChange={(e) => {
                setJsonInput(e.target.value);
                clearMessages();
              }}
              placeholder="Paste your JSON here..."
              className="w-full min-h-500px resize-y rounded-xl border border-slate-700 bg-slate-950 p-4 font-mono text-sm text-slate-300 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 shadow-inner"
              spellCheck={false}
            />
          </div>
        </div>
      }
      settings={
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col gap-6">
          <div>
            <h3 className="font-semibold text-slate-200 flex items-center gap-2 mb-4">
              <Braces className="w-5 h-5 text-teal-400" />
              JSON Actions
            </h3>

            <div className="flex flex-col gap-3">
              <Button
                onClick={handleFormat}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 justify-start gap-3 border border-slate-700"
                disabled={!jsonInput}
              >
                <FileCode className="w-4 h-4 text-teal-400" />
                Format / Prettify (2 spaces)
              </Button>
              <Button
                onClick={handleMinify}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 justify-start gap-3 border border-slate-700"
                disabled={!jsonInput}
              >
                <Braces className="w-4 h-4 text-emerald-400" />
                Minify (Remove whitespace)
              </Button>
              <Button
                onClick={handleValidate}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 justify-start gap-3 border border-slate-700"
                disabled={!jsonInput}
              >
                <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                Validate Syntax
              </Button>
            </div>
          </div>

          {(error || success) && (
            <div className={`p-4 rounded-xl border ${error ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'} flex items-start gap-3 text-sm`}>
              {error ? (
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              )}
              <div className="break-all whitespace-pre-wrap">
                {error || success}
              </div>
            </div>
          )}
        </div>
      }
    />
  );
}

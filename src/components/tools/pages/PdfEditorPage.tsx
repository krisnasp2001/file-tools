"use client";

/**
 * PdfEditorPage.tsx
 *
 * A fully client-side, Word-like PDF Editor tool.
 *
 * Pipeline:
 *   PDF File ──► pdfjs-dist ──► EditorBlock[] ──► contenteditable DOM
 *                                                        │
 *                                    User edits freely   │
 *                                                        ▼
 *                                              domToExportBlocks()
 *                                                        │
 *                                              exportBlocksToPdf()
 *                                                        │
 *                                              Download .pdf
 *
 * CRITICAL: Zero overlay / coordinate-patch approach. The editor is a
 * semantic HTML structure rendered inside a contenteditable container.
 * Text flows naturally just like Microsoft Word.
 */

import * as React from "react";
import { ToolPageLayout } from "@/components/tools/ToolPageLayout";
import { FileDropzone } from "@/components/file-upload/FileDropzone";
import { Button } from "@/components/ui/Button";
import { SelectedFileItem } from "@/lib/file/types";
import { parsePdfToBlocks, EditorBlock } from "@/lib/pdf/editor/pdfParser";
import {
  domToExportBlocks,
  exportBlocksToPdf,
} from "@/lib/pdf/editor/pdfExporter";
import {
  Loader2,
  Download,
  RotateCcw,
  AlertTriangle,
  FileText,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Heading3,
  Type,
  Pilcrow,
  Info,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EditorPhase = "upload" | "parsing" | "editing" | "exporting" | "error";

// ---------------------------------------------------------------------------
// Utility: convert EditorBlock[] → HTML string for contenteditable
// ---------------------------------------------------------------------------

function blocksToHtml(blocks: EditorBlock[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "heading1":
          return `<h1>${escapeHtml(block.content)}</h1>`;
        case "heading2":
          return `<h2>${escapeHtml(block.content)}</h2>`;
        case "heading3":
          return `<h3>${escapeHtml(block.content)}</h3>`;
        case "paragraph":
          return `<p>${escapeHtml(block.content)}</p>`;
        case "page-break":
          return `<hr class="pdf-page-break" data-page="${block.pageNumber}" contenteditable="false" />`;
        case "table": {
          const rows = block.rows
            .map(
              (row) =>
                `<tr>${row
                  .map((cell) => `<td>${escapeHtml(cell)}</td>`)
                  .join("")}</tr>`
            )
            .join("");
          return `<table><tbody>${rows}</tbody></table>`;
        }
        default:
          return "";
      }
    })
    .join("\n");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// Toolbar button component
// ---------------------------------------------------------------------------

interface ToolbarButtonProps {
  onClick: () => void;
  title: string;
  active?: boolean;
  children: React.ReactNode;
  disabled?: boolean;
}

function ToolbarButton({
  onClick,
  title,
  active = false,
  children,
  disabled = false,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => {
        e.preventDefault(); // Prevent editor losing focus
        onClick();
      }}
      className={`
        inline-flex items-center justify-center h-8 w-8 rounded-md text-sm transition-colors
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400
        disabled:opacity-40 disabled:cursor-not-allowed
        ${
          active
            ? "bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-100"
            : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
        }
      `}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Toolbar separator
// ---------------------------------------------------------------------------

function ToolbarSeparator() {
  return (
    <span className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-0.5 shrink-0" />
  );
}

// ---------------------------------------------------------------------------
// Formatting toolbar (execCommand-based — works in all modern browsers)
// ---------------------------------------------------------------------------

interface EditorToolbarProps {
  editorRef: React.RefObject<HTMLDivElement | null>;
  disabled?: boolean;
}

function EditorToolbar({ editorRef, disabled = false }: EditorToolbarProps) {
  const exec = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
  };

  const formatBlock = (tag: string) => exec("formatBlock", tag);

  const [activeFormats, setActiveFormats] = React.useState({
    bold: false,
    italic: false,
    underline: false,
    justifyLeft: false,
    justifyCenter: false,
    justifyRight: false,
  });

  const updateActiveFormats = React.useCallback(() => {
    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      justifyLeft: document.queryCommandState("justifyLeft"),
      justifyCenter: document.queryCommandState("justifyCenter"),
      justifyRight: document.queryCommandState("justifyRight"),
    });
  }, []);

  React.useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    el.addEventListener("keyup", updateActiveFormats);
    el.addEventListener("mouseup", updateActiveFormats);
    el.addEventListener("selectionchange", updateActiveFormats);
    return () => {
      el.removeEventListener("keyup", updateActiveFormats);
      el.removeEventListener("mouseup", updateActiveFormats);
      el.removeEventListener("selectionchange", updateActiveFormats);
    };
  }, [editorRef, updateActiveFormats]);

  return (
    <div
      role="toolbar"
      aria-label="Text formatting toolbar"
      className={`
        flex flex-wrap items-center gap-0.5 px-3 py-2
        border-b border-neutral-200 dark:border-neutral-700
        bg-neutral-50 dark:bg-neutral-900 rounded-t-xl
        ${disabled ? "pointer-events-none opacity-50" : ""}
      `}
    >
      {/* Block format selectors */}
      <ToolbarButton
        onClick={() => formatBlock("p")}
        title="Paragraph"
        disabled={disabled}
      >
        <Pilcrow className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => formatBlock("h1")}
        title="Heading 1"
        disabled={disabled}
      >
        <Heading1 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => formatBlock("h2")}
        title="Heading 2"
        disabled={disabled}
      >
        <Heading2 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => formatBlock("h3")}
        title="Heading 3"
        disabled={disabled}
      >
        <Heading3 className="h-3.5 w-3.5" />
      </ToolbarButton>

      <ToolbarSeparator />

      {/* Inline formatting */}
      <ToolbarButton
        onClick={() => exec("bold")}
        title="Bold (Ctrl+B)"
        active={activeFormats.bold}
        disabled={disabled}
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => exec("italic")}
        title="Italic (Ctrl+I)"
        active={activeFormats.italic}
        disabled={disabled}
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => exec("underline")}
        title="Underline (Ctrl+U)"
        active={activeFormats.underline}
        disabled={disabled}
      >
        <Underline className="h-3.5 w-3.5" />
      </ToolbarButton>

      <ToolbarSeparator />

      {/* Lists */}
      <ToolbarButton
        onClick={() => exec("insertUnorderedList")}
        title="Bullet List"
        disabled={disabled}
      >
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => exec("insertOrderedList")}
        title="Numbered List"
        disabled={disabled}
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>

      <ToolbarSeparator />

      {/* Alignment */}
      <ToolbarButton
        onClick={() => exec("justifyLeft")}
        title="Align Left"
        active={activeFormats.justifyLeft}
        disabled={disabled}
      >
        <AlignLeft className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => exec("justifyCenter")}
        title="Center"
        active={activeFormats.justifyCenter}
        disabled={disabled}
      >
        <AlignCenter className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => exec("justifyRight")}
        title="Align Right"
        active={activeFormats.justifyRight}
        disabled={disabled}
      >
        <AlignRight className="h-3.5 w-3.5" />
      </ToolbarButton>

      <ToolbarSeparator />

      {/* Font size nudge */}
      <ToolbarButton
        onClick={() => exec("fontSize", "4")}
        title="Increase font size"
        disabled={disabled}
      >
        <Type className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => exec("fontSize", "2")}
        title="Decrease font size"
        disabled={disabled}
      >
        <Type className="h-3 w-3" />
      </ToolbarButton>

      <ToolbarSeparator />

      {/* Undo / Redo */}
      <ToolbarButton onClick={() => exec("undo")} title="Undo (Ctrl+Z)" disabled={disabled}>
        <span className="text-xs font-mono">↩</span>
      </ToolbarButton>
      <ToolbarButton onClick={() => exec("redo")} title="Redo (Ctrl+Y)" disabled={disabled}>
        <span className="text-xs font-mono">↪</span>
      </ToolbarButton>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

const BREADCRUMBS = [
  { label: "Home", href: "/" },
  { label: "PDF", href: "/categories/pdf" },
  { label: "PDF Editor" },
];

export function PdfEditorPage() {
  // ------------------------------------------------------------------
  // State
  // ------------------------------------------------------------------
  const [files, setFiles] = React.useState<SelectedFileItem[]>([]);
  const [phase, setPhase] = React.useState<EditorPhase>("upload");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [exportError, setExportError] = React.useState<string | null>(null);
  const [parseStats, setParseStats] = React.useState<{
    pageCount: number;
    wordCount: number;
    isScanned: boolean;
  } | null>(null);

  const editorRef = React.useRef<HTMLDivElement | null>(null);
  const [originalFileName, setOriginalFileName] = React.useState<string>("document");
  // Holds parsed HTML waiting to be injected once React mounts the editor div
  const pendingHtmlRef = React.useRef<string | null>(null);

  const readyFile = files.find((f) => f.status === "ready");

  // ------------------------------------------------------------------
  // Parse PDF → populate editor
  // ------------------------------------------------------------------
  const handleParse = React.useCallback(async () => {
    if (!readyFile) return;
    setPhase("parsing");
    setErrorMessage(null);
    setOriginalFileName(readyFile.name.replace(/\.pdf$/i, ""));

    try {
      const result = await parsePdfToBlocks(readyFile.file);

      if (result.isScanned) {
        setPhase("error");
        setErrorMessage(
          "This PDF appears to be a scanned image without selectable text. " +
            "PDF Editor works with text-based PDFs only. " +
            "Try running it through an OCR tool first."
        );
        return;
      }

      const html = blocksToHtml(result.blocks);
      setParseStats({
        pageCount: result.pageCount,
        wordCount: result.wordCount,
        isScanned: result.isScanned,
      });

      // Store HTML; a useEffect below will inject it after React mounts the editor div.
      pendingHtmlRef.current = html;
      setPhase("editing");
    } catch (err: unknown) {
      setPhase("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to parse the PDF file."
      );
    }
  }, [readyFile]);

  // ------------------------------------------------------------------
  // Inject parsed HTML once the editor div is in the DOM
  // useEffect fires after React has committed the DOM update triggered
  // by setPhase("editing"), so editorRef.current is guaranteed to exist.
  // ------------------------------------------------------------------
  React.useEffect(() => {
    if (phase === "editing" && pendingHtmlRef.current !== null && editorRef.current) {
      editorRef.current.innerHTML = pendingHtmlRef.current;
      pendingHtmlRef.current = null;
      // Scroll to top of document and place cursor at start
      editorRef.current.scrollTop = 0;
      try {
        const range = document.createRange();
        const sel = window.getSelection();
        range.setStart(editorRef.current, 0);
        range.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(range);
        editorRef.current.focus();
      } catch {
        editorRef.current.focus();
      }
    }
  }, [phase]);

  // ------------------------------------------------------------------
  // Export editor DOM → PDF download
  // ------------------------------------------------------------------
  const handleExport = React.useCallback(async () => {
    const el = editorRef.current;
    if (!el) return;

    setExportError(null);
    setPhase("exporting");

    try {
      const exportBlocks = domToExportBlocks(el);
      if (exportBlocks.length === 0) {
        throw new Error("No text content found in the editor to export.");
      }
      const pdfBytes = await exportBlocksToPdf(
        exportBlocks,
        originalFileName
      );

      // Use .slice() to get a Uint8Array with its own ArrayBuffer (correct
      // byteOffset + byteLength), avoiding the bug where .buffer returns
      // the entire underlying SharedArrayBuffer from pdf-lib's allocator.
      const blob = new Blob([pdfBytes.slice()], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${originalFileName}-edited.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setExportError(
        err instanceof Error ? err.message : "Unknown export error. Please try again."
      );
    } finally {
      setPhase("editing");
    }
  }, [originalFileName]);

  // ------------------------------------------------------------------
  // Reset
  // ------------------------------------------------------------------
  const handleReset = React.useCallback(() => {
    setFiles([]);
    setPhase("upload");
    setErrorMessage(null);
    setParseStats(null);
    setOriginalFileName("document");
    if (editorRef.current) editorRef.current.innerHTML = "";
  }, []);

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <ToolPageLayout
      breadcrumbs={BREADCRUMBS}
      title="PDF Editor"
      description="Upload a PDF, edit the text freely in a Word-like workspace, then download your modified document — all 100% in your browser."
      badge="Client-Side"
      workspace={
        <div className="flex flex-col gap-6">
          {/* ── Phase: Upload ─────────────────────────────────────────── */}
          {phase === "upload" && (
            <div className="space-y-5">
              <FileDropzone
                accept={[".pdf", "application/pdf"]}
                maxSize={50 * 1024 * 1024}
                multiple={false}
                value={files}
                onChange={setFiles}
              />

              {/* Info banner */}
              <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-relaxed text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Works with <strong>text-based PDFs</strong> only. Scanned or
                  image-only PDFs need OCR processing first. Your file never
                  leaves the browser.
                </span>
              </div>

              {readyFile && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    className="inline-flex items-center gap-2"
                    onClick={handleParse}
                  >
                    <FileText className="h-4 w-4" />
                    Open in Editor
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ── Phase: Parsing ────────────────────────────────────────── */}
          {phase === "parsing" && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-neutral-200 bg-neutral-50 py-20 dark:border-neutral-800 dark:bg-neutral-900/40">
              <Loader2 className="h-10 w-10 animate-spin text-neutral-400" />
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                Parsing PDF — extracting text structure…
              </p>
            </div>
          )}

          {/* ── Phase: Error ──────────────────────────────────────────── */}
          {phase === "error" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                <div>
                  <p className="font-semibold">Could not open PDF</p>
                  <p className="mt-1">{errorMessage}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="inline-flex items-center gap-2"
                onClick={handleReset}
              >
                <RotateCcw className="h-4 w-4" />
                Try another file
              </Button>
            </div>
          )}

          {/* ── Phase: Editing ────────────────────────────────────────── */}
          {(phase === "editing" || phase === "exporting") && (
            <div className="flex flex-col gap-4">
              {/* Export error banner */}
              {exportError && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <div>
                    <p className="font-semibold">Export failed</p>
                    <p className="mt-0.5 text-xs">{exportError}</p>
                  </div>
                </div>
              )}

              {/* Stats + action bar */}

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2.5 dark:border-neutral-800 dark:bg-neutral-900/40">
                <div className="flex flex-wrap gap-4 text-xs text-neutral-500 dark:text-neutral-400">
                  {parseStats && (
                    <>
                      <span>
                        <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                          {parseStats.pageCount}
                        </span>{" "}
                        page{parseStats.pageCount !== 1 ? "s" : ""}
                      </span>
                      <span>
                        <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                          {parseStats.wordCount.toLocaleString()}
                        </span>{" "}
                        words
                      </span>
                      <span className="text-neutral-400 dark:text-neutral-600">
                        {originalFileName}.pdf
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="inline-flex items-center gap-1.5"
                    onClick={handleReset}
                    disabled={phase === "exporting"}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    New file
                  </Button>

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className="inline-flex items-center gap-1.5"
                    onClick={handleExport}
                    disabled={phase === "exporting"}
                  >
                    {phase === "exporting" ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Generating PDF…
                      </>
                    ) : (
                      <>
                        <Download className="h-3.5 w-3.5" />
                        Download PDF
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Editor panel */}
              <div
                className="overflow-hidden rounded-xl border border-neutral-200 shadow-sm dark:border-neutral-700"
              >
                {/* Formatting toolbar */}
                <EditorToolbar
                  editorRef={editorRef}
                  disabled={phase === "exporting"}
                />

                {/* Paper-like editing area */}
                <div className="overflow-y-auto bg-white dark:bg-neutral-950" style={{ maxHeight: "72vh" }}>
                  <div
                    ref={editorRef}
                    id="pdf-editor-content"
                    contentEditable
                    suppressContentEditableWarning
                    aria-label="PDF document editor"
                    aria-multiline="true"
                    role="textbox"
                    spellCheck
                    className="
                      min-h-[60vh] w-full outline-none
                      px-16 py-12
                      text-neutral-900 dark:text-neutral-100
                      font-sans text-[15px] leading-7
                      selection:bg-blue-100 dark:selection:bg-blue-900/40

                      [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:leading-tight [&_h1]:mt-8 [&_h1]:mb-3
                        [&_h1]:text-neutral-900 dark:[&_h1]:text-neutral-50
                      [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:leading-snug [&_h2]:mt-6 [&_h2]:mb-2
                        [&_h2]:text-neutral-800 dark:[&_h2]:text-neutral-100
                      [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:leading-snug [&_h3]:mt-5 [&_h3]:mb-2
                        [&_h3]:text-neutral-800 dark:[&_h3]:text-neutral-100
                      [&_p]:my-2 [&_p]:leading-relaxed
                      [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2
                      [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2
                      [&_li]:my-1

                      [&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_table]:text-sm
                      [&_td]:border [&_td]:border-neutral-200 dark:[&_td]:border-neutral-700
                        [&_td]:px-3 [&_td]:py-2 [&_td]:align-top
                      [&_th]:border [&_th]:border-neutral-200 dark:[&_th]:border-neutral-700
                        [&_th]:px-3 [&_th]:py-2 [&_th]:bg-neutral-50 dark:[&_th]:bg-neutral-900
                        [&_th]:font-semibold [&_th]:text-left

                      [&_hr.pdf-page-break]:block [&_hr.pdf-page-break]:my-8
                        [&_hr.pdf-page-break]:border-0
                        [&_hr.pdf-page-break]:border-t-2
                        [&_hr.pdf-page-break]:border-dashed
                        [&_hr.pdf-page-break]:border-blue-200
                        dark:[&_hr.pdf-page-break]:border-blue-900/50
                        [&_hr.pdf-page-break]:cursor-default
                    "
                  />
                </div>
              </div>

              {/* Tip */}
              <p className="text-[11px] text-neutral-400 dark:text-neutral-600">
                <kbd className="rounded border border-neutral-200 bg-neutral-50 px-1 py-0.5 font-mono text-[10px] dark:border-neutral-700 dark:bg-neutral-900">
                  Ctrl+B
                </kbd>{" "}
                Bold ·{" "}
                <kbd className="rounded border border-neutral-200 bg-neutral-50 px-1 py-0.5 font-mono text-[10px] dark:border-neutral-700 dark:bg-neutral-900">
                  Ctrl+I
                </kbd>{" "}
                Italic ·{" "}
                <kbd className="rounded border border-neutral-200 bg-neutral-50 px-1 py-0.5 font-mono text-[10px] dark:border-neutral-700 dark:bg-neutral-900">
                  Ctrl+Z
                </kbd>{" "}
                Undo · Dashed lines mark page breaks (not editable).
              </p>
            </div>
          )}
        </div>
      }
    />
  );
}

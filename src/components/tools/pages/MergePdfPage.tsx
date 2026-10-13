"use client";

import * as React from "react";
import { ToolPageLayout } from "@/components/tools/ToolPageLayout";
import { FileDropzone } from "@/components/file-upload/FileDropzone";
import { PdfPageGrid } from "@/components/pdf/PdfPageGrid";
import { PdfPagePreview } from "@/components/pdf/PdfPagePreview";
import { PdfPageCardData } from "@/components/pdf/PdfPageCard";
import { Button } from "@/components/ui/Button";
import { SelectedFileItem } from "@/lib/file/types";
import { getToolBySlug } from "@/lib/tools/registry";
import { renderPdfThumbnails } from "@/lib/pdf/renderThumbnails";
import { mergePdfFiles, downloadBlob } from "@/lib/pdf/pdfOperations";
import { Plus, Download, Trash2, Loader2 } from "lucide-react";

const tool = getToolBySlug("merge-pdf")!;

const BREADCRUMBS = [
  { label: "Home", href: "/" },
  { label: "PDF", href: "/#tools" },
  { label: tool.name },
];

type RenderState = "idle" | "loading" | "ready" | "error";

export function MergePdfPage() {
  const [files, setFiles] = React.useState<SelectedFileItem[]>([]);
  const [pages, setPages] = React.useState<PdfPageCardData[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [renderState, setRenderState] = React.useState<RenderState>("idle");
  const [renderError, setRenderError] = React.useState<string | undefined>();
  const abortRef = React.useRef<AbortController | null>(null);

  const validFiles = files.filter((f) => f.status === "ready");
  const validFileKey = validFiles.map((f) => f.id).join(",");

  // When new valid files are added, render thumbnails for any not yet rendered
  React.useEffect(() => {
    if (validFiles.length === 0) {
      // Use a microtask to avoid synchronous setState inside effect body
      Promise.resolve().then(() => {
        setPages([]);
        setSelectedIds(new Set());
        setRenderState("idle");
        setRenderError(undefined);
      });
      return;
    }

    const knownSources = new Set(pages.map((p) => p.sourceFileName));
    const newFiles = validFiles.filter((f) => !knownSources.has(f.name));
    if (newFiles.length === 0) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Defer to avoid synchronous setState inside effect body
    Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      setRenderState("loading");
      try {
        const allNewPages: PdfPageCardData[] = [];
        for (const fileItem of newFiles) {
          if (controller.signal.aborted) break;
          const rendered = await renderPdfThumbnails(fileItem.file, {
            thumbnailWidth: 180,
            signal: controller.signal,
          });
          allNewPages.push(...rendered);
        }
        if (!controller.signal.aborted) {
          setPages((prev) => [...prev, ...allNewPages]);
          setRenderState("ready");
        }
      } catch {
        if (!controller.signal.aborted) {
          setRenderError("Could not load one or more PDF files. Ensure they are valid PDFs.");
          setRenderState("error");
        }
      }
    });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validFileKey]);

  const handleSelectPage = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRemovePage = (id: string) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleClearAll = () => {
    abortRef.current?.abort();
    setFiles([]);
    setPages([]);
    setSelectedIds(new Set());
    setRenderState("idle");
    setRenderError(undefined);
  };

  const [isMerging, setIsMerging] = React.useState(false);

  const handleMergePdf = async () => {
    if (validFiles.length < 2 || isMerging) return;
    setIsMerging(true);
    try {
      const rawFiles = validFiles.map((f) => f.file);
      const mergedBytes = await mergePdfFiles(rawFiles);
      downloadBlob(mergedBytes, "merged-document.pdf", "application/pdf");
    } catch (err: unknown) {
      alert("Error merging PDFs: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsMerging(false);
    }
  };

  const canMerge = validFiles.length >= 2;

  return (
    <ToolPageLayout
      breadcrumbs={BREADCRUMBS}
      title={tool.name}
      description={tool.description}
      workspace={
        <div className="flex flex-col gap-6">
          {/* Upload area */}
          <FileDropzone
            accept={tool.accept}
            maxSize={tool.maxSizeBytes}
            multiple
            value={files}
            onChange={setFiles}
          />

          {/* Summary bar */}
          {pages.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900/40">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {pages.length} page{pages.length !== 1 ? "s" : ""}
                </span>{" "}
                across{" "}
                <span className="font-medium">
                  {validFiles.length} file{validFiles.length !== 1 ? "s" : ""}
                </span>
                {selectedIds.size > 0 && (
                  <> — <span className="font-medium">{selectedIds.size} selected</span></>
                )}
              </p>
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1.5 rounded-sm text-xs text-neutral-400 transition-colors hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 dark:text-neutral-500 dark:hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Clear all
              </button>
            </div>
          )}

          {/* Page grid */}
          <PdfPagePreview
            renderState={renderState}
            errorMessage={renderError}
          >
            {pages.length > 0 && (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    Pages
                  </h2>
                  {selectedIds.size > 0 && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {selectedIds.size} page{selectedIds.size !== 1 ? "s" : ""} selected
                    </p>
                  )}
                </div>
                <PdfPageGrid
                  pages={pages}
                  selectedIds={selectedIds}
                  showDragHandles={false}
                  showRemove
                  onSelectPage={handleSelectPage}
                  onRemovePage={handleRemovePage}
                  emptyState={
                    <p className="text-sm text-neutral-400 dark:text-neutral-500">
                      Add PDF files above to see page previews.
                    </p>
                  }
                />
              </>
            )}
          </PdfPagePreview>

          {/* Merge action */}
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="secondary"
                size="md"
                className="inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add more PDFs
              </Button>

              <Button
                type="button"
                variant="primary"
                size="md"
                disabled={!canMerge || isMerging}
                onClick={handleMergePdf}
                className="inline-flex items-center gap-2"
                aria-label={`Merge ${pages.length} PDF pages into one file`}
              >
                {isMerging ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Merging PDFs...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Merge PDF
                  </>
                )}
              </Button>
            </div>

            {!canMerge && validFiles.length === 0 && (
              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                Add at least two PDF files to merge.
              </p>
            )}
            {!canMerge && validFiles.length === 1 && (
              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                Add one more PDF file to enable merging.
              </p>
            )}
          </div>
        </div>
      }
    />
  );
}

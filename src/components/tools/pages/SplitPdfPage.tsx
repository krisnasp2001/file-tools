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
import { extractPdfPages, splitAllPdfPagesToZip, downloadBlob } from "@/lib/pdf/pdfOperations";
import { Scissors, CheckSquare, Square, Loader2 } from "lucide-react";

const tool = getToolBySlug("split-pdf")!;

const BREADCRUMBS = [
  { label: "Home", href: "/" },
  { label: "PDF", href: "/#tools" },
  { label: tool.name },
];

type SplitMode = "extract-selected" | "split-every-page";
type RenderState = "idle" | "loading" | "ready" | "error";

export function SplitPdfPage({ hideHeader }: { hideHeader?: boolean }) {
  const [files, setFiles] = React.useState<SelectedFileItem[]>([]);
  const [pages, setPages] = React.useState<PdfPageCardData[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [splitMode, setSplitMode] = React.useState<SplitMode>("extract-selected");
  const [renderState, setRenderState] = React.useState<RenderState>("idle");
  const [renderError, setRenderError] = React.useState<string | undefined>();
  const abortRef = React.useRef<AbortController | null>(null);

  const validFile = files.find((f) => f.status === "ready");
  const validFileId = validFile?.id;

  // Render thumbnails when the selected file changes
  React.useEffect(() => {
    if (!validFile) {
      // Defer to avoid synchronous setState inside effect body
      Promise.resolve().then(() => {
        setPages([]);
        setSelectedIds(new Set());
        setRenderState("idle");
        setRenderError(undefined);
      });
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Defer to avoid synchronous setState inside effect body
    Promise.resolve().then(() => {
      if (controller.signal.aborted) return;
      setRenderState("loading");

      renderPdfThumbnails(validFile.file, {
        thumbnailWidth: 180,
        signal: controller.signal,
      })
        .then((rendered) => {
          if (!controller.signal.aborted) {
            setPages(rendered);
            setSelectedIds(new Set());
            setRenderState("ready");
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setRenderError("Could not load this PDF. Make sure it is a valid, uncorrupted PDF file.");
            setRenderState("error");
          }
        });
    });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validFileId]);

  const handleSelectPage = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === pages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pages.map((p) => p.id)));
    }
  };

  const allSelected = pages.length > 0 && selectedIds.size === pages.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const canSplit =
    renderState === "ready" &&
    pages.length > 0 &&
    (splitMode === "split-every-page" || selectedIds.size > 0);

  const [isSplitting, setIsSplitting] = React.useState(false);

  const handleSplitPdf = async () => {
    if (!canSplit || !validFile || isSplitting) return;
    setIsSplitting(true);

    try {
      if (splitMode === "split-every-page") {
        const JSZipModule = await import("jszip");
        const JSZip = JSZipModule.default;
        const zipBlob = await splitAllPdfPagesToZip(validFile.file, JSZip);
        const baseName = validFile.name.replace(/\.[^/.]+$/, "");
        downloadBlob(zipBlob, `${baseName}-split-pages.zip`, "application/zip");
      } else {
        // Extract selected pages
        const selectedPageNumbers = pages
          .filter((p) => selectedIds.has(p.id))
          .map((p) => p.pageNumber);

        const pdfBytes = await extractPdfPages(validFile.file, selectedPageNumbers);
        const baseName = validFile.name.replace(/\.[^/.]+$/, "");
        downloadBlob(pdfBytes, `${baseName}-extracted.pdf`, "application/pdf");
      }
    } catch (err: unknown) {
      alert("Error splitting PDF: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSplitting(false);
    }
  };

  const splitLabel = () => {
    if (splitMode === "split-every-page") {
      return `Split into ${pages.length} file${pages.length !== 1 ? "s" : ""}`;
    }
    if (selectedIds.size === 0) return "Select pages to extract";
    return `Extract ${selectedIds.size} selected page${selectedIds.size !== 1 ? "s" : ""}`;
  };

  return (
    <ToolPageLayout hideHeader={hideHeader}
      breadcrumbs={BREADCRUMBS}
      title={tool.name}
      description={tool.description}
      workspace={
        <div className="flex flex-col gap-6">
          {/* Upload */}
          <FileDropzone
            accept={tool.accept}
            maxSize={tool.maxSizeBytes}
            multiple={false}
            value={files}
            onChange={setFiles}
          />

          {/* File metadata */}
          {validFile && (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm dark:border-neutral-800 dark:bg-neutral-900/40">
              <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                {validFile.name}
              </p>
              {renderState === "ready" && (
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                  {pages.length} page{pages.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          )}

          {/* Page grid */}
          <PdfPagePreview
            renderState={renderState}
            errorMessage={renderError}
          >
            {pages.length > 0 && (
              <>
                {/* Grid header with select-all */}
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    Pages
                    <span className="ml-2 text-xs font-normal text-neutral-500 dark:text-neutral-400">
                      ({pages.length} total
                      {selectedIds.size > 0 && `, ${selectedIds.size} selected`})
                    </span>
                  </h2>

                  {splitMode === "extract-selected" && (
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="inline-flex items-center gap-1.5 rounded-sm text-xs font-medium text-neutral-600 transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:text-neutral-400 dark:hover:text-neutral-100"
                      aria-label={allSelected ? "Deselect all pages" : "Select all pages"}
                    >
                      {allSelected ? (
                        <CheckSquare className="h-4 w-4" aria-hidden="true" />
                      ) : someSelected ? (
                        <Square className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                      ) : (
                        <Square className="h-4 w-4" aria-hidden="true" />
                      )}
                      {allSelected ? "Deselect all" : "Select all"}
                    </button>
                  )}
                </div>

                <PdfPageGrid
                  pages={pages}
                  selectedIds={
                    splitMode === "split-every-page"
                      ? new Set(pages.map((p) => p.id))
                      : selectedIds
                  }
                  showRemove={false}
                  onSelectPage={
                    splitMode === "extract-selected" ? handleSelectPage : undefined
                  }
                  emptyState={null}
                />

                {splitMode === "extract-selected" && pages.length > 0 && selectedIds.size === 0 && (
                  <p className="mt-3 text-xs text-neutral-400 dark:text-neutral-500">
                    Click pages to select them for extraction.
                  </p>
                )}
              </>
            )}
          </PdfPagePreview>

          {/* Split options + action */}
          {renderState === "ready" && pages.length > 0 && (
            <div className="flex flex-col gap-4 border-t border-neutral-200 pt-5 dark:border-neutral-800">
              <fieldset>
                <legend className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Split options
                </legend>
                <div className="flex flex-col gap-2">
                  {(
                    [
                      {
                        value: "extract-selected" as SplitMode,
                        label: "Extract selected pages",
                        description: "The pages you select above will be saved as a new PDF.",
                      },
                      {
                        value: "split-every-page" as SplitMode,
                        label: "Split every page",
                        description: "Each page becomes a separate PDF file.",
                      },
                    ] satisfies { value: SplitMode; label: string; description: string }[]
                  ).map((opt) => {
                    const isSelected = splitMode === opt.value;
                    return (
                      <label
                        key={opt.value}
                        className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
                          isSelected
                            ? "border-neutral-900 bg-neutral-50 dark:border-neutral-200 dark:bg-neutral-800/60"
                            : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600"
                        }`}
                      >
                        <input
                          type="radio"
                          name="split-mode"
                          value={opt.value}
                          checked={isSelected}
                          onChange={() => setSplitMode(opt.value)}
                          className="mt-0.5 shrink-0 accent-neutral-900 dark:accent-neutral-100"
                        />
                        <div>
                          <span className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                            {opt.label}
                          </span>
                          <span className="mt-0.5 block text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                            {opt.description}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <Button
                type="button"
                variant="primary"
                size="lg"
                disabled={!canSplit || isSplitting}
                onClick={handleSplitPdf}
                className="inline-flex w-full items-center justify-center gap-2"
                aria-label={splitLabel()}
              >
                {isSplitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Processing PDF...
                  </>
                ) : (
                  <>
                    <Scissors className="h-4 w-4" aria-hidden="true" />
                    {splitLabel()}
                  </>
                )}
              </Button>

            </div>
          )}
        </div>
      }
    />
  );
}

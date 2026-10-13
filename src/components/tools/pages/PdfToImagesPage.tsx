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
import { downloadBlob } from "@/lib/pdf/pdfOperations";
import { Loader2, Image as ImageIcon } from "lucide-react";

const tool = getToolBySlug("pdf-to-images")!;

const BREADCRUMBS = [
  { label: "Home", href: "/" },
  { label: "PDF", href: "/#tools" },
  { label: tool.name },
];

type RenderState = "idle" | "loading" | "ready" | "error";

export function PdfToImagesPage({ hideHeader }: { hideHeader?: boolean }) {
  const [files, setFiles] = React.useState<SelectedFileItem[]>([]);
  const [pages, setPages] = React.useState<PdfPageCardData[]>([]);
  const [renderState, setRenderState] = React.useState<RenderState>("idle");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isConverting, setIsConverting] = React.useState(false);
  const [quality, setQuality] = React.useState<number>(0.9);
  const [imageFormat, setImageFormat] = React.useState<"jpeg" | "png" | "webp">("jpeg");

  const abortRef = React.useRef<AbortController | null>(null);

  const validFiles = files.filter((f) => f.status === "ready");
  const validFileId = validFiles[0]?.file.name;

  React.useEffect(() => {
    if (validFiles.length === 0) {
      Promise.resolve().then(() => {
        setPages([]);
        setRenderState("idle");
        setErrorMessage(null);
      });
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    Promise.resolve().then(() => {
      setRenderState("loading");
      setErrorMessage(null);

      renderPdfThumbnails(validFiles[0].file, {
        thumbnailWidth: 260,
        signal: controller.signal,
      })
        .then((renderedPages) => {
          if (!controller.signal.aborted) {
            setPages(renderedPages);
            setRenderState("ready");
          }
        })
        .catch((err) => {
          if (!controller.signal.aborted) {
            setErrorMessage(err?.message ?? "Failed to load PDF pages.");
            setRenderState("error");
          }
        });
    });

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validFileId]);

  const handleConvertAndDownload = async () => {
    if (validFiles.length === 0) return;
    setIsConverting(true);

    try {
      const file = validFiles[0].file;
      const pdfjsLib = await import("pdfjs-dist");
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      }

      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const JSZipModule = await import("jszip");
      const JSZip = JSZipModule.default;
      const zip = new JSZip();

      const baseName = file.name.replace(/\.[^/.]+$/, "");

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 }); // High-res for export
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext("2d");
        if (ctx) {
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        }

        const dataUrl = canvas.toDataURL(`image/${imageFormat}`, quality);
        const base64Data = dataUrl.replace(/^data:image\/(jpeg|png|webp);base64,/, "");
        const ext = imageFormat === "jpeg" ? "jpg" : imageFormat;
        zip.file(`${baseName}-page-${i}.${ext}`, base64Data, { base64: true });
        page.cleanup();
      }

      await pdf.cleanup();
      await loadingTask.destroy();

      if (pdf.numPages === 1) {
        const ext = imageFormat === "jpeg" ? "jpg" : imageFormat;
        const zipFile = zip.file(`${baseName}-page-1.${ext}`);
        if (zipFile) {
          const blob = await zipFile.async("blob");
          downloadBlob(blob, `${baseName}-page-1.${ext}`, `image/${imageFormat}`);
        }
      } else {
        const zipBlob = await zip.generateAsync({ type: "blob" });
        downloadBlob(zipBlob, `${baseName}-images.zip`, "application/zip");
      }
    } catch (err: unknown) {
      alert("Error converting PDF to Images: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsConverting(false);
    }
  };

  const canConvert = validFiles.length > 0 && renderState === "ready" && pages.length > 0;

  return (
    <ToolPageLayout hideHeader={hideHeader}
      breadcrumbs={BREADCRUMBS}
      title={tool.name}
      description={tool.description}
      workspace={
        <div className="flex flex-col gap-6">
          <FileDropzone
            accept={[".pdf", "application/pdf"]}
            maxSize={50 * 1024 * 1024}
            multiple={false}
            value={files}
            onChange={setFiles}
          />

          {validFiles.length > 0 && (
            <PdfPagePreview
              renderState={renderState}
              errorMessage={errorMessage ?? undefined}
            >
              <PdfPageGrid pages={pages} />
            </PdfPagePreview>
          )}
        </div>
      }
      settings={
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Image Format
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "JPG", value: "jpeg" as const },
                { label: "PNG", value: "png" as const },
                { label: "WebP", value: "webp" as const },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setImageFormat(opt.value)}
                  className={`rounded-md border py-2 text-xs font-medium transition-colors ${imageFormat === opt.value
                      ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                      : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400"
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Output Quality
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Standard", value: 0.75 },
                { label: "High", value: 0.9 },
                { label: "Maximum", value: 1.0 },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setQuality(opt.value)}
                  className={`rounded-md border py-2 text-xs font-medium transition-colors ${quality === opt.value
                      ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                      : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400"
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Each page will be rendered as a crisp 300-DPI equivalent image.
            </p>
          </div>

          <Button
            type="button"
            variant="primary"
            size="lg"
            disabled={!canConvert || isConverting}
            onClick={handleConvertAndDownload}
            className="inline-flex w-full items-center justify-center gap-2"
          >
            {isConverting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Converting pages...
              </>
            ) : (
              <>
                <ImageIcon className="h-4 w-4" aria-hidden="true" />
                Convert to {imageFormat === "jpeg" ? "JPG" : imageFormat.toUpperCase()} {pages.length > 0 ? `(${pages.length} Pages)` : ""}
              </>
            )}
          </Button>

          {pages.length > 1 && (
            <p className="text-center text-xs text-neutral-400">
              Multiple pages will be downloaded together as a ZIP archive.
            </p>
          )}
        </div>
      }
    />
  );
}

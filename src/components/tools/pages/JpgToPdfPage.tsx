"use client";

import * as React from "react";
import { ToolPageLayout } from "@/components/tools/ToolPageLayout";
import { FileDropzone } from "@/components/file-upload/FileDropzone";
import { ImageFitPreview } from "@/components/pdf/ImageFitPreview";
import { Button } from "@/components/ui/Button";
import { SelectedFileItem } from "@/lib/file/types";
import {
  PAGE_SIZES,
  DEFAULT_IMAGE_TO_PDF_CONFIG,
  ImageToPdfConfig,
  ImageFittingOption,
  PageOrientation,
} from "@/lib/pdf/pageSizes";
import { getToolBySlug } from "@/lib/tools/registry";
import { convertImagesToPdf, downloadBlob } from "@/lib/pdf/pdfOperations";
import { FileImage, Download, RotateCw, ChevronDown, Loader2, X } from "lucide-react";

const tool = getToolBySlug("jpg-to-pdf")!;

const BREADCRUMBS = [
  { label: "Home", href: "/" },
  { label: "PDF", href: "/#tools" },
  { label: tool.name },
];

const FITTING_OPTIONS: { value: ImageFittingOption; label: string; description: string }[] = [
  {
    value: "fit-to-page",
    label: "Fit to page",
    description: "Scale the image to fill the page while preserving its aspect ratio.",
  },
  {
    value: "original-size",
    label: "Keep original size",
    description: "Place the image at its natural size. If it exceeds the page, it is scaled down to fit.",
  },
];

const MARGIN_OPTIONS = [
  { value: 0, label: "No margin" },
  { value: 5, label: "5mm margin" },
  { value: 10, label: "10mm margin" },
  { value: 20, label: "20mm margin" },
];

export function JpgToPdfPage({ hideHeader }: { hideHeader?: boolean }) {
  const [files, setFiles] = React.useState<SelectedFileItem[]>([]);
  const [config, setConfig] = React.useState<ImageToPdfConfig>(DEFAULT_IMAGE_TO_PDF_CONFIG);

  // First image preview data
  const [previewImageUrl, setPreviewImageUrl] = React.useState<string | undefined>();
  const [previewDims, setPreviewDims] = React.useState<{ w: number; h: number } | undefined>();

  const firstValidId = files.find((f) => f.status === "ready")?.id;
  const firstValidFile = files.find((f) => f.status === "ready");

  // Load object URL and image dimensions when first valid file changes
  React.useEffect(() => {
    if (!firstValidFile) {
      // No valid file — clear preview asynchronously to avoid synchronous setState in effect
      const id = setTimeout(() => {
        setPreviewImageUrl(undefined);
        setPreviewDims(undefined);
      }, 0);
      return () => clearTimeout(id);
    }

    const url = URL.createObjectURL(firstValidFile.file);
    let cancelled = false;

    const img = new window.Image();
    img.onload = () => {
      if (!cancelled) {
        setPreviewImageUrl(url);
        setPreviewDims({ w: img.naturalWidth, h: img.naturalHeight });
      }
    };
    img.src = url;

    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstValidId]);

  const validFiles = files.filter((f) => f.status === "ready");

  return (
    <ToolPageLayout hideHeader={hideHeader}
      breadcrumbs={BREADCRUMBS}
      title={tool.name}
      description={tool.description}
      workspace={
        <WorkspaceArea
          files={files}
          setFiles={setFiles}
          validFiles={validFiles}
          config={config}
          previewImageUrl={previewImageUrl}
          previewDims={previewDims}
        />
      }
      settings={
        <SettingsPanel
          config={config}
          setConfig={setConfig}
          validFiles={validFiles}
          previewImageUrl={previewImageUrl}
          previewDims={previewDims}
        />
      }
    />
  );
}

// ─── Workspace ────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function WorkspaceArea({
  files,
  setFiles,
  validFiles,
}: {
  files: SelectedFileItem[];
  setFiles: (f: SelectedFileItem[]) => void;
  validFiles: SelectedFileItem[];
  config: ImageToPdfConfig;
  previewImageUrl?: string;
  previewDims?: { w: number; h: number };
}) {
  const [previewUrls, setPreviewUrls] = React.useState<Record<string, string>>({});

  // Generate object URLs for all valid files
  React.useEffect(() => {
    const newUrls: Record<string, string> = {};
    for (const f of validFiles) {
      newUrls[f.id] = URL.createObjectURL(f.file);
    }
    Promise.resolve().then(() => {
      setPreviewUrls(newUrls);
    });

    return () => {
      for (const url of Object.values(newUrls)) {
        URL.revokeObjectURL(url);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validFiles.map((f) => f.id).join(",")]);

  const handleRemove = (id: string) => {
    setFiles(files.filter((f) => f.id !== id));
  };

  return (
    <div className="flex flex-col gap-4">
      <FileDropzone
        accept={tool.accept}
        maxSize={tool.maxSizeBytes}
        multiple
        value={files}
        onChange={setFiles}
      />

      {validFiles.length === 0 && (
        <p className="text-xs text-neutral-400 dark:text-neutral-500">
          Supported formats: JPG, JPEG, PNG. Maximum 50MB per file.
        </p>
      )}

      {validFiles.length > 0 && (
        <div className="flex flex-col gap-3">
          {/* Summary badge */}
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-400">
            <span className="font-medium text-neutral-800 dark:text-neutral-200">
              {validFiles.length} image{validFiles.length !== 1 ? "s" : ""}
            </span>{" "}
            ready to convert. Configure the settings and click{" "}
            <span className="font-medium">Create PDF</span>.
          </div>

          {/* Image preview grid */}
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            }}
            aria-label="Uploaded images preview"
          >
            {validFiles.map((file, index) => {
              const url = previewUrls[file.id];
              return (
                <div
                  key={file.id}
                  className="group relative flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-square w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt={file.file.name}
                        className="h-full w-full object-cover"
                        draggable={false}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <FileImage className="h-8 w-8 text-neutral-300 dark:text-neutral-600" aria-hidden="true" />
                      </div>
                    )}

                    {/* Page number badge */}
                    <span className="absolute left-1.5 top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded bg-black/60 px-1 text-[10px] font-semibold text-white">
                      {index + 1}
                    </span>

                    {/* Remove button */}
                    <button
                      type="button"
                      aria-label={`Remove ${file.file.name}`}
                      onClick={() => handleRemove(file.id)}
                      className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded bg-black/60 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </div>

                  {/* File info */}
                  <div className="px-2 py-1.5">
                    <p
                      className="truncate text-[11px] font-medium text-neutral-700 dark:text-neutral-300"
                      title={file.file.name}
                    >
                      {file.file.name}
                    </p>
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
                      {formatBytes(file.file.size)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Settings Panel ────────────────────────────────────────────────────────────

function SettingsPanel({
  config,
  setConfig,
  validFiles,
  previewImageUrl,
  previewDims,
}: {
  config: ImageToPdfConfig;
  setConfig: React.Dispatch<React.SetStateAction<ImageToPdfConfig>>;
  validFiles: SelectedFileItem[];
  previewImageUrl?: string;
  previewDims?: { w: number; h: number };
}) {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const canCreate = validFiles.length > 0;

  const handleCreatePdf = async () => {
    if (!canCreate || isGenerating) return;
    setIsGenerating(true);
    try {
      const rawFiles = validFiles.map((f) => f.file);
      const pdfBytes = await convertImagesToPdf(rawFiles, {
        pageSizeId: config.pageSizeId,
        orientation: config.orientation,
        fitting: config.fitting === "original-size" ? "original" : "fit-page",
        marginMm: config.marginMm,
      });

      downloadBlob(pdfBytes, "converted-images.pdf", "application/pdf");
    } catch (err: unknown) {
      alert("Error generating PDF: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsGenerating(false);
    }
  };

  const setProp = <K extends keyof ImageToPdfConfig>(key: K, val: ImageToPdfConfig[K]) =>
    setConfig((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="flex flex-col gap-6">
      {/* Page size preview */}
      <div className="flex justify-center">
        <ImageFitPreview
          imageUrl={previewImageUrl}
          imageNaturalWidth={previewDims?.w}
          imageNaturalHeight={previewDims?.h}
          pageSizeId={config.pageSizeId}
          orientation={config.orientation}
          fitting={config.fitting}
          marginMm={config.marginMm}
        />
      </div>

      {/* Settings block */}
      <div className="flex flex-col gap-5">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          <FileImage className="h-4 w-4" aria-hidden="true" />
          PDF Settings
        </h2>

        {/* Paper Size */}
        <fieldset>
          <legend className="mb-2 text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Paper size
          </legend>
          <div className="relative">
            <select
              aria-label="Paper size"
              value={config.pageSizeId}
              onChange={(e) => setProp("pageSizeId", e.target.value)}
              className="w-full appearance-none rounded-md border border-neutral-300 bg-white py-2 pl-3 pr-8 text-sm text-neutral-900 shadow-sm transition-colors focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size.id} value={size.id}>
                  {size.name} — {size.description}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
              aria-hidden="true"
            />
          </div>
        </fieldset>

        {/* Orientation */}
        <fieldset>
          <legend className="mb-2 text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Orientation
          </legend>
          <div className="flex gap-2">
            {(["portrait", "landscape"] as PageOrientation[]).map((dir) => (
              <button
                key={dir}
                type="button"
                onClick={() => setProp("orientation", dir)}
                aria-pressed={config.orientation === dir}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border py-1.5 text-xs font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 ${
                  config.orientation === dir
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                    : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800"
                }`}
              >
                <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                {dir}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Image Fitting */}
        <fieldset>
          <legend className="mb-2 text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Image fitting
          </legend>
          <div className="flex flex-col gap-2">
            {FITTING_OPTIONS.map((opt) => {
              const isSelected = config.fitting === opt.value;
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
                    name="fitting"
                    value={opt.value}
                    checked={isSelected}
                    onChange={() => setProp("fitting", opt.value)}
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

        {/* Margin */}
        <fieldset>
          <legend className="mb-2 text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Page margin
          </legend>
          <div className="flex flex-wrap gap-2">
            {MARGIN_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setProp("marginMm", opt.value)}
                aria-pressed={config.marginMm === opt.value}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 ${
                  config.marginMm === opt.value
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                    : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      {/* Action */}
      <Button
        type="button"
        variant="primary"
        size="lg"
        disabled={!canCreate || isGenerating}
        onClick={handleCreatePdf}
        className="w-full"
        aria-label={`Create PDF from ${validFiles.length} image${validFiles.length !== 1 ? "s" : ""}`}
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Creating PDF...
          </>
        ) : (
          <>
            <Download className="h-4 w-4" aria-hidden="true" />
            {canCreate
              ? `Create PDF from ${validFiles.length} image${validFiles.length !== 1 ? "s" : ""}`
              : "Add images to create PDF"}
          </>
        )}
      </Button>

      {!canCreate && (
        <p className="text-center text-xs text-neutral-400 dark:text-neutral-500">
          Add at least one image above to enable conversion.
        </p>
      )}
    </div>
  );
}

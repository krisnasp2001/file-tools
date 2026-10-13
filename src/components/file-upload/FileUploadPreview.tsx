"use client";

import * as React from "react";
import { FileDropzone } from "@/components/file-upload/FileDropzone";

export function FileUploadPreview() {
  return (
    <section
      className="mt-14 rounded-xl border border-dashed border-neutral-300 bg-neutral-50/40 p-6 sm:p-8 dark:border-neutral-800 dark:bg-neutral-900/20"
      aria-labelledby="preview-heading"
    >
      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="inline-block rounded bg-neutral-200/80 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
            Preview / Development Component
          </span>
          <h2
            id="preview-heading"
            className="mt-2 text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-100"
          >
            File Upload & Validation Preview
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Test selecting, dragging, validating, and managing files client-side. Files stay 100% in your browser.
          </p>
        </div>
      </div>

      <FileDropzone
        multiple={true}
        maxSize={50 * 1024 * 1024} // 50 MB
        accept={[
          "image/*",
          ".pdf",
          ".csv",
          ".json",
          ".txt",
          "application/pdf",
        ]}
      />
    </section>
  );
}

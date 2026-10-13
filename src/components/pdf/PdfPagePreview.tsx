"use client";

import * as React from "react";
import { FileText, Loader2 } from "lucide-react";

export type PdfRenderState = "idle" | "loading" | "ready" | "error";

export interface PdfPagePreviewProps {
  renderState: PdfRenderState;
  errorMessage?: string;
  /** Slot rendered on top of / alongside pages — e.g. grid selection UI */
  children?: React.ReactNode;
  className?: string;
}

/**
 * PdfPagePreview
 *
 * Container for displaying the current state of PDF page rendering.
 * Handles idle, loading, error, and ready states.
 * The actual page grid is passed via children to keep this component decoupled.
 */
export function PdfPagePreview({
  renderState,
  errorMessage,
  children,
  className = "",
}: PdfPagePreviewProps) {
  return (
    <div className={`w-full ${className}`}>
      {renderState === "loading" && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 py-16 text-center dark:border-neutral-800 dark:bg-neutral-900/40">
          <Loader2
            className="h-6 w-6 animate-spin text-neutral-400 dark:text-neutral-500"
            aria-hidden="true"
          />
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Loading PDF pages…
          </p>
        </div>
      )}

      {renderState === "error" && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-red-200 bg-red-50 py-16 text-center dark:border-red-900/40 dark:bg-red-950/20">
          <FileText
            className="h-6 w-6 text-red-400 dark:text-red-500"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            Failed to load PDF
          </p>
          {errorMessage && (
            <p className="max-w-xs text-xs text-red-500 dark:text-red-400/70">
              {errorMessage}
            </p>
          )}
        </div>
      )}

      {(renderState === "ready" || renderState === "idle") && children}
    </div>
  );
}

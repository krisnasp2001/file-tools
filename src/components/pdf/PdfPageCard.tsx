"use client";

import * as React from "react";
import { Check, Trash2, GripVertical } from "lucide-react";

export interface PdfPageCardData {
  /** Unique identifier for this page entry */
  id: string;
  /** 1-based page number within this PDF file */
  pageNumber: number;
  /** Total pages in the source file */
  totalPages: number;
  /** Source filename */
  sourceFileName: string;
  /** Optional rendered thumbnail URL (object URL or data URL) */
  thumbnailUrl?: string;
}

export interface PdfPageCardProps {
  page: PdfPageCardData;
  isSelected?: boolean;
  showDragHandle?: boolean;
  showRemove?: boolean;
  onSelect?: (id: string) => void;
  onRemove?: (id: string) => void;
  className?: string;
}

export function PdfPageCard({
  page,
  isSelected = false,
  showDragHandle = false,
  showRemove = false,
  onSelect,
  onRemove,
  className = "",
}: PdfPageCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onSelect?.(page.id);
    }
  };

  return (
    <div
      className={`group relative flex flex-col items-center gap-2 ${className}`}
    >
      {/* Drag handle — only shown when reordering is available */}
      {showDragHandle && (
        <div
          className="absolute -left-5 top-1/2 -translate-y-1/2 cursor-grab text-neutral-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-neutral-600"
          aria-hidden="true"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}

      {/* Page thumbnail card */}
      <div
        role="checkbox"
        aria-checked={isSelected}
        aria-label={`Page ${page.pageNumber} from ${page.sourceFileName}`}
        tabIndex={onSelect ? 0 : -1}
        onClick={() => onSelect?.(page.id)}
        onKeyDown={handleKeyDown}
        className={`relative flex w-full cursor-pointer flex-col overflow-hidden rounded border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 ${
          isSelected
            ? "border-neutral-900 shadow-sm dark:border-neutral-200"
            : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-500"
        }`}
        style={{ aspectRatio: "0.707" }} /* A4 portrait ratio ≈ 1/√2 */
      >
        {/* Thumbnail area */}
        {page.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={page.thumbnailUrl}
            alt={`Preview of page ${page.pageNumber}`}
            className="h-full w-full object-contain bg-white dark:bg-neutral-50"
            loading="lazy"
          />
        ) : (
          /* Placeholder skeleton when thumbnail not yet rendered */
          <div className="flex h-full w-full items-center justify-center bg-neutral-50 dark:bg-neutral-800/60">
            <div className="flex flex-col items-center gap-1.5 text-neutral-300 dark:text-neutral-600">
              <div className="h-8 w-6 rounded-sm border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-700/60" />
              <div className="h-1.5 w-10 rounded-full bg-neutral-200 dark:bg-neutral-700" />
              <div className="h-1.5 w-8 rounded-full bg-neutral-200 dark:bg-neutral-700" />
            </div>
          </div>
        )}

        {/* Selected overlay check indicator */}
        {isSelected && (
          <>
            <div className="pointer-events-none absolute inset-0 bg-neutral-900/10 dark:bg-neutral-100/10" />
            <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-neutral-50 shadow dark:bg-neutral-100 dark:text-neutral-900">
              <Check className="h-3 w-3" aria-hidden="true" />
            </div>
          </>
        )}

        {/* Remove button overlay */}
        {showRemove && (
          <button
            type="button"
            aria-label={`Remove page ${page.pageNumber} from ${page.sourceFileName}`}
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.(page.id);
            }}
            className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-neutral-500 opacity-0 shadow transition-opacity hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 group-hover:opacity-100 dark:bg-neutral-900/90 dark:text-neutral-400 dark:hover:bg-red-950 dark:hover:text-red-400"
          >
            <Trash2 className="h-3 w-3" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Caption */}
      <div className="flex w-full flex-col items-center gap-0.5">
        <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
          Page {page.pageNumber}
        </span>
        {page.totalPages > 0 && (
          <span
            className="max-w-full truncate text-center text-[10px] text-neutral-400 dark:text-neutral-500"
            title={page.sourceFileName}
          >
            {page.sourceFileName}
          </span>
        )}
      </div>
    </div>
  );
}

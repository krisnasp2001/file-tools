"use client";

import * as React from "react";
import { PdfPageCard, PdfPageCardData } from "./PdfPageCard";

export interface PdfPageGridProps {
  pages: PdfPageCardData[];
  selectedIds?: Set<string>;
  showDragHandles?: boolean;
  showRemove?: boolean;
  onSelectPage?: (id: string) => void;
  onRemovePage?: (id: string) => void;
  emptyState?: React.ReactNode;
  className?: string;
}

export function PdfPageGrid({
  pages,
  selectedIds = new Set(),
  showDragHandles = false,
  showRemove = false,
  onSelectPage,
  onRemovePage,
  emptyState,
  className = "",
}: PdfPageGridProps) {
  if (pages.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-200 py-16 text-center dark:border-neutral-800 ${className}`}>
        {emptyState ?? (
          <p className="text-sm text-neutral-400 dark:text-neutral-500">
            No pages to display.
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      aria-label="PDF page grid"
      className={`grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5 ${className}`}
    >
      {pages.map((page) => (
        <PdfPageCard
          key={page.id}
          page={page}
          isSelected={selectedIds.has(page.id)}
          showDragHandle={showDragHandles}
          showRemove={showRemove}
          onSelect={onSelectPage}
          onRemove={onRemovePage}
        />
      ))}
    </div>
  );
}

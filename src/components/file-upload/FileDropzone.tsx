"use client";

import * as React from "react";
import { Upload, FileUp } from "lucide-react";
import { SelectedFileItem } from "@/lib/file/types";
import {
  validateFileSize,
  validateFileType,
  generateFileFingerprint,
} from "@/lib/file/validation";
import { Button } from "@/components/ui/Button";
import { FileList } from "./FileList";
import { useTranslation } from "@/lib/i18n/context";

export interface FileDropzoneProps {
  accept?: string[];
  maxSize?: number; // Maximum size in bytes
  multiple?: boolean;
  value?: SelectedFileItem[];
  onChange?: (files: SelectedFileItem[]) => void;
  className?: string;
  disabled?: boolean;
}

export function FileDropzone({
  accept,
  maxSize,
  multiple = false,
  value,
  onChange,
  className = "",
  disabled = false,
}: FileDropzoneProps) {
  const { t } = useTranslation();
  const [internalFiles, setInternalFiles] = React.useState<SelectedFileItem[]>([]);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  // Controlled or uncontrolled support
  const files = value !== undefined ? value : internalFiles;

  const updateFiles = React.useCallback(
    (newFiles: SelectedFileItem[]) => {
      if (value === undefined) {
        setInternalFiles(newFiles);
      }
      onChange?.(newFiles);
    },
    [value, onChange]
  );

  const processIncomingFiles = React.useCallback(
    (incomingList: FileList | File[]) => {
      const incomingArray = Array.from(incomingList);
      if (incomingArray.length === 0) return;

      const targetIncoming = multiple ? incomingArray : [incomingArray[0]];

      // Existing fingerprints to prevent accidental duplicates
      const existingFingerprints = new Set(
        multiple ? files.map((f) => generateFileFingerprint(f.file)) : []
      );

      const processedNewItems: SelectedFileItem[] = [];

      for (const file of targetIncoming) {
        const fingerprint = generateFileFingerprint(file);
        if (multiple && existingFingerprints.has(fingerprint)) {
          continue; // Skip exact duplicate
        }
        existingFingerprints.add(fingerprint);

        // Perform lightweight validations
        let error: string | undefined;

        if (accept && accept.length > 0) {
          const typeCheck = validateFileType(file, accept);
          if (!typeCheck.valid) {
            error = typeCheck.error;
          }
        }

        if (!error && maxSize !== undefined) {
          const sizeCheck = validateFileSize(file, maxSize);
          if (!sizeCheck.valid) {
            error = sizeCheck.error;
          }
        }

        processedNewItems.push({
          id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          status: error ? "error" : "ready",
          error,
        });
      }

      const nextFiles = multiple
        ? [...files, ...processedNewItems]
        : processedNewItems;

      updateFiles(nextFiles);
    },
    [accept, maxSize, multiple, files, updateFiles]
  );

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsDragOver(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Only turn off if leaving the dropzone container itself
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processIncomingFiles(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processIncomingFiles(e.target.files);
    }
    // Reset input value so re-selecting the exact same file can still trigger change if removed
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleRemove = React.useCallback(
    (id: string) => {
      const next = files.filter((item) => item.id !== id);
      updateFiles(next);
    },
    [files, updateFiles]
  );

  const handleClearAll = React.useCallback(() => {
    updateFiles([]);
  }, [updateFiles]);

  const handleTriggerPicker = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  };

  const acceptString = accept ? accept.join(",") : undefined;

  return (
    <div className={`w-full ${className}`}>
      {/* Dropzone container */}
      <div
        role="region"
        aria-label="File upload dropzone"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleTriggerPicker}
        className={`group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all cursor-pointer select-none sm:p-12 ${
          isDragOver
            ? "border-neutral-900 bg-neutral-100/70 dark:border-neutral-100 dark:bg-neutral-800/60"
            : "border-neutral-300 bg-neutral-50/50 hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/30 dark:hover:border-neutral-700 dark:hover:bg-neutral-900/60"
        } ${disabled ? "pointer-events-none opacity-50" : ""}`}
      >
        {/* Visually hidden but fully accessible native file input */}
        <input
          ref={inputRef}
          type="file"
          accept={acceptString}
          multiple={multiple}
          onChange={handleInputChange}
          disabled={disabled}
          className="sr-only"
          tabIndex={0}
          aria-label={
            multiple
              ? "Choose files to upload"
              : "Choose a file to upload"
          }
        />

        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 transition-transform group-hover:scale-105 dark:bg-neutral-800 dark:text-neutral-300">
          {isDragOver ? (
            <FileUp className="h-6 w-6 text-neutral-900 dark:text-neutral-100" aria-hidden="true" />
          ) : (
            <Upload className="h-6 w-6" aria-hidden="true" />
          )}
        </div>

        <p className="mt-4 text-sm font-semibold text-neutral-900 sm:text-base dark:text-neutral-100">
          {isDragOver ? t.common.dropFilesToAdd : t.common.dropFilesHere}
        </p>

        <p className="mt-1 text-xs text-neutral-500 sm:text-sm dark:text-neutral-400">
          {multiple ? t.common.orChooseFiles : t.common.orChooseFile}
        </p>

        <div className="mt-5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleTriggerPicker();
            }}
          >
            {t.common.browseFiles}
          </Button>
        </div>

        {accept && accept.length > 0 && (
          <p className="mt-3 text-[11px] text-neutral-400 dark:text-neutral-500">
            {t.common.supportedFormats}: {accept.join(", ")}
          </p>
        )}
      </div>

      {/* Render selected files */}
      <FileList
        files={files}
        onRemove={handleRemove}
        onClearAll={handleClearAll}
      />
    </div>
  );
}

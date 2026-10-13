import * as React from "react";
import {
  FileText,
  FileImage,
  FileSpreadsheet,
  FileVideo,
  FileAudio,
  File as FileGeneric,
  X,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { SelectedFileItem } from "@/lib/file/types";
import { formatFileSize } from "@/lib/file/validation";
import { sanitizeFilename } from "@/lib/security/sanitize";
import { IconButton } from "@/components/ui/IconButton";

export interface FileItemProps {
  item: SelectedFileItem;
  onRemove: (id: string) => void;
}

function renderFileIcon(type: string, name: string) {
  const mime = type.toLowerCase();
  const lowerName = name.toLowerCase();

  if (mime.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|svg|bmp)$/.test(lowerName)) {
    return <FileImage className="h-5 w-5" aria-hidden="true" />;
  }
  if (mime.includes("pdf") || lowerName.endsWith(".pdf")) {
    return <FileText className="h-5 w-5" aria-hidden="true" />;
  }
  if (
    mime.includes("sheet") ||
    mime.includes("csv") ||
    /\.(csv|xlsx|xls|json)$/.test(lowerName)
  ) {
    return <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />;
  }
  if (mime.startsWith("video/") || /\.(mp4|webm|mkv|mov|avi)$/.test(lowerName)) {
    return <FileVideo className="h-5 w-5" aria-hidden="true" />;
  }
  if (mime.startsWith("audio/") || /\.(mp3|wav|ogg|flac|m4a)$/.test(lowerName)) {
    return <FileAudio className="h-5 w-5" aria-hidden="true" />;
  }
  return <FileGeneric className="h-5 w-5" aria-hidden="true" />;
}

export function FileItem({ item, onRemove }: FileItemProps) {
  const safeName = sanitizeFilename(item.name);
  const isError = item.status === "error";

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg border p-3 text-sm transition-colors ${
        isError
          ? "border-red-300 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20"
          : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
            isError
              ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
              : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
          }`}
        >
          {renderFileIcon(item.type, item.name)}
        </div>

        <div className="min-w-0 flex-1">
          <p
            className="truncate font-medium text-neutral-900 dark:text-neutral-100"
            title={safeName}
          >
            {safeName}
          </p>

          <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <span>{formatFileSize(item.size)}</span>

            {isError ? (
              <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.error || "Invalid file"}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400">
                <CheckCircle className="h-3 w-3 text-neutral-400 dark:text-neutral-500" aria-hidden="true" />
                <span>Ready</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0">
        <IconButton
          type="button"
          aria-label={`Remove ${safeName}`}
          variant="ghost"
          size="sm"
          onClick={() => onRemove(item.id)}
          className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </IconButton>
      </div>
    </div>
  );
}

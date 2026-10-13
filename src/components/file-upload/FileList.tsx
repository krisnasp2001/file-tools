import * as React from "react";
import { Trash2 } from "lucide-react";
import { SelectedFileItem } from "@/lib/file/types";
import { FileItem } from "./FileItem";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/context";

export interface FileListProps {
  files: SelectedFileItem[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

export function FileList({ files, onRemove, onClearAll }: FileListProps) {
  const { t } = useTranslation();

  if (files.length === 0) {
    return null;
  }

  const validFilesCount = files.filter((f) => f.status === "ready").length;

  return (
    <div className="mt-6 flex flex-col gap-3" aria-label="Selected files list">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {t.common.selectedFiles} ({files.length}
          {validFilesCount !== files.length ? ` • ${validFilesCount} valid` : ""})
        </span>

        {files.length > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="text-xs text-neutral-500 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {t.common.clearAll}
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {files.map((item) => (
          <FileItem key={item.id} item={item} onRemove={onRemove} />
        ))}
      </div>
    </div>
  );
}

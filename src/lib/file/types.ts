export type FileItemStatus = "ready" | "processing" | "completed" | "error";

export interface SelectedFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: FileItemStatus;
  error?: string;
}

export interface FileValidationConfig {
  maxSize?: number; // Maximum size in bytes
  accept?: string[]; // Array of MIME types or file extensions (e.g. ['image/png', '.jpg'])
}

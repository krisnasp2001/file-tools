export type ToolCategory =
  | "image"
  | "pdf"
  | "document"
  | "data"
  | "audio-video";

export interface ToolMeta {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  href: string;
  isAvailable?: boolean;
}

export type ProcessingStatus = "idle" | "processing" | "success" | "error";

export interface FileProcessingState {
  status: ProcessingStatus;
  progress?: number;
  error?: string | null;
}

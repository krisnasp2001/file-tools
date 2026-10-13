
export type ToolCategory =
  | "image"
  | "pdf"
  | "document"
  | "data"
  | "audio-video";

export interface ToolDefinition {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  category: ToolCategory;
  categoryLabel: string;
  inputTypes: string[]; // e.g. [".jpg", ".jpeg", ".png"] or ["image/jpeg", "image/png"]
  outputTypes: string[]; // e.g. [".pdf"]
  accept: string[]; // For FileDropzone validation
  maxFiles?: number;
  maxSizeBytes?: number; // Optional size limit (e.g. 50MB)
  route: string;
  iconName: string;
  isAvailable: boolean;
  badge?: string;
}

export interface CategoryDefinition {
  id: ToolCategory;
  name: string;
  description: string;
  iconName: string;
}

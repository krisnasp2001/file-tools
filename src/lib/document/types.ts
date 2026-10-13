export type DocumentCategory = 
  | "word-processing"
  | "spreadsheet"
  | "presentation"
  | "ebook"
  | "pdf";

export type SupportStatus = "supported" | "experimental" | "unsupported";

export interface DocumentFormatDefinition {
  extension: string;
  mimeTypes: string[];
  category: DocumentCategory;
  displayName: string;
  browserSupport: SupportStatus;
  readSupport: boolean;
  writeSupport: boolean;
  conversionSupport: boolean;
  previewSupport: boolean;
  notes?: string;
  isLegacyBinary?: boolean;
  isProprietaryPackage?: boolean;
}

export interface DocumentMetadata {
  title?: string;
  author?: string;
  createdAt?: string;
  pageCount?: number;
  wordCount?: number;
}

export interface DocumentParagraph {
  text: string;
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  isListItem?: boolean;
}

export interface ParsedDocument {
  metadata: DocumentMetadata;
  paragraphs: DocumentParagraph[];
  rawText: string;
  html?: string;
  hasImages?: boolean;
  isScannedPdf?: boolean;
}

export interface TableRow {
  cells: string[];
}

export interface ExtractedTable {
  headers?: string[];
  rows: TableRow[];
}

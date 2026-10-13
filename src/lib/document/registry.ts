import { DocumentFormatDefinition } from "./types";

export const DOCUMENT_FORMATS: Record<string, DocumentFormatDefinition> = {
  // Word Processing
  ".pdf": {
    extension: ".pdf",
    mimeTypes: ["application/pdf"],
    category: "pdf",
    displayName: "PDF Document",
    browserSupport: "supported",
    readSupport: true,
    writeSupport: true,
    conversionSupport: true,
    previewSupport: true,
    notes: "Client-side rendering, text extraction, manipulation, and annotation supported."
  },
  ".docx": {
    extension: ".docx",
    mimeTypes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    category: "word-processing",
    displayName: "Word Document (DOCX)",
    browserSupport: "supported",
    readSupport: true,
    writeSupport: true,
    conversionSupport: true,
    previewSupport: true,
    notes: "Parsed via browser-compatible openxml extractors and generated via docx library."
  },
  ".doc": {
    extension: ".doc",
    mimeTypes: ["application/msword"],
    category: "word-processing",
    displayName: "Legacy Word (DOC)",
    browserSupport: "unsupported",
    readSupport: false,
    writeSupport: false,
    conversionSupport: false,
    previewSupport: false,
    notes: "Legacy binary OLE CFBF format. Direct browser-side conversion is not reliably supported.",
    isLegacyBinary: true
  },
  ".odt": {
    extension: ".odt",
    mimeTypes: ["application/vnd.oasis.opendocument.text"],
    category: "word-processing",
    displayName: "OpenDocument Text (ODT)",
    browserSupport: "supported",
    readSupport: true,
    writeSupport: false,
    conversionSupport: true,
    previewSupport: true,
    notes: "ODT packages (ZIP + content.xml) extracted client-side for TXT/HTML."
  },
  ".rtf": {
    extension: ".rtf",
    mimeTypes: ["application/rtf", "text/rtf"],
    category: "word-processing",
    displayName: "Rich Text Format (RTF)",
    browserSupport: "supported",
    readSupport: true,
    writeSupport: true,
    conversionSupport: true,
    previewSupport: true,
    notes: "Standard RTF control word tokenizer and builder for text, paragraphs, and styling."
  },
  ".txt": {
    extension: ".txt",
    mimeTypes: ["text/plain"],
    category: "word-processing",
    displayName: "Plain Text (TXT)",
    browserSupport: "supported",
    readSupport: true,
    writeSupport: true,
    conversionSupport: true,
    previewSupport: true,
    notes: "Full Unicode and UTF-8 client-side support with newline preservation."
  },
  ".pages": {
    extension: ".pages",
    mimeTypes: ["application/x-iwork-pages-sffpages"],
    category: "word-processing",
    displayName: "Apple Pages",
    browserSupport: "unsupported",
    readSupport: false,
    writeSupport: false,
    conversionSupport: false,
    previewSupport: false,
    notes: "Apple Pages files use proprietary bundle structures. Direct local browser conversion is not supported.",
    isProprietaryPackage: true
  },

  // Spreadsheets
  ".xlsx": {
    extension: ".xlsx",
    mimeTypes: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    category: "spreadsheet",
    displayName: "Excel Spreadsheet (XLSX)",
    browserSupport: "supported",
    readSupport: true,
    writeSupport: true,
    conversionSupport: true,
    previewSupport: true,
    notes: "Client-side spreadsheet reading and generation supported."
  },
  ".xls": {
    extension: ".xls",
    mimeTypes: ["application/vnd.ms-excel"],
    category: "spreadsheet",
    displayName: "Legacy Excel (XLS)",
    browserSupport: "unsupported",
    readSupport: false,
    writeSupport: false,
    conversionSupport: false,
    previewSupport: false,
    notes: "Legacy binary BIFF format. Direct browser conversion is not supported without server execution.",
    isLegacyBinary: true
  },
  ".csv": {
    extension: ".csv",
    mimeTypes: ["text/csv"],
    category: "spreadsheet",
    displayName: "Comma-Separated Values (CSV)",
    browserSupport: "supported",
    readSupport: true,
    writeSupport: true,
    conversionSupport: true,
    previewSupport: true,
    notes: "RFC 4180 compliant client-side CSV parser and generator."
  },
  ".ods": {
    extension: ".ods",
    mimeTypes: ["application/vnd.oasis.opendocument.spreadsheet"],
    category: "spreadsheet",
    displayName: "OpenDocument Spreadsheet (ODS)",
    browserSupport: "experimental",
    readSupport: true,
    writeSupport: false,
    conversionSupport: true,
    previewSupport: true,
    notes: "Client-side XML extraction of table rows and cells."
  },
  ".numbers": {
    extension: ".numbers",
    mimeTypes: ["application/x-iwork-numbers-sffnumbers"],
    category: "spreadsheet",
    displayName: "Apple Numbers",
    browserSupport: "unsupported",
    readSupport: false,
    writeSupport: false,
    conversionSupport: false,
    previewSupport: false,
    notes: "Apple Numbers files use proprietary package structures. Not supported for local conversion.",
    isProprietaryPackage: true
  },

  // Presentations
  ".pptx": {
    extension: ".pptx",
    mimeTypes: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
    category: "presentation",
    displayName: "PowerPoint Presentation (PPTX)",
    browserSupport: "supported",
    readSupport: true,
    writeSupport: true,
    conversionSupport: true,
    previewSupport: true,
    notes: "Slide content and text extraction supported client-side."
  },
  ".ppt": {
    extension: ".ppt",
    mimeTypes: ["application/vnd.ms-powerpoint"],
    category: "presentation",
    displayName: "Legacy PowerPoint (PPT)",
    browserSupport: "unsupported",
    readSupport: false,
    writeSupport: false,
    conversionSupport: false,
    previewSupport: false,
    notes: "Legacy binary format. Direct browser conversion is not supported.",
    isLegacyBinary: true
  },
  ".odp": {
    extension: ".odp",
    mimeTypes: ["application/vnd.oasis.opendocument.presentation"],
    category: "presentation",
    displayName: "OpenDocument Presentation (ODP)",
    browserSupport: "experimental",
    readSupport: true,
    writeSupport: false,
    conversionSupport: false,
    previewSupport: false,
    notes: "Planned OpenDocument presentation support."
  },
  ".key": {
    extension: ".key",
    mimeTypes: ["application/x-iwork-keynote-sffkey"],
    category: "presentation",
    displayName: "Apple Keynote",
    browserSupport: "unsupported",
    readSupport: false,
    writeSupport: false,
    conversionSupport: false,
    previewSupport: false,
    notes: "Apple Keynote proprietary bundle format. Not supported for browser conversion.",
    isProprietaryPackage: true
  },

  // eBooks
  ".epub": {
    extension: ".epub",
    mimeTypes: ["application/epub+zip"],
    category: "ebook",
    displayName: "Electronic Publication (EPUB)",
    browserSupport: "supported",
    readSupport: true,
    writeSupport: false,
    conversionSupport: true,
    previewSupport: true,
    notes: "Extracted as sanitized HTML and plain text directly in-browser."
  },
  ".mobi": {
    extension: ".mobi",
    mimeTypes: ["application/x-mobipocket-ebook"],
    category: "ebook",
    displayName: "Mobipocket eBook (MOBI)",
    browserSupport: "unsupported",
    readSupport: false,
    writeSupport: false,
    conversionSupport: false,
    previewSupport: false,
    notes: "Proprietary Mobipocket format. DRM-protected or proprietary formats cannot be parsed locally."
  },
  ".azw": {
    extension: ".azw",
    mimeTypes: ["application/vnd.amazon.ebook"],
    category: "ebook",
    displayName: "Amazon Kindle (AZW)",
    browserSupport: "unsupported",
    readSupport: false,
    writeSupport: false,
    conversionSupport: false,
    previewSupport: false,
    notes: "Kindle proprietary format. DRM removal is strictly prohibited and not supported."
  }
};

export function getDocumentFormat(extOrFilename: string): DocumentFormatDefinition | undefined {
  const match = extOrFilename.toLowerCase().match(/\.[a-z0-9]+$/);
  if (!match) return undefined;
  return DOCUMENT_FORMATS[match[0]];
}

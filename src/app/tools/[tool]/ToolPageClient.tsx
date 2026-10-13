"use client";

import * as React from "react";
import { notFound } from "next/navigation";
import {
  JpgToPdfPage,
  MergePdfPage,
  SplitPdfPage,
  PdfToImagesPage,
  JpgToPngPage,
  PngToJpgPage,
  JpgToWebpPage,
  PngToWebpPage,
  WebpToJpgPage,
  WebpToPngPage,
  SvgToPngPage,
  SvgToJpgPage,
  SvgToWebpPage,
  HeicToJpgPage,
  HeicToPngPage,
  HeicToWebpPage,
  ImageCompressorPage,
  ImageEnhancerPage,
  JpgToSvgPage,
  PngToSvgPage,
  WebpToSvgPage,
  HeicToSvgPage,
  TxtToDocxPage,
  TxtToPdfPage,
  TxtToHtmlPage,
  TxtToRtfPage,
  RtfToTxtPage,
  DocxToTxtPage,
  DocxToHtmlPage,
  OdtToTxtPage,
  OdtToHtmlPage,
  CsvToXlsxPage,
  XlsxToCsvPage,
  CsvToJsonPage,
  JsonToCsvPage,
  PptxToTxtPage,
  EpubToTxtPage,
  EpubToHtmlPage,
  PdfToTxtPage,
  PdfToDocxPage,
  PdfToCsvPage,
  PdfEditorPage,
  PdfVisualEditorPage,
  PdfWatermarkPage,
  PdfSignaturePage,
  JsonFormatterPage,
  VideoToAudioPage,
  AudioConverterPage,
  AudioTrimmerPage,
  VideoTrimmerPage,
  VideoFrameExtractorPage,
  VideoConverterPage,
} from "@/components/tools/pages";

export interface ToolPageProps {
  /** When true the tool page suppresses its internal header/breadcrumb because
   * the parent server component (ToolPageShell) already rendered it via SSR. */
  hideHeader?: boolean;
}

const TOOL_PAGE_MAP: Record<string, React.ComponentType<ToolPageProps>> = {
  // Existing Image & PDF tools
  "jpg-to-pdf": JpgToPdfPage,
  "merge-pdf": MergePdfPage,
  "split-pdf": SplitPdfPage,
  "pdf-to-images": PdfToImagesPage,
  "jpg-to-png": JpgToPngPage,
  "png-to-jpg": PngToJpgPage,
  "jpg-to-webp": JpgToWebpPage,
  "png-to-webp": PngToWebpPage,
  "webp-to-jpg": WebpToJpgPage,
  "webp-to-png": WebpToPngPage,
  "svg-to-png": SvgToPngPage,
  "svg-to-jpg": SvgToJpgPage,
  "svg-to-webp": SvgToWebpPage,
  "heic-to-jpg": HeicToJpgPage,
  "heic-to-png": HeicToPngPage,
  "heic-to-webp": HeicToWebpPage,
  "jpg-to-svg": JpgToSvgPage,
  "png-to-svg": PngToSvgPage,
  "webp-to-svg": WebpToSvgPage,
  "heic-to-svg": HeicToSvgPage,
  "image-compressor": ImageCompressorPage,
  "image-enhancer": ImageEnhancerPage,

  // Text / Word Processing
  "txt-to-pdf": TxtToPdfPage,
  "txt-to-docx": TxtToDocxPage,
  "txt-to-html": TxtToHtmlPage,
  "txt-to-rtf": TxtToRtfPage,
  "rtf-to-txt": RtfToTxtPage,
  "docx-to-txt": DocxToTxtPage,
  "docx-to-html": DocxToHtmlPage,
  "odt-to-txt": OdtToTxtPage,
  "odt-to-html": OdtToHtmlPage,

  // PDF Extraction
  "pdf-to-txt": PdfToTxtPage,
  "pdf-to-docx": PdfToDocxPage,
  "pdf-to-csv": PdfToCsvPage,
  // PDF Editor
  "pdf-editor": PdfEditorPage,
  "pdf-visual-editor": PdfVisualEditorPage,
  "pdf-watermark": PdfWatermarkPage,
  "pdf-sign": PdfSignaturePage,
  // Spreadsheets
  "csv-to-xlsx": CsvToXlsxPage,
  "xlsx-to-csv": XlsxToCsvPage,
  "csv-to-json": CsvToJsonPage,
  "json-to-csv": JsonToCsvPage,
  "json-formatter": JsonFormatterPage,

  // Audio & Video
  "video-to-audio": VideoToAudioPage,
  "audio-converter": AudioConverterPage,
  "audio-trimmer": AudioTrimmerPage,
  "video-trimmer": VideoTrimmerPage,
  "video-frame-extractor": VideoFrameExtractorPage,
  "video-converter": VideoConverterPage,


  // Presentation & eBook
  "pptx-to-txt": PptxToTxtPage,
  "epub-to-txt": EpubToTxtPage,
  "epub-to-html": EpubToHtmlPage,
};

interface ToolPageClientProps {
  slug: string;
  hideHeader?: boolean;
}

export function ToolPageClient({ slug, hideHeader }: ToolPageClientProps) {
  const PageComponent = TOOL_PAGE_MAP[slug];
  if (!PageComponent) {
    notFound();
  }

  return <PageComponent hideHeader={hideHeader} />;
}

/**
 * /tools/pdf-editor-dev — development/standalone testing entry.
 *
 * Excluded from search engine indexing to avoid duplicate content against
 * canonical /tools/pdf-editor.
 */

import { Metadata } from "next";
import { ToolPageClient } from "../[tool]/ToolPageClient";

export const metadata: Metadata = {
  title: "PDF Editor (Dev)",
  description:
    "Upload a text-based PDF and freely edit paragraphs, headings, tables, and lists in a Word-like workspace.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/tools/pdf-editor",
  },
};

export default function PdfEditorRoute() {
  return <ToolPageClient slug="pdf-editor" />;
}

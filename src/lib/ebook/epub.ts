import JSZip from "jszip";
import { sanitizeHtml } from "../document/security";

/**
 * Extract content from an EPUB file (ZIP containing OPF and XHTML documents).
 */
export async function parseEpub(arrayBuffer: ArrayBuffer): Promise<{ text: string; html: string; title?: string }> {
  const zip = await JSZip.loadAsync(arrayBuffer);
  
  // Find META-INF/container.xml to locate rootfile
  const containerFile = zip.file("META-INF/container.xml");
  let opfPath = "";
  
  if (containerFile) {
    const containerXml = await containerFile.async("string");
    const match = containerXml.match(/full-path=["']([^"']+\.opf)["']/i);
    if (match) {
      opfPath = match[1];
    }
  }

  // Fallback: search for any .opf file in the zip
  if (!opfPath) {
    const opfFiles = Object.keys(zip.files).filter(f => f.endsWith(".opf"));
    if (opfFiles.length > 0) {
      opfPath = opfFiles[0];
    }
  }

  const htmlFiles: string[] = [];
  let title = "eBook";

  if (opfPath) {
    const opfFile = zip.file(opfPath);
    if (opfFile) {
      const opfXml = await opfFile.async("string");
      const titleMatch = opfXml.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
      if (titleMatch) {
        title = titleMatch[1].trim();
      }

      // Get basePath of opf
      const basePath = opfPath.includes("/") ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1) : "";

      // Look for spine and manifest
      const itemMatches = opfXml.matchAll(/<item\b[^>]*href=["']([^"']+)["'][^>]*media-type=["']application\/xhtml\+xml["'][^>]*\/?>/gi);
      for (const m of itemMatches) {
        let href = m[1];
        if (href.startsWith("/")) href = href.substring(1);
        const resolvedPath = basePath + href;
        if (zip.file(resolvedPath)) {
          htmlFiles.push(resolvedPath);
        }
      }
    }
  }

  // Fallback: find all .xhtml and .html files sorted
  if (htmlFiles.length === 0) {
    const files = Object.keys(zip.files)
      .filter(f => f.endsWith(".xhtml") || f.endsWith(".html"))
      .sort();
    htmlFiles.push(...files);
  }

  if (htmlFiles.length === 0) {
    throw new Error("Invalid or DRM-protected EPUB file: No readable HTML/XHTML spine found.");
  }

  const textSections: string[] = [];
  const htmlSections: string[] = [];

  for (const filePath of htmlFiles) {
    const file = zip.file(filePath);
    if (!file) continue;
    const content = await file.async("string");

    // Extract body content
    const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyContent = bodyMatch ? bodyMatch[1] : content;

    // Sanitize HTML
    const cleanSectionHtml = sanitizeHtml(bodyContent);
    htmlSections.push(`<div class="epub-chapter">\n${cleanSectionHtml}\n</div>`);

    // Extract text
    const tempText = cleanSectionHtml
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();

    if (tempText) {
      textSections.push(tempText);
    }
  }

  return {
    title,
    text: textSections.join("\n\n"),
    html: htmlSections.join("\n<hr/>\n"),
  };
}

import JSZip from "jszip";
import { sanitizeHtml } from "../security";

/**
 * Extract content from an ODT file (ZIP containing content.xml).
 */
export async function parseOdt(arrayBuffer: ArrayBuffer): Promise<{ text: string; html: string }> {
  const zip = await JSZip.loadAsync(arrayBuffer);
  const contentXmlFile = zip.file("content.xml");
  
  if (!contentXmlFile) {
    throw new Error("Invalid ODT document: missing content.xml");
  }

  const xmlStr = await contentXmlFile.async("string");
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlStr, "application/xml");

  // Find all text:p, text:h
  const paragraphs: string[] = [];
  const htmlParts: string[] = [];

  const textNodes = xmlDoc.getElementsByTagName("*");
  for (let i = 0; i < textNodes.length; i++) {
    const el = textNodes[i];
    const nodeName = el.nodeName.toLowerCase();

    if (nodeName === "text:h") {
      const headingText = el.textContent || "";
      if (headingText.trim()) {
        paragraphs.push(headingText);
        htmlParts.push(`<h2>${headingText}</h2>`);
      }
    } else if (nodeName === "text:p") {
      const pText = el.textContent || "";
      if (pText.trim()) {
        paragraphs.push(pText);
        htmlParts.push(`<p>${pText}</p>`);
      }
    }
  }

  const text = paragraphs.join("\n\n");
  const html = sanitizeHtml(htmlParts.join("\n"));

  return { text, html };
}

import JSZip from "jszip";

/**
 * Extracts plain text from a PPTX file by reading slide XML files.
 */
export async function pptxToTxt(arrayBuffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(arrayBuffer);
  
  // Find all slides: ppt/slides/slide1.xml, etc.
  const slideFiles = Object.keys(zip.files)
    .filter(f => f.match(/^ppt\/slides\/slide\d+\.xml$/i))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)\.xml/i)?.[1] || "0", 10);
      const numB = parseInt(b.match(/slide(\d+)\.xml/i)?.[1] || "0", 10);
      return numA - numB;
    });

  if (slideFiles.length === 0) {
    throw new Error("Invalid PPTX file: No slides detected.");
  }

  const slidesText: string[] = [];

  for (let i = 0; i < slideFiles.length; i++) {
    const file = zip.file(slideFiles[i]);
    if (!file) continue;

    const xml = await file.async("string");
    // Match all text elements <a:t>...</a:t>
    const matches = xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/gi);
    const textPieces: string[] = [];
    for (const m of matches) {
      if (m[1]) {
        textPieces.push(m[1].trim());
      }
    }

    const slideContent = textPieces.join(" ").replace(/\s+/g, " ").trim();
    slidesText.push(`--- Slide ${i + 1} ---\n${slideContent || "(Empty or image-only slide)"}`);
  }

  return slidesText.join("\n\n");
}

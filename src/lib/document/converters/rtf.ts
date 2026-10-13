import { escapeHtml } from "../security";

/**
 * Convert plain text to RTF format.
 * Preserves unicode characters and paragraph / line breaks.
 */
export function txtToRtf(text: string): string {
  // RTF header
  let rtf = "{\\rtf1\\ansi\\ansicpg1252\\deff0\\nouicompat\\deflang1033{\\fonttbl{\\f0\\fnil\\fcharset0 Calibri;}}\n";
  rtf += "{\\*\\generator AntigravityFileTools;}\\viewkind4\\uc1\n\\pard\\sa200\\sl276\\slmult1\\f0\\fs22\\lang9 ";

  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let encodedLine = "";
    for (let j = 0; j < line.length; j++) {
      const charCode = line.charCodeAt(j);
      if (charCode < 128) {
        if (line[j] === "\\" || line[j] === "{" || line[j] === "}") {
          encodedLine += "\\" + line[j];
        } else {
          encodedLine += line[j];
        }
      } else {
        // Unicode escape \uN? where N is signed 16-bit integer
        const signedCode = charCode > 32767 ? charCode - 65536 : charCode;
        encodedLine += `\\u${signedCode}?`;
      }
    }
    rtf += encodedLine;
    if (i < lines.length - 1) {
      rtf += "\\par\n";
    }
  }

  rtf += "}\n";
  return rtf;
}

/**
 * Extract plain text from an RTF string.
 * Strips formatting control words and handles \par, line breaks, and unicode escapes.
 */
export function rtfToTxt(rtfText: string): string {
  // Replace RTF unicode escapes \u1234? or \u-1234?
  let text = rtfText.replace(/\\u(-?\d+)\??/g, (_, codeStr) => {
    let code = parseInt(codeStr, 10);
    if (code < 0) code += 65536;
    return String.fromCharCode(code);
  });

  // Replace paragraph break \par and line breaks \line with newline
  text = text.replace(/\\par(?:\r?\n| )?/g, "\n");
  text = text.replace(/\\line(?:\r?\n| )?/g, "\n");
  text = text.replace(/\\tab(?:\r?\n| )?/g, "\t");

  // Remove groups and headers that contain metadata or fonts (e.g. {\fonttbl...})
  text = text.replace(/\{\\\*?\w+[^}]*\}/g, "");

  // Remove all other RTF control words like \b, \i, \fs24, \pard, etc.
  text = text.replace(/\\[a-zA-Z]+-?\d* ?/g, "");

  // Remove unmatched braces
  text = text.replace(/[{}]/g, "");

  // Normalize excessive empty newlines
  return text.trim();
}

/**
 * Converts plain text to HTML document, escaping text safely.
 */
export function txtToHtml(text: string, title: string = "Document"): string {
  const paragraphs = text
    .split(/\r?\n\r?\n/)
    .map(p => `<p>${escapeHtml(p).replace(/\r?\n/g, "<br/>")}</p>`)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1f2937; }
    p { margin-bottom: 1em; }
  </style>
</head>
<body>
${paragraphs}
</body>
</html>`;
}

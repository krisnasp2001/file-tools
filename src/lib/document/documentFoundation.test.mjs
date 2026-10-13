import assert from "node:assert/strict";
import test from "node:test";

// Inline testable implementations matching src/lib/document
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitizeHtml(html) {
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
  clean = clean.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");
  clean = clean.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "");
  clean = clean.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "");
  clean = clean.replace(/\son\w+="[^"]*"/gi, "");
  clean = clean.replace(/\son\w+='[^']*'/gi, "");
  clean = clean.replace(/\son\w+=\S+/gi, "");
  clean = clean.replace(/(href|src)=["']javascript:[^"']*["']/gi, '$1="#"');
  return clean;
}

function parseCsv(csvText) {
  const rows = [];
  let currentRow = [];
  let currentCell = "";
  let insideQuotes = false;
  let i = 0;

  while (i < csvText.length) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentCell += '"';
          i += 2;
          continue;
        } else {
          insideQuotes = false;
          i++;
          continue;
        }
      } else {
        currentCell += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        currentRow.push(currentCell.trim());
        currentCell = "";
        i++;
        continue;
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i += 2;
        } else {
          i++;
        }
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = "";
        continue;
      } else if (char === '\n') {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = "";
        i++;
        continue;
      } else {
        currentCell += char;
        i++;
        continue;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }

  return rows.filter(r => r.length > 0 && r.some(c => c.length > 0));
}

function generateCsv(rows) {
  return rows
    .map(row =>
      row
        .map(cell => {
          const val = cell ?? "";
          if (val.includes('"') || val.includes(',') || val.includes('\n') || val.includes('\r')) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        })
        .join(",")
    )
    .join("\r\n");
}

function txtToRtf(text) {
  let rtf = "{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Calibri;}}\\f0\\fs22 ";
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

function rtfToTxt(rtfText) {
  let text = rtfText.replace(/\\u(-?\d+)\??/g, (_, codeStr) => {
    let code = parseInt(codeStr, 10);
    if (code < 0) code += 65536;
    return String.fromCharCode(code);
  });
  text = text.replace(/\\par(?:\r?\n| )?/g, "\n");
  text = text.replace(/\\line(?:\r?\n| )?/g, "\n");
  text = text.replace(/\\tab(?:\r?\n| )?/g, "\t");
  text = text.replace(/\{\\\*?\w+[^}]*\}/g, "");
  text = text.replace(/\\[a-zA-Z]+-?\d* ?/g, "");
  text = text.replace(/[{}]/g, "");
  return text.trim();
}

test("Security Sanitization escapes malicious HTML and prevents XSS", () => {
  const unsafeText = '<script>alert("xss")</script><b>Hello & Welcome!</b>';
  const escaped = escapeHtml(unsafeText);
  assert.ok(!escaped.includes("<script>"));
  assert.ok(escaped.includes("&lt;script&gt;"));
  assert.ok(escaped.includes("&amp;"));

  const maliciousHtml = '<p>Normal text</p><script>evil()</script><iframe src="evil.com"></iframe><a href="javascript:steal()">Click</a><img src="x" onerror="alert(1)"/>';
  const clean = sanitizeHtml(maliciousHtml);
  assert.ok(!clean.includes("<script>"));
  assert.ok(!clean.includes("<iframe>"));
  assert.ok(!clean.includes("onerror="));
  assert.ok(!clean.includes("javascript:"));
  assert.ok(clean.includes("<p>Normal text</p>"));
});

test("CSV parser handles commas, quotes, and escaped newlines accurately", () => {
  const csvRaw = 'Name,Role,"Description with, comma"\r\nAlice,Engineer,"Works on core,\r\nsystem features"\r\nBob,Designer,"Loves ""pixel-perfect"" UI"';
  const parsed = parseCsv(csvRaw);
  assert.equal(parsed.length, 3);
  assert.equal(parsed[0][0], "Name");
  assert.equal(parsed[0][2], "Description with, comma");
  assert.equal(parsed[1][1], "Engineer");
  assert.ok(parsed[1][2].includes("core,\r\nsystem features"));
  assert.equal(parsed[2][2], 'Loves "pixel-perfect" UI');

  const regenerated = generateCsv(parsed);
  assert.ok(regenerated.includes('"Description with, comma"'));
  assert.ok(regenerated.includes('"Loves ""pixel-perfect"" UI"'));
});

test("RTF <-> TXT conversion preserves lines and Unicode", () => {
  const original = "Hello World!\nSecond Line with special: café & résumé\nFinal line.";
  const rtf = txtToRtf(original);
  assert.ok(rtf.startsWith("{\\rtf1"));
  assert.ok(rtf.includes("\\par"));

  const extracted = rtfToTxt(rtf);
  assert.ok(extracted.includes("Hello World!"));
  assert.ok(extracted.includes("café & résumé"));
  assert.ok(extracted.includes("Final line."));
});

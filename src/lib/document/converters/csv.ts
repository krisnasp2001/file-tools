/**
 * Robust CSV parser handling RFC 4180 rules (quotes, commas, newlines inside quotes).
 */
export function parseCsv(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let insideQuotes = false;
  let i = 0;

  while (i < csvText.length) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote: ""
          currentCell += '"';
          i += 2;
          continue;
        } else {
          // Closing quote
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

  // Filter out any purely empty trailing row
  return rows.filter(r => r.length > 0 && r.some(c => c.length > 0));
}

/**
 * Robust CSV string generator escaping quotes, commas, and newlines.
 */
export function generateCsv(rows: string[][]): string {
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

/**
 * Converts CSV rows to JSON array of objects or 2D array.
 */
export function csvToJson(csvText: string): string {
  const rows = parseCsv(csvText);
  if (rows.length === 0) return "[]";
  const headers = rows[0];
  const data = rows.slice(1).map(row => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h || `column_${idx + 1}`] = row[idx] ?? "";
    });
    return obj;
  });
  return JSON.stringify(data, null, 2);
}

/**
 * Converts JSON string (array of objects or 2D array) to CSV.
 */
export function jsonToCsv(jsonString: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error("Invalid JSON input format.");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("JSON must be an array of objects or an array of arrays.");
  }

  if (parsed.length === 0) return "";

  if (Array.isArray(parsed[0])) {
    return generateCsv(parsed as string[][]);
  }

  // Array of objects
  const objects = parsed as Record<string, unknown>[];
  const keys = Array.from(new Set(objects.flatMap(obj => Object.keys(obj))));
  const rows: string[][] = [keys];

  for (const obj of objects) {
    const row = keys.map(k => {
      const val = obj[k];
      if (val === null || val === undefined) return "";
      if (typeof val === "object") return JSON.stringify(val);
      return String(val);
    });
    rows.push(row);
  }

  return generateCsv(rows);
}

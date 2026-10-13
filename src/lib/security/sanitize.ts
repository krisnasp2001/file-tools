export function sanitizeFilename(filename: string): string {
  // Strip control characters, null bytes, and path traversal sequences
  // First strip any leading directory path (both / and \) to strictly get basename
  const basename = filename.split(/[/\\]/).pop() || "";

  // Preserve Unicode characters (Indonesian, Japanese, accents, spaces, etc.)
  const cleanName = basename
    .replace(/[\x00-\x1f\x7f]/g, "")
    .replace(/[/\\?%*:|"<>]/g, "-");

  // Prevent leading hidden-file dots and collapse excessive spaces
  const trimmed = cleanName.trim().replace(/^\.+/, "");
  return trimmed.length > 0 ? trimmed : "file";
}

export function sanitizeText(input: string): string {
  // Basic escaping of special HTML characters for safe rendering/context
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url, "https://localhost");
    return parsed.protocol === "http:" || parsed.protocol === "https:" || parsed.protocol === "blob:";
  } catch {
    return false;
  }
}

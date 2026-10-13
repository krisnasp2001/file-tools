import { sanitizeFilename } from "@/lib/security/sanitize";

export interface DownloadBlobOptions {
  blob: Blob;
  filename: string;
}

export function downloadBlob(
  optionsOrBlob: DownloadBlobOptions | Blob,
  optionalFilename?: string
): void {
  if (typeof window === "undefined") return;

  let blob: Blob;
  let filename: string;

  if (optionsOrBlob instanceof Blob) {
    blob = optionsOrBlob;
    filename = optionalFilename || "download";
  } else {
    blob = optionsOrBlob.blob;
    filename = optionsOrBlob.filename;
  }

  const safeName = sanitizeFilename(filename);
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = safeName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);

  try {
    anchor.click();
  } finally {
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(objectUrl);
  }
}

export function downloadFile(
  content: string,
  filename: string,
  mimeType: string = "text/plain"
): void {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(blob, filename);
}

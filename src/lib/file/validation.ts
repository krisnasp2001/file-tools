export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function validateFileSize(file: File, maxSizeBytes: number): ValidationResult {
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `This file is too large. The maximum allowed size is ${formatFileSize(maxSizeBytes)}.`,
    };
  }
  return { valid: true };
}

export function validateFileType(
  file: File,
  acceptList: string[]
): ValidationResult {
  if (!acceptList || acceptList.length === 0) {
    return { valid: true };
  }

  const fileName = file.name.toLowerCase();
  const fileMime = file.type.toLowerCase();

  const isAccepted = acceptList.some((pattern) => {
    const p = pattern.trim().toLowerCase();
    if (!p) return false;

    // Extension pattern (e.g. ".png", ".jpg", ".pdf")
    if (p.startsWith(".")) {
      return fileName.endsWith(p);
    }

    // MIME wildcard pattern (e.g. "image/*", "video/*")
    if (p.endsWith("/*")) {
      const baseType = p.slice(0, -2);
      return fileMime.startsWith(`${baseType}/`);
    }

    // Exact MIME type match (e.g. "image/png", "application/pdf")
    if (p.includes("/")) {
      return fileMime === p;
    }

    // Fallback: extension without dot
    return fileName.endsWith(`.${p}`);
  });

  if (!isAccepted) {
    return {
      valid: false,
      error: "This file type isn't supported by this tool.",
    };
  }

  return { valid: true };
}

export function generateFileFingerprint(file: File): string {
  // Safe deduplication fingerprint without reading file body: name + size + lastModified
  return `${file.name}-${file.size}-${file.lastModified}`;
}

/**
 * DMS rules: bulk upload, preview MIME types, OCR eligibility.
 */

export const DMS_MAX_FILE_BYTES = 15 * 1024 * 1024;
export const DMS_MAX_BULK_FILES = 20;
/** Cap total decoded bulk payload so JSON body stays within parser limits. */
export const DMS_MAX_BULK_TOTAL_BYTES = 20 * 1024 * 1024;
/** express.json limit for base64 uploads (single 15MB file ≈ 20MB encoded). */
export const DMS_JSON_BODY_LIMIT = "25mb";
/** Default JSON body limit for non-upload routes. */
export const JSON_BODY_LIMIT_DEFAULT = "1mb";
/**
 * Vercel serverless JSON body is ~4.5MB. Base64 expands ~4/3, so keep
 * in-request file bytes under this and use client→Blob for anything larger.
 */
export const VERCEL_SAFE_JSON_UPLOAD_BYTES = 3 * 1024 * 1024;

/**
 * Temporary UI legend while the product ships with a conservative per-file cap.
 * Set to `false` when raising `DMS_MAX_FILE_BYTES` after full production rollout.
 */
export const DMS_SHOW_SIZE_STABILIZATION_LEGEND = true;

export function dmsMaxFileSizeMb(): number {
  return Math.round(DMS_MAX_FILE_BYTES / (1024 * 1024));
}

export function estimateBase64DecodedBytes(dataBase64: string): number {
  const cleaned = dataBase64.replace(/\s/g, "");
  if (!cleaned) return 0;
  const padding = cleaned.endsWith("==") ? 2 : cleaned.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((cleaned.length * 3) / 4) - padding);
}

export const DMS_ALLOWED_MIME_PREFIXES = [
  "application/pdf",
  "image/",
  "text/",
  "application/msword",
  "application/vnd.openxmlformats-officedocument",
] as const;

export type OcrStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "skipped";

export type BulkDocumentInput = {
  title?: unknown;
  fileName?: unknown;
  contentType?: unknown;
  data?: unknown;
  category?: unknown;
};

export type BulkValidateOk = {
  ok: true;
  files: Array<{
    title: string;
    fileName: string;
    contentType: string;
    dataBase64: string;
    category: string;
  }>;
};

export type BulkValidateErr = {
  ok: false;
  error: string;
  code: "empty" | "too_many" | "invalid_file" | "too_large";
};

export function isOcrableMime(mime: string | null | undefined): boolean {
  if (!mime) return false;
  const m = mime.toLowerCase();
  return m === "application/pdf" || m.startsWith("image/");
}

export function isPreviewableMime(mime: string | null | undefined): boolean {
  if (!mime) return false;
  const m = mime.toLowerCase();
  return (
    m === "application/pdf" ||
    m.startsWith("image/") ||
    m.startsWith("text/")
  );
}

export function isAllowedDmsMime(mime: string | null | undefined): boolean {
  if (!mime) return true; // allow unknown; server still size-checks
  const m = mime.toLowerCase();
  return DMS_ALLOWED_MIME_PREFIXES.some(
    (p) => m === p || m.startsWith(p.endsWith("/") ? p : `${p}`),
  );
}

export function initialOcrStatusForMime(
  mime: string | null | undefined,
): OcrStatus {
  return isOcrableMime(mime) ? "pending" : "skipped";
}

export function validateBulkDocuments(
  files: unknown,
): BulkValidateOk | BulkValidateErr {
  if (!Array.isArray(files) || files.length === 0) {
    return { ok: false, error: "files array is required", code: "empty" };
  }
  if (files.length > DMS_MAX_BULK_FILES) {
    return {
      ok: false,
      error: `Maximum ${DMS_MAX_BULK_FILES} files per upload`,
      code: "too_many",
    };
  }

  const normalized: BulkValidateOk["files"] = [];
  let totalBytes = 0;
  for (let i = 0; i < files.length; i += 1) {
    const raw = files[i] as BulkDocumentInput;
    const fileName = String(raw?.fileName || "").trim();
    const dataBase64 = String(raw?.data || "").trim();
    const contentType =
      String(raw?.contentType || "application/octet-stream").trim() ||
      "application/octet-stream";
    const title =
      String(raw?.title || "").trim() ||
      fileName.replace(/\.[^.]+$/, "") ||
      `Document ${i + 1}`;
    if (!fileName || !dataBase64) {
      return {
        ok: false,
        error: `File ${i + 1}: fileName and data are required`,
        code: "invalid_file",
      };
    }
    const categoryRaw =
      raw?.category != null && String(raw.category).trim()
        ? String(raw.category).trim()
        : "";
    if (!categoryRaw) {
      return {
        ok: false,
        error: `File ${i + 1}: category is required`,
        code: "invalid_file",
      };
    }
    if (!isAllowedDmsMime(contentType)) {
      return {
        ok: false,
        error: `File ${i + 1}: unsupported type ${contentType}`,
        code: "invalid_file",
      };
    }
    const estimated = estimateBase64DecodedBytes(dataBase64);
    if (estimated <= 0 || estimated > DMS_MAX_FILE_BYTES) {
      return {
        ok: false,
        error: `File ${i + 1}: invalid file size`,
        code: "too_large",
      };
    }
    totalBytes += estimated;
    if (totalBytes > DMS_MAX_BULK_TOTAL_BYTES) {
      return {
        ok: false,
        error: `Total bulk upload exceeds ${Math.floor(DMS_MAX_BULK_TOTAL_BYTES / (1024 * 1024))}MB`,
        code: "too_large",
      };
    }
    normalized.push({
      title,
      fileName,
      contentType,
      dataBase64,
      category: categoryRaw,
    });
  }
  return { ok: true, files: normalized };
}

export function truncateOcrText(text: string, maxChars = 200_000): string {
  const trimmed = text.replace(/\u0000/g, "").trim();
  if (trimmed.length <= maxChars) return trimmed;
  return trimmed.slice(0, maxChars);
}

export function shouldUseDirectBlobUpload(fileSizeBytes: number): boolean {
  return Number.isFinite(fileSizeBytes) && fileSizeBytes > VERCEL_SAFE_JSON_UPLOAD_BYTES;
}

/** JSON body stays under Vercel’s ~4.5MB limit only when the whole batch is small. */
export function shouldUseJsonDocumentUpload(
  files: Array<{ size: number }>,
): boolean {
  if (!Array.isArray(files) || files.length === 0) return false;
  const total = files.reduce((sum, file) => sum + (file.size || 0), 0);
  return (
    total <= VERCEL_SAFE_JSON_UPLOAD_BYTES &&
    files.every((file) => !shouldUseDirectBlobUpload(file.size))
  );
}

export function isBlobTokenMissingError(
  message: string | null | undefined,
): boolean {
  return String(message || "").includes("BLOB_READ_WRITE_TOKEN");
}

export type DmsFileRejectReason =
  | "empty"
  | "too_large"
  | "unsupported_type"
  | "too_many";

export type DmsFileLike = {
  name: string;
  size: number;
  type?: string | null;
};

export function classifyDmsFile(
  file: DmsFileLike,
): { ok: true } | { ok: false; reason: Exclude<DmsFileRejectReason, "too_many"> } {
  if (!file.size || file.size <= 0) return { ok: false, reason: "empty" };
  if (file.size > DMS_MAX_FILE_BYTES) return { ok: false, reason: "too_large" };
  const mime = file.type || "application/octet-stream";
  if (!isAllowedDmsMime(mime)) return { ok: false, reason: "unsupported_type" };
  return { ok: true };
}

export function classifyDmsFiles(files: DmsFileLike[]): {
  accepted: DmsFileLike[];
  rejected: Array<{ name: string; reason: DmsFileRejectReason }>;
} {
  const list = Array.isArray(files) ? files : [];
  const accepted: DmsFileLike[] = [];
  const rejected: Array<{ name: string; reason: DmsFileRejectReason }> = [];
  for (const file of list) {
    if (accepted.length >= DMS_MAX_BULK_FILES) {
      rejected.push({ name: file.name, reason: "too_many" });
      continue;
    }
    const classified = classifyDmsFile(file);
    if (classified.ok === false) {
      rejected.push({ name: file.name, reason: classified.reason });
      continue;
    }
    accepted.push(file);
  }
  return { accepted, rejected };
}

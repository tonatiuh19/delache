/**
 * Blob storage helpers — private uploads, signed client URLs, cleanup.
 */

export const BLOB_SIGNED_URL_TTL_MS = 15 * 60 * 1000;
export const JSON_BODY_LIMIT_DEFAULT = "1mb";

/** Extract pathname from a Vercel Blob URL when possible. */
export function blobPathnameFromUrl(storageKey: string): string | null {
  const raw = String(storageKey || "").trim();
  if (!raw) return null;
  try {
    if (!/^https?:\/\//i.test(raw)) {
      return raw.replace(/^\//, "");
    }
    const u = new URL(raw);
    const path = u.pathname.replace(/^\//, "");
    return path || null;
  } catch {
    return null;
  }
}

export function isPrivateBlobUrl(storageKey: string): boolean {
  return /\.private\.blob\./i.test(storageKey);
}

/** Allow server-side fetch only for Vercel Blob hosts (blocks SSRF via arbitrary URLs). */
export function isAllowedBlobFetchUrl(storageKey: string): boolean {
  const raw = String(storageKey || "").trim();
  if (!raw || !/^https?:\/\//i.test(raw)) return false;
  try {
    const host = new URL(raw).hostname.toLowerCase();
    return (
      host.endsWith(".blob.vercel-storage.com") ||
      host === "blob.vercel-storage.com"
    );
  } catch {
    return false;
  }
}

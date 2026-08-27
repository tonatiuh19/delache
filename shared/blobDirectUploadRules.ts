/**
 * Client → Vercel Blob direct upload (bypasses the ~4.5MB serverless JSON body).
 */

export type DirectUploadActor = "staff" | "law_firm";

export type DirectUploadClientPayload = {
  casePublicUuid: string;
  actor: DirectUploadActor;
};

export type FromBlobDocumentInput = {
  title?: unknown;
  fileName?: unknown;
  contentType?: unknown;
  category?: unknown;
  storageKey?: unknown;
  fileSizeBytes?: unknown;
};

export function blobUploadPathPrefix(
  actor: DirectUploadActor,
  casePublicUuid: string,
): string {
  const uuid = String(casePublicUuid || "").trim();
  const base = actor === "law_firm" ? "client-cases" : "cases";
  return `${base}/${uuid}`;
}

export function isAllowedDirectUploadPathname(
  pathname: string,
  actor: DirectUploadActor,
  casePublicUuid: string,
): boolean {
  const uuid = String(casePublicUuid || "").trim();
  if (!uuid) return false;
  const prefix = `${blobUploadPathPrefix(actor, uuid)}/`;
  const path = String(pathname || "")
    .trim()
    .replace(/^\//, "");
  return path.startsWith(prefix) && path.length > prefix.length && !path.includes("..");
}

export function parseDirectUploadClientPayload(
  raw: string | null | undefined,
):
  | { ok: true; value: DirectUploadClientPayload }
  | { ok: false; error: string } {
  if (raw == null || String(raw).trim() === "") {
    return { ok: false, error: "clientPayload is required" };
  }
  try {
    const parsed = JSON.parse(String(raw)) as {
      casePublicUuid?: unknown;
      actor?: unknown;
    };
    const casePublicUuid = String(parsed?.casePublicUuid || "").trim();
    const actor = parsed?.actor;
    if (!casePublicUuid) {
      return { ok: false, error: "casePublicUuid is required" };
    }
    if (actor !== "staff" && actor !== "law_firm") {
      return { ok: false, error: "actor must be staff or law_firm" };
    }
    return { ok: true, value: { casePublicUuid, actor } };
  } catch {
    return { ok: false, error: "clientPayload must be JSON" };
  }
}

export function validateFromBlobDocument(
  body: FromBlobDocumentInput,
  opts: {
    actor: DirectUploadActor;
    casePublicUuid: string;
    maxFileBytes: number;
    isAllowedMime: (mime: string) => boolean;
    blobPathnameFromUrl: (storageKey: string) => string | null;
    isPrivateBlobUrl: (storageKey: string) => boolean;
  },
):
  | {
      ok: true;
      value: {
        title: string;
        fileName: string;
        contentType: string;
        storageKey: string;
        fileSizeBytes: number;
        pathname: string;
      };
    }
  | { ok: false; error: string } {
  const fileName = String(body?.fileName || "").trim();
  const storageKey = String(body?.storageKey || "").trim();
  const title =
    String(body?.title || "").trim() ||
    fileName.replace(/\.[^.]+$/, "") ||
    "Document";
  const contentType =
    String(body?.contentType || "application/octet-stream").trim() ||
    "application/octet-stream";
  const fileSizeBytes = Number(body?.fileSizeBytes);
  if (!fileName || !storageKey) {
    return { ok: false, error: "fileName and storageKey are required" };
  }
  if (!opts.isPrivateBlobUrl(storageKey)) {
    return { ok: false, error: "storageKey must be a private blob URL" };
  }
  if (!opts.isAllowedMime(contentType)) {
    return { ok: false, error: `unsupported type ${contentType}` };
  }
  if (
    !Number.isFinite(fileSizeBytes) ||
    fileSizeBytes <= 0 ||
    fileSizeBytes > opts.maxFileBytes
  ) {
    return { ok: false, error: "Invalid file size" };
  }
  const pathname = opts.blobPathnameFromUrl(storageKey);
  if (!pathname || !isAllowedDirectUploadPathname(pathname, opts.actor, opts.casePublicUuid)) {
    return { ok: false, error: "Blob pathname does not belong to this case" };
  }
  return {
    ok: true,
    value: { title, fileName, contentType, storageKey, fileSizeBytes, pathname },
  };
}

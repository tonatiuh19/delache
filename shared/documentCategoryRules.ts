/**
 * Document category validation for upload + recategorize.
 */

import type { DocumentCategory } from "./api";

export const DOCUMENT_CATEGORIES: readonly DocumentCategory[] = [
  "lawsuit",
  "medical_record",
  "cfe_report",
  "preliminary_photo",
  "defendant_response",
  "death_certificate",
  "sketch",
  "plaintiff_questionnaire",
  "questionnaire",
  "technical_report",
  "court_filing",
  "protesta",
  "ratification",
  "invoice",
  "receipt",
  "logistics",
  "other",
] as const;

/** Categories the despacho is responsible for (P1 intake + P5 additional docs). */
export const CLIENT_DOCUMENT_CATEGORIES: readonly DocumentCategory[] = [
  "lawsuit",
  "medical_record",
  "cfe_report",
  "preliminary_photo",
  "defendant_response",
  "death_certificate",
  "sketch",
  "plaintiff_questionnaire",
] as const;

export function isDocumentCategory(value: unknown): value is DocumentCategory {
  return (
    typeof value === "string" &&
    (DOCUMENT_CATEGORIES as readonly string[]).includes(value)
  );
}

export function parseDocumentCategory(
  raw: unknown,
  fallback: DocumentCategory = "other",
): DocumentCategory {
  return isDocumentCategory(raw) ? raw : fallback;
}

export function parseDocumentCategoryStrict(
  raw: unknown,
): { ok: true; value: DocumentCategory } | { ok: false; error: string } {
  if (!isDocumentCategory(raw)) {
    return { ok: false, error: "Invalid document category" };
  }
  return { ok: true, value: raw };
}

export function canClientSetDocumentCategory(
  category: DocumentCategory,
): boolean {
  return (CLIENT_DOCUMENT_CATEGORIES as readonly string[]).includes(category);
}

/** Despacho may retag P1/P5 files and legacy `other`, never staff-only types. */
export function canClientRecategorizeDocument(
  currentCategory: unknown,
): boolean {
  if (!isDocumentCategory(currentCategory)) return false;
  return (
    canClientSetDocumentCategory(currentCategory) ||
    currentCategory === "other"
  );
}

export function parseRequiredDocumentCategory(
  raw: unknown,
): { ok: true; value: DocumentCategory } | { ok: false; error: string } {
  if (raw == null || (typeof raw === "string" && raw.trim() === "")) {
    return { ok: false, error: "category is required" };
  }
  return parseDocumentCategoryStrict(raw);
}

export function parseUpdateDocumentCategory(
  body: unknown,
  opts: { clientPortal?: boolean; currentCategory?: unknown } = {},
):
  | { ok: true; value: { category: DocumentCategory } }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid body" };
  }
  const parsed = parseDocumentCategoryStrict(
    (body as { category?: unknown }).category,
  );
  if (parsed.ok === false) return parsed;
  if (opts.clientPortal && !canClientSetDocumentCategory(parsed.value)) {
    return {
      ok: false,
      error: "Law firm users can only set intake and additional-doc categories",
    };
  }
  if (
    opts.clientPortal &&
    opts.currentCategory !== undefined &&
    !canClientRecategorizeDocument(opts.currentCategory)
  ) {
    return {
      ok: false,
      error: "Law firm users cannot recategorize staff documents",
    };
  }
  return { ok: true, value: { category: parsed.value } };
}

export function parseClientUploadCategory(
  raw: unknown,
): { ok: true; value: DocumentCategory } | { ok: false; error: string } {
  const required = parseRequiredDocumentCategory(raw);
  if (required.ok === false) return required;
  if (!canClientSetDocumentCategory(required.value)) {
    return {
      ok: false,
      error: "Law firm users can only upload intake and additional-doc categories",
    };
  }
  return required;
}

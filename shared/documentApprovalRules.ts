/**
 * Intake document approve/reject, expediente gate, despacho immutability,
 * and 3-BD correction SLA (CRM PDF decisions 4B+C, 7A, 10B).
 */

import { INTAKE_REQUIRED_CATEGORIES } from "./documentCompleteness";

export const DOCUMENT_APPROVAL_STATUSES = [
  "draft",
  "uploaded",
  "under_review",
  "approved",
  "rejected",
  "archived",
] as const;

export type DocumentApprovalStatus =
  (typeof DOCUMENT_APPROVAL_STATUSES)[number];

/** Statuses that count as “submitted” and lock despacho mutation until reject. */
export const DOCUMENT_LOCKED_STATUSES = [
  "uploaded",
  "under_review",
  "approved",
] as const;

export const INTAKE_CORRECTION_BUSINESS_DAYS = 3;

export const INTAKE_CORRECTION_DEADLINE_TYPE = "intake_correction" as const;

export const INTAKE_CORRECTION_DEADLINE_TITLE =
  "Intake document correction (3 business days)";

export type DocumentApprovalRow = {
  category: string;
  status: string | null | undefined;
};

export function isIntakeDocumentCategory(
  category: string | null | undefined,
): boolean {
  if (!category) return false;
  return (INTAKE_REQUIRED_CATEGORIES as readonly string[]).includes(category);
}

export function canApproveIntakeDocument(
  role: string | null | undefined,
): boolean {
  return role === "admin";
}

export function canRejectIntakeDocument(
  role: string | null | undefined,
): boolean {
  return role === "admin";
}

export function canApproveExpediente(
  role: string | null | undefined,
): boolean {
  return role === "admin";
}

export function canSetExternalCourtDeadline(
  role: string | null | undefined,
): boolean {
  return role === "admin" || role === "legal";
}

export function isDocumentStatusLocked(
  status: string | null | undefined,
): boolean {
  if (!status) return false;
  return (DOCUMENT_LOCKED_STATUSES as readonly string[]).includes(status);
}

/**
 * Law-firm portal: cannot replace/recategorize while the file is submitted.
 * Rejected/archived/draft remain mutable so corrections can be uploaded.
 */
export function canLawFirmMutateDocument(opts: {
  status: string | null | undefined;
}): boolean {
  return !isDocumentStatusLocked(opts.status);
}

/**
 * Law-firm cannot upload another active file for a category that already has
 * a locked (uploaded/under_review/approved) document.
 */
export function canLawFirmUploadCategory(opts: {
  existingStatuses: readonly (string | null | undefined)[];
}): boolean {
  return !opts.existingStatuses.some((s) => isDocumentStatusLocked(s));
}

export function documentIsApprovable(status: string | null | undefined): boolean {
  return status === "uploaded" || status === "under_review";
}

export function documentIsRejectable(status: string | null | undefined): boolean {
  return (
    status === "uploaded" ||
    status === "under_review" ||
    status === "approved"
  );
}

export function approvedCategoriesFromDocs(
  docs: readonly DocumentApprovalRow[],
): string[] {
  const set = new Set<string>();
  for (const d of docs) {
    if (d.status === "approved" && d.category) set.add(d.category);
  }
  return [...set];
}

export function intakeDocsAllApproved(
  docs: readonly DocumentApprovalRow[],
): boolean {
  const approved = new Set(approvedCategoriesFromDocs(docs));
  return INTAKE_REQUIRED_CATEGORIES.every((c) => approved.has(c));
}

export function missingApprovedIntakeCategories(
  docs: readonly DocumentApprovalRow[],
): string[] {
  const approved = new Set(approvedCategoriesFromDocs(docs));
  return INTAKE_REQUIRED_CATEGORIES.filter((c) => !approved.has(c));
}

export function canApproveExpedienteNow(opts: {
  role: string | null | undefined;
  docs: readonly DocumentApprovalRow[];
  alreadyApproved: boolean;
}): { ok: true } | { ok: false; error: string; code: string } {
  if (!canApproveExpediente(opts.role)) {
    return { ok: false, error: "Insufficient permissions", code: "forbidden" };
  }
  if (opts.alreadyApproved) {
    return { ok: false, error: "Expediente already approved", code: "already_approved" };
  }
  const missing = missingApprovedIntakeCategories(opts.docs);
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Approve all intake documents first (missing: ${missing.join(", ")})`,
      code: "intake_docs_not_approved",
    };
  }
  return { ok: true };
}

export function expedienteApproved(
  approvedAt: string | null | undefined,
): boolean {
  return Boolean(approvedAt && String(approvedAt).trim().length > 0);
}

export function intakeCorrectionDeadlineSpec(): {
  deadlineType: typeof INTAKE_CORRECTION_DEADLINE_TYPE;
  title: string;
  businessDays: number;
} {
  return {
    deadlineType: INTAKE_CORRECTION_DEADLINE_TYPE,
    title: INTAKE_CORRECTION_DEADLINE_TITLE,
    businessDays: INTAKE_CORRECTION_BUSINESS_DAYS,
  };
}

/** Normalize reject reason; empty → null (optional). */
export function normalizeRejectionReason(
  reason: unknown,
): string | null {
  if (reason == null) return null;
  const trimmed = String(reason).trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 2000);
}

export function parseDocumentRejectBody(body: unknown):
  | { ok: true; reason: string | null }
  | { ok: false; error: string } {
  if (body == null) return { ok: true, reason: null };
  if (typeof body !== "object") {
    return { ok: false, error: "Invalid body" };
  }
  const rec = body as Record<string, unknown>;
  if (!("reason" in rec) && !("rejectionReason" in rec)) {
    return { ok: true, reason: null };
  }
  const raw = "reason" in rec ? rec.reason : rec.rejectionReason;
  if (raw != null && typeof raw !== "string") {
    return { ok: false, error: "reason must be a string" };
  }
  return { ok: true, reason: normalizeRejectionReason(raw) };
}

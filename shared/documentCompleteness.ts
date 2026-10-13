/**
 * Document completeness vs Product.md Phases 1 and 5.
 */

export const INTAKE_REQUIRED_CATEGORIES = [
  "lawsuit",
  "medical_record",
  "cfe_report",
  "preliminary_photo",
] as const;

export const ADDITIONAL_DOCS_CATEGORIES = [
  "defendant_response",
  "death_certificate",
  "sketch",
  "plaintiff_questionnaire",
] as const;

export const COURT_FILING_CATEGORIES = [
  "protesta",
  "court_filing",
  "ratification",
] as const;

export type CourtFilingCategory = (typeof COURT_FILING_CATEGORIES)[number];

export type DocumentCompletenessStatus = {
  phase: "intake" | "additional_docs" | "court_filing";
  required: string[];
  present: string[];
  missing: string[];
  complete: boolean;
};

function uniquePresent(
  categories: readonly string[],
  required: readonly string[],
): string[] {
  const set = new Set(categories);
  return required.filter((c) => set.has(c));
}

export function getIntakeCompleteness(
  documentCategories: readonly string[],
): DocumentCompletenessStatus {
  const required = [...INTAKE_REQUIRED_CATEGORIES];
  const present = uniquePresent(documentCategories, required);
  const missing = required.filter((c) => !present.includes(c));
  return {
    phase: "intake",
    required,
    present,
    missing,
    complete: missing.length === 0,
  };
}

export type AdditionalDocsOptions = {
  involvesFatality?: boolean;
};

export const INACTIVE_DOCUMENT_STATUSES = ["rejected", "archived"] as const;

export const ADDITIONAL_DOCS_ALWAYS_REQUIRED = [
  "defendant_response",
  "sketch",
  "plaintiff_questionnaire",
] as const;

export function additionalDocsRequiredCount(involvesFatality: boolean): number {
  return (
    ADDITIONAL_DOCS_ALWAYS_REQUIRED.length + (involvesFatality ? 1 : 0)
  );
}

export function isActiveDocumentStatus(status: string | null | undefined): boolean {
  if (!status) return true;
  return !(INACTIVE_DOCUMENT_STATUSES as readonly string[]).includes(status);
}

export function getAdditionalDocsCompleteness(
  documentCategories: readonly string[],
  opts: AdditionalDocsOptions = {},
): DocumentCompletenessStatus {
  const required = ADDITIONAL_DOCS_CATEGORIES.filter((c) => {
    if (c === "death_certificate") return opts.involvesFatality === true;
    return true;
  });
  const present = uniquePresent(documentCategories, required);
  const missing = required.filter((c) => !present.includes(c));
  return {
    phase: "additional_docs",
    required,
    present,
    missing,
    complete: missing.length === 0,
  };
}

export function getCourtFilingCompleteness(
  documentCategories: readonly string[],
): DocumentCompletenessStatus {
  const required = [...COURT_FILING_CATEGORIES];
  const present = uniquePresent(documentCategories, required);
  const missing = required.filter((c) => !present.includes(c));
  return {
    phase: "court_filing",
    required,
    present,
    missing,
    complete: missing.length === 0,
  };
}

/** True when case is in a phase that cares about missing docs and any are missing. */
export function shouldEmitMissingDocumentsAlert(
  caseStatus: string,
  completeness: DocumentCompletenessStatus,
): boolean {
  if (completeness.complete) return false;
  if (completeness.phase === "intake") {
    return caseStatus === "intake" || caseStatus === "assignment";
  }
  if (completeness.phase === "court_filing") {
    return caseStatus === "validation_delivery";
  }
  return caseStatus === "additional_docs";
}

/** Throttle repeated missing-doc notifications (e.g. every upload). */
export const MISSING_DOCS_NOTIFY_COOLDOWN_MS = 6 * 60 * 60 * 1000;

export function shouldThrottleMissingDocumentsAlert(
  lastNotifiedAtMs: number | null | undefined,
  nowMs: number,
  cooldownMs: number = MISSING_DOCS_NOTIFY_COOLDOWN_MS,
): boolean {
  if (lastNotifiedAtMs == null) return false;
  return nowMs - lastNotifiedAtMs < cooldownMs;
}

/** Active completeness checklist for a case status (dashboard KPI + alerts). */
export function activeCompletenessForCaseStatus(
  caseStatus: string,
  documentCategories: readonly string[],
  opts: AdditionalDocsOptions = {},
): DocumentCompletenessStatus {
  if (caseStatus === "validation_delivery") {
    return getCourtFilingCompleteness(documentCategories);
  }
  if (caseStatus === "additional_docs") {
    return getAdditionalDocsCompleteness(documentCategories, opts);
  }
  return getIntakeCompleteness(documentCategories);
}

/** Case statuses where missing-docs KPI / alerts apply. */
export const MISSING_DOCS_KPI_STATUSES = [
  "intake",
  "assignment",
  "additional_docs",
  "validation_delivery",
] as const;

export function caseStatusCountsTowardMissingDocsKpi(
  caseStatus: string,
): boolean {
  return (MISSING_DOCS_KPI_STATUSES as readonly string[]).includes(caseStatus);
}

/** SOP P1/P5: missing intake/additional docs alert the despacho. */
export function shouldNotifyLawFirmOfMissingDocs(
  completeness: DocumentCompletenessStatus,
): boolean {
  return (
    completeness.phase === "intake" || completeness.phase === "additional_docs"
  );
}

/** SOP P5: same-day note to the despacho when additional docs are missing. */
export function shouldWriteLawFirmMissingDocsNote(
  completeness: DocumentCompletenessStatus,
): boolean {
  return completeness.phase === "additional_docs";
}

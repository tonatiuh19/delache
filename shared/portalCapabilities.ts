/**
 * Portal case-detail section visibility + server-aligned action RBAC by staff role.
 */

import type { UserRole } from "./api";
import type { ReviewStage } from "./reviewRequestRules";

export const CASE_SECTIONS = [
  "workflow",
  "timeline",
  "notes",
  "documents",
  "assignments",
  "deadlines",
  "questionnaire",
  "reviews",
  "inspections",
  "evidence",
  "logistics",
  "reports",
  "audit",
  "completeness",
] as const;

export type CaseSection = (typeof CASE_SECTIONS)[number];

/** Sections that imply mutate permission when visible (API must match). */
export type CaseMutateSection = Extract<
  CaseSection,
  | "documents"
  | "questionnaire"
  | "reviews"
  | "inspections"
  | "evidence"
  | "logistics"
  | "reports"
>;

const ALL = new Set<CaseSection>(CASE_SECTIONS);

const BY_ROLE: Record<UserRole, ReadonlySet<CaseSection>> = {
  admin: ALL,
  case_coordinator: ALL,
  expert: new Set([
    "workflow",
    "timeline",
    "notes",
    "documents",
    "deadlines",
    "questionnaire",
    "inspections",
    "evidence",
    "reports",
    "reviews",
    "completeness",
  ]),
  legal: new Set([
    "workflow",
    "timeline",
    "notes",
    "documents",
    "deadlines",
    "questionnaire",
    "reviews",
    "reports",
    "audit",
    "completeness",
  ]),
  logistics: new Set([
    "workflow",
    "timeline",
    "notes",
    "deadlines",
    "inspections",
    "logistics",
    "evidence",
  ]),
  accountant: new Set([
    "workflow",
    "timeline",
    "notes",
    "documents",
    "deadlines",
    "audit",
    "completeness",
  ]),
};

const REVIEW_STAGE_ROLES: Record<ReviewStage, readonly UserRole[]> = {
  grammar_qa: ["admin", "case_coordinator", "expert"],
  technical_director: ["admin", "case_coordinator", "expert"],
  internal_legal: ["admin", "case_coordinator", "legal"],
  /** External law-firm stage is completed via client portal; staff admin can override. */
  external_law_firm: ["admin"],
};

export function canViewCaseSection(
  role: string | null | undefined,
  section: CaseSection,
): boolean {
  if (!role) return false;
  const set = BY_ROLE[role as UserRole];
  if (!set) return role === "admin";
  return set.has(section);
}

export function visibleCaseSections(
  role: string | null | undefined,
): CaseSection[] {
  return CASE_SECTIONS.filter((s) => canViewCaseSection(role, s));
}

export function canMutateCaseSection(
  role: string | null | undefined,
  section: CaseMutateSection,
): boolean {
  return canViewCaseSection(role, section);
}

export function canCompleteReviewStage(
  role: string | null | undefined,
  stage: string,
): boolean {
  if (!role) return false;
  const allowed = REVIEW_STAGE_ROLES[stage as ReviewStage];
  if (!allowed) return false;
  return allowed.includes(role as UserRole);
}

/**
 * Staff must not approve reports out of external_review — that is law-firm review.
 * Admin may override for operational recovery.
 */
export function canStaffApproveExternalReview(
  role: string | null | undefined,
): boolean {
  return role === "admin";
}

/** Questionnaire approve / reject / changes_requested — legal gate. */
export function canDecideQuestionnaireReview(
  role: string | null | undefined,
): boolean {
  return (
    role === "admin" || role === "case_coordinator" || role === "legal"
  );
}

/** Edit property GPS / address on a case. */
export function canEditCaseLocation(role: string | null | undefined): boolean {
  return (
    role === "admin" ||
    role === "case_coordinator" ||
    role === "expert" ||
    role === "logistics"
  );
}

/** Case workflow status transitions — coordinators and admins. */
export function canChangeCaseStatus(role: string | null | undefined): boolean {
  return role === "admin" || role === "case_coordinator";
}

/** Accountant may only complete P12; coordinators/admins keep full workflow. */
export function canApplyCaseStatusChange(
  role: string | null | undefined,
  from: string,
  to: string,
): boolean {
  if (canChangeCaseStatus(role)) return true;
  return role === "accountant" && from === "accounting" && to === "completed";
}

/** Assignments — coordinators and admins. */
export function canManageCaseAssignments(
  role: string | null | undefined,
): boolean {
  return role === "admin" || role === "case_coordinator";
}

/** Calendar create/update — ops roles. */
export function canManageCalendar(role: string | null | undefined): boolean {
  return (
    role === "admin" ||
    role === "case_coordinator" ||
    role === "logistics" ||
    role === "expert"
  );
}

/** Generic blob upload endpoint — documents or evidence roles. */
export function canUploadBlobs(role: string | null | undefined): boolean {
  return (
    canMutateCaseSection(role, "documents") ||
    canMutateCaseSection(role, "evidence")
  );
}

export type CaseDetailSectionsPayload = {
  notes: unknown[];
  documents: Array<{ ocrText?: string | null; storageKey?: string | null }>;
  assignments: unknown[];
  deadlines: unknown[];
  questionnaires: unknown[];
  inspections: unknown[];
  measurements: unknown[];
  evidence: unknown[];
  evidenceChecklist: unknown;
  reviewRequests: unknown[];
  documentCompleteness: unknown;
  auditLogs: unknown[];
  trips: unknown[];
  expenses: unknown[];
  technicalReports: unknown[];
};

/**
 * Strip case-detail sections the role cannot view (server-side RBAC).
 * Mutates a shallow copy-friendly object and returns it.
 */
export function filterCaseDetailSectionsForRole<T extends CaseDetailSectionsPayload>(
  role: string | null | undefined,
  payload: T,
): T {
  const next = { ...payload };
  if (!canViewCaseSection(role, "notes")) next.notes = [];
  if (!canViewCaseSection(role, "documents")) {
    next.documents = [];
  } else {
    // Hide full OCR text from roles that can see docs but shouldn't scrape content?
    // Keep OCR for document viewers; strip storageKey is handled by signed URLs.
    next.documents = payload.documents.map((d) => ({ ...d }));
  }
  if (!canViewCaseSection(role, "assignments")) next.assignments = [];
  if (!canViewCaseSection(role, "deadlines")) next.deadlines = [];
  if (!canViewCaseSection(role, "questionnaire")) next.questionnaires = [];
  if (!canViewCaseSection(role, "inspections")) {
    next.inspections = [];
    next.measurements = [];
  }
  if (!canViewCaseSection(role, "evidence")) {
    next.evidence = [];
    next.evidenceChecklist = null;
  }
  if (!canViewCaseSection(role, "reviews")) next.reviewRequests = [];
  if (!canViewCaseSection(role, "completeness")) next.documentCompleteness = null;
  if (!canViewCaseSection(role, "audit")) next.auditLogs = [];
  if (!canViewCaseSection(role, "logistics")) {
    next.trips = [];
    next.expenses = [];
  }
  if (!canViewCaseSection(role, "reports")) next.technicalReports = [];
  return next;
}

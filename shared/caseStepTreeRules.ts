/**
 * Case detail step tree: flat 10-point list, URL slugs, section mapping, action CTAs.
 */

import type { CaseStatus, UserRole } from "./api";
import { CASE_STATUS_FLOW } from "./caseWorkflow";
import {
  canChangeCaseStatus,
  canViewCaseSection,
  type CaseSection,
} from "./portalCapabilities";
import {
  evaluateProcessGates,
  PROCESS_POINT_IDS,
  PROCESS_POINTS,
  processPointForStatus,
  type ProcessGateInput,
  type ProcessPointId,
} from "./processGates";
import {
  partitionMissingGatesForViewer,
  processViewerActionKey,
} from "./processGuidanceRules";
import { visibleProcessPointIdsForRole } from "./roleMissionRules";

export type ProcessStepSlug =
  (typeof PROCESS_POINTS)[ProcessPointId]["slug"];

export type CaseDetailSectionId =
  | "location"
  | "completeness"
  | "deadlines"
  | "workflow"
  | "timeline"
  | "notes"
  | "documents"
  | "assignments"
  | "questionnaire"
  | "reviews"
  | "inspections"
  | "evidence"
  | "logistics"
  | "reports"
  | "finance"
  | "audit";

export type StepTreeNode = {
  id: ProcessPointId;
  slug: ProcessStepSlug;
  children?: readonly StepTreeNode[];
};

/** Flat 10-point process rail (P7 field_ops merges logistics+inspection; P9 merges validation+delivery). */
export const CASE_STEP_TREE: readonly StepTreeNode[] = [
  { id: 1, slug: "intake" },
  { id: 2, slug: "questionnaire" },
  { id: 3, slug: "assignment" },
  { id: 4, slug: "legal_review_questionnaire" },
  { id: 5, slug: "additional_docs" },
  { id: 6, slug: "court_acceptance" },
  { id: 7, slug: "field_ops" },
  { id: 8, slug: "technical_report" },
  { id: 9, slug: "validation_delivery" },
  { id: 10, slug: "accounting" },
];

/** Legacy URL slugs from the 12-point tree → canonical slug. */
export const LEGACY_STEP_SLUG_ALIASES: Record<string, ProcessStepSlug> = {
  logistics: "field_ops",
  inspection: "field_ops",
  legal_validation: "validation_delivery",
  court_delivery: "validation_delivery",
};

export type StepVisualStatus =
  | "completed"
  | "current"
  | "upcoming"
  | "locked";

const SLUG_TO_POINT: Record<string, ProcessPointId> = Object.fromEntries(
  PROCESS_POINT_IDS.map((id) => [PROCESS_POINTS[id].slug, id]),
) as Record<string, ProcessPointId>;

export function canonicalizeStepSlug(
  slug: string | null | undefined,
): ProcessStepSlug | null {
  if (!slug) return null;
  if (slug in SLUG_TO_POINT) return slug as ProcessStepSlug;
  return LEGACY_STEP_SLUG_ALIASES[slug] ?? null;
}

export function processPointForSlug(
  slug: string | undefined | null,
): ProcessPointId | null {
  const canonical = canonicalizeStepSlug(slug);
  if (!canonical) return null;
  return SLUG_TO_POINT[canonical] ?? null;
}

export function caseStepPath(
  publicUuid: string,
  slug?: ProcessStepSlug | "overview" | string,
  section?: CaseDetailSectionId,
): string {
  const base = `/portal/cases/${publicUuid}`;
  if (!slug || slug === "overview") return base;
  const canonical = canonicalizeStepSlug(slug) ?? slug;
  const path = `${base}/p/${canonical}`;
  if (!section) return path;
  return `${path}?section=${section}`;
}

/** DOM anchor for scroll targets (`#case-location`, etc.). */
export function sectionDomId(sectionId: CaseDetailSectionId): string {
  const map: Record<CaseDetailSectionId, string> = {
    location: "case-location",
    completeness: "case-completeness",
    deadlines: "case-deadlines",
    workflow: "case-workflow",
    timeline: "case-workflow",
    notes: "case-notes",
    documents: "case-documents",
    assignments: "case-assignments",
    questionnaire: "case-questionnaire",
    reviews: "case-reviews",
    inspections: "case-inspections",
    evidence: "case-evidence",
    logistics: "case-logistics",
    reports: "case-reports",
    finance: "case-finance",
    audit: "case-audit",
  };
  return map[sectionId];
}

export type CaseStepSubsection = {
  sectionId: CaseDetailSectionId;
  labelKey: string;
};

/** Fill-in areas per step (sidebar substeps). Omits duplicate timeline row. */
export const SUBSTEPS_BY_STEP: Record<
  ProcessStepSlug,
  readonly CaseStepSubsection[]
> = {
  intake: [
    { sectionId: "documents", labelKey: "cases.subsection.intake" },
    { sectionId: "location", labelKey: "cases.subsection.location" },
    { sectionId: "workflow", labelKey: "cases.subsection.workflow" },
  ],
  assignment: [
    { sectionId: "assignments", labelKey: "cases.subsection.assignments" },
    { sectionId: "workflow", labelKey: "cases.subsection.workflow" },
    { sectionId: "notes", labelKey: "cases.subsection.notes" },
  ],
  questionnaire: [
    { sectionId: "location", labelKey: "cases.subsection.location" },
    { sectionId: "questionnaire", labelKey: "cases.subsection.questionnaire" },
    { sectionId: "documents", labelKey: "cases.subsection.documents" },
    { sectionId: "workflow", labelKey: "cases.subsection.workflow" },
    { sectionId: "notes", labelKey: "cases.subsection.notes" },
  ],
  legal_review_questionnaire: [
    { sectionId: "questionnaire", labelKey: "cases.subsection.questionnaire" },
    { sectionId: "reviews", labelKey: "cases.subsection.reviews" },
    { sectionId: "documents", labelKey: "cases.subsection.documents" },
    { sectionId: "workflow", labelKey: "cases.subsection.workflow" },
    { sectionId: "notes", labelKey: "cases.subsection.notes" },
  ],
  additional_docs: [
    { sectionId: "documents", labelKey: "cases.subsection.documents" },
    { sectionId: "completeness", labelKey: "cases.subsection.completeness" },
    { sectionId: "workflow", labelKey: "cases.subsection.workflow" },
    { sectionId: "notes", labelKey: "cases.subsection.notes" },
  ],
  court_acceptance: [
    { sectionId: "documents", labelKey: "cases.subsection.documents" },
    { sectionId: "deadlines", labelKey: "cases.subsection.deadlines" },
    { sectionId: "workflow", labelKey: "cases.subsection.workflow" },
    { sectionId: "notes", labelKey: "cases.subsection.notes" },
  ],
  field_ops: [
    { sectionId: "logistics", labelKey: "cases.subsection.logistics" },
    { sectionId: "inspections", labelKey: "cases.subsection.inspections" },
    { sectionId: "evidence", labelKey: "cases.subsection.evidence" },
    { sectionId: "location", labelKey: "cases.subsection.location" },
    { sectionId: "deadlines", labelKey: "cases.subsection.deadlines" },
    { sectionId: "workflow", labelKey: "cases.subsection.workflow" },
    { sectionId: "notes", labelKey: "cases.subsection.notes" },
  ],
  technical_report: [
    { sectionId: "reports", labelKey: "cases.subsection.reports" },
    { sectionId: "evidence", labelKey: "cases.subsection.evidence" },
    { sectionId: "workflow", labelKey: "cases.subsection.workflow" },
    { sectionId: "notes", labelKey: "cases.subsection.notes" },
  ],
  validation_delivery: [
    { sectionId: "reviews", labelKey: "cases.subsection.reviews" },
    { sectionId: "reports", labelKey: "cases.subsection.reports" },
    { sectionId: "documents", labelKey: "cases.subsection.documents" },
    { sectionId: "evidence", labelKey: "cases.subsection.evidence" },
    { sectionId: "deadlines", labelKey: "cases.subsection.deadlines" },
    { sectionId: "workflow", labelKey: "cases.subsection.workflow" },
    { sectionId: "notes", labelKey: "cases.subsection.notes" },
  ],
  accounting: [
    { sectionId: "finance", labelKey: "cases.subsection.finance" },
    { sectionId: "documents", labelKey: "cases.subsection.documents" },
    { sectionId: "audit", labelKey: "cases.subsection.audit" },
    { sectionId: "workflow", labelKey: "cases.subsection.workflow" },
    { sectionId: "notes", labelKey: "cases.subsection.notes" },
  ],
};

export function substepsForStepSlug(
  slug: string | null | undefined,
): readonly CaseStepSubsection[] {
  if (!slug || !isValidProcessStepSlug(slug)) return [];
  return SUBSTEPS_BY_STEP[slug] ?? [];
}

/** Whether the viewer can open a subsection in the step tree / tab nav. */
export function canViewCaseSubsection(
  role: UserRole | string | null | undefined,
  sectionId: CaseDetailSectionId,
): boolean {
  if (!role) return false;
  if (sectionId === "location") return true;
  // Status advance is admin-only — hide workflow from operator trees.
  // Accountant keeps workflow on P10 (can complete → completed).
  if (sectionId === "workflow" || sectionId === "timeline") {
    return canChangeCaseStatus(role) || role === "accountant";
  }
  return canViewCaseSection(role, sectionId as CaseSection);
}

/** Substeps visible for a role (hides completeness when documents panel covers it). */
export function visibleSubstepsForStep(
  slug: string | null | undefined,
  role: UserRole | string | null | undefined,
): readonly CaseStepSubsection[] {
  return substepsForStepSlug(slug).filter((sub) => {
    if (
      sub.sectionId === "completeness" &&
      canViewCaseSection(role, "documents")
    ) {
      return false;
    }
    return canViewCaseSubsection(role, sub.sectionId);
  });
}

/** Preferred subsection for a role (first visible), falling back to step default. */
export function defaultSubsectionForStep(
  stepSlug: string | null | undefined,
  role?: UserRole | string | null,
): CaseDetailSectionId | null {
  // PDF workspaces are one page; do not force ?section=.
  if (
    stepSlug === "questionnaire" ||
    stepSlug === "assignment" ||
    stepSlug === "legal_review_questionnaire" ||
    stepSlug === "court_acceptance" ||
    stepSlug === "field_ops"
  ) {
    return null;
  }
  if (role) {
    const visible = visibleSubstepsForStep(stepSlug, role);
    if (visible.length > 0) return visible[0]!.sectionId;
  }
  const substeps = substepsForStepSlug(stepSlug);
  return substeps[0]?.sectionId ?? null;
}

/**
 * Step-tree nodes this role should navigate (Miro mission + soft parallel + PASO ACTUAL).
 */
export function visibleStepTreeForRole(opts: {
  role: UserRole | string | null | undefined;
  currentPoint?: ProcessPointId | null;
  status?: CaseStatus | string | null;
}): readonly StepTreeNode[] {
  const ids = new Set(
    visibleProcessPointIdsForRole({
      role: opts.role,
      currentPoint: opts.currentPoint,
      status: opts.status,
    }),
  );
  const showLegacyDocs = opts.status === "additional_docs";
  return CASE_STEP_TREE.filter((node) => {
    if (!ids.has(node.id)) return false;
    if (!showLegacyDocs && node.slug === "additional_docs") return false;
    return true;
  });
}

/** Sidebar number for the client-approved 1–7 order (skips the hidden docs step). */
export function clientStepNumber(point: ProcessPointId): number {
  if (point <= 4) return point;
  if (point === 5) return 5;
  return point - 1;
}

export function isValidCaseDetailSectionId(
  value: string | null | undefined,
): value is CaseDetailSectionId {
  if (!value) return false;
  return (
    value === "location" ||
    value === "completeness" ||
    value === "deadlines" ||
    value === "workflow" ||
    value === "timeline" ||
    value === "notes" ||
    value === "documents" ||
    value === "assignments" ||
    value === "questionnaire" ||
    value === "reviews" ||
    value === "inspections" ||
    value === "evidence" ||
    value === "logistics" ||
    value === "reports" ||
    value === "finance" ||
    value === "audit"
  );
}

export function resolveFocusedSection(
  stepSlug: string | null | undefined,
  sectionParam: string | null | undefined,
): CaseDetailSectionId | null {
  if (!stepSlug || !sectionParam) return null;
  if (!isValidCaseDetailSectionId(sectionParam)) return null;
  const allowed = sectionsForStepSlug(stepSlug);
  if (!allowed.includes(sectionParam)) return null;
  return sectionParam;
}

export function flattenStepTree(
  nodes: readonly StepTreeNode[] = CASE_STEP_TREE,
): ProcessPointId[] {
  const out: ProcessPointId[] = [];
  for (const node of nodes) {
    out.push(node.id);
    if (node.children?.length) {
      for (const child of node.children) {
        out.push(child.id);
      }
    }
  }
  return out;
}

export function stepVisualStatus(
  pointId: ProcessPointId,
  currentPoint: ProcessPointId | null,
  caseStatus: CaseStatus,
): StepVisualStatus {
  if (caseStatus === "completed") {
    return "completed";
  }
  if (caseStatus === "cancelled") {
    return pointId === currentPoint ? "current" : "locked";
  }
  if (currentPoint == null) {
    return caseStatus === "on_hold" ? "locked" : "upcoming";
  }
  const order = flattenStepTree();
  const curIdx = order.indexOf(currentPoint);
  const idx = order.indexOf(pointId);
  if (idx < 0 || curIdx < 0) return "upcoming";
  if (idx < curIdx) return "completed";
  if (idx === curIdx) return "current";
  return "upcoming";
}

/** Sections rendered when viewing a process step. */
export const SECTIONS_BY_STEP: Record<
  ProcessStepSlug,
  readonly CaseDetailSectionId[]
> = {
  intake: ["documents", "location", "workflow", "timeline"],
  assignment: ["assignments", "workflow", "timeline", "notes"],
  questionnaire: [
    "location",
    "questionnaire",
    "documents",
    "workflow",
    "timeline",
    "notes",
  ],
  legal_review_questionnaire: [
    "questionnaire",
    "reviews",
    "documents",
    "workflow",
    "timeline",
    "notes",
  ],
  additional_docs: ["documents", "completeness", "workflow", "timeline", "notes"],
  court_acceptance: [
    "documents",
    "deadlines",
    "workflow",
    "timeline",
    "notes",
  ],
  field_ops: [
    "logistics",
    "inspections",
    "evidence",
    "location",
    "deadlines",
    "workflow",
    "timeline",
    "notes",
  ],
  technical_report: ["reports", "evidence", "workflow", "timeline", "notes"],
  validation_delivery: [
    "reviews",
    "reports",
    "documents",
    "evidence",
    "deadlines",
    "workflow",
    "timeline",
    "notes",
  ],
  accounting: ["finance", "documents", "audit", "workflow", "timeline", "notes"],
};

export function sectionsForStepSlug(
  slug: string | null | undefined,
): readonly CaseDetailSectionId[] {
  if (!slug) return [];
  const point = processPointForSlug(slug);
  if (!point) return [];
  return SECTIONS_BY_STEP[PROCESS_POINTS[point].slug] ?? [];
}

export function shouldShowSection(
  sectionId: CaseDetailSectionId,
  stepSlug: string | null | undefined,
  isOverview: boolean,
  focusedSection?: CaseDetailSectionId | null,
): boolean {
  if (isOverview) return false;
  if (!stepSlug) return true;
  if (!sectionsForStepSlug(stepSlug).includes(sectionId)) return false;
  if (focusedSection) {
    if (sectionId === focusedSection) return true;
    if (focusedSection === "workflow" && sectionId === "timeline") return true;
    return false;
  }
  return true;
}

export type ActionRequiredSummary = {
  point: ProcessPointId;
  slug: ProcessStepSlug;
  gatesOk: boolean;
  /** Full missing list (process still blocked until empty). */
  missingGateCodes: readonly string[];
  /** Subset the current viewer can clear themselves. */
  viewerMissingGateCodes: readonly string[];
  /** Subset owned by other roles. */
  waitingGateCodes: readonly string[];
  ctaHref: string;
  ctaLabelKey: string;
  progressCompleted: number;
  progressTotal: number;
};

export function completedProcessSteps(
  currentPoint: ProcessPointId | null,
  caseStatus: CaseStatus,
): number {
  if (caseStatus === "completed") return PROCESS_POINT_IDS.length;
  if (currentPoint == null) return 0;
  const order = flattenStepTree();
  const idx = order.indexOf(currentPoint);
  return idx >= 0 ? idx : 0;
}

export function buildActionRequiredSummary(opts: {
  publicUuid: string;
  caseStatus: CaseStatus;
  gateInput: ProcessGateInput;
  serverGate?: { point: ProcessPointId; ok: boolean; missing: string[] } | null;
  viewerRole?: UserRole | string | null;
}): ActionRequiredSummary | null {
  const current = processPointForStatus(opts.caseStatus);
  if (current == null) return null;

  const local = evaluateProcessGates(current, opts.gateInput);
  const gates =
    opts.serverGate && opts.serverGate.point === current
      ? { ok: opts.serverGate.ok, missing: opts.serverGate.missing }
      : local;

  const slug = PROCESS_POINTS[current].slug;
  const { actionable, waiting } = partitionMissingGatesForViewer(
    gates.missing,
    opts.viewerRole,
  );
  const actionKey = processViewerActionKey(opts.viewerRole);

  // Soft-parallel CTA: expert stuck on assignment admin gates → questionnaire.
  const softParallelExpert =
    current === 3 &&
    !gates.ok &&
    actionable.length === 0 &&
    opts.viewerRole === "expert";

  const ctaLabelKey = softParallelExpert
    ? "process.quickLink.questionnaire"
    : gates.ok
      ? `cases.action.continueStep.${slug}`
      : actionable.length > 0 && actionKey
        ? `process.viewerAction.${actionKey}`
        : actionKey
          ? `process.viewerAction.${actionKey}`
          : `cases.action.openStep.${slug}`;

  const ctaHref = softParallelExpert
    ? caseStepPath(opts.publicUuid, "questionnaire", "questionnaire")
    : caseStepPath(
        opts.publicUuid,
        slug,
        defaultSubsectionForStep(slug) ?? undefined,
      );

  const progressTotal = flattenStepTree().length;
  const progressCompleted = completedProcessSteps(current, opts.caseStatus);

  return {
    point: current,
    slug,
    gatesOk: gates.ok,
    missingGateCodes: gates.missing,
    viewerMissingGateCodes: actionable,
    waitingGateCodes: waiting,
    ctaHref,
    ctaLabelKey,
    progressCompleted,
    progressTotal,
  };
}

/** Cases needing attention for list action queue (gates not satisfied). */
export function caseNeedsAction(
  gatesOk: boolean | undefined,
  status: CaseStatus,
): boolean {
  if (status === "completed" || status === "cancelled") return false;
  return gatesOk === false;
}

export function compareCasesByActionPriority(
  a: { priority: string; listado?: { gatesOk?: boolean } | null },
  b: { priority: string; listado?: { gatesOk?: boolean } | null },
): number {
  const priorityRank: Record<string, number> = {
    urgent: 0,
    high: 1,
    normal: 2,
    low: 3,
  };
  const pa = priorityRank[a.priority] ?? 2;
  const pb = priorityRank[b.priority] ?? 2;
  if (pa !== pb) return pa - pb;
  const ga = a.listado?.gatesOk === false ? 0 : 1;
  const gb = b.listado?.gatesOk === false ? 0 : 1;
  return ga - gb;
}

export function isValidProcessStepSlug(slug: string): slug is ProcessStepSlug {
  return canonicalizeStepSlug(slug) != null;
}

export function redirectStepForLegacyHash(
  hash: string,
): ProcessStepSlug | null {
  if (hash === "#case-reviews") return "legal_review_questionnaire";
  if (hash === "#case-questionnaire") return "questionnaire";
  if (hash === "#case-assignments") return "assignment";
  if (hash === "#case-documents") return "additional_docs";
  if (hash === "#case-location") return "intake";
  if (hash === "#case-inspections" || hash === "#case-evidence") {
    return "field_ops";
  }
  if (hash === "#case-logistics") return "field_ops";
  return null;
}

export function caseStatusIndex(status: CaseStatus): number {
  return CASE_STATUS_FLOW.indexOf(status);
}

export function legacySectionForHash(
  hash: string,
): CaseDetailSectionId | null {
  if (hash === "#case-location") return "location";
  if (hash === "#case-documents") return "documents";
  if (hash === "#case-reviews") return "reviews";
  if (hash === "#case-questionnaire") return "questionnaire";
  if (hash === "#case-assignments") return "assignments";
  if (hash === "#case-inspections") return "inspections";
  if (hash === "#case-evidence") return "evidence";
  if (hash === "#case-logistics") return "logistics";
  if (hash === "#case-workflow") return "workflow";
  if (hash === "#case-notes") return "notes";
  return null;
}

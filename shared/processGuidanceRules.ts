/**
 * Case process guidance: who owns the current point, how assignment works,
 * what is needed to advance, role-gated copy, and in-page quick links.
 */

import type { UserRole } from "./api";
import {
  accountableActor,
  PROCESS_POINTS,
  type ProcessActor,
  type ProcessPointId,
  type RaciLetter,
} from "./processGates";
import {
  canChangeCaseStatus,
  canCompleteReviewStage,
  canManageCaseAssignments,
  canMutateCaseSection,
  canViewCaseSection,
} from "./portalCapabilities";
import { canConfirmDocumentsHandoff } from "./handoffRules";
import {
  documentCategoryFromGateCode,
  documentCategoryHref,
} from "./documentPanelRules";
import {
  caseStepPath,
  type CaseDetailSectionId,
  type ProcessStepSlug,
} from "./caseStepTreeRules";

export type ProcessRaciBucket = {
  letter: RaciLetter;
  actors: ProcessActor[];
};

export function processPointRaciBuckets(
  point: ProcessPointId,
): ProcessRaciBucket[] {
  const raci = PROCESS_POINTS[point].raci;
  const order: RaciLetter[] = ["A", "R", "C", "I"];
  return order
    .map((letter) => ({
      letter,
      actors: (
        Object.entries(raci) as [ProcessActor, RaciLetter][]
      )
        .filter(([, l]) => l === letter)
        .map(([actor]) => actor),
    }))
    .filter((b) => b.actors.length > 0);
}

export function processPointAccountable(
  point: ProcessPointId,
): ProcessActor | null {
  return accountableActor(point);
}

/** Who may advance case status for this point (product RBAC). */
export function whoCanAdvanceWorkflow(
  role: string | null | undefined,
): boolean {
  return canChangeCaseStatus(role);
}

/**
 * Assignment section is critical from P2 onward; at P1 explain intake ownership.
 */
export function shouldHighlightAssignment(
  point: ProcessPointId | null,
): boolean {
  return point != null && point >= 3;
}

/** Full RACI matrix — ops / legal; others get a compact “your action” blurb. */
export function canSeeProcessRaciDetail(
  role: string | null | undefined,
): boolean {
  return role === "admin" || role === "legal";
}

/**
 * Whether this staff role can personally satisfy a missing process gate.
 * Admin-only gates (handoff, primary assign, status advance) stay false for perito.
 */
export function viewerCanActOnGate(
  code: string,
  role: string | null | undefined,
): boolean {
  if (!role) return false;

  if (code === "handoff:documents_confirmed") {
    return canConfirmDocumentsHandoff(role);
  }
  if (code === "assignment:primary_expert") {
    return canManageCaseAssignments(role);
  }
  if (code.startsWith("doc:")) {
    return canMutateCaseSection(role, "documents");
  }
  if (code === "questionnaire:legal_approved") {
    return canCompleteReviewStage(role, "internal_legal");
  }
  if (code.startsWith("questionnaire:")) {
    return canMutateCaseSection(role, "questionnaire");
  }
  if (code.startsWith("evidence:")) {
    return canMutateCaseSection(role, "evidence");
  }
  if (code.startsWith("inspection:")) {
    return canMutateCaseSection(role, "inspections");
  }
  if (code.startsWith("logistics:")) {
    return canMutateCaseSection(role, "logistics");
  }
  if (code.startsWith("location:")) {
    return (
      canMutateCaseSection(role, "questionnaire") ||
      canMutateCaseSection(role, "inspections")
    );
  }
  if (code === "report:internal_approved") {
    return (
      canCompleteReviewStage(role, "technical_director") ||
      canCompleteReviewStage(role, "grammar_qa") ||
      whoCanAdvanceWorkflow(role)
    );
  }
  if (code === "report:firm_approved") {
    return whoCanAdvanceWorkflow(role);
  }
  if (code === "court:ratification_scheduled") {
    return whoCanAdvanceWorkflow(role);
  }
  if (code.startsWith("finance:")) {
    return role === "accountant" || whoCanAdvanceWorkflow(role);
  }
  // Unknown codes: only ops treat them as actionable checklists.
  return whoCanAdvanceWorkflow(role);
}

export type MissingGatesForViewer = {
  /** Gates this role can clear themselves. */
  actionable: string[];
  /** Gates blocked on other roles (shown as waiting, not fake CTAs). */
  waiting: string[];
};

export function partitionMissingGatesForViewer(
  missingGateCodes: readonly string[],
  role: string | null | undefined,
): MissingGatesForViewer {
  const actionable: string[] = [];
  const waiting: string[] = [];
  for (const code of missingGateCodes) {
    if (viewerCanActOnGate(code, role)) actionable.push(code);
    else waiting.push(code);
  }
  return { actionable, waiting };
}

export type ProcessBlockedHowToKey =
  | "blockedHowToOps"
  | "blockedHowToUploader"
  | "blockedHowToWaitAssignment"
  | "blockedHowToWait"
  | "blockedHowToPrepParallel";

export function processBlockedHowToKey(opts: {
  role: string | null | undefined;
  missingGateCodes: readonly string[];
}): ProcessBlockedHowToKey {
  const missing = opts.missingGateCodes;
  if (whoCanAdvanceWorkflow(opts.role)) return "blockedHowToOps";

  const { actionable, waiting } = partitionMissingGatesForViewer(
    missing,
    opts.role,
  );

  if (
    actionable.some((c) => c.startsWith("doc:")) &&
    canMutateCaseSection(opts.role, "documents")
  ) {
    return "blockedHowToUploader";
  }
  if (actionable.length > 0) {
    return "blockedHowToWait";
  }
  if (
    waiting.includes("assignment:primary_expert") &&
    !canManageCaseAssignments(opts.role)
  ) {
    return "blockedHowToWaitAssignment";
  }
  const onlyAdminP2Waiting =
    waiting.length > 0 &&
    waiting.every(
      (c) =>
        c === "handoff:documents_confirmed" ||
        c === "assignment:primary_expert",
    );
  if (
    onlyAdminP2Waiting &&
    (opts.role === "expert" || opts.role === "logistics")
  ) {
    return "blockedHowToPrepParallel";
  }
  return "blockedHowToWait";
}

export type ProcessQuickLinkId =
  | "documents"
  | "assignments"
  | "workflow"
  | "questionnaire"
  | "evidence"
  | "inspections"
  | "logistics"
  | "location";

export type ProcessQuickLink = {
  id: ProcessQuickLinkId;
  /** In-app path (`/portal/cases/:uuid/p/:slug?section=`) or legacy hash fallback. */
  href: string;
  section: CaseDetailSectionId;
};

const LINK_SECTION: Record<ProcessQuickLinkId, CaseDetailSectionId> = {
  documents: "documents",
  assignments: "assignments",
  workflow: "workflow",
  questionnaire: "questionnaire",
  evidence: "evidence",
  inspections: "inspections",
  logistics: "logistics",
  location: "location",
};

/** Prefer step-scoped section path; fall back to hash for overview-only callers. */
export function resolveProcessQuickLinkHref(opts: {
  id: ProcessQuickLinkId;
  publicUuid?: string | null;
  stepSlug?: ProcessStepSlug | string | null;
  /** Optional override (e.g. document category hash). */
  hash?: string | null;
}): string {
  const section = LINK_SECTION[opts.id];
  const hash =
    opts.hash == null
      ? ""
      : opts.hash.startsWith("#")
        ? opts.hash
        : `#${opts.hash}`;

  if (opts.publicUuid && opts.stepSlug) {
    const path = caseStepPath(opts.publicUuid, opts.stepSlug, section);
    return `${path}${hash}`;
  }
  if (opts.publicUuid) {
    return `${caseStepPath(opts.publicUuid)}${hash || `#case-${section}`}`;
  }
  return hash || `#case-${section}`;
}

function pushUnique(
  links: ProcessQuickLink[],
  id: ProcessQuickLinkId,
  hrefOpts?: {
    publicUuid?: string | null;
    stepSlug?: string | null;
    hash?: string | null;
  },
): void {
  if (links.some((l) => l.id === id)) return;
  links.push({
    id,
    section: LINK_SECTION[id],
    href: resolveProcessQuickLinkHref({
      id,
      publicUuid: hrefOpts?.publicUuid,
      stepSlug: hrefOpts?.stepSlug,
      hash: hrefOpts?.hash,
    }),
  });
}

/** Quick links for missing gates + role capabilities (staff case detail). */
export function processQuickLinksForViewer(opts: {
  role: string | null | undefined;
  missingGateCodes: readonly string[];
  gatesOk: boolean;
  point: ProcessPointId | null;
  publicUuid?: string | null;
  stepSlug?: ProcessStepSlug | string | null;
}): ProcessQuickLink[] {
  const { role, missingGateCodes, gatesOk, point } = opts;
  const hrefOpts = { publicUuid: opts.publicUuid, stepSlug: opts.stepSlug };
  const links: ProcessQuickLink[] = [];
  const { actionable } = partitionMissingGatesForViewer(
    missingGateCodes,
    role,
  );

  const hasDocGap = actionable.some((c) => c.startsWith("doc:"));
  const needsExpert = actionable.includes("assignment:primary_expert");
  const needsQuestionnaire = actionable.some((c) =>
    c.startsWith("questionnaire:"),
  );
  const needsEvidence = actionable.some((c) => c.startsWith("evidence:"));
  const needsInspection = actionable.some((c) =>
    c.startsWith("inspection:"),
  );
  const needsLogistics = actionable.some((c) =>
    c.startsWith("logistics:"),
  );
  const needsLocation = actionable.some((c) =>
    c.startsWith("location:"),
  );

  if (hasDocGap && canViewCaseSection(role, "documents")) {
    pushUnique(links, "documents", hrefOpts);
  }
  if (needsExpert && canViewCaseSection(role, "assignments")) {
    pushUnique(links, "assignments", hrefOpts);
  } else if (
    shouldHighlightAssignment(point) &&
    canManageCaseAssignments(role) &&
    canViewCaseSection(role, "assignments")
  ) {
    pushUnique(links, "assignments", hrefOpts);
  }
  if (needsQuestionnaire && canViewCaseSection(role, "questionnaire")) {
    pushUnique(links, "questionnaire", hrefOpts);
  }
  if (needsEvidence && canViewCaseSection(role, "evidence")) {
    pushUnique(links, "evidence", hrefOpts);
  }
  if (needsInspection && canViewCaseSection(role, "inspections")) {
    pushUnique(links, "inspections", hrefOpts);
  }
  if (needsLogistics && canViewCaseSection(role, "logistics")) {
    pushUnique(links, "logistics", hrefOpts);
  }
  if (needsLocation) {
    pushUnique(links, "location", hrefOpts);
  }
  if (
    actionable.includes("handoff:documents_confirmed") &&
    canConfirmDocumentsHandoff(role) &&
    canViewCaseSection(role, "assignments")
  ) {
    pushUnique(links, "assignments", hrefOpts);
  }
  if (
    actionable.includes("court:ratification_scheduled") &&
    canViewCaseSection(role, "documents")
  ) {
    pushUnique(links, "documents", {
      ...hrefOpts,
      hash: "#case-ratification-schedule",
    });
  }

  // Soft-parallel prep while assignment is blocked on admin gates.
  if (point === 3 && !gatesOk) {
    if (role === "expert") {
      if (canViewCaseSection(role, "questionnaire")) {
        pushUnique(links, "questionnaire", {
          publicUuid: opts.publicUuid,
          stepSlug: "questionnaire",
        });
      }
      pushUnique(links, "location", {
        publicUuid: opts.publicUuid,
        stepSlug: "questionnaire",
      });
      if (canViewCaseSection(role, "documents")) {
        pushUnique(links, "documents", {
          publicUuid: opts.publicUuid,
          stepSlug: "assignment",
        });
      }
    }
    if (role === "logistics" && canViewCaseSection(role, "logistics")) {
      pushUnique(links, "logistics", hrefOpts);
    }
  }

  if (whoCanAdvanceWorkflow(role) && canViewCaseSection(role, "workflow")) {
    pushUnique(links, "workflow", hrefOpts);
  } else if (gatesOk && whoCanAdvanceWorkflow(role)) {
    pushUnique(links, "workflow", hrefOpts);
  }

  return links;
}

/** Map a missing gate code to a scroll target when the viewer can open that section. */
export function processGateQuickLink(
  code: string,
  role: string | null | undefined,
  hrefOpts?: { publicUuid?: string | null; stepSlug?: string | null },
): ProcessQuickLink | null {
  if (!viewerCanActOnGate(code, role)) return null;

  const base = hrefOpts ?? {};
  if (code.startsWith("doc:") && canViewCaseSection(role, "documents")) {
    const category = documentCategoryFromGateCode(code);
    return {
      id: "documents",
      section: "documents",
      href: resolveProcessQuickLinkHref({
        id: "documents",
        ...base,
        hash: category ? documentCategoryHref(category) : undefined,
      }),
    };
  }
  if (
    code === "assignment:primary_expert" &&
    canViewCaseSection(role, "assignments")
  ) {
    return {
      id: "assignments",
      section: "assignments",
      href: resolveProcessQuickLinkHref({ id: "assignments", ...base }),
    };
  }
  if (
    code.startsWith("questionnaire:") &&
    canViewCaseSection(role, "questionnaire")
  ) {
    return {
      id: "questionnaire",
      section: "questionnaire",
      href: resolveProcessQuickLinkHref({ id: "questionnaire", ...base }),
    };
  }
  if (code.startsWith("evidence:") && canViewCaseSection(role, "evidence")) {
    return {
      id: "evidence",
      section: "evidence",
      href: resolveProcessQuickLinkHref({ id: "evidence", ...base }),
    };
  }
  if (
    code.startsWith("inspection:") &&
    canViewCaseSection(role, "inspections")
  ) {
    return {
      id: "inspections",
      section: "inspections",
      href: resolveProcessQuickLinkHref({ id: "inspections", ...base }),
    };
  }
  if (code.startsWith("logistics:") && canViewCaseSection(role, "logistics")) {
    return {
      id: "logistics",
      section: "logistics",
      href: resolveProcessQuickLinkHref({ id: "logistics", ...base }),
    };
  }
  if (code.startsWith("location:")) {
    return {
      id: "location",
      section: "location",
      href: resolveProcessQuickLinkHref({ id: "location", ...base }),
    };
  }
  if (
    code === "handoff:documents_confirmed" &&
    canViewCaseSection(role, "assignments")
  ) {
    return {
      id: "assignments",
      section: "assignments",
      href: resolveProcessQuickLinkHref({ id: "assignments", ...base }),
    };
  }
  if (
    code === "court:ratification_scheduled" &&
    canViewCaseSection(role, "documents")
  ) {
    return {
      id: "documents",
      section: "documents",
      href: resolveProcessQuickLinkHref({
        id: "documents",
        ...base,
        hash: "#case-ratification-schedule",
      }),
    };
  }
  return null;
}

export type NextStepGuidance = {
  point: ProcessPointId;
  accountable: ProcessActor | null;
  responsible: ProcessActor[];
  missingGateCodes: string[];
  /** Staff roles that can change status after gates pass. */
  advanceRoles: readonly UserRole[];
  /** Whether primary expert assignment is the main remaining gate. */
  needsPrimaryExpert: boolean;
};

export function buildNextStepGuidance(opts: {
  point: ProcessPointId;
  missingGateCodes: readonly string[];
}): NextStepGuidance {
  const buckets = processPointRaciBuckets(opts.point);
  const responsible =
    buckets.find((b) => b.letter === "R")?.actors ?? [];
  const missing = [...opts.missingGateCodes];
  return {
    point: opts.point,
    accountable: processPointAccountable(opts.point),
    responsible,
    missingGateCodes: missing,
    advanceRoles: ["admin"],
    needsPrimaryExpert: missing.includes("assignment:primary_expert"),
  };
}

/** Map process actor → staff portal role when applicable. */
export function processActorToStaffRole(
  actor: ProcessActor,
): UserRole | "law_firm" | null {
  switch (actor) {
    case "admin":
      return "admin";
    case "coordinator":
      return "admin";
    case "expert":
    case "questionnaire_author":
      return "expert";
    case "legal_internal":
      return "legal";
    case "logistics":
      return "logistics";
    case "accountant":
      return "accountant";
    case "law_firm":
      return "law_firm";
    case "qa":
    case "technical_director":
      return "expert";
    default:
      return null;
  }
}

/** Compact “what you should do” persona for non-ops viewers. */
export function processViewerActionKey(
  role: string | null | undefined,
): "ops" | "uploader" | "assignee" | "viewer" {
  if (whoCanAdvanceWorkflow(role)) return "ops";
  if (role === "expert" || role === "logistics" || role === "legal") {
    return "assignee";
  }
  if (canMutateCaseSection(role, "documents")) return "uploader";
  return "viewer";
}

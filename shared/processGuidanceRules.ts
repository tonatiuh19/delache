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
  canManageCaseAssignments,
  canMutateCaseSection,
  canViewCaseSection,
} from "./portalCapabilities";
import {
  documentCategoryFromGateCode,
  documentCategoryHref,
} from "./documentPanelRules";

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
  return point === 2 || (point != null && point > 2);
}

/** Full RACI matrix — ops / legal; others get a compact “your action” blurb. */
export function canSeeProcessRaciDetail(
  role: string | null | undefined,
): boolean {
  return (
    role === "admin" ||
    role === "case_coordinator" ||
    role === "legal"
  );
}

export type ProcessBlockedHowToKey =
  | "blockedHowToOps"
  | "blockedHowToUploader"
  | "blockedHowToWaitAssignment"
  | "blockedHowToWait";

export function processBlockedHowToKey(opts: {
  role: string | null | undefined;
  missingGateCodes: readonly string[];
}): ProcessBlockedHowToKey {
  const missing = opts.missingGateCodes;
  if (whoCanAdvanceWorkflow(opts.role)) return "blockedHowToOps";
  if (
    missing.includes("assignment:primary_expert") &&
    !canManageCaseAssignments(opts.role)
  ) {
    return "blockedHowToWaitAssignment";
  }
  if (
    missing.some((c) => c.startsWith("doc:")) &&
    canMutateCaseSection(opts.role, "documents")
  ) {
    return "blockedHowToUploader";
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
  /** In-page anchor on CaseDetail */
  href: string;
};

const SECTION_ANCHORS: Record<ProcessQuickLinkId, string> = {
  documents: "#case-documents",
  assignments: "#case-assignments",
  workflow: "#case-workflow",
  questionnaire: "#case-questionnaire",
  evidence: "#case-evidence",
  inspections: "#case-inspections",
  logistics: "#case-logistics",
  location: "#case-location",
};

function pushUnique(
  links: ProcessQuickLink[],
  id: ProcessQuickLinkId,
): void {
  if (links.some((l) => l.id === id)) return;
  links.push({ id, href: SECTION_ANCHORS[id] });
}

/** Quick links for missing gates + role capabilities (staff case detail). */
export function processQuickLinksForViewer(opts: {
  role: string | null | undefined;
  missingGateCodes: readonly string[];
  gatesOk: boolean;
  point: ProcessPointId | null;
}): ProcessQuickLink[] {
  const { role, missingGateCodes, gatesOk, point } = opts;
  const links: ProcessQuickLink[] = [];

  const hasDocGap = missingGateCodes.some((c) => c.startsWith("doc:"));
  const needsExpert = missingGateCodes.includes("assignment:primary_expert");
  const needsQuestionnaire = missingGateCodes.some((c) =>
    c.startsWith("questionnaire:"),
  );
  const needsEvidence = missingGateCodes.some((c) => c.startsWith("evidence:"));
  const needsInspection = missingGateCodes.some((c) =>
    c.startsWith("inspection:"),
  );
  const needsLogistics = missingGateCodes.some((c) =>
    c.startsWith("logistics:"),
  );
  const needsLocation = missingGateCodes.some((c) =>
    c.startsWith("location:"),
  );

  if (hasDocGap && canViewCaseSection(role, "documents")) {
    pushUnique(links, "documents");
  }
  if (
    needsExpert &&
    canViewCaseSection(role, "assignments")
  ) {
    pushUnique(links, "assignments");
  } else if (
    shouldHighlightAssignment(point) &&
    canManageCaseAssignments(role) &&
    canViewCaseSection(role, "assignments")
  ) {
    pushUnique(links, "assignments");
  }
  if (needsQuestionnaire && canViewCaseSection(role, "questionnaire")) {
    pushUnique(links, "questionnaire");
  }
  if (needsEvidence && canViewCaseSection(role, "evidence")) {
    pushUnique(links, "evidence");
  }
  if (needsInspection && canViewCaseSection(role, "inspections")) {
    pushUnique(links, "inspections");
  }
  if (needsLogistics && canViewCaseSection(role, "logistics")) {
    pushUnique(links, "logistics");
  }
  if (needsLocation) {
    pushUnique(links, "location");
  }
  if (whoCanAdvanceWorkflow(role) && canViewCaseSection(role, "workflow")) {
    pushUnique(links, "workflow");
  } else if (gatesOk && whoCanAdvanceWorkflow(role)) {
    pushUnique(links, "workflow");
  }

  return links;
}

/** Map a missing gate code to a scroll target when the viewer can open that section. */
export function processGateQuickLink(
  code: string,
  role: string | null | undefined,
): ProcessQuickLink | null {
  if (code.startsWith("doc:") && canViewCaseSection(role, "documents")) {
    const category = documentCategoryFromGateCode(code);
    return {
      id: "documents",
      href: category
        ? documentCategoryHref(category)
        : SECTION_ANCHORS.documents,
    };
  }
  if (
    code === "assignment:primary_expert" &&
    canViewCaseSection(role, "assignments")
  ) {
    return { id: "assignments", href: SECTION_ANCHORS.assignments };
  }
  if (
    code.startsWith("questionnaire:") &&
    canViewCaseSection(role, "questionnaire")
  ) {
    return { id: "questionnaire", href: SECTION_ANCHORS.questionnaire };
  }
  if (code.startsWith("evidence:") && canViewCaseSection(role, "evidence")) {
    return { id: "evidence", href: SECTION_ANCHORS.evidence };
  }
  if (
    code.startsWith("inspection:") &&
    canViewCaseSection(role, "inspections")
  ) {
    return { id: "inspections", href: SECTION_ANCHORS.inspections };
  }
  if (code.startsWith("logistics:") && canViewCaseSection(role, "logistics")) {
    return { id: "logistics", href: SECTION_ANCHORS.logistics };
  }
  if (code.startsWith("location:")) {
    return { id: "location", href: SECTION_ANCHORS.location };
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
    advanceRoles: ["admin", "case_coordinator"],
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
      return "case_coordinator";
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
  if (canMutateCaseSection(role, "documents")) return "uploader";
  if (role === "expert" || role === "logistics" || role === "legal") {
    return "assignee";
  }
  return "viewer";
}

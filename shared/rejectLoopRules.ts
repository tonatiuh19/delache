/**
 * Reject-loop + typed-deadline side effects for the 12-point process.
 * Keep API handlers thin — Vitest covers these rules.
 */

import type { CaseStatus } from "./api";
import {
  caseStatusAfterArtifactReject,
  shouldReopenArtifactAfterCaseReturn,
} from "./caseWorkflow";

export {
  caseStatusAfterArtifactReject,
  shouldReopenArtifactAfterCaseReturn,
};

/** Deadline types owned by a case status (completed when leaving that status). */
export function deadlineTypesForCaseStatus(
  status: CaseStatus,
): readonly string[] {
  if (status === "questionnaire") return ["questionnaire"];
  if (status === "legal_review_questionnaire") return ["legal_review"];
  if (status === "legal_validation") return ["external_legal_validation"];
  return [];
}

/** Complete these typed deadlines when moving from → to. */
export function deadlineTypesToCompleteOnTransition(
  from: CaseStatus,
  to: CaseStatus,
): string[] {
  if (from === to) return [];
  const owned = deadlineTypesForCaseStatus(from);
  if (owned.length === 0) return [];
  // Holding the case pauses the active point clock.
  if (to === "on_hold" || to === "cancelled") return [...owned];
  // Leaving the owning status for any other status completes it.
  if (deadlineTypesForCaseStatus(to).join() !== owned.join()) {
    return [...owned];
  }
  return [];
}

/**
 * Artifact statuses that should become `changes_requested` when the case
 * returns to the author (or fondo-rejects onto hold).
 */
export const QUESTIONNAIRE_REOPEN_FROM_STATUSES = [
  "submitted",
  "legal_review",
  "approved",
  "rejected",
] as const;

export const REPORT_REOPEN_FROM_STATUSES = [
  "approved_internal",
  "external_review",
  "approved",
  "rejected",
] as const;

/**
 * Which artifact to force back to changes_requested after a reject loop.
 * Fondo reject (case → on_hold) still reopens so the author is not stranded.
 */
export function artifactToForceChangesRequested(opts: {
  artifact: "questionnaire" | "technical_report";
  outcome: string;
  toStatus: CaseStatus;
}): "questionnaire" | "technical_report" | null {
  if (opts.outcome !== "changes_requested" && opts.outcome !== "rejected") {
    return null;
  }
  const byReturn = shouldReopenArtifactAfterCaseReturn(opts.toStatus);
  if (byReturn) return byReturn;
  if (opts.outcome === "rejected" && opts.toStatus === "on_hold") {
    return opts.artifact;
  }
  return null;
}

/** Skip emailing the firm about a status change they themselves caused. */
export function shouldNotifyLawFirmAfterArtifactReject(opts: {
  auditActorType?: "staff" | "law_firm" | "system" | null;
}): boolean {
  return opts.auditActorType !== "law_firm";
}

/** Whether a fresh authoring deadline should be opened after the loop. */
export function shouldEnsureAuthoringDeadlineAfterReject(
  toStatus: CaseStatus,
): boolean {
  return toStatus === "questionnaire" || toStatus === "technical_report";
}

export function authoringDeadlineSpec(toStatus: CaseStatus): {
  deadlineType: string;
  title: string;
  businessDays: number;
} | null {
  if (toStatus === "questionnaire") {
    return {
      deadlineType: "questionnaire",
      title: "Questionnaire, GPS and Street View (3 business days)",
      businessDays: 3,
    };
  }
  if (toStatus === "technical_report") {
    return {
      deadlineType: "technical_report",
      title: "Technical report (inside 10-day clock)",
      businessDays: 5,
    };
  }
  return null;
}

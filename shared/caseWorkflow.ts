import type { CaseStatus, UserRole } from "./api";
import { canManageAdmin } from "./rbac";

/** Primary forward workflow (Product.md phases 1–12 → completed) */
export const CASE_STATUS_FLOW: CaseStatus[] = [
  "intake",
  "assignment",
  "questionnaire",
  "legal_review_questionnaire",
  "additional_docs",
  "court_acceptance",
  "logistics",
  "inspection",
  "technical_report",
  "legal_validation",
  "court_delivery",
  "accounting",
  "completed",
];

export function isTerminalStatus(status: CaseStatus): boolean {
  return status === "completed" || status === "cancelled";
}

export type WorkflowTransitionOpts = {
  role?: UserRole | null;
  /** Workflow status the case left when it went on_hold. */
  lastWorkflowStatus?: CaseStatus | null;
  /** Last to_status still on the 12-point flow (legacy hold with no from_status). */
  fallbackWorkflowStatus?: CaseStatus | null;
};

export function resolveHoldResumeStatus(
  lastHoldFromStatus?: CaseStatus | null,
  lastWorkflowToStatus?: CaseStatus | null,
): CaseStatus {
  for (const candidate of [
    lastHoldFromStatus,
    lastWorkflowToStatus,
    "intake" as const,
  ]) {
    if (
      candidate &&
      CASE_STATUS_FLOW.includes(candidate) &&
      candidate !== "completed"
    ) {
      return candidate;
    }
  }
  return "intake";
}

/** Allowed next statuses from current. */
export function getAllowedNextStatuses(
  current: CaseStatus,
  opts: WorkflowTransitionOpts = {},
): CaseStatus[] {
  if (isTerminalStatus(current)) return [];

  if (current === "on_hold") {
    if (canManageAdmin(opts.role ?? null)) {
      return [
        ...CASE_STATUS_FLOW.filter((s) => s !== "completed"),
        "cancelled",
      ];
    }
    const resume = resolveHoldResumeStatus(
      opts.lastWorkflowStatus,
      opts.fallbackWorkflowStatus,
    );
    return [resume, "cancelled"];
  }

  if (current === "legal_review_questionnaire") {
    return ["additional_docs", "questionnaire", "on_hold", "cancelled"];
  }

  if (current === "legal_validation") {
    return ["court_delivery", "technical_report", "on_hold", "cancelled"];
  }

  const idx = CASE_STATUS_FLOW.indexOf(current);
  const next: CaseStatus[] = [];
  if (idx >= 0 && idx < CASE_STATUS_FLOW.length - 1) {
    next.push(CASE_STATUS_FLOW[idx + 1]);
  }
  next.push("on_hold", "cancelled");
  return next;
}

export function canTransition(
  from: CaseStatus,
  to: CaseStatus,
  opts: WorkflowTransitionOpts = {},
): { ok: true } | { ok: false; reason: string } {
  if (from === to) {
    return { ok: false, reason: "Status is already set to that value." };
  }
  const allowed = getAllowedNextStatuses(from, opts);
  if (!allowed.includes(to)) {
    return {
      ok: false,
      reason: `Cannot move from ${from} to ${to}. Allowed: ${allowed.join(", ") || "none"}.`,
    };
  }
  return { ok: true };
}

/**
 * Auto-move the case when a review/artifact is sent back.
 * P4/P10 `changes_requested` → P3/P9 so the author can edit.
 * P4/P10 `rejected` (fondo) → `on_hold` (SOP). P9 QA stays put.
 */
export function caseStatusAfterArtifactReject(opts: {
  caseStatus: CaseStatus;
  artifact: "questionnaire" | "technical_report";
  outcome: string;
}): CaseStatus | null {
  const atP4 =
    opts.artifact === "questionnaire" &&
    opts.caseStatus === "legal_review_questionnaire";
  const atP10 =
    opts.artifact === "technical_report" &&
    opts.caseStatus === "legal_validation";
  if (!atP4 && !atP10) return null;
  if (opts.outcome === "changes_requested") {
    return atP4 ? "questionnaire" : "technical_report";
  }
  if (opts.outcome === "rejected") return "on_hold";
  return null;
}

/** Reopen the artifact only when the case returned to the authoring status. */
export function shouldReopenArtifactAfterCaseReturn(
  toStatus: CaseStatus,
): "questionnaire" | "technical_report" | null {
  if (toStatus === "questionnaire") return "questionnaire";
  if (toStatus === "technical_report") return "technical_report";
  return null;
}

import type { CaseStatus, UserRole } from "./api";
import { canManageAdmin } from "./rbac";

/** Primary forward workflow (10 process points → completed). SoT: docs/Proceso_Peritaje_Electrico_10_Puntos.md */
export const CASE_STATUS_FLOW: CaseStatus[] = [
  "intake",
  "questionnaire",
  "assignment",
  "legal_review_questionnaire",
  "additional_docs",
  "court_acceptance",
  "field_ops",
  "technical_report",
  "validation_delivery",
  "accounting",
  "completed",
];

/** Map pre-Y (12-point) statuses onto the 10-point flow. */
export const LEGACY_CASE_STATUS_MAP: Record<string, CaseStatus> = {
  logistics: "field_ops",
  inspection: "field_ops",
  legal_validation: "validation_delivery",
  court_delivery: "validation_delivery",
};

export function normalizeCaseStatus(status: string): CaseStatus | null {
  if (LEGACY_CASE_STATUS_MAP[status]) return LEGACY_CASE_STATUS_MAP[status];
  if ((CASE_STATUS_FLOW as string[]).includes(status)) {
    return status as CaseStatus;
  }
  if (status === "on_hold" || status === "cancelled") {
    return status;
  }
  return null;
}

export function isTerminalStatus(status: CaseStatus): boolean {
  return status === "completed" || status === "cancelled";
}

export type WorkflowTransitionOpts = {
  role?: UserRole | null;
  /** Workflow status the case left when it went on_hold. */
  lastWorkflowStatus?: CaseStatus | null;
  /** Last to_status still on the 10-point flow (legacy hold with no from_status). */
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
    if (!candidate) continue;
    const normalized = normalizeCaseStatus(candidate) ?? candidate;
    if (
      CASE_STATUS_FLOW.includes(normalized) &&
      normalized !== "completed"
    ) {
      return normalized;
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
    // Plaintiff questionnaire lives on protesta. Skip the extra docs step.
    return ["court_acceptance", "questionnaire", "on_hold", "cancelled"];
  }

  if (current === "validation_delivery") {
    return ["accounting", "technical_report", "on_hold", "cancelled"];
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
 * P4/P9 `changes_requested` → P3/P8 so the author can edit.
 * P4/P9 `rejected` (fondo) → `on_hold` (SOP). P8 QA stays put.
 */
export function caseStatusAfterArtifactReject(opts: {
  caseStatus: CaseStatus;
  artifact: "questionnaire" | "technical_report";
  outcome: string;
}): CaseStatus | null {
  const atP4 =
    opts.artifact === "questionnaire" &&
    opts.caseStatus === "legal_review_questionnaire";
  const atP9 =
    opts.artifact === "technical_report" &&
    opts.caseStatus === "validation_delivery";
  if (!atP4 && !atP9) return null;
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

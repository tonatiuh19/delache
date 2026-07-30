import type { CaseStatus } from "./api";

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

/** Allowed next statuses from current (admin-driven transitions). */
export function getAllowedNextStatuses(current: CaseStatus): CaseStatus[] {
  if (isTerminalStatus(current)) return [];

  if (current === "on_hold") {
    // Resume to any active workflow stage (admin chooses)
    return [...CASE_STATUS_FLOW.filter((s) => s !== "completed"), "cancelled"];
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
): { ok: true } | { ok: false; reason: string } {
  if (from === to) {
    return { ok: false, reason: "Status is already set to that value." };
  }
  const allowed = getAllowedNextStatuses(from);
  if (!allowed.includes(to)) {
    return {
      ok: false,
      reason: `Cannot move from ${from} to ${to}. Allowed: ${allowed.join(", ") || "none"}.`,
    };
  }
  return { ok: true };
}

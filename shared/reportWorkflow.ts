export type TechnicalReportStatus =
  | "draft"
  | "grammar_qa"
  | "technical_director"
  | "approved_internal"
  | "external_review"
  | "changes_requested"
  | "approved"
  | "rejected"
  | "delivered";

const FORWARD: Partial<
  Record<TechnicalReportStatus, TechnicalReportStatus[]>
> = {
  draft: ["grammar_qa", "rejected"],
  grammar_qa: ["technical_director", "changes_requested", "rejected"],
  technical_director: [
    "approved_internal",
    "changes_requested",
    "rejected",
  ],
  approved_internal: ["external_review", "changes_requested"],
  external_review: ["approved", "changes_requested", "rejected"],
  changes_requested: ["draft", "grammar_qa"],
  approved: ["delivered", "changes_requested"],
  rejected: ["changes_requested", "draft"],
  delivered: [],
};

export function getAllowedReportStatuses(
  from: TechnicalReportStatus,
): TechnicalReportStatus[] {
  return FORWARD[from] || [];
}

export function canTransitionReport(
  from: TechnicalReportStatus,
  to: TechnicalReportStatus,
): { ok: true } | { ok: false; reason: string } {
  if (from === to) return { ok: false, reason: "Already in that status" };
  const allowed = getAllowedReportStatuses(from);
  if (!allowed.includes(to)) {
    return {
      ok: false,
      reason: `Cannot move technical report from ${from} to ${to}`,
    };
  }
  return { ok: true };
}

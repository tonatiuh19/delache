/**
 * Questionnaire status transitions (Product.md Phases 3–4).
 */

export type QuestionnaireStatus =
  | "draft"
  | "submitted"
  | "legal_review"
  | "changes_requested"
  | "approved"
  | "rejected";

const FORWARD: Partial<Record<QuestionnaireStatus, QuestionnaireStatus[]>> = {
  draft: ["submitted", "rejected"],
  submitted: ["legal_review", "changes_requested", "rejected"],
  legal_review: ["approved", "changes_requested", "rejected"],
  changes_requested: ["draft", "submitted"],
  approved: ["changes_requested"],
  rejected: ["changes_requested", "draft"],
};

export function getAllowedQuestionnaireStatuses(
  from: QuestionnaireStatus,
): QuestionnaireStatus[] {
  return FORWARD[from] || [];
}

export function canTransitionQuestionnaire(
  from: QuestionnaireStatus,
  to: QuestionnaireStatus,
): { ok: true } | { ok: false; reason: string } {
  if (from === to) return { ok: false, reason: "Already in that status" };
  const allowed = getAllowedQuestionnaireStatuses(from);
  if (!allowed.includes(to)) {
    return {
      ok: false,
      reason: `Cannot move questionnaire from ${from} to ${to}`,
    };
  }
  return { ok: true };
}

/** Entering legal_review should open an internal_legal review request. */
export function shouldOpenInternalLegalReview(
  to: QuestionnaireStatus,
): boolean {
  return to === "legal_review";
}

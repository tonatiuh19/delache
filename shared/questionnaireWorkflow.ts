/**
 * Questionnaire status transitions (Product.md Phases 3–4).
 * P3: draft → grammar_qa (QA) → legal_review (P4 legal) → approved.
 */

export type QuestionnaireStatus =
  | "draft"
  | "grammar_qa"
  | "legal_review"
  | "changes_requested"
  | "approved"
  | "rejected";

const FORWARD: Partial<Record<QuestionnaireStatus, QuestionnaireStatus[]>> = {
  draft: ["grammar_qa", "rejected"],
  grammar_qa: ["legal_review", "changes_requested", "rejected"],
  legal_review: ["approved", "changes_requested", "rejected"],
  changes_requested: ["draft", "grammar_qa"],
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

/** Transitions that must go through Reviews complete (not status PATCH). */
const REVIEW_ONLY_DIRECT_PATCH: ReadonlySet<string> = new Set([
  "grammar_qa→legal_review",
  "legal_review→approved",
]);

function reviewOnlyDirectPatchKey(
  from: QuestionnaireStatus,
  to: QuestionnaireStatus,
): string {
  return `${from}→${to}`;
}

/** Status PATCH allowed from the questionnaire aside (excludes review-only advances). */
export function canDirectPatchQuestionnaireStatus(
  from: QuestionnaireStatus,
  to: QuestionnaireStatus,
): { ok: true } | { ok: false; reason: string } {
  const base = canTransitionQuestionnaire(from, to);
  if (!base.ok) return base;
  if (REVIEW_ONLY_DIRECT_PATCH.has(reviewOnlyDirectPatchKey(from, to))) {
    return {
      ok: false,
      reason: "Complete the pending review in the Reviews panel",
    };
  }
  return { ok: true };
}

export function getAllowedQuestionnaireStatusesForDirectPatch(
  from: QuestionnaireStatus,
): QuestionnaireStatus[] {
  return getAllowedQuestionnaireStatuses(from).filter(
    (to) => canDirectPatchQuestionnaireStatus(from, to).ok,
  );
}

/** Submitting for QA review (P3 control de calidad). */
export function shouldOpenGrammarQaReview(to: QuestionnaireStatus): boolean {
  return to === "grammar_qa";
}

/** Entering legal_review opens internal legal review (P4). */
export function shouldOpenInternalLegalReview(
  to: QuestionnaireStatus,
): boolean {
  return to === "legal_review";
}

/** Status after author submits for review. */
export function questionnaireStatusOnSubmit(): QuestionnaireStatus {
  return "grammar_qa";
}

/** QA passed — questionnaire ready for legal (P3 complete per SOP). */
export function questionnaireQaComplete(
  status: string | null | undefined,
): boolean {
  return status === "legal_review" || status === "approved";
}

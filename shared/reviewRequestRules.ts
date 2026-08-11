/**
 * Review request lifecycle (Product.md Phases 4, 9, 10).
 */

export const REVIEW_ENTITY_TYPES = [
  "questionnaire",
  "technical_report",
  "document",
  "inspection",
] as const;

export type ReviewEntityType = (typeof REVIEW_ENTITY_TYPES)[number];

export const REVIEW_STAGES = [
  "grammar_qa",
  "technical_director",
  "internal_legal",
  "external_law_firm",
] as const;

export type ReviewStage = (typeof REVIEW_STAGES)[number];

export const REVIEW_STATUSES = [
  "pending",
  "approved",
  "changes_requested",
  "rejected",
] as const;

export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const REVIEW_OUTCOMES = [
  "approved",
  "changes_requested",
  "rejected",
] as const;

export type ReviewOutcome = (typeof REVIEW_OUTCOMES)[number];

/** Map technical report status → review stage when entering a review gate. */
export function reviewStageForReportStatus(
  status: string,
): ReviewStage | null {
  if (status === "grammar_qa") return "grammar_qa";
  if (status === "technical_director") return "technical_director";
  if (status === "external_review") return "external_law_firm";
  return null;
}

export function isReviewEntityType(v: unknown): v is ReviewEntityType {
  return (
    typeof v === "string" &&
    (REVIEW_ENTITY_TYPES as readonly string[]).includes(v)
  );
}

export function isReviewStage(v: unknown): v is ReviewStage {
  return (
    typeof v === "string" && (REVIEW_STAGES as readonly string[]).includes(v)
  );
}

export function isReviewOutcome(v: unknown): v is ReviewOutcome {
  return (
    typeof v === "string" &&
    (REVIEW_OUTCOMES as readonly string[]).includes(v)
  );
}

/** Default SLA in business days by stage (Product.md). */
export function defaultReviewSlaBusinessDays(stage: ReviewStage): number {
  if (stage === "external_law_firm") return 3;
  if (stage === "internal_legal") return 2;
  return 2;
}

export type CompleteReviewResult =
  | { ok: true; nextStatus: ReviewOutcome; completed: true }
  | { ok: false; error: string; code: "not_pending" | "invalid_outcome" };

export function resolveReviewCompletion(
  currentStatus: string,
  outcome: unknown,
): CompleteReviewResult {
  if (currentStatus !== "pending") {
    return {
      ok: false,
      error: "Only pending reviews can be completed",
      code: "not_pending",
    };
  }
  if (!isReviewOutcome(outcome)) {
    return {
      ok: false,
      error: "outcome must be approved, changes_requested, or rejected",
      code: "invalid_outcome",
    };
  }
  return { ok: true, nextStatus: outcome, completed: true };
}

/** Map review outcome → questionnaire status. */
export function questionnaireStatusFromReview(
  outcome: ReviewOutcome,
): "approved" | "changes_requested" | "rejected" {
  return outcome;
}

/** Map review outcome → technical report status from a given stage. */
export function reportStatusFromReview(
  stage: ReviewStage,
  outcome: ReviewOutcome,
): string | null {
  if (outcome === "changes_requested") return "changes_requested";
  if (outcome === "rejected") return "rejected";
  if (outcome === "approved") {
    if (stage === "grammar_qa") return "technical_director";
    if (stage === "technical_director") return "approved_internal";
    if (stage === "external_law_firm") return "approved";
  }
  return null;
}

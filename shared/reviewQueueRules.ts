/**
 * Pending review queue: role-actionable stages for dashboard CTA + queue API.
 */

import { canCompleteReviewStage, canViewCaseSection } from "./portalCapabilities";
import type { ReviewStage } from "./reviewRequestRules";

const ALL_REVIEW_STAGES: readonly ReviewStage[] = [
  "grammar_qa",
  "technical_director",
  "internal_legal",
  "external_law_firm",
];

/** Review stages the role may complete (queue + dashboard count). */
export function actionableReviewStagesForRole(
  role: string | null | undefined,
): ReviewStage[] {
  if (!canViewCaseSection(role, "reviews")) return [];
  return ALL_REVIEW_STAGES.filter((stage) =>
    canCompleteReviewStage(role, stage),
  );
}

export function canAccessReviewsQueue(
  role: string | null | undefined,
): boolean {
  return actionableReviewStagesForRole(role).length > 0;
}

/** SQL fragment + params for filtering review_requests by actionable stage. */
export function buildReviewStageFilterSql(
  role: string | null | undefined,
  rrAlias = "rr",
): { sql: string; params: ReviewStage[] } {
  const stages = actionableReviewStagesForRole(role);
  if (stages.length === 0) return { sql: " AND 1=0", params: [] };
  return {
    sql: ` AND ${rrAlias}.review_stage IN (${stages.map(() => "?").join(", ")})`,
    params: stages,
  };
}

/** In-app notification type when a review request is completed. */
export function reviewCompleteNotificationType(
  stage: string,
): "qa_requested" | "general" {
  if (stage === "grammar_qa" || stage === "technical_director") {
    return "qa_requested";
  }
  return "general";
}

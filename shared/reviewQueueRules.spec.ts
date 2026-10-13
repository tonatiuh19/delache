import { describe, expect, it } from "vitest";
import {
  actionableReviewStagesForRole,
  buildReviewStageFilterSql,
  canAccessReviewsQueue,
  reviewCompleteNotificationType,
} from "./reviewQueueRules";

describe("reviewQueueRules", () => {
  it("returns grammar stages for expert, legal stages for legal", () => {
    expect(actionableReviewStagesForRole("expert")).toEqual([
      "grammar_qa",
      "technical_director",
    ]);
    expect(actionableReviewStagesForRole("legal")).toEqual(["internal_legal"]);
  });

  it("allows admin all actionable stages including external firm override", () => {
    expect(actionableReviewStagesForRole("admin")).toHaveLength(4);
    expect(actionableReviewStagesForRole("admin")).toContain(
      "external_law_firm",
    );
    expect(actionableReviewStagesForRole("legal")).not.toContain(
      "external_law_firm",
    );
  });

  it("denies logistics and accountant queue access", () => {
    expect(canAccessReviewsQueue("logistics")).toBe(false);
    expect(canAccessReviewsQueue("accountant")).toBe(false);
    expect(actionableReviewStagesForRole("logistics")).toEqual([]);
    expect(canAccessReviewsQueue("expert")).toBe(true);
    expect(canAccessReviewsQueue(null)).toBe(false);
  });

  it("builds SQL filter for expert with two stages", () => {
    const { sql, params } = buildReviewStageFilterSql("expert");
    expect(sql).toContain("rr.review_stage IN (?, ?)");
    expect(params).toEqual(["grammar_qa", "technical_director"]);
  });

  it("returns empty filter for roles without actionable stages", () => {
    const { sql, params } = buildReviewStageFilterSql("logistics");
    expect(sql).toBe(" AND 1=0");
    expect(params).toEqual([]);
  });

  it("uses custom review_requests alias", () => {
    const { sql } = buildReviewStageFilterSql("legal", "reviews");
    expect(sql).toContain("reviews.review_stage IN");
  });

  it("maps review complete notification type by stage", () => {
    expect(reviewCompleteNotificationType("grammar_qa")).toBe("qa_requested");
    expect(reviewCompleteNotificationType("technical_director")).toBe(
      "qa_requested",
    );
    expect(reviewCompleteNotificationType("internal_legal")).toBe("general");
    expect(reviewCompleteNotificationType("external_law_firm")).toBe(
      "general",
    );
  });
});

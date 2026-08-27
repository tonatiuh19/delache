import { describe, expect, it } from "vitest";
import { buildHoldResumeStatusByCase, latestHoldFromStatusByCase } from "./holdResumeRules";
import { buildReviewStageFilterSql } from "./reviewQueueRules";
import { expertDeliveryClearNotificationCopy } from "./notificationCopy";

/**
 * Contract tests for rules duplicated inline in api/index.ts (Vercel ESM).
 * Changing shared modules without updating the API inline copies breaks production.
 */
describe("api rules parity (shared sources for api/index.ts inlines)", () => {
  it("review stage SQL exposes expert actionable stages", () => {
    const expert = buildReviewStageFilterSql("expert");
    expect(expert.params).toEqual(["grammar_qa", "technical_director"]);

    const legal = buildReviewStageFilterSql("legal");
    expect(legal.params).toEqual(["internal_legal"]);
  });

  it("hold-resume derives resume status from hold history", () => {
    const holdFrom = latestHoldFromStatusByCase([
      { caseId: 1, fromStatus: "inspection" },
    ]);
    const result = buildHoldResumeStatusByCase([1], holdFrom, new Map());
    expect(result.get(1)).toBe("inspection");
  });

  it("expert delivery clear copy is stable for notifications", () => {
    const copy = expertDeliveryClearNotificationCopy({
      locale: "es",
      caseNumber: "DEL-99",
    });
    expect(copy.title).toContain("DEL-99");
    expect(copy.body).toContain("eliminó");
  });
});

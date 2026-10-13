import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildHoldResumeStatusByCase, latestHoldFromStatusByCase } from "./holdResumeRules";
import { buildReviewStageFilterSql } from "./reviewQueueRules";
import { expertDeliveryClearNotificationCopy } from "./notificationCopy";
import {
  QUESTIONNAIRE_REOPEN_FROM_STATUSES,
  REPORT_REOPEN_FROM_STATUSES,
} from "./rejectLoopRules";
import { ratificationGateSatisfied } from "./ratificationRules";

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
      { caseId: 1, fromStatus: "field_ops" },
    ]);
    const result = buildHoldResumeStatusByCase([1], holdFrom, new Map());
    expect(result.get(1)).toBe("field_ops");
  });

  it("expert delivery clear copy is stable for notifications", () => {
    const copy = expertDeliveryClearNotificationCopy({
      locale: "es",
      caseNumber: "DEL-99",
    });
    expect(copy.title).toContain("DEL-99");
    expect(copy.body).toContain("eliminó");
  });

  it("questionnaire reopen statuses include grammar_qa for P3 QA workflow", () => {
    expect(QUESTIONNAIRE_REOPEN_FROM_STATUSES).toEqual([
      "grammar_qa",
      "legal_review",
      "approved",
      "rejected",
    ]);
  });

  it("api/index.ts inline reopen status lists match shared rejectLoopRules", () => {
    const apiSrc = readFileSync(join(process.cwd(), "api/index.ts"), "utf8");
    const extractBlock = (name: string) => {
      const match = apiSrc.match(
        new RegExp(`const ${name} = \\[([\\s\\S]*?)\\] as const;`),
      );
      expect(match, `${name} block in api/index.ts`).not.toBeNull();
      return match![1];
    };
    const qBlock = extractBlock("QUESTIONNAIRE_REOPEN_FROM_STATUSES");
    for (const status of QUESTIONNAIRE_REOPEN_FROM_STATUSES) {
      expect(qBlock).toContain(`"${status}"`);
    }
    const rBlock = extractBlock("REPORT_REOPEN_FROM_STATUSES");
    for (const status of REPORT_REOPEN_FROM_STATUSES) {
      expect(rBlock).toContain(`"${status}"`);
    }
  });

  it("ratification PDF is required (schedule alone does not clear gate)", () => {
    expect(
      ratificationGateSatisfied({
        ratificationPresent: false,
        courtFilingPresent: true,
        ratificationScheduledAt: "2026-06-01T10:00:00.000Z",
      }),
    ).toBe(false);
    expect(
      ratificationGateSatisfied({
        ratificationPresent: true,
        courtFilingPresent: true,
        ratificationScheduledAt: null,
      }),
    ).toBe(true);
  });
});
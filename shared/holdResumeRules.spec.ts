import { describe, expect, it } from "vitest";
import {
  buildHoldResumeStatusByCase,
  latestFlowToStatusByCase,
  latestHoldFromStatusByCase,
} from "./holdResumeRules";

describe("holdResumeRules", () => {
  it("picks the first (newest) hold from_status per case", () => {
    const map = latestHoldFromStatusByCase([
      { caseId: 1, fromStatus: "inspection" },
      { caseId: 1, fromStatus: "intake" },
      { caseId: 2, fromStatus: "assignment" },
    ]);
    expect(map.get(1)).toBe("inspection");
    expect(map.get(2)).toBe("assignment");
  });

  it("picks the first flow to_status per case", () => {
    const map = latestFlowToStatusByCase([
      { caseId: 5, toStatus: "questionnaire" },
      { caseId: 5, toStatus: "intake" },
    ]);
    expect(map.get(5)).toBe("questionnaire");
  });

  it("resolves hold resume from hold history with flow fallback", () => {
    const holdFrom = latestHoldFromStatusByCase([
      { caseId: 10, fromStatus: "inspection" },
    ]);
    const flowTo = latestFlowToStatusByCase([]);
    const result = buildHoldResumeStatusByCase([10], holdFrom, flowTo);
    expect(result.get(10)).toBe("inspection");
  });

  it("falls back to last workflow status when hold from is missing", () => {
    const holdFrom = latestHoldFromStatusByCase([]);
    const flowTo = latestFlowToStatusByCase([
      { caseId: 11, toStatus: "legal_review_questionnaire" },
    ]);
    const result = buildHoldResumeStatusByCase([11], holdFrom, flowTo);
    expect(result.get(11)).toBe("legal_review_questionnaire");
  });

  it("defaults to intake when hold and flow history are empty", () => {
    const result = buildHoldResumeStatusByCase(
      [12],
      new Map(),
      new Map(),
    );
    expect(result.get(12)).toBe("intake");
  });

  it("ignores completed status in hold from (resolveHoldResumeStatus)", () => {
    const holdFrom = latestHoldFromStatusByCase([
      { caseId: 13, fromStatus: "completed" },
    ]);
    const flowTo = latestFlowToStatusByCase([
      { caseId: 13, toStatus: "inspection" },
    ]);
    const result = buildHoldResumeStatusByCase([13], holdFrom, flowTo);
    expect(result.get(13)).toBe("inspection");
  });
});

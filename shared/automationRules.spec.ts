import { describe, expect, it } from "vitest";
import {
  automationOnCaseCompletedOrRatified,
  automationOnDeadlineApproaching,
  automationOnInspectionCompleted,
  automationOnQuestionnaireApproved,
  automationOnReportApproved,
  automationOnReportEnterExternalReview,
} from "./automationRules";

describe("automationRules", () => {
  it("questionnaire approved → advance invoice + notify", () => {
    const actions = automationOnQuestionnaireApproved();
    expect(actions.some((a) => a.type === "create_invoice")).toBe(true);
    expect(actions.some((a) => a.type === "notify")).toBe(true);
  });

  it("inspection completed → QA notify", () => {
    expect(automationOnInspectionCompleted()[0]?.type).toBe("notify");
  });

  it("deadline escalate only when critical/overdue", () => {
    expect(automationOnDeadlineApproaching("safe")).toEqual([]);
    expect(automationOnDeadlineApproaching("critical").length).toBe(1);
  });

  it("case completed → final invoice", () => {
    expect(automationOnCaseCompletedOrRatified("completed").length).toBe(2);
    expect(automationOnCaseCompletedOrRatified("intake")).toEqual([]);
  });

  it("external review opens review action", () => {
    expect(automationOnReportEnterExternalReview()[0]).toMatchObject({
      type: "open_review",
      stage: "external_law_firm",
    });
  });

  it("report approved notifies", () => {
    expect(automationOnReportApproved()[0]?.type).toBe("notify");
  });
});

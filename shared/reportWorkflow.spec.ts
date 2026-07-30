import { describe, expect, it } from "vitest";
import {
  canTransitionReport,
  getAllowedReportStatuses,
} from "./reportWorkflow";

describe("reportWorkflow", () => {
  it("allows draft to grammar_qa", () => {
    expect(getAllowedReportStatuses("draft")).toContain("grammar_qa");
    expect(canTransitionReport("draft", "grammar_qa").ok).toBe(true);
  });

  it("blocks skipping review stages", () => {
    const check = canTransitionReport("draft", "approved");
    expect(check.ok).toBe(false);
  });

  it("allows approved to delivered", () => {
    expect(canTransitionReport("approved", "delivered").ok).toBe(true);
  });
});

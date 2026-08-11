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

  it("allows firm reject to reopen an approved report", () => {
    expect(canTransitionReport("approved", "changes_requested").ok).toBe(true);
  });

  it("allows fondo reject recovery via changes_requested", () => {
    expect(canTransitionReport("rejected", "changes_requested").ok).toBe(true);
    expect(canTransitionReport("rejected", "draft").ok).toBe(true);
  });
});

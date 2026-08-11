import { describe, expect, it } from "vitest";
import {
  canTransition,
  caseStatusAfterArtifactReject,
  shouldReopenArtifactAfterCaseReturn,
  CASE_STATUS_FLOW,
  getAllowedNextStatuses,
  isTerminalStatus,
  resolveHoldResumeStatus,
} from "@shared/caseWorkflow";

describe("caseWorkflow", () => {
  it("defines the full forward flow ending in completed", () => {
    expect(CASE_STATUS_FLOW[0]).toBe("intake");
    expect(CASE_STATUS_FLOW[CASE_STATUS_FLOW.length - 1]).toBe("completed");
  });

  it("allows next phase, hold, and cancel from intake", () => {
    expect(getAllowedNextStatuses("intake")).toEqual([
      "assignment",
      "on_hold",
      "cancelled",
    ]);
  });

  it("blocks transitions from terminal statuses", () => {
    expect(isTerminalStatus("completed")).toBe(true);
    expect(getAllowedNextStatuses("cancelled")).toEqual([]);
    expect(canTransition("completed", "accounting").ok).toBe(false);
  });

  it("lets admin resume from on_hold to any workflow stage", () => {
    const allowed = getAllowedNextStatuses("on_hold", { role: "admin" });
    expect(allowed).toContain("inspection");
    expect(allowed).toContain("cancelled");
    expect(allowed).not.toContain("completed");
  });

  it("restricts coordinator resume from on_hold to the paused status", () => {
    expect(
      getAllowedNextStatuses("on_hold", {
        role: "case_coordinator",
        lastWorkflowStatus: "inspection",
      }),
    ).toEqual(["inspection", "cancelled"]);
    expect(
      getAllowedNextStatuses("on_hold", { role: "case_coordinator" }),
    ).toEqual(["intake", "cancelled"]);
    expect(
      getAllowedNextStatuses("on_hold", {
        role: "case_coordinator",
        fallbackWorkflowStatus: "logistics",
      }),
    ).toEqual(["logistics", "cancelled"]);
    expect(
      canTransition("on_hold", "inspection", {
        role: "case_coordinator",
        lastWorkflowStatus: "assignment",
      }).ok,
    ).toBe(false);
  });

  it("falls back hold resume to the last flow status, then intake", () => {
    expect(resolveHoldResumeStatus("inspection", "logistics")).toBe(
      "inspection",
    );
    expect(resolveHoldResumeStatus(null, "logistics")).toBe("logistics");
    expect(resolveHoldResumeStatus(null, null)).toBe("intake");
    expect(resolveHoldResumeStatus("completed", "cancelled" as never)).toBe(
      "intake",
    );
  });

  it("allows legal review to send the questionnaire back to P3", () => {
    expect(getAllowedNextStatuses("legal_review_questionnaire")).toEqual([
      "additional_docs",
      "questionnaire",
      "on_hold",
      "cancelled",
    ]);
    expect(
      canTransition("legal_review_questionnaire", "questionnaire").ok,
    ).toBe(true);
  });

  it("allows law-firm reject to return from P10 to P9", () => {
    expect(getAllowedNextStatuses("legal_validation")).toEqual([
      "court_delivery",
      "technical_report",
      "on_hold",
      "cancelled",
    ]);
    expect(canTransition("legal_validation", "technical_report").ok).toBe(true);
  });

  it("auto-returns P4/P10 on changes; fondo reject holds; P9 QA stays", () => {
    expect(
      caseStatusAfterArtifactReject({
        caseStatus: "legal_review_questionnaire",
        artifact: "questionnaire",
        outcome: "changes_requested",
      }),
    ).toBe("questionnaire");
    expect(
      caseStatusAfterArtifactReject({
        caseStatus: "legal_review_questionnaire",
        artifact: "questionnaire",
        outcome: "rejected",
      }),
    ).toBe("on_hold");
    expect(
      caseStatusAfterArtifactReject({
        caseStatus: "legal_review_questionnaire",
        artifact: "questionnaire",
        outcome: "approved",
      }),
    ).toBeNull();
    expect(
      caseStatusAfterArtifactReject({
        caseStatus: "legal_validation",
        artifact: "technical_report",
        outcome: "changes_requested",
      }),
    ).toBe("technical_report");
    expect(
      caseStatusAfterArtifactReject({
        caseStatus: "legal_validation",
        artifact: "technical_report",
        outcome: "rejected",
      }),
    ).toBe("on_hold");
    expect(
      caseStatusAfterArtifactReject({
        caseStatus: "technical_report",
        artifact: "technical_report",
        outcome: "rejected",
      }),
    ).toBeNull();
    expect(
      caseStatusAfterArtifactReject({
        caseStatus: "intake",
        artifact: "questionnaire",
        outcome: "changes_requested",
      }),
    ).toBeNull();
    expect(shouldReopenArtifactAfterCaseReturn("questionnaire")).toBe(
      "questionnaire",
    );
    expect(shouldReopenArtifactAfterCaseReturn("on_hold")).toBeNull();
  });

  it("rejects skipping ahead", () => {
    const r = canTransition("intake", "inspection");
    expect(r.ok).toBe(false);
  });
});

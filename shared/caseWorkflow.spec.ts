import { describe, expect, it } from "vitest";
import {
  canTransition,
  caseStatusAfterArtifactReject,
  shouldReopenArtifactAfterCaseReturn,
  CASE_STATUS_FLOW,
  getAllowedNextStatuses,
  isTerminalStatus,
  normalizeCaseStatus,
  resolveHoldResumeStatus,
} from "@shared/caseWorkflow";

describe("caseWorkflow", () => {
  it("defines the 10-point forward flow ending in completed", () => {
    expect(CASE_STATUS_FLOW).toEqual([
      "intake",
      "questionnaire",
      "assignment",
      "legal_review_questionnaire",
      "additional_docs",
      "court_acceptance",
      "field_ops",
      "technical_report",
      "validation_delivery",
      "accounting",
      "completed",
    ]);
  });

  it("maps legacy 12-point statuses onto the 10-point flow", () => {
    expect(normalizeCaseStatus("logistics")).toBe("field_ops");
    expect(normalizeCaseStatus("inspection")).toBe("field_ops");
    expect(normalizeCaseStatus("legal_validation")).toBe("validation_delivery");
    expect(normalizeCaseStatus("court_delivery")).toBe("validation_delivery");
    expect(normalizeCaseStatus("field_ops")).toBe("field_ops");
  });

  it("allows next phase, hold, and cancel from intake", () => {
    expect(getAllowedNextStatuses("intake")).toEqual([
      "questionnaire",
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
    expect(allowed).toContain("field_ops");
    expect(allowed).toContain("cancelled");
    expect(allowed).not.toContain("completed");
  });

  it("restricts non-admin resume from on_hold to the paused status", () => {
    expect(
      getAllowedNextStatuses("on_hold", {
        role: "expert",
        lastWorkflowStatus: "field_ops",
      }),
    ).toEqual(["field_ops", "cancelled"]);
    expect(
      getAllowedNextStatuses("on_hold", { role: "legal" }),
    ).toEqual(["intake", "cancelled"]);
    expect(
      getAllowedNextStatuses("on_hold", {
        role: "expert",
        fallbackWorkflowStatus: "logistics" as never,
      }),
    ).toEqual(["field_ops", "cancelled"]);
    expect(
      canTransition("on_hold", "field_ops", {
        role: "expert",
        lastWorkflowStatus: "assignment",
      }).ok,
    ).toBe(false);
  });

  it("falls back hold resume to the last flow status, then intake", () => {
    expect(resolveHoldResumeStatus("field_ops", "questionnaire")).toBe(
      "field_ops",
    );
    expect(resolveHoldResumeStatus(null, "logistics" as never)).toBe(
      "field_ops",
    );
    expect(resolveHoldResumeStatus(null, null)).toBe("intake");
    expect(resolveHoldResumeStatus("completed", "cancelled" as never)).toBe(
      "intake",
    );
  });

  it("allows legal review to send the questionnaire back to P3", () => {
    expect(getAllowedNextStatuses("legal_review_questionnaire")).toEqual([
      "court_acceptance",
      "questionnaire",
      "on_hold",
      "cancelled",
    ]);
    expect(
      canTransition("legal_review_questionnaire", "questionnaire").ok,
    ).toBe(true);
  });

  it("allows firm reject to return from P9 to P8", () => {
    expect(getAllowedNextStatuses("validation_delivery")).toEqual([
      "accounting",
      "technical_report",
      "on_hold",
      "cancelled",
    ]);
    expect(canTransition("validation_delivery", "technical_report").ok).toBe(
      true,
    );
  });

  it("auto-returns P4/P9 on changes; fondo reject holds; P8 QA stays", () => {
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
        caseStatus: "validation_delivery",
        artifact: "technical_report",
        outcome: "changes_requested",
      }),
    ).toBe("technical_report");
    expect(
      caseStatusAfterArtifactReject({
        caseStatus: "technical_report",
        artifact: "technical_report",
        outcome: "rejected",
      }),
    ).toBeNull();
    expect(shouldReopenArtifactAfterCaseReturn("questionnaire")).toBe(
      "questionnaire",
    );
    expect(shouldReopenArtifactAfterCaseReturn("on_hold")).toBeNull();
  });

  it("rejects skipping ahead", () => {
    const r = canTransition("intake", "field_ops");
    expect(r.ok).toBe(false);
  });
});

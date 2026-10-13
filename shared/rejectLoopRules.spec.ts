import { describe, expect, it } from "vitest";
import {
  artifactToForceChangesRequested,
  authoringDeadlineSpec,
  caseStatusAfterArtifactReject,
  deadlineTypesToCompleteOnTransition,
  QUESTIONNAIRE_REOPEN_FROM_STATUSES,
  shouldEnsureAuthoringDeadlineAfterReject,
  shouldNotifyLawFirmAfterArtifactReject,
  shouldReopenArtifactAfterCaseReturn,
} from "./rejectLoopRules";

describe("rejectLoopRules", () => {
  it("maps P4/P10 changes to authoring and fondo reject to hold", () => {
    expect(
      caseStatusAfterArtifactReject({
        caseStatus: "legal_review_questionnaire",
        artifact: "questionnaire",
        outcome: "changes_requested",
      }),
    ).toBe("questionnaire");
    expect(
      caseStatusAfterArtifactReject({
        caseStatus: "validation_delivery",
        artifact: "technical_report",
        outcome: "rejected",
      }),
    ).toBe("on_hold");
  });

  it("forces changes_requested on authoring return and fondo hold", () => {
    expect(
      artifactToForceChangesRequested({
        artifact: "questionnaire",
        outcome: "changes_requested",
        toStatus: "questionnaire",
      }),
    ).toBe("questionnaire");
    expect(
      artifactToForceChangesRequested({
        artifact: "questionnaire",
        outcome: "rejected",
        toStatus: "on_hold",
      }),
    ).toBe("questionnaire");
    expect(
      artifactToForceChangesRequested({
        artifact: "technical_report",
        outcome: "rejected",
        toStatus: "on_hold",
      }),
    ).toBe("technical_report");
    expect(
      artifactToForceChangesRequested({
        artifact: "questionnaire",
        outcome: "approved",
        toStatus: "questionnaire",
      }),
    ).toBeNull();
    expect(shouldReopenArtifactAfterCaseReturn("on_hold")).toBeNull();
  });

  it("questionnaire reopen statuses cover grammar QA workflow", () => {
    expect(QUESTIONNAIRE_REOPEN_FROM_STATUSES).toContain("grammar_qa");
    expect(QUESTIONNAIRE_REOPEN_FROM_STATUSES).toContain("legal_review");
  });

  it("completes typed deadlines when leaving or holding the owning status", () => {
    expect(
      deadlineTypesToCompleteOnTransition(
        "questionnaire",
        "legal_review_questionnaire",
      ),
    ).toEqual(["questionnaire"]);
    expect(
      deadlineTypesToCompleteOnTransition(
        "legal_review_questionnaire",
        "on_hold",
      ),
    ).toEqual(["legal_review"]);
    expect(
      deadlineTypesToCompleteOnTransition(
        "validation_delivery",
        "technical_report",
      ),
    ).toEqual(["external_legal_validation"]);
    expect(
      deadlineTypesToCompleteOnTransition("questionnaire", "questionnaire"),
    ).toEqual([]);
    expect(
      deadlineTypesToCompleteOnTransition("intake", "assignment"),
    ).toEqual([]);
  });

  it("skips firm self-notify and opens authoring deadlines after return", () => {
    expect(
      shouldNotifyLawFirmAfterArtifactReject({ auditActorType: "law_firm" }),
    ).toBe(false);
    expect(
      shouldNotifyLawFirmAfterArtifactReject({ auditActorType: "staff" }),
    ).toBe(true);
    expect(shouldEnsureAuthoringDeadlineAfterReject("questionnaire")).toBe(
      true,
    );
    expect(shouldEnsureAuthoringDeadlineAfterReject("on_hold")).toBe(false);
    expect(authoringDeadlineSpec("questionnaire")?.businessDays).toBe(3);
  });
});

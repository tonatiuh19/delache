import { describe, expect, it } from "vitest";
import {
  canTransitionQuestionnaire,
  getAllowedQuestionnaireStatuses,
  shouldOpenInternalLegalReview,
} from "./questionnaireWorkflow";

describe("questionnaireWorkflow", () => {
  it("allows submitted → legal_review → approved", () => {
    expect(getAllowedQuestionnaireStatuses("submitted")).toContain(
      "legal_review",
    );
    expect(canTransitionQuestionnaire("submitted", "legal_review").ok).toBe(
      true,
    );
    expect(canTransitionQuestionnaire("legal_review", "approved").ok).toBe(
      true,
    );
    expect(canTransitionQuestionnaire("approved", "draft").ok).toBe(false);
    expect(
      canTransitionQuestionnaire("approved", "changes_requested").ok,
    ).toBe(true);
  });

  it("allows fondo reject recovery via changes_requested", () => {
    expect(
      canTransitionQuestionnaire("rejected", "changes_requested").ok,
    ).toBe(true);
    expect(canTransitionQuestionnaire("rejected", "draft").ok).toBe(true);
  });
});

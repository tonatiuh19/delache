import { describe, expect, it } from "vitest";
import {
  canDirectPatchQuestionnaireStatus,
  canTransitionQuestionnaire,
  getAllowedQuestionnaireStatuses,
  getAllowedQuestionnaireStatusesForDirectPatch,
  questionnaireQaComplete,
  shouldOpenGrammarQaReview,
  shouldOpenInternalLegalReview,
} from "./questionnaireWorkflow";

describe("questionnaireWorkflow", () => {
  it("routes submit through grammar_qa before legal_review", () => {
    expect(getAllowedQuestionnaireStatuses("draft")).toContain("grammar_qa");
    expect(canTransitionQuestionnaire("draft", "grammar_qa").ok).toBe(true);
    expect(canTransitionQuestionnaire("grammar_qa", "legal_review").ok).toBe(
      true,
    );
    expect(canTransitionQuestionnaire("legal_review", "approved").ok).toBe(true);
    expect(canTransitionQuestionnaire("draft", "legal_review").ok).toBe(false);
  });

  it("opens QA then legal review hooks", () => {
    expect(shouldOpenGrammarQaReview("grammar_qa")).toBe(true);
    expect(shouldOpenInternalLegalReview("legal_review")).toBe(true);
  });

  it("marks QA complete at legal_review or approved", () => {
    expect(questionnaireQaComplete("grammar_qa")).toBe(false);
    expect(questionnaireQaComplete("legal_review")).toBe(true);
    expect(questionnaireQaComplete("approved")).toBe(true);
  });

  it("allows fondo reject recovery via changes_requested", () => {
    expect(
      canTransitionQuestionnaire("rejected", "changes_requested").ok,
    ).toBe(true);
  });

  it("blocks review-only transitions from direct status PATCH", () => {
    expect(canDirectPatchQuestionnaireStatus("grammar_qa", "legal_review").ok).toBe(
      false,
    );
    expect(canDirectPatchQuestionnaireStatus("legal_review", "approved").ok).toBe(
      false,
    );
    expect(
      getAllowedQuestionnaireStatusesForDirectPatch("grammar_qa"),
    ).not.toContain("legal_review");
    expect(canDirectPatchQuestionnaireStatus("grammar_qa", "changes_requested").ok).toBe(
      true,
    );
    expect(canDirectPatchQuestionnaireStatus("draft", "grammar_qa").ok).toBe(
      true,
    );
  });
});

import { describe, expect, it } from "vitest";
import {
  defaultReviewSlaBusinessDays,
  questionnaireStatusFromReview,
  reportStatusFromReview,
  resolveReviewCompletion,
  reviewStageForReportStatus,
} from "./reviewRequestRules";

describe("reviewStageForReportStatus", () => {
  it("maps review gates and ignores others", () => {
    expect(reviewStageForReportStatus("grammar_qa")).toBe("grammar_qa");
    expect(reviewStageForReportStatus("technical_director")).toBe(
      "technical_director",
    );
    expect(reviewStageForReportStatus("external_review")).toBe(
      "external_law_firm",
    );
    expect(reviewStageForReportStatus("draft")).toBeNull();
    expect(reviewStageForReportStatus("approved")).toBeNull();
  });
});

describe("resolveReviewCompletion", () => {
  it("accepts outcomes from pending only", () => {
    const ok = resolveReviewCompletion("pending", "approved");
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.nextStatus).toBe("approved");

    expect(resolveReviewCompletion("approved", "rejected").ok).toBe(false);
    expect(resolveReviewCompletion("pending", "nope").ok).toBe(false);
  });
});

describe("SLA + status mapping", () => {
  it("uses SOP SLAs: 2 days internal legal, 3 days firm", () => {
    expect(defaultReviewSlaBusinessDays("external_law_firm")).toBe(3);
    expect(defaultReviewSlaBusinessDays("internal_legal")).toBe(2);
    expect(defaultReviewSlaBusinessDays("grammar_qa")).toBe(2);
  });

  it("maps questionnaire and report outcomes", () => {
    expect(questionnaireStatusFromReview("approved")).toBe("approved");
    expect(reportStatusFromReview("grammar_qa", "approved")).toBe(
      "technical_director",
    );
    expect(reportStatusFromReview("technical_director", "approved")).toBe(
      "approved_internal",
    );
    expect(reportStatusFromReview("external_law_firm", "approved")).toBe(
      "approved",
    );
    expect(reportStatusFromReview("grammar_qa", "changes_requested")).toBe(
      "changes_requested",
    );
  });
});

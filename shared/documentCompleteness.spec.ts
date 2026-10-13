import { describe, expect, it } from "vitest";
import {
  activeCompletenessForCaseStatus,
  caseStatusCountsTowardMissingDocsKpi,
  additionalDocsRequiredCount,
  getAdditionalDocsCompleteness,
  getCourtFilingCompleteness,
  getIntakeCompleteness,
  isActiveDocumentStatus,
  shouldEmitMissingDocumentsAlert,
  shouldNotifyLawFirmOfMissingDocs,
  shouldThrottleMissingDocumentsAlert,
  shouldWriteLawFirmMissingDocsNote,
} from "./documentCompleteness";

describe("documentCompleteness", () => {
  it("reports missing intake categories", () => {
    const status = getIntakeCompleteness(["lawsuit", "other"]);
    expect(status.complete).toBe(false);
    expect(status.missing).toContain("medical_record");
    expect(status.present).toEqual(["lawsuit"]);
  });

  it("is complete when all intake docs present", () => {
    const status = getIntakeCompleteness([
      "lawsuit",
      "medical_record",
      "cfe_report",
      "preliminary_photo",
      "other",
    ]);
    expect(status.complete).toBe(true);
    expect(status.missing).toEqual([]);
  });

  it("gates missing-doc alerts by case status", () => {
    const incomplete = getIntakeCompleteness(["lawsuit"]);
    expect(shouldEmitMissingDocumentsAlert("intake", incomplete)).toBe(true);
    expect(shouldEmitMissingDocumentsAlert("inspection", incomplete)).toBe(
      false,
    );
    const additional = getAdditionalDocsCompleteness([]);
    expect(
      shouldEmitMissingDocumentsAlert("additional_docs", additional),
    ).toBe(true);
    expect(
      shouldEmitMissingDocumentsAlert(
        "legal_review_questionnaire",
        additional,
      ),
    ).toBe(false);
  });

  it("tracks court filing checklist", () => {
    const partial = getCourtFilingCompleteness(["protesta"]);
    expect(partial.phase).toBe("court_filing");
    expect(partial.missing).toEqual(["court_filing", "ratification"]);
    expect(shouldEmitMissingDocumentsAlert("validation_delivery", partial)).toBe(
      true,
    );
    expect(shouldEmitMissingDocumentsAlert("court_acceptance", partial)).toBe(
      false,
    );
    const done = getCourtFilingCompleteness([
      "protesta",
      "court_filing",
      "ratification",
    ]);
    expect(done.complete).toBe(true);
  });

  it("throttles repeat missing-doc alerts within cooldown", () => {
    const now = 1_000_000;
    expect(shouldThrottleMissingDocumentsAlert(null, now)).toBe(false);
    expect(shouldThrottleMissingDocumentsAlert(now - 1000, now, 60_000)).toBe(
      true,
    );
    expect(
      shouldThrottleMissingDocumentsAlert(now - 120_000, now, 60_000),
    ).toBe(false);
  });

  it("omits death certificate unless the case is a fatality", () => {
    const noFatal = getAdditionalDocsCompleteness([]);
    expect(noFatal.required).not.toContain("death_certificate");
    expect(noFatal.missing).toContain("plaintiff_questionnaire");
    const fatal = getAdditionalDocsCompleteness([], { involvesFatality: true });
    expect(fatal.missing).toContain("death_certificate");
  });

  it("picks active checklist and KPI status membership", () => {
    expect(
      activeCompletenessForCaseStatus("validation_delivery", ["protesta"]).phase,
    ).toBe("court_filing");
    expect(
      activeCompletenessForCaseStatus("additional_docs", []).phase,
    ).toBe("additional_docs");
    expect(caseStatusCountsTowardMissingDocsKpi("intake")).toBe(true);
    expect(caseStatusCountsTowardMissingDocsKpi("inspection")).toBe(false);
    expect(
      caseStatusCountsTowardMissingDocsKpi("legal_review_questionnaire"),
    ).toBe(false);
    expect(caseStatusCountsTowardMissingDocsKpi("court_acceptance")).toBe(
      false,
    );
    expect(caseStatusCountsTowardMissingDocsKpi("validation_delivery")).toBe(
      true,
    );
    expect(
      activeCompletenessForCaseStatus("additional_docs", [], {
        involvesFatality: true,
      }).missing,
    ).toContain("death_certificate");
  });

  it("treats rejected and archived documents as inactive", () => {
    expect(isActiveDocumentStatus("uploaded")).toBe(true);
    expect(isActiveDocumentStatus("approved")).toBe(true);
    expect(isActiveDocumentStatus(null)).toBe(true);
    expect(isActiveDocumentStatus("rejected")).toBe(false);
    expect(isActiveDocumentStatus("archived")).toBe(false);
  });

  it("counts additional-doc requirements from the fatality flag", () => {
    expect(additionalDocsRequiredCount(false)).toBe(3);
    expect(additionalDocsRequiredCount(true)).toBe(4);
  });

  it("alerts the despacho on P1/P5 and writes a P5 note", () => {
    const intake = getIntakeCompleteness(["lawsuit"]);
    const additional = getAdditionalDocsCompleteness([]);
    const court = getCourtFilingCompleteness([]);
    expect(shouldNotifyLawFirmOfMissingDocs(intake)).toBe(true);
    expect(shouldNotifyLawFirmOfMissingDocs(additional)).toBe(true);
    expect(shouldNotifyLawFirmOfMissingDocs(court)).toBe(false);
    expect(shouldWriteLawFirmMissingDocsNote(intake)).toBe(false);
    expect(shouldWriteLawFirmMissingDocsNote(additional)).toBe(true);
  });
});

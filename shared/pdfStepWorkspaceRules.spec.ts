import { describe, expect, it } from "vitest";
import type { ListadoProgress } from "./processGates";
import {
  isPdfAccountingReady,
  isPdfTechnicalReportReady,
  isPdfValidationDeliveryReady,
  isPdfWorkspaceStep,
  pdfEvidenceTileForCategory,
  primaryCategoryForPdfEvidenceTile,
  shouldHideStepSubsections,
  PDF_EVIDENCE_TILES,
} from "./pdfStepWorkspaceRules";

function listadoStub(
  patch: Partial<ListadoProgress>,
): ListadoProgress {
  return {
    processPoint: 8,
    gatesOk: false,
    primaryExpert: true,
    intakeComplete: true,
    questionnaireApproved: true,
    streetViewDone: true,
    advanceReleased: true,
    advancePaid: false,
    plaintiffQuestionnaire: true,
    protestaFiled: true,
    clock10DueAt: null,
    logisticsReady: true,
    inspectionComplete: true,
    reportInternalOk: false,
    reportFirmOk: false,
    ratified: false,
    attendedWithReport: false,
    finalReleased: false,
    finalPaid: false,
    ...patch,
  };
}

describe("pdfStepWorkspaceRules", () => {
  it("marks steps 2–9 PDF workspaces and hides their pills", () => {
    expect(isPdfWorkspaceStep("questionnaire")).toBe(true);
    expect(isPdfWorkspaceStep("assignment")).toBe(true);
    expect(isPdfWorkspaceStep("legal_review_questionnaire")).toBe(true);
    expect(isPdfWorkspaceStep("court_acceptance")).toBe(true);
    expect(isPdfWorkspaceStep("field_ops")).toBe(true);
    expect(isPdfWorkspaceStep("technical_report")).toBe(true);
    expect(isPdfWorkspaceStep("validation_delivery")).toBe(true);
    expect(isPdfWorkspaceStep("accounting")).toBe(true);
    expect(isPdfWorkspaceStep("intake")).toBe(false);
    expect(shouldHideStepSubsections("technical_report")).toBe(true);
    expect(shouldHideStepSubsections("intake")).toBe(true);
  });

  it("maps evidence categories onto the five PDF tiles", () => {
    expect(PDF_EVIDENCE_TILES).toHaveLength(5);
    expect(pdfEvidenceTileForCategory("horizontal_distance")?.id).toBe(
      "distances",
    );
    expect(pdfEvidenceTileForCategory("pole_id")?.id).toBe("facade_pole");
    expect(pdfEvidenceTileForCategory("oversized_construction")?.id).toBe(
      "oversize",
    );
    expect(primaryCategoryForPdfEvidenceTile("distances")).toBe(
      "horizontal_distance",
    );
  });

  it("gates P8–P10 send readiness from Miro comps", () => {
    expect(
      isPdfTechnicalReportReady({ hasReportPdf: true, reportInternalOk: true }),
    ).toBe(true);
    expect(
      isPdfTechnicalReportReady({ hasReportPdf: true, reportInternalOk: false }),
    ).toBe(false);
    expect(
      isPdfValidationDeliveryReady({
        listado: listadoStub({ reportFirmOk: true }),
        hasCourtFiling: true,
        hasRatificationPdf: true,
      }),
    ).toBe(true);
    expect(
      isPdfValidationDeliveryReady({
        listado: listadoStub({ reportFirmOk: false }),
        hasCourtFiling: true,
        hasRatificationPdf: true,
      }),
    ).toBe(false);
    expect(
      isPdfAccountingReady({
        listado: listadoStub({ advancePaid: true, finalPaid: true }),
      }),
    ).toBe(true);
    expect(
      isPdfAccountingReady({
        listado: listadoStub({ advancePaid: true, finalPaid: false }),
      }),
    ).toBe(false);
  });
});

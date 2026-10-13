import { describe, expect, it } from "vitest";
import {
  buildActionRequiredSummary,
  caseNeedsAction,
  caseStepPath,
  completedProcessSteps,
  defaultSubsectionForStep,
  flattenStepTree,
  legacySectionForHash,
  processPointForSlug,
  redirectStepForLegacyHash,
  resolveFocusedSection,
  sectionsForStepSlug,
  shouldShowSection,
  stepVisualStatus,
  substepsForStepSlug,
  visibleStepTreeForRole,
  visibleSubstepsForStep,
} from "./caseStepTreeRules";
import type { ProcessGateInput } from "./processGates";

const emptyGateInput: ProcessGateInput = {
  documentCategories: [],
  evidenceCategories: [],
  hasPrimaryExpert: false,
  questionnaireStatus: null,
  hasStreetView: false,
  hasPropertyGps: false,
  plaintiffQuestionnairePresent: false,
  inspectionComplete: false,
  reportStatus: null,
  logisticsReady: false,
  involvesFatality: false,
  hasUnpaidInvoices: false,
};

describe("caseStepTreeRules", () => {
  it("builds flat 10-point step tree in order", () => {
    const flat = flattenStepTree();
    expect(flat).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("maps slugs to process points", () => {
    expect(processPointForSlug("questionnaire")).toBe(2);
    expect(processPointForSlug("assignment")).toBe(3);
    expect(processPointForSlug("unknown")).toBeNull();
  });

  it("builds step URLs", () => {
    expect(caseStepPath("abc")).toBe("/portal/cases/abc");
    expect(caseStepPath("abc", "field_ops")).toBe(
      "/portal/cases/abc/p/field_ops",
    );
    expect(caseStepPath("abc", "intake", "location")).toBe(
      "/portal/cases/abc/p/intake?section=location",
    );
  });

  it("filters substeps by role visibility", () => {
    const expert = visibleSubstepsForStep("intake", "expert");
    expect(expert.some((s) => s.sectionId === "documents")).toBe(true);
    expect(expert.some((s) => s.sectionId === "workflow")).toBe(false);
    expect(visibleSubstepsForStep("intake", null)).toEqual([]);
    const additional = visibleSubstepsForStep("additional_docs", "admin");
    expect(additional.some((s) => s.sectionId === "completeness")).toBe(false);
    expect(additional.some((s) => s.sectionId === "documents")).toBe(true);
  });

  it("filters step tree by Miro role mission", () => {
    const expertTree = visibleStepTreeForRole({
      role: "expert",
      status: "assignment",
    });
    expect(expertTree.map((n) => n.id)).toEqual([2, 3, 6, 7, 8, 9]);
    expect(expertTree.some((n) => n.slug === "intake")).toBe(false);
    expect(expertTree.some((n) => n.slug === "questionnaire")).toBe(true);

    const adminTree = visibleStepTreeForRole({
      role: "admin",
      status: "assignment",
    });
    expect(adminTree).toHaveLength(9);
    expect(adminTree.some((n) => n.slug === "additional_docs")).toBe(false);
  });

  it("lists substeps per process step", () => {
    const intake = substepsForStepSlug("intake");
    expect(intake.map((s) => s.sectionId)).toEqual([
      "documents",
      "location",
      "workflow",
    ]);
    expect(defaultSubsectionForStep("intake")).toBe("documents");
  });

  it("resolves focused section from query param", () => {
    expect(resolveFocusedSection("intake", "documents")).toBe("documents");
    expect(resolveFocusedSection("intake", "assignments")).toBeNull();
    expect(resolveFocusedSection("intake", "not-a-section")).toBeNull();
  });

  it("maps legacy hash anchors to sections", () => {
    expect(legacySectionForHash("#case-location")).toBe("location");
    expect(legacySectionForHash("#case-documents")).toBe("documents");
    expect(redirectStepForLegacyHash("#case-location")).toBe("intake");
  });

  it("computes step visual status relative to current point", () => {
    expect(stepVisualStatus(2, 3, "questionnaire")).toBe("completed");
    expect(stepVisualStatus(3, 3, "questionnaire")).toBe("current");
    expect(stepVisualStatus(4, 3, "questionnaire")).toBe("upcoming");
  });

  it("maps step slugs to detail sections", () => {
    expect(sectionsForStepSlug("field_ops")).toContain("evidence");
    expect(sectionsForStepSlug("assignment")).toEqual([
      "assignments",
      "workflow",
      "timeline",
      "notes",
    ]);
  });

  it("hides sections on overview, filters on step view", () => {
    expect(shouldShowSection("documents", null, true)).toBe(false);
    expect(shouldShowSection("documents", "assignment", false)).toBe(false);
    expect(shouldShowSection("assignments", "assignment", false)).toBe(true);
    expect(
      shouldShowSection("documents", "intake", false, "location"),
    ).toBe(false);
    expect(
      shouldShowSection("location", "intake", false, "location"),
    ).toBe(true);
    expect(
      shouldShowSection("timeline", "intake", false, "workflow"),
    ).toBe(true);
  });

  it("builds action required summary for current step", () => {
    const summary = buildActionRequiredSummary({
      publicUuid: "uuid-1",
      caseStatus: "questionnaire",
      gateInput: emptyGateInput,
      viewerRole: "expert",
    });
    expect(summary?.slug).toBe("questionnaire");
    expect(summary?.ctaHref).toContain("/p/questionnaire");
    expect(summary?.gatesOk).toBe(false);
    expect(summary?.viewerMissingGateCodes.length).toBeGreaterThan(0);
  });

  it("routes expert soft-parallel CTA to questionnaire when P2 only has admin gates", () => {
    const summary = buildActionRequiredSummary({
      publicUuid: "uuid-1",
      caseStatus: "assignment",
      gateInput: {
        ...emptyGateInput,
        hasPrimaryExpert: true,
        documentsHandoffConfirmed: false,
      },
      viewerRole: "expert",
    });
    expect(summary?.gatesOk).toBe(false);
    expect(summary?.viewerMissingGateCodes).toEqual([]);
    expect(summary?.waitingGateCodes).toContain("handoff:documents_confirmed");
    expect(summary?.ctaHref).toContain("/p/questionnaire");
    expect(summary?.ctaLabelKey).toBe("process.quickLink.questionnaire");
  });

  it("flags cases needing action when gates blocked", () => {
    expect(caseNeedsAction(false, "field_ops")).toBe(true);
    expect(caseNeedsAction(true, "field_ops")).toBe(false);
    expect(caseNeedsAction(false, "completed")).toBe(false);
  });

  it("maps legacy hash anchors to step slugs", () => {
    expect(redirectStepForLegacyHash("#case-reviews")).toBe(
      "legal_review_questionnaire",
    );
    expect(redirectStepForLegacyHash("#case-evidence")).toBe("field_ops");
  });

  it("counts completed process steps", () => {
    expect(completedProcessSteps(3, "questionnaire")).toBe(2);
    expect(completedProcessSteps(null, "completed")).toBe(10);
  });
});

import { describe, expect, it } from "vitest";
import {
  canApplyCaseStatusChange,
  canChangeCaseStatus,
  canCompleteReviewStage,
  canDecideQuestionnaireReview,
  canEditCaseLocation,
  canManageCaseAssignments,
  canMutateCaseSection,
  canStaffApproveExternalReview,
  canUploadBlobs,
  canViewCaseSection,
  filterCaseDetailSectionsForRole,
  visibleCaseSections,
} from "./portalCapabilities";

describe("portalCapabilities", () => {
  it("gives admin and coordinator full case sections", () => {
    expect(canViewCaseSection("admin", "logistics")).toBe(true);
    expect(canViewCaseSection("case_coordinator", "audit")).toBe(true);
    expect(visibleCaseSections("admin").length).toBeGreaterThan(10);
  });

  it("scopes expert away from logistics and assignments", () => {
    expect(canViewCaseSection("expert", "evidence")).toBe(true);
    expect(canViewCaseSection("expert", "logistics")).toBe(false);
    expect(canViewCaseSection("expert", "assignments")).toBe(false);
  });

  it("scopes legal to reviews/docs and logistics to travel", () => {
    expect(canViewCaseSection("legal", "reviews")).toBe(true);
    expect(canViewCaseSection("legal", "inspections")).toBe(false);
    expect(canViewCaseSection("logistics", "logistics")).toBe(true);
    expect(canViewCaseSection("logistics", "reports")).toBe(false);
  });

  it("scopes accountant to docs/audit without field evidence", () => {
    expect(canViewCaseSection("accountant", "documents")).toBe(true);
    expect(canViewCaseSection("accountant", "evidence")).toBe(false);
    expect(canMutateCaseSection("accountant", "evidence")).toBe(false);
  });

  it("gates review completion by stage role", () => {
    expect(canCompleteReviewStage("expert", "grammar_qa")).toBe(true);
    expect(canCompleteReviewStage("legal", "grammar_qa")).toBe(false);
    expect(canCompleteReviewStage("legal", "internal_legal")).toBe(true);
    expect(canCompleteReviewStage("expert", "external_law_firm")).toBe(false);
    expect(canCompleteReviewStage("admin", "external_law_firm")).toBe(true);
  });

  it("restricts staff external-review approval and questionnaire decisions", () => {
    expect(canStaffApproveExternalReview("admin")).toBe(true);
    expect(canStaffApproveExternalReview("legal")).toBe(false);
    expect(canDecideQuestionnaireReview("legal")).toBe(true);
    expect(canDecideQuestionnaireReview("expert")).toBe(false);
  });

  it("gates workflow/assignment/upload actions", () => {
    expect(canChangeCaseStatus("case_coordinator")).toBe(true);
    expect(canChangeCaseStatus("expert")).toBe(false);
    expect(
      canApplyCaseStatusChange("accountant", "accounting", "completed"),
    ).toBe(true);
    expect(
      canApplyCaseStatusChange("accountant", "accounting", "on_hold"),
    ).toBe(false);
    expect(
      canApplyCaseStatusChange("accountant", "inspection", "completed"),
    ).toBe(false);
    expect(
      canApplyCaseStatusChange("case_coordinator", "intake", "assignment"),
    ).toBe(true);
    expect(canManageCaseAssignments("admin")).toBe(true);
    expect(canManageCaseAssignments("logistics")).toBe(false);
    expect(canUploadBlobs("expert")).toBe(true);
    expect(canUploadBlobs("accountant")).toBe(true);
    expect(canUploadBlobs("logistics")).toBe(true);
    expect(canEditCaseLocation("expert")).toBe(true);
    expect(canEditCaseLocation("accountant")).toBe(false);
  });

  it("filters case detail payload by role", () => {
    const filtered = filterCaseDetailSectionsForRole("logistics", {
      notes: [{ id: 1 }],
      documents: [{ ocrText: "secret", storageKey: "https://x" }],
      assignments: [{ id: 1 }],
      deadlines: [{ id: 1 }],
      questionnaires: [{ id: 1 }],
      inspections: [{ id: 1 }],
      measurements: [{ id: 1 }],
      evidence: [{ id: 1 }],
      evidenceChecklist: { complete: false },
      reviewRequests: [{ id: 1 }],
      documentCompleteness: { intake: {} },
      auditLogs: [{ id: 1 }],
      trips: [{ id: 1 }],
      expenses: [{ id: 1 }],
      technicalReports: [{ id: 1 }],
    });
    expect(filtered.documents).toEqual([]);
    expect(filtered.auditLogs).toEqual([]);
    expect(filtered.technicalReports).toEqual([]);
    expect(filtered.evidence).toHaveLength(1);
    expect(filtered.trips).toHaveLength(1);
    expect(filtered.notes).toHaveLength(1);
  });
});

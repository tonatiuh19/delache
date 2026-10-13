import { describe, expect, it } from "vitest";
import {
  approvedCategoriesFromDocs,
  canApproveExpediente,
  canApproveExpedienteNow,
  canApproveIntakeDocument,
  canLawFirmMutateDocument,
  canLawFirmUploadCategory,
  canRejectIntakeDocument,
  documentIsApprovable,
  documentIsRejectable,
  expedienteApproved,
  intakeCorrectionDeadlineSpec,
  intakeDocsAllApproved,
  isDocumentStatusLocked,
  isIntakeDocumentCategory,
  missingApprovedIntakeCategories,
  normalizeRejectionReason,
  parseDocumentRejectBody,
} from "./documentApprovalRules";

describe("documentApprovalRules roles", () => {
  it("restricts approve/reject/expediente to admin", () => {
    expect(canApproveIntakeDocument("admin")).toBe(true);
    expect(canRejectIntakeDocument("admin")).toBe(true);
    expect(canApproveExpediente("admin")).toBe(true);
    expect(canApproveIntakeDocument("legal")).toBe(false);
    expect(canRejectIntakeDocument("expert")).toBe(false);
    expect(canApproveExpediente("legal")).toBe(false);
  });
});

describe("document lock / mutate", () => {
  it("locks uploaded/under_review/approved for law firm", () => {
    expect(isDocumentStatusLocked("uploaded")).toBe(true);
    expect(isDocumentStatusLocked("approved")).toBe(true);
    expect(isDocumentStatusLocked("rejected")).toBe(false);
    expect(canLawFirmMutateDocument({ status: "uploaded" })).toBe(false);
    expect(canLawFirmMutateDocument({ status: "rejected" })).toBe(true);
  });

  it("blocks category re-upload while a locked file exists", () => {
    expect(
      canLawFirmUploadCategory({ existingStatuses: ["uploaded"] }),
    ).toBe(false);
    expect(
      canLawFirmUploadCategory({ existingStatuses: ["rejected"] }),
    ).toBe(true);
    expect(canLawFirmUploadCategory({ existingStatuses: [] })).toBe(true);
  });
});

describe("intake approval completeness", () => {
  const pack = [
    { category: "lawsuit", status: "approved" },
    { category: "medical_record", status: "approved" },
    { category: "cfe_report", status: "approved" },
    { category: "preliminary_photo", status: "approved" },
  ];

  it("requires all four intake categories approved", () => {
    expect(intakeDocsAllApproved(pack)).toBe(true);
    expect(
      intakeDocsAllApproved([
        ...pack.slice(0, 3),
        { category: "preliminary_photo", status: "uploaded" },
      ]),
    ).toBe(false);
    expect(missingApprovedIntakeCategories(pack.slice(0, 2))).toEqual([
      "cfe_report",
      "preliminary_photo",
    ]);
    expect(approvedCategoriesFromDocs(pack)).toHaveLength(4);
  });

  it("gates expediente approve on role + all docs approved", () => {
    expect(
      canApproveExpedienteNow({
        role: "admin",
        docs: pack,
        alreadyApproved: false,
      }).ok,
    ).toBe(true);
    expect(
      canApproveExpedienteNow({
        role: "admin",
        docs: pack.slice(0, 2),
        alreadyApproved: false,
      }).ok,
    ).toBe(false);
    expect(
      canApproveExpedienteNow({
        role: "admin",
        docs: pack,
        alreadyApproved: true,
      }),
    ).toMatchObject({ ok: false, code: "already_approved" });
  });
});

describe("approvable / rejectable", () => {
  it("allows approve from uploaded/under_review and reject from those + approved", () => {
    expect(documentIsApprovable("uploaded")).toBe(true);
    expect(documentIsApprovable("approved")).toBe(false);
    expect(documentIsRejectable("approved")).toBe(true);
    expect(documentIsRejectable("rejected")).toBe(false);
  });
});

describe("correction SLA + reject body", () => {
  it("specifies 3 business-day intake_correction deadline", () => {
    const spec = intakeCorrectionDeadlineSpec();
    expect(spec.deadlineType).toBe("intake_correction");
    expect(spec.businessDays).toBe(3);
  });

  it("parses optional reject reason", () => {
    expect(parseDocumentRejectBody(undefined)).toEqual({
      ok: true,
      reason: null,
    });
    expect(parseDocumentRejectBody({ reason: "  fix scan  " })).toEqual({
      ok: true,
      reason: "fix scan",
    });
    expect(parseDocumentRejectBody({ reason: 12 }).ok).toBe(false);
    expect(normalizeRejectionReason("")).toBeNull();
  });
});

describe("helpers", () => {
  it("detects intake categories and expediente stamp", () => {
    expect(isIntakeDocumentCategory("lawsuit")).toBe(true);
    expect(isIntakeDocumentCategory("questionnaire")).toBe(false);
    expect(expedienteApproved("2026-10-01T00:00:00Z")).toBe(true);
    expect(expedienteApproved(null)).toBe(false);
  });
});

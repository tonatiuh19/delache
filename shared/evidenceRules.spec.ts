import { describe, expect, it } from "vitest";
import {
  EVIDENCE_CHECKLIST_CATEGORIES,
  evidenceRequiresFile,
  getEvidenceChecklistStatus,
  isEvidenceCategory,
  isEvidenceType,
  validateCreateEvidence,
} from "./evidenceRules";

describe("evidence type / category classifiers", () => {
  it("accepts schema enum values", () => {
    expect(isEvidenceType("photo")).toBe(true);
    expect(isEvidenceType("gps_point")).toBe(true);
    expect(isEvidenceType("selfie")).toBe(false);
    expect(isEvidenceCategory("facade")).toBe(true);
    expect(isEvidenceCategory("general")).toBe(true);
    expect(isEvidenceCategory("unknown")).toBe(false);
  });

  it("requires files for media and court filing types only", () => {
    expect(evidenceRequiresFile("photo")).toBe(true);
    expect(evidenceRequiresFile("video")).toBe(true);
    expect(evidenceRequiresFile("voice_note")).toBe(true);
    expect(evidenceRequiresFile("signature")).toBe(true);
    expect(evidenceRequiresFile("court_filing")).toBe(true);
    expect(evidenceRequiresFile("observation")).toBe(false);
    expect(evidenceRequiresFile("gps_point")).toBe(false);
    expect(evidenceRequiresFile("measurement")).toBe(false);
    expect(evidenceRequiresFile("other")).toBe(false);
  });
});

describe("validateCreateEvidence", () => {
  it("accepts photo with file payload", () => {
    const result = validateCreateEvidence({
      evidenceType: "photo",
      category: "facade",
      title: " Front facade ",
      fileName: "facade.jpg",
      contentType: "image/jpeg",
      data: "abc123",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe("Front facade");
      expect(result.value.category).toBe("facade");
      expect(result.value.requiresFile).toBe(true);
      expect(result.value.dataBase64).toBe("abc123");
    }
  });

  it("rejects photo without file", () => {
    const result = validateCreateEvidence({
      evidenceType: "photo",
      category: "facade",
      title: "Facade",
    });
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.code).toBe("file_required");
  });

  it("requires lat/lng for gps_point", () => {
    const missing = validateCreateEvidence({
      evidenceType: "gps_point",
      title: "Pin",
    });
    expect(missing.ok).toBe(false);
    if (missing.ok === false) expect(missing.code).toBe("gps_required");

    const ok = validateCreateEvidence({
      evidenceType: "gps_point",
      lat: 19.4326,
      lng: -99.1332,
      title: "Property pin",
    });
    expect(ok.ok).toBe(true);
  });

  it("rejects invalid coordinates and partial lat/lng", () => {
    expect(
      validateCreateEvidence({
        evidenceType: "observation",
        caption: "note",
        lat: 100,
        lng: 0,
      }).ok,
    ).toBe(false);

    const partial = validateCreateEvidence({
      evidenceType: "observation",
      caption: "note",
      lat: 19,
    });
    expect(partial.ok).toBe(false);
    if (partial.ok === false) expect(partial.code).toBe("invalid_coordinates");
  });

  it("defaults category to general and trims whitespace", () => {
    const result = validateCreateEvidence({
      evidenceType: "observation",
      caption: "  risk note  ",
      title: "   ",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.category).toBe("general");
      expect(result.value.caption).toBe("risk note");
      expect(result.value.title).toBeNull();
    }
  });

  it("rejects empty content with no file/text/gps", () => {
    const result = validateCreateEvidence({
      evidenceType: "other",
    });
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.code).toBe("empty_content");
  });

  it("rejects invalid type, category, inspectionId, capturedAt, file size", () => {
    expect(validateCreateEvidence({ evidenceType: "nope" }).ok).toBe(false);
    expect(
      validateCreateEvidence({
        evidenceType: "observation",
        caption: "x",
        category: "nope",
      }).ok,
    ).toBe(false);
    expect(
      validateCreateEvidence({
        evidenceType: "observation",
        caption: "x",
        inspectionId: -1,
      }).ok,
    ).toBe(false);
    expect(
      validateCreateEvidence({
        evidenceType: "observation",
        caption: "x",
        capturedAt: "not-a-date",
      }).ok,
    ).toBe(false);
    expect(
      validateCreateEvidence({
        evidenceType: "photo",
        fileName: "a.jpg",
        data: "x",
        fileSizeBytes: 0,
      }).ok,
    ).toBe(false);
    expect(
      validateCreateEvidence({
        evidenceType: "photo",
        fileName: "a.jpg",
        data: "x",
        fileSizeBytes: 20 * 1024 * 1024,
      }).ok,
    ).toBe(false);
  });

  it("accepts optional inspectionId and capturedAt", () => {
    const result = validateCreateEvidence({
      evidenceType: "observation",
      caption: "note",
      inspectionId: 12,
      capturedAt: "2026-08-10T18:00:00.000Z",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.inspectionId).toBe(12);
      expect(result.value.capturedAt?.toISOString()).toBe(
        "2026-08-10T18:00:00.000Z",
      );
    }
  });
});

describe("getEvidenceChecklistStatus", () => {
  it("reports all missing when empty", () => {
    const status = getEvidenceChecklistStatus([]);
    expect(status.complete).toBe(false);
    expect(status.coveredCount).toBe(0);
    expect(status.totalCount).toBe(EVIDENCE_CHECKLIST_CATEGORIES.length);
    expect(status.missing).toEqual([...EVIDENCE_CHECKLIST_CATEGORIES]);
  });

  it("ignores general and counts unique checklist categories", () => {
    const status = getEvidenceChecklistStatus([
      { category: "general" },
      { category: "facade" },
      { category: "facade" },
      { category: "safety" },
    ]);
    expect(status.covered).toEqual(["facade", "safety"]);
    expect(status.coveredCount).toBe(2);
    expect(status.complete).toBe(false);
    expect(status.missing).toContain("horizontal_distance");
    expect(status.missing).not.toContain("facade");
  });

  it("is complete when every checklist category is present", () => {
    const status = getEvidenceChecklistStatus(
      EVIDENCE_CHECKLIST_CATEGORIES.map((category) => ({ category })),
    );
    expect(status.complete).toBe(true);
    expect(status.missing).toEqual([]);
    expect(status.coveredCount).toBe(EVIDENCE_CHECKLIST_CATEGORIES.length);
  });
});

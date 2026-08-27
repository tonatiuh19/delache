import { describe, expect, it } from "vitest";
import {
  blockingDocCategoriesFromGates,
  buildDocumentPhaseSummaries,
  documentCategoryAnchorId,
  documentCategoryFromGateCode,
  documentCategoryHref,
  groupDocumentsByCategory,
  parseDocumentCategoryFromHash,
  preferredUploadCategory,
} from "./documentPanelRules";

describe("documentPanelRules", () => {
  it("parses doc gate codes and category anchors", () => {
    expect(documentCategoryFromGateCode("doc:medical_record")).toBe(
      "medical_record",
    );
    expect(documentCategoryFromGateCode("assignment:primary_expert")).toBeNull();
    expect(documentCategoryFromGateCode("doc:")).toBeNull();
    expect(documentCategoryAnchorId("cfe_report")).toBe(
      "case-documents-cat-cfe_report",
    );
    expect(documentCategoryHref("cfe_report")).toBe(
      "#case-documents-cat-cfe_report",
    );
    expect(parseDocumentCategoryFromHash("#case-documents-cat-lawsuit")).toBe(
      "lawsuit",
    );
    expect(parseDocumentCategoryFromHash("case-documents")).toBeNull();
  });

  it("lists unique blocking categories from gates", () => {
    expect(
      blockingDocCategoriesFromGates([
        "doc:medical_record",
        "doc:cfe_report",
        "doc:medical_record",
        "assignment:primary_expert",
      ]),
    ).toEqual(["medical_record", "cfe_report"]);
  });

  it("builds phase summaries and groups documents in process order", () => {
    const phases = buildDocumentPhaseSummaries({
      intake: {
        complete: false,
        present: ["lawsuit"],
        missing: ["medical_record"],
        required: ["lawsuit", "medical_record"],
      },
      additionalDocs: null,
      courtFiling: {
        complete: true,
        present: ["protesta"],
        missing: [],
        required: ["protesta"],
      },
    });
    expect(phases).toHaveLength(2);
    expect(phases[0]?.key).toBe("intake");
    expect(phases[0]?.presentCount).toBe(1);
    expect(phases[1]?.key).toBe("courtFiling");

    const groups = groupDocumentsByCategory([
      { category: "other", id: 1 },
      { category: "medical_record", id: 2 },
      { category: "lawsuit", id: 3 },
      { category: "medical_record", id: 4 },
    ]);
    expect(groups.map((g) => g.category)).toEqual([
      "lawsuit",
      "medical_record",
      "other",
    ]);
    expect(groups[1]?.documents).toHaveLength(2);
  });

  it("prefers hash then first blocking category for upload focus", () => {
    expect(
      preferredUploadCategory({
        hashCategory: "cfe_report",
        blockingCategories: ["medical_record"],
        fallback: "lawsuit",
      }),
    ).toBe("cfe_report");
    expect(
      preferredUploadCategory({
        hashCategory: null,
        blockingCategories: ["medical_record", "cfe_report"],
        fallback: "lawsuit",
      }),
    ).toBe("medical_record");
    expect(
      preferredUploadCategory({
        hashCategory: null,
        blockingCategories: [],
        fallback: "lawsuit",
      }),
    ).toBe("lawsuit");
  });
});

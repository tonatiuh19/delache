import { describe, expect, it } from "vitest";
import {
  canClientRecategorizeDocument,
  canClientSetDocumentCategory,
  DOCUMENT_CATEGORIES,
  isDocumentCategory,
  parseClientUploadCategory,
  parseDocumentCategory,
  parseDocumentCategoryStrict,
  parseRequiredDocumentCategory,
  parseUpdateDocumentCategory,
} from "./documentCategoryRules";

describe("documentCategoryRules", () => {
  it("accepts every product category and rejects junk", () => {
    for (const cat of DOCUMENT_CATEGORIES) {
      expect(isDocumentCategory(cat)).toBe(true);
    }
    expect(isDocumentCategory("")).toBe(false);
    expect(isDocumentCategory("  lawsuit")).toBe(false);
    expect(isDocumentCategory("Lawsuit")).toBe(false);
    expect(isDocumentCategory(null)).toBe(false);
  });

  it("falls back on invalid upload category and is strict when required", () => {
    expect(parseDocumentCategory(undefined)).toBe("other");
    expect(parseDocumentCategory("protesta")).toBe("protesta");
    expect(parseDocumentCategoryStrict("other").ok).toBe(true);
    expect(parseDocumentCategoryStrict("nope").ok).toBe(false);
    expect(parseDocumentCategoryStrict("").ok).toBe(false);
  });

  it("limits despacho uploads to P1/P5 categories", () => {
    expect(canClientSetDocumentCategory("lawsuit")).toBe(true);
    expect(canClientSetDocumentCategory("plaintiff_questionnaire")).toBe(true);
    expect(canClientSetDocumentCategory("protesta")).toBe(false);
    expect(canClientSetDocumentCategory("other")).toBe(true);
    expect(parseClientUploadCategory("other").ok).toBe(true);
    expect(parseClientUploadCategory("medical_record").ok).toBe(true);
    expect(parseClientUploadCategory("technical_report").ok).toBe(false);
    expect(parseClientUploadCategory(undefined).ok).toBe(false);
    expect(parseRequiredDocumentCategory(undefined).ok).toBe(false);
    expect(parseRequiredDocumentCategory("other").ok).toBe(true);
  });

  it("validates recategorize body and client-portal guard", () => {
    expect(parseUpdateDocumentCategory({ category: "sketch" }).ok).toBe(true);
    expect(parseUpdateDocumentCategory({}).ok).toBe(false);
    expect(parseUpdateDocumentCategory(null).ok).toBe(false);
    expect(
      parseUpdateDocumentCategory(
        { category: "protesta" },
        { clientPortal: true },
      ).ok,
    ).toBe(false);
    expect(
      parseUpdateDocumentCategory(
        { category: "cfe_report" },
        { clientPortal: true },
      ).ok,
    ).toBe(true);
    expect(canClientRecategorizeDocument("lawsuit")).toBe(true);
    expect(canClientRecategorizeDocument("other")).toBe(true);
    expect(canClientRecategorizeDocument("protesta")).toBe(false);
    expect(
      parseUpdateDocumentCategory(
        { category: "lawsuit" },
        { clientPortal: true, currentCategory: "protesta" },
      ).ok,
    ).toBe(false);
    expect(
      parseUpdateDocumentCategory(
        { category: "sketch" },
        { clientPortal: true, currentCategory: "other" },
      ).ok,
    ).toBe(true);
  });
});

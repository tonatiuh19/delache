import { describe, expect, it } from "vitest";
import {
  DMS_MAX_BULK_FILES,
  DMS_MAX_BULK_TOTAL_BYTES,
  DMS_MAX_FILE_BYTES,
  DMS_SHOW_SIZE_STABILIZATION_LEGEND,
  VERCEL_SAFE_JSON_UPLOAD_BYTES,
  classifyDmsFiles,
  dmsMaxFileSizeMb,
  estimateBase64DecodedBytes,
  initialOcrStatusForMime,
  isBlobTokenMissingError,
  isOcrableMime,
  isPreviewableMime,
  shouldUseDirectBlobUpload,
  shouldUseJsonDocumentUpload,
  truncateOcrText,
  validateBulkDocuments,
} from "./documentDmsRules";

describe("documentDmsRules", () => {
  it("exposes max size helpers for UI copy", () => {
    expect(dmsMaxFileSizeMb()).toBe(15);
    expect(DMS_SHOW_SIZE_STABILIZATION_LEGEND).toBe(true);
    expect(DMS_MAX_FILE_BYTES).toBe(15 * 1024 * 1024);
  });
  it("classifies OCR and preview MIME types", () => {
    expect(isOcrableMime("application/pdf")).toBe(true);
    expect(isOcrableMime("image/png")).toBe(true);
    expect(isOcrableMime("text/plain")).toBe(false);
    expect(isPreviewableMime("application/pdf")).toBe(true);
    expect(isPreviewableMime("image/jpeg")).toBe(true);
    expect(initialOcrStatusForMime("image/webp")).toBe("pending");
    expect(initialOcrStatusForMime("text/plain")).toBe("skipped");
  });

  it("validates bulk payloads", () => {
    expect(validateBulkDocuments([]).ok).toBe(false);
    expect(
      validateBulkDocuments(
        Array.from({ length: DMS_MAX_BULK_FILES + 1 }, (_, i) => ({
          fileName: `f${i}.pdf`,
          data: "abc",
          contentType: "application/pdf",
        })),
      ).ok,
    ).toBe(false);

    const ok = validateBulkDocuments([
      {
        fileName: "lawsuit.pdf",
        data: "YmFzZTY0",
        contentType: "application/pdf",
        category: "lawsuit",
      },
      {
        fileName: "photo.jpg",
        data: "abc",
        contentType: "image/jpeg",
        category: "preliminary_photo",
      },
    ]);
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.files).toHaveLength(2);
      expect(ok.files[0].title).toBe("lawsuit");
      expect(ok.files[0].category).toBe("lawsuit");
    }
  });

  it("rejects missing file fields and truncates OCR text", () => {
    expect(
      validateBulkDocuments([{ fileName: "a.pdf", data: "" }]).ok,
    ).toBe(false);
    expect(
      validateBulkDocuments([
        { fileName: "a.pdf", data: "abc", contentType: "application/pdf" },
      ]).ok,
    ).toBe(false);
    expect(truncateOcrText("  hello  ")).toBe("hello");
    expect(truncateOcrText("x".repeat(10), 4)).toBe("xxxx");
  });

  it("rejects oversized bulk total payload", () => {
    expect(estimateBase64DecodedBytes("YWJj")).toBe(3);
    const huge = "A".repeat(
      Math.ceil(((DMS_MAX_BULK_TOTAL_BYTES + 1024) * 4) / 3),
    );
    const result = validateBulkDocuments([
      {
        fileName: "big.pdf",
        data: huge,
        contentType: "application/pdf",
        category: "lawsuit",
      },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.code).toBe("too_large");
  });

  it("classifies local files and routes large ones to direct blob", () => {
    expect(shouldUseDirectBlobUpload(VERCEL_SAFE_JSON_UPLOAD_BYTES)).toBe(false);
    expect(shouldUseDirectBlobUpload(VERCEL_SAFE_JSON_UPLOAD_BYTES + 1)).toBe(
      true,
    );
    expect(
      shouldUseJsonDocumentUpload([
        { size: 1024 },
        { size: VERCEL_SAFE_JSON_UPLOAD_BYTES },
      ]),
    ).toBe(false);
    expect(shouldUseJsonDocumentUpload([{ size: 1024 }])).toBe(true);
    expect(isBlobTokenMissingError("BLOB_READ_WRITE_TOKEN not configured")).toBe(
      true,
    );
    const classified = classifyDmsFiles([
      { name: "ok.pdf", size: 1024, type: "application/pdf" },
      { name: "empty.pdf", size: 0, type: "application/pdf" },
      { name: "huge.pdf", size: DMS_MAX_FILE_BYTES + 1, type: "application/pdf" },
      { name: "bad.exe", size: 10, type: "application/x-msdownload" },
      ...Array.from({ length: DMS_MAX_BULK_FILES }, (_, i) => ({
        name: `extra-${i}.pdf`,
        size: 10,
        type: "application/pdf",
      })),
    ]);
    expect(classified.accepted[0]?.name).toBe("ok.pdf");
    expect(classified.rejected.map((r) => r.reason)).toEqual(
      expect.arrayContaining(["empty", "too_large", "unsupported_type", "too_many"]),
    );
  });
});

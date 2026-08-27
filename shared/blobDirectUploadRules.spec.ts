import { describe, expect, it } from "vitest";
import {
  blobUploadPathPrefix,
  isAllowedDirectUploadPathname,
  parseDirectUploadClientPayload,
  validateFromBlobDocument,
} from "./blobDirectUploadRules";

describe("blobDirectUploadRules", () => {
  it("builds and validates pathname prefixes", () => {
    expect(blobUploadPathPrefix("staff", "abc")).toBe("cases/abc");
    expect(blobUploadPathPrefix("law_firm", "abc")).toBe("client-cases/abc");
    expect(
      isAllowedDirectUploadPathname("cases/abc/123-file.pdf", "staff", "abc"),
    ).toBe(true);
    expect(
      isAllowedDirectUploadPathname("cases/other/123-file.pdf", "staff", "abc"),
    ).toBe(false);
    expect(
      isAllowedDirectUploadPathname("cases/abc/../x.pdf", "staff", "abc"),
    ).toBe(false);
  });

  it("parses client payload", () => {
    expect(parseDirectUploadClientPayload(null).ok).toBe(false);
    expect(parseDirectUploadClientPayload("{").ok).toBe(false);
    const ok = parseDirectUploadClientPayload(
      JSON.stringify({ casePublicUuid: "uuid-1", actor: "staff" }),
    );
    expect(ok).toEqual({
      ok: true,
      value: { casePublicUuid: "uuid-1", actor: "staff" },
    });
  });

  it("validates from-blob documents", () => {
    const helpers = {
      maxFileBytes: 15 * 1024 * 1024,
      isAllowedMime: (mime: string) => mime === "application/pdf",
      blobPathnameFromUrl: (url: string) =>
        url.replace("https://store.private.blob.vercel-storage.com/", ""),
      isPrivateBlobUrl: (url: string) => url.includes(".private.blob."),
    };
    const ok = validateFromBlobDocument(
      {
        title: "Demanda",
        fileName: "file.pdf",
        contentType: "application/pdf",
        storageKey:
          "https://store.private.blob.vercel-storage.com/cases/abc/1-file.pdf",
        fileSizeBytes: 2048,
      },
      { actor: "staff", casePublicUuid: "abc", ...helpers },
    );
    expect(ok.ok).toBe(true);

    const badHost = validateFromBlobDocument(
      {
        fileName: "file.pdf",
        contentType: "application/pdf",
        storageKey: "https://evil.example/cases/abc/1-file.pdf",
        fileSizeBytes: 2048,
      },
      { actor: "staff", casePublicUuid: "abc", ...helpers },
    );
    expect(badHost.ok).toBe(false);

    const wrongCase = validateFromBlobDocument(
      {
        fileName: "file.pdf",
        contentType: "application/pdf",
        storageKey:
          "https://store.private.blob.vercel-storage.com/cases/zzz/1-file.pdf",
        fileSizeBytes: 2048,
      },
      { actor: "staff", casePublicUuid: "abc", ...helpers },
    );
    expect(wrongCase.ok).toBe(false);
  });
});

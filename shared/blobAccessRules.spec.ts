import { describe, expect, it } from "vitest";
import {
  blobPathnameFromUrl,
  isAllowedBlobFetchUrl,
  isPrivateBlobUrl,
} from "./blobAccessRules";

describe("blobAccessRules", () => {
  it("extracts pathname from blob URLs and raw paths", () => {
    expect(
      blobPathnameFromUrl(
        "https://abc.private.blob.vercel-storage.com/cases/1/file.pdf",
      ),
    ).toBe("cases/1/file.pdf");
    expect(blobPathnameFromUrl("cases/1/file.pdf")).toBe("cases/1/file.pdf");
    expect(blobPathnameFromUrl("")).toBeNull();
  });

  it("detects private blob hosts", () => {
    expect(
      isPrivateBlobUrl(
        "https://abc.private.blob.vercel-storage.com/cases/1/a.pdf",
      ),
    ).toBe(true);
    expect(
      isPrivateBlobUrl("https://abc.public.blob.vercel-storage.com/x.pdf"),
    ).toBe(false);
  });

  it("allowlists only Vercel Blob hosts for server fetch", () => {
    expect(
      isAllowedBlobFetchUrl(
        "https://abc.public.blob.vercel-storage.com/x.pdf",
      ),
    ).toBe(true);
    expect(
      isAllowedBlobFetchUrl(
        "https://abc.private.blob.vercel-storage.com/x.pdf",
      ),
    ).toBe(true);
    expect(isAllowedBlobFetchUrl("https://evil.example/steal")).toBe(false);
    expect(isAllowedBlobFetchUrl("cases/1/file.pdf")).toBe(false);
  });
});

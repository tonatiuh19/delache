import { describe, expect, it } from "vitest";
import {
  isCaseStepPath,
  isNewCasePath,
  parseCaseDetailPath,
} from "@/hooks/usePortalCaseContext";

describe("parseCaseDetailPath", () => {
  it("detects case overview and step routes", () => {
    const uuid = "2378a175-5d79-4d18-a526-b69eb7180682";
    expect(parseCaseDetailPath(`/portal/cases/${uuid}`)).toBe(uuid);
    expect(parseCaseDetailPath(`/portal/cases/${uuid}/p/intake`)).toBe(uuid);
  });

  it("ignores cases list route", () => {
    expect(parseCaseDetailPath("/portal/cases")).toBeNull();
    expect(parseCaseDetailPath("/portal/cases?create=1")).toBeNull();
  });

  it("treats the unsaved create page as its own route", () => {
    expect(isNewCasePath("/portal/cases/new")).toBe(true);
    expect(isNewCasePath("/portal/cases/new/")).toBe(true);
    expect(parseCaseDetailPath("/portal/cases/new")).toBeNull();
    expect(isNewCasePath("/portal/cases")).toBe(false);
  });
});

describe("isCaseStepPath", () => {
  it("detects step routes only", () => {
    const uuid = "2378a175-5d79-4d18-a526-b69eb7180682";
    expect(isCaseStepPath(`/portal/cases/${uuid}/p/intake`)).toBe(true);
    expect(isCaseStepPath(`/portal/cases/${uuid}`)).toBe(false);
  });
});

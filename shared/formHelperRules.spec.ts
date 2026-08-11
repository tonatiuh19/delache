import { describe, expect, it } from "vitest";
import {
  isShowFormHelpersEnabled,
  parseUpdatePreferences,
} from "./formHelperRules";

describe("isShowFormHelpersEnabled", () => {
  it("defaults ON when unset", () => {
    expect(isShowFormHelpersEnabled(undefined)).toBe(true);
    expect(isShowFormHelpersEnabled(null)).toBe(true);
  });

  it("reads booleans", () => {
    expect(isShowFormHelpersEnabled(true)).toBe(true);
    expect(isShowFormHelpersEnabled(false)).toBe(false);
  });

  it("reads mysql tinyint-style numbers", () => {
    expect(isShowFormHelpersEnabled(1)).toBe(true);
    expect(isShowFormHelpersEnabled(0)).toBe(false);
    expect(isShowFormHelpersEnabled(2)).toBe(true);
  });

  it("reads common string flags", () => {
    expect(isShowFormHelpersEnabled("1")).toBe(true);
    expect(isShowFormHelpersEnabled("true")).toBe(true);
    expect(isShowFormHelpersEnabled("yes")).toBe(true);
    expect(isShowFormHelpersEnabled("on")).toBe(true);
    expect(isShowFormHelpersEnabled("0")).toBe(false);
    expect(isShowFormHelpersEnabled("false")).toBe(false);
    expect(isShowFormHelpersEnabled("off")).toBe(false);
    expect(isShowFormHelpersEnabled("no")).toBe(false);
    expect(isShowFormHelpersEnabled("")).toBe(false);
    expect(isShowFormHelpersEnabled("  false  ")).toBe(false);
  });

  it("defaults ON for unexpected types", () => {
    expect(isShowFormHelpersEnabled({} as never)).toBe(true);
    expect(isShowFormHelpersEnabled([] as never)).toBe(true);
  });
});

describe("parseUpdatePreferences", () => {
  it("accepts boolean true/false", () => {
    expect(parseUpdatePreferences({ showFormHelpers: true })).toEqual({
      ok: true,
      showFormHelpers: true,
    });
    expect(parseUpdatePreferences({ showFormHelpers: false })).toEqual({
      ok: true,
      showFormHelpers: false,
    });
  });

  it("ignores extra fields when showFormHelpers is valid", () => {
    expect(
      parseUpdatePreferences({ showFormHelpers: false, theme: "dark" }),
    ).toEqual({ ok: true, showFormHelpers: false });
  });

  it("rejects missing or non-boolean", () => {
    expect(parseUpdatePreferences({})).toMatchObject({
      ok: false,
      error: "showFormHelpers is required",
    });
    expect(parseUpdatePreferences({ showFormHelpers: 1 })).toMatchObject({
      ok: false,
      error: "showFormHelpers must be a boolean",
    });
    expect(parseUpdatePreferences({ showFormHelpers: "true" })).toMatchObject({
      ok: false,
    });
    expect(parseUpdatePreferences({ showFormHelpers: null })).toMatchObject({
      ok: false,
    });
    expect(parseUpdatePreferences(null)).toMatchObject({
      ok: false,
      error: "Invalid body",
    });
    expect(parseUpdatePreferences([])).toMatchObject({ ok: false });
    expect(parseUpdatePreferences("true")).toMatchObject({ ok: false });
  });
});

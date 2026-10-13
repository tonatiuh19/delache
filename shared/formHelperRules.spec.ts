import { describe, expect, it } from "vitest";
import {
  isPreferenceFlagEnabled,
  isShowFormHelpersEnabled,
  isShowProcessGuidanceEnabled,
  parseUpdatePreferences,
} from "./formHelperRules";

describe("isPreferenceFlagEnabled", () => {
  it("defaults OFF when unset", () => {
    expect(isPreferenceFlagEnabled(undefined)).toBe(false);
    expect(isPreferenceFlagEnabled(null)).toBe(false);
    expect(isShowFormHelpersEnabled(undefined)).toBe(false);
    expect(isShowProcessGuidanceEnabled(null)).toBe(false);
  });

  it("reads booleans", () => {
    expect(isPreferenceFlagEnabled(true)).toBe(true);
    expect(isPreferenceFlagEnabled(false)).toBe(false);
  });

  it("reads mysql tinyint-style numbers", () => {
    expect(isPreferenceFlagEnabled(1)).toBe(true);
    expect(isPreferenceFlagEnabled(0)).toBe(false);
    expect(isPreferenceFlagEnabled(2)).toBe(true);
  });

  it("reads common string flags", () => {
    expect(isPreferenceFlagEnabled("1")).toBe(true);
    expect(isPreferenceFlagEnabled("true")).toBe(true);
    expect(isPreferenceFlagEnabled("yes")).toBe(true);
    expect(isPreferenceFlagEnabled("on")).toBe(true);
    expect(isPreferenceFlagEnabled("0")).toBe(false);
    expect(isPreferenceFlagEnabled("false")).toBe(false);
    expect(isPreferenceFlagEnabled("off")).toBe(false);
    expect(isPreferenceFlagEnabled("no")).toBe(false);
    expect(isPreferenceFlagEnabled("")).toBe(false);
    expect(isPreferenceFlagEnabled("  false  ")).toBe(false);
    expect(isPreferenceFlagEnabled("maybe")).toBe(false);
  });

  it("defaults OFF for unexpected types", () => {
    expect(isPreferenceFlagEnabled({} as never)).toBe(false);
    expect(isPreferenceFlagEnabled([] as never)).toBe(false);
  });
});

describe("parseUpdatePreferences", () => {
  it("accepts showProcessGuidance alone", () => {
    expect(parseUpdatePreferences({ showProcessGuidance: true })).toEqual({
      ok: true,
      showProcessGuidance: true,
    });
    expect(parseUpdatePreferences({ showProcessGuidance: false })).toEqual({
      ok: true,
      showProcessGuidance: false,
    });
  });

  it("accepts showFormHelpers alone (legacy)", () => {
    expect(parseUpdatePreferences({ showFormHelpers: true })).toEqual({
      ok: true,
      showFormHelpers: true,
    });
  });

  it("accepts both flags", () => {
    expect(
      parseUpdatePreferences({
        showFormHelpers: false,
        showProcessGuidance: true,
      }),
    ).toEqual({
      ok: true,
      showFormHelpers: false,
      showProcessGuidance: true,
    });
  });

  it("ignores extra fields when a flag is valid", () => {
    expect(
      parseUpdatePreferences({ showProcessGuidance: false, theme: "dark" }),
    ).toEqual({ ok: true, showProcessGuidance: false });
  });

  it("rejects missing or non-boolean", () => {
    expect(parseUpdatePreferences({})).toMatchObject({
      ok: false,
      error: "showProcessGuidance or showFormHelpers is required",
    });
    expect(parseUpdatePreferences({ showFormHelpers: 1 })).toMatchObject({
      ok: false,
      error: "showFormHelpers must be a boolean",
    });
    expect(
      parseUpdatePreferences({ showProcessGuidance: "true" }),
    ).toMatchObject({
      ok: false,
      error: "showProcessGuidance must be a boolean",
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

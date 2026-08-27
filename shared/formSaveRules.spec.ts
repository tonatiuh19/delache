import { describe, expect, it } from "vitest";
import {
  resolveLocationGpsForSave,
  settleAsyncThunkResult,
  shouldReinitializeForm,
} from "./formSaveRules";
import { resolveOptionalLatLng } from "./locationRules";

describe("formSaveRules", () => {
  it("settles fulfilled and rejected thunk-like results", () => {
    expect(
      settleAsyncThunkResult({ meta: { requestStatus: "fulfilled" } }),
    ).toEqual({ ok: true });
    expect(
      settleAsyncThunkResult({
        meta: { requestStatus: "rejected" },
        payload: "boom",
      }),
    ).toEqual({ ok: false, error: "boom" });
    expect(
      settleAsyncThunkResult({
        meta: { requestStatus: "rejected" },
        payload: { message: "gate blocked", missing: ["x"] },
      }),
    ).toEqual({ ok: false, error: "gate blocked" });
    expect(settleAsyncThunkResult(null).ok).toBe(false);
    const blank = settleAsyncThunkResult({
      meta: { requestStatus: "rejected" },
      payload: "  ",
    });
    expect(blank.ok).toBe(false);
    if (blank.ok === false) expect(blank.error).toBe("save_failed");
  });

  it("applies GPS without blocking address persistence", () => {
    expect(
      resolveLocationGpsForSave({
        latRaw: "",
        lngRaw: "",
        resolveOptionalLatLng,
      }),
    ).toEqual({ action: "clear" });

    expect(
      resolveLocationGpsForSave({
        latRaw: "16.44",
        lngRaw: "",
        resolveOptionalLatLng,
      }),
    ).toEqual({ action: "keep", warning: "need_both" });

    expect(
      resolveLocationGpsForSave({
        latRaw: "not-a-coord",
        lngRaw: "also-bad",
        resolveOptionalLatLng,
      }),
    ).toEqual({ action: "keep", warning: "invalid" });

    const dms = resolveLocationGpsForSave({
      latRaw: `16°26'47.1"N`,
      lngRaw: `92°43'40.7"W`,
      resolveOptionalLatLng,
    });
    expect(dms.action).toBe("set");
    if (dms.action === "set") {
      expect(dms.lat).toBeCloseTo(16.4464167, 5);
      expect(dms.lng).toBeCloseTo(-92.7279722, 5);
    }
  });

  it("skips reinitialize while dirty", () => {
    expect(
      shouldReinitializeForm({ enableReinitialize: true, dirty: true }),
    ).toBe(false);
    expect(
      shouldReinitializeForm({ enableReinitialize: true, dirty: false }),
    ).toBe(true);
    expect(
      shouldReinitializeForm({ enableReinitialize: false, dirty: false }),
    ).toBe(false);
  });
});

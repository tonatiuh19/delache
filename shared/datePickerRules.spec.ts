import { describe, expect, it } from "vitest";
import {
  formatDatetimeLocal,
  formatIsoDateOnly,
  isDatetimeLocal,
  isIsoDateOnly,
  mergeDateIntoDatetimeLocal,
  parseDatetimeLocal,
  parseIsoDateOnly,
  setTimeOnDatetimeLocal,
} from "./datePickerRules";

describe("datePickerRules", () => {
  it("parses and formats ISO date-only", () => {
    expect(isIsoDateOnly("2026-09-29")).toBe(true);
    expect(isIsoDateOnly("29/09/2026")).toBe(false);
    const d = parseIsoDateOnly("2026-09-29");
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(8);
    expect(d?.getDate()).toBe(29);
    expect(formatIsoDateOnly(d!)).toBe("2026-09-29");
  });

  it("rejects invalid calendar dates", () => {
    expect(parseIsoDateOnly("2026-02-31")).toBeNull();
    expect(parseIsoDateOnly("")).toBeNull();
  });

  it("parses and formats datetime-local", () => {
    expect(isDatetimeLocal("2026-09-29T14:30")).toBe(true);
    const d = parseDatetimeLocal("2026-09-29T14:30");
    expect(d?.getHours()).toBe(14);
    expect(d?.getMinutes()).toBe(30);
    expect(formatDatetimeLocal(d!)).toBe("2026-09-29T14:30");
  });

  it("merges date into datetime keeping time", () => {
    const next = mergeDateIntoDatetimeLocal(
      new Date(2026, 9, 1, 12, 0, 0, 0),
      "2026-09-29T16:45",
    );
    expect(next).toBe("2026-10-01T16:45");
  });

  it("defaults time to 09:00 when merging without previous", () => {
    const next = mergeDateIntoDatetimeLocal(
      new Date(2026, 0, 5, 12, 0, 0, 0),
      "",
    );
    expect(next).toBe("2026-01-05T09:00");
  });

  it("sets time on datetime-local", () => {
    expect(setTimeOnDatetimeLocal("2026-09-29T09:00", 18, 15)).toBe(
      "2026-09-29T18:15",
    );
    expect(setTimeOnDatetimeLocal("2026-09-29T09:00", 25, 0)).toBeNull();
  });
});

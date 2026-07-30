import { describe, expect, it } from "vitest";
import {
  buildMonthGrid,
  isSameDay,
  monthRangeIso,
  startOfMonth,
  toDateKey,
} from "./calendarUtils";

describe("calendarUtils", () => {
  it("builds a 42-day Monday-first grid", () => {
    const grid = buildMonthGrid(new Date(2026, 6, 1)); // July 2026
    expect(grid).toHaveLength(42);
    expect(grid[0].getDay()).toBe(1); // Monday
  });

  it("creates stable date keys", () => {
    expect(toDateKey(new Date(2026, 6, 29))).toBe("2026-07-29");
  });

  it("compares days ignoring time", () => {
    expect(
      isSameDay(new Date(2026, 6, 29, 9), new Date(2026, 6, 29, 18)),
    ).toBe(true);
  });

  it("returns an ISO range covering the month buffer", () => {
    const range = monthRangeIso(startOfMonth(new Date(2026, 6, 15)));
    expect(new Date(range.from).getTime()).toBeLessThan(
      new Date(range.to).getTime(),
    );
  });
});

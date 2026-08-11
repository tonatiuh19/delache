import { describe, expect, it } from "vitest";
import {
  addBusinessDays,
  computeDeadlineSeverity,
  isMexicanPublicHoliday,
} from "./businessDays";

describe("businessDays", () => {
  it("skips weekends when adding business days", () => {
    // Friday 2026-07-31 UTC → +1 business day = Monday 2026-08-03
    const friday = new Date(Date.UTC(2026, 6, 31, 12, 0, 0));
    const next = addBusinessDays(friday, 1);
    expect(next.toISOString().slice(0, 10)).toBe("2026-08-03");
  });

  it("adds 10 business days from a Monday", () => {
    const monday = new Date(Date.UTC(2026, 6, 27, 12, 0, 0)); // Jul 27
    const due = addBusinessDays(monday, 10);
    expect(due.toISOString().slice(0, 10)).toBe("2026-08-10");
  });

  it("skips Mexican public holidays", () => {
    expect(
      isMexicanPublicHoliday(new Date(Date.UTC(2026, 4, 1))),
    ).toBe(true);
    expect(
      isMexicanPublicHoliday(new Date(Date.UTC(2026, 1, 2))),
    ).toBe(true);
    expect(
      isMexicanPublicHoliday(new Date(Date.UTC(2024, 9, 1))),
    ).toBe(true);
    const thursday = new Date(Date.UTC(2026, 3, 30, 12, 0, 0));
    const next = addBusinessDays(thursday, 1);
    expect(next.toISOString().slice(0, 10)).toBe("2026-05-04");
    expect(isMexicanPublicHoliday(new Date(Date.UTC(2026, 0, 1)))).toBe(true);
    expect(isMexicanPublicHoliday(new Date(Date.UTC(2026, 8, 16)))).toBe(true);
    expect(isMexicanPublicHoliday(new Date(Date.UTC(2026, 11, 25)))).toBe(
      true,
    );
    expect(isMexicanPublicHoliday(new Date(Date.UTC(2026, 2, 16)))).toBe(
      true,
    );
    expect(isMexicanPublicHoliday(new Date(Date.UTC(2026, 10, 16)))).toBe(
      true,
    );
    expect(isMexicanPublicHoliday(new Date(Date.UTC(2018, 11, 1)))).toBe(
      true,
    );
    expect(isMexicanPublicHoliday(new Date(Date.UTC(2025, 9, 1)))).toBe(
      false,
    );
  });

  it("computes deadline severity bands", () => {
    const now = new Date(Date.UTC(2026, 6, 29, 12, 0, 0));
    expect(
      computeDeadlineSeverity(new Date(Date.UTC(2026, 6, 28, 12, 0, 0)), now),
    ).toBe("overdue");
    expect(
      computeDeadlineSeverity(new Date(Date.UTC(2026, 6, 30, 12, 0, 0)), now),
    ).toBe("critical");
    expect(
      computeDeadlineSeverity(new Date(Date.UTC(2026, 7, 2, 12, 0, 0)), now),
    ).toBe("warning");
    expect(
      computeDeadlineSeverity(new Date(Date.UTC(2026, 7, 10, 12, 0, 0)), now),
    ).toBe("safe");
  });
});

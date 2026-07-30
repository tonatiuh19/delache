import { describe, expect, it } from "vitest";
import { addBusinessDays, computeDeadlineSeverity } from "./businessDays";

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

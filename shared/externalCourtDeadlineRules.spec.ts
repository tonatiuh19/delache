import { describe, expect, it } from "vitest";
import {
  externalCourtDeadlineSeverity,
  hasExternalCourtClock,
  parseExternalCourtDeadlineAt,
} from "./externalCourtDeadlineRules";

describe("externalCourtDeadlineRules", () => {
  it("treats null/empty as no external clock", () => {
    expect(hasExternalCourtClock(null)).toBe(false);
    expect(hasExternalCourtClock("")).toBe(false);
    expect(hasExternalCourtClock("  ")).toBe(false);
    expect(hasExternalCourtClock("2026-12-01T12:00:00.000Z")).toBe(true);
  });

  it("parses ISO dates and clear sentinels", () => {
    expect(parseExternalCourtDeadlineAt(null)).toEqual({
      ok: true,
      value: null,
    });
    expect(parseExternalCourtDeadlineAt("")).toEqual({
      ok: true,
      value: null,
    });
    const ok = parseExternalCourtDeadlineAt("2026-11-15T18:00:00.000Z");
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.value).toBe("2026-11-15T18:00:00.000Z");
    expect(parseExternalCourtDeadlineAt("not-a-date").ok).toBe(false);
  });

  it("computes severity bands", () => {
    const now = Date.parse("2026-10-06T12:00:00.000Z");
    expect(
      externalCourtDeadlineSeverity({
        externalCourtDeadlineAt: null,
        nowMs: now,
      }),
    ).toBe("none");
    expect(
      externalCourtDeadlineSeverity({
        externalCourtDeadlineAt: "2026-10-20T12:00:00.000Z",
        nowMs: now,
      }),
    ).toBe("safe");
    expect(
      externalCourtDeadlineSeverity({
        externalCourtDeadlineAt: "2026-10-08T12:00:00.000Z",
        nowMs: now,
      }),
    ).toBe("warning");
    expect(
      externalCourtDeadlineSeverity({
        externalCourtDeadlineAt: "2026-10-06T18:00:00.000Z",
        nowMs: now,
      }),
    ).toBe("critical");
    expect(
      externalCourtDeadlineSeverity({
        externalCourtDeadlineAt: "2026-10-05T12:00:00.000Z",
        nowMs: now,
      }),
    ).toBe("overdue");
  });
});

import { describe, expect, it } from "vitest";
import {
  isValidCaseNumberFormat,
  renderCaseNumber,
} from "@shared/caseNumber";

describe("caseNumber", () => {
  it("requires a SEQ token and safe charset", () => {
    expect(isValidCaseNumberFormat("DEL-{YYYY}-{SEQ:4}")).toBe(true);
    expect(isValidCaseNumberFormat("EXP-{SEQ:6}")).toBe(true);
    expect(isValidCaseNumberFormat("NO-SEQ-HERE")).toBe(false);
    expect(isValidCaseNumberFormat("BAD/{YYYY}")).toBe(false);
    expect(isValidCaseNumberFormat("")).toBe(false);
  });

  it("renders year and padded sequence", () => {
    const fixed = new Date(Date.UTC(2026, 6, 29));
    expect(renderCaseNumber("DEL-{YYYY}-{SEQ:4}", 1, fixed)).toBe(
      "DEL-2026-0001",
    );
    expect(renderCaseNumber("EXP-{YY}-{MM}-{SEQ:3}", 42, fixed)).toBe(
      "EXP-26-07-042",
    );
  });
});

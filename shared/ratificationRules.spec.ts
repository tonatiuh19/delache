import { describe, expect, it } from "vitest";
import {
  ratificationGateMissingCode,
  ratificationGateSatisfied,
  ratificationScheduled,
} from "./ratificationRules";

describe("ratificationRules", () => {
  it("accepts uploaded ratification PDF", () => {
    expect(
      ratificationGateSatisfied({
        ratificationPresent: true,
        courtFilingPresent: true,
        ratificationScheduledAt: null,
      }),
    ).toBe(true);
  });

  it("does not accept schedule alone (Miro PDF is required)", () => {
    expect(
      ratificationGateSatisfied({
        ratificationPresent: false,
        courtFilingPresent: true,
        ratificationScheduledAt: "2026-12-01T10:00:00.000Z",
      }),
    ).toBe(false);
    expect(
      ratificationGateMissingCode({
        ratificationPresent: false,
        courtFilingPresent: true,
        ratificationScheduledAt: "2026-12-01T10:00:00.000Z",
      }),
    ).toBe("doc:ratification");
  });

  it("requires ratification PDF when court filing exists", () => {
    expect(
      ratificationGateMissingCode({
        ratificationPresent: false,
        courtFilingPresent: true,
        ratificationScheduledAt: null,
      }),
    ).toBe("doc:ratification");
  });

  it("detects scheduled timestamps", () => {
    expect(ratificationScheduled("2026-01-01")).toBe(true);
    expect(ratificationScheduled("")).toBe(false);
  });
});

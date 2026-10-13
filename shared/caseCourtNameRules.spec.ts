import { describe, expect, it } from "vitest";
import { resolveCaseCourtName } from "./caseCourtNameRules";

describe("resolveCaseCourtName", () => {
  it("prefers explicit court name", () => {
    expect(
      resolveCaseCourtName({
        provided: "  Juzgado 1  ",
        firmDefaultCourtName: "Juzgado Default",
      }),
    ).toBe("Juzgado 1");
  });

  it("falls back to firm default when provided empty", () => {
    expect(
      resolveCaseCourtName({
        provided: "   ",
        firmDefaultCourtName: " Juzgado Default ",
      }),
    ).toBe("Juzgado Default");
  });

  it("returns null when both missing", () => {
    expect(resolveCaseCourtName({})).toBeNull();
    expect(
      resolveCaseCourtName({ provided: null, firmDefaultCourtName: "" }),
    ).toBeNull();
  });
});

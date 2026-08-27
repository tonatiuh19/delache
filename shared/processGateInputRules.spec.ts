import { describe, expect, it } from "vitest";
import {
  buildProcessGateInputFromSource,
  hasPropertyGpsFromCoords,
} from "./processGateInputRules";
import { evaluateProcessGates } from "./processGates";

describe("processGateInputRules", () => {
  it("rejects empty GPS strings like detail load", () => {
    expect(hasPropertyGpsFromCoords("", "")).toBe(false);
    expect(hasPropertyGpsFromCoords("19.4", "-99.1")).toBe(true);
  });

  it("merges evidence categories into gate input", () => {
    const input = buildProcessGateInputFromSource({
      documentCategories: [],
      evidenceCategories: ["horizontal_distance"],
      measurementTypes: ["pole_distance"],
      hasPrimaryExpert: true,
      inspectionComplete: true,
      logisticsReady: true,
      invoices: [],
    });
    expect(input.evidenceCategories).toContain("horizontal_distance");
    expect(input.evidenceCategories).toContain("pole_distance");
  });

  it("blocks P8 when batch-style input omits evidence", () => {
    const input = buildProcessGateInputFromSource({
      documentCategories: [],
      hasPrimaryExpert: true,
      inspectionComplete: true,
      logisticsReady: true,
      invoices: [],
    });
    const gates = evaluateProcessGates(8, input);
    expect(gates.ok).toBe(false);
    expect(gates.missing.some((m) => m.startsWith("evidence:"))).toBe(true);
  });
});

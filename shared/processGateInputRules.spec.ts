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

  it("blocks P7 when batch-style input omits evidence", () => {
    const input = buildProcessGateInputFromSource({
      documentCategories: [],
      hasPrimaryExpert: true,
      inspectionComplete: true,
      logisticsReady: true,
      invoices: [],
    });
    const gates = evaluateProcessGates(7, input);
    expect(gates.ok).toBe(false);
    expect(gates.missing.some((m) => m.startsWith("evidence:"))).toBe(true);
  });

  it("passes handoff and ratification fields into gate input", () => {
    const input = buildProcessGateInputFromSource({
      documentCategories: ["technical_report", "court_filing", "ratification"],
      hasPrimaryExpert: true,
      inspectionComplete: true,
      logisticsReady: true,
      invoices: [],
      documentsHandoffConfirmedAt: "2026-01-01T00:00:00.000Z",
      ratificationScheduledAt: "2026-06-01T10:00:00.000Z",
    });
    expect(input.documentsHandoffConfirmed).toBe(true);
    expect(input.ratificationScheduledAt).toBe("2026-06-01T10:00:00.000Z");
    expect(
      evaluateProcessGates(9, {
        ...input,
        reportStatus: "approved",
        ratificationPresent: true,
        courtFilingPresent: true,
      }).ok,
    ).toBe(true);
    expect(
      evaluateProcessGates(9, {
        ...input,
        documentCategories: ["technical_report", "court_filing"],
        reportStatus: "approved",
        ratificationPresent: false,
        courtFilingPresent: true,
      }).ok,
    ).toBe(false);
  });
});

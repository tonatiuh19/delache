import { describe, expect, it } from "vitest";
import {
  canTransition,
  CASE_STATUS_FLOW,
  getAllowedNextStatuses,
  isTerminalStatus,
} from "@shared/caseWorkflow";

describe("caseWorkflow", () => {
  it("defines the full forward flow ending in completed", () => {
    expect(CASE_STATUS_FLOW[0]).toBe("intake");
    expect(CASE_STATUS_FLOW[CASE_STATUS_FLOW.length - 1]).toBe("completed");
  });

  it("allows next phase, hold, and cancel from intake", () => {
    expect(getAllowedNextStatuses("intake")).toEqual([
      "assignment",
      "on_hold",
      "cancelled",
    ]);
  });

  it("blocks transitions from terminal statuses", () => {
    expect(isTerminalStatus("completed")).toBe(true);
    expect(getAllowedNextStatuses("cancelled")).toEqual([]);
    expect(canTransition("completed", "accounting").ok).toBe(false);
  });

  it("allows resume from on_hold", () => {
    const allowed = getAllowedNextStatuses("on_hold");
    expect(allowed).toContain("inspection");
    expect(allowed).toContain("cancelled");
    expect(allowed).not.toContain("completed");
  });

  it("rejects skipping ahead", () => {
    const r = canTransition("intake", "inspection");
    expect(r.ok).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { canTransitionInspection } from "./inspectionStatusRules";

describe("canTransitionInspection", () => {
  it("allows scheduled → in_progress → completed and scheduled → completed", () => {
    expect(canTransitionInspection("scheduled", "in_progress").ok).toBe(true);
    expect(canTransitionInspection("in_progress", "completed").ok).toBe(true);
    expect(canTransitionInspection("scheduled", "completed").ok).toBe(true);
  });

  it("allows cancel from scheduled or in_progress only", () => {
    expect(canTransitionInspection("scheduled", "cancelled").ok).toBe(true);
    expect(canTransitionInspection("in_progress", "cancelled").ok).toBe(true);
    expect(canTransitionInspection("completed", "cancelled").ok).toBe(false);
  });

  it("blocks completed → scheduled and invalid targets", () => {
    expect(canTransitionInspection("completed", "scheduled").ok).toBe(false);
    expect(canTransitionInspection("scheduled", "nope").ok).toBe(false);
  });
});

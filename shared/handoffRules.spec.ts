import { describe, expect, it } from "vitest";
import {
  canConfirmDocumentsHandoff,
  documentsHandoffConfirmed,
  handoffPendingAudience,
  missingRecommendedAssignmentRoles,
} from "./handoffRules";

describe("handoffRules", () => {
  it("only admin can confirm handoff", () => {
    expect(canConfirmDocumentsHandoff("admin")).toBe(true);
    expect(canConfirmDocumentsHandoff("expert")).toBe(false);
    expect(canConfirmDocumentsHandoff("legal")).toBe(false);
  });

  it("classifies handoff pending audience for role-specific copy", () => {
    expect(handoffPendingAudience("admin")).toBe("coordinator");
    expect(handoffPendingAudience("expert")).toBe("expert");
    expect(handoffPendingAudience("legal")).toBe("observer");
  });

  it("detects handoff confirmation timestamp", () => {
    expect(documentsHandoffConfirmed(null)).toBe(false);
    expect(documentsHandoffConfirmed("2026-01-01T00:00:00.000Z")).toBe(true);
  });

  it("lists missing recommended roles", () => {
    expect(
      missingRecommendedAssignmentRoles([{ assignmentRole: "expert" }]),
    ).toContain("coordinator");
    expect(
      missingRecommendedAssignmentRoles([
        { assignmentRole: "expert" },
        { assignmentRole: "coordinator" },
        { assignmentRole: "qa" },
        { assignmentRole: "legal_reviewer" },
        { assignmentRole: "logistics" },
        { assignmentRole: "accountant" },
      ]),
    ).toEqual([]);
  });
});

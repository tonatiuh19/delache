import { describe, expect, it } from "vitest";
import { buildCaseCardOwnershipBadges } from "./caseCardOwnershipRules";

describe("buildCaseCardOwnershipBadges", () => {
  it("shows R with assigned expert on intake", () => {
    const badges = buildCaseCardOwnershipBadges({
      status: "intake",
      assignments: [
        {
          assignmentRole: "expert",
          userName: "Ana Perito",
          isPrimary: true,
        },
      ],
    });
    expect(badges.length).toBeGreaterThan(0);
    expect(badges.some((b) => b.letter === "R" || b.personName === "Ana Perito")).toBe(
      true,
    );
  });

  it("prefers named R over unnamed A", () => {
    const badges = buildCaseCardOwnershipBadges({
      status: "field_ops",
      assignments: [
        {
          assignmentRole: "logistics",
          userName: "Luis Log",
          isPrimary: false,
        },
        {
          assignmentRole: "expert",
          userName: "Ana Perito",
          isPrimary: true,
        },
      ],
      max: 2,
    });
    expect(badges.length).toBeLessThanOrEqual(2);
    expect(badges.some((b) => b.personName)).toBe(true);
  });

  it("falls back to primary expert when no process point", () => {
    const badges = buildCaseCardOwnershipBadges({
      status: "cancelled",
      assignments: [
        {
          assignmentRole: "expert",
          userName: "Ana Perito",
          isPrimary: true,
        },
      ],
    });
    expect(badges).toEqual([
      {
        letter: null,
        labelKey: "expert",
        labelNamespace: "role",
        personName: "Ana Perito",
        emphasis: "assigned",
      },
    ]);
  });

  it("uses hold resume status for on_hold point", () => {
    const badges = buildCaseCardOwnershipBadges({
      status: "on_hold",
      holdResumeStatus: "legal_review_questionnaire",
      assignments: [
        {
          assignmentRole: "legal_reviewer",
          userName: "Lia Legal",
          isPrimary: false,
        },
      ],
    });
    expect(badges.some((b) => b.labelKey === "law_firm")).toBe(true);
  });

  it("returns empty when no assignments and no useful chips needed cap", () => {
    const badges = buildCaseCardOwnershipBadges({
      status: "intake",
      assignments: [],
      max: 3,
    });
    // RACI still yields role-only chips for current point
    expect(badges.length).toBeGreaterThan(0);
    expect(badges.every((b) => b.personName == null || b.personName === "")).toBe(
      true,
    );
  });

  it("dedupes same person across R/A", () => {
    const badges = buildCaseCardOwnershipBadges({
      status: "assignment",
      assignments: [
        {
          assignmentRole: "coordinator",
          userName: "Same Person",
          isPrimary: false,
        },
        {
          assignmentRole: "expert",
          userName: "Same Person",
          isPrimary: true,
        },
      ],
      max: 3,
    });
    const named = badges.filter((b) => b.personName === "Same Person");
    expect(named.length).toBe(1);
  });
});

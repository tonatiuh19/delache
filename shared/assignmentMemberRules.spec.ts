import { describe, expect, it } from "vitest";
import {
  assignmentRoleSelectGroups,
  assignmentRoleTier,
  filterMembersForAssignmentRole,
  isMemberEligibleForAssignment,
  shouldForcePrimaryAssignment,
  staffRolesForAssignmentRole,
} from "./assignmentMemberRules";

const members = [
  { id: 1, role: "expert", status: "active" },
  { id: 2, role: "legal", status: "active" },
  { id: 3, role: "logistics", status: "active" },
  { id: 4, role: "accountant", status: "active" },
  { id: 5, role: "admin", status: "active" },
  { id: 6, role: "expert", status: "inactive" },
  { id: 7, role: "expert", status: "invited" },
] as const;

describe("staffRolesForAssignmentRole", () => {
  it("maps 1:1 ops roles", () => {
    expect(staffRolesForAssignmentRole("expert")).toEqual(["expert"]);
    expect(staffRolesForAssignmentRole("legal_reviewer")).toEqual(["legal"]);
    expect(staffRolesForAssignmentRole("logistics")).toEqual(["logistics"]);
    expect(staffRolesForAssignmentRole("accountant")).toEqual(["accountant"]);
  });

  it("maps coordinator to admin and qa/tech director to admin+expert", () => {
    expect(staffRolesForAssignmentRole("coordinator")).toEqual(["admin"]);
    expect(staffRolesForAssignmentRole("qa")).toEqual(["admin", "expert"]);
    expect(staffRolesForAssignmentRole("technical_director")).toEqual([
      "admin",
      "expert",
    ]);
  });

  it("allows any staff for observer", () => {
    expect(staffRolesForAssignmentRole("observer")).toEqual([
      "admin",
      "expert",
      "legal",
      "logistics",
      "accountant",
    ]);
  });
});

describe("P2 role tiers", () => {
  it("marks expert required and team roles recommended", () => {
    expect(assignmentRoleTier("expert")).toBe("required");
    expect(assignmentRoleTier("logistics")).toBe("recommended");
    expect(assignmentRoleTier("observer")).toBe("optional");
  });

  it("groups select options Miro-aligned", () => {
    const groups = assignmentRoleSelectGroups();
    expect(groups[0]).toEqual({ tier: "required", roles: ["expert"] });
    expect(groups[1]?.roles).toContain("coordinator");
    expect(groups[2]?.roles).toEqual(["technical_director", "observer"]);
  });

  it("forces primary when assigning expert", () => {
    expect(shouldForcePrimaryAssignment("expert")).toBe(true);
    expect(shouldForcePrimaryAssignment("logistics")).toBe(false);
  });
});

describe("filterMembersForAssignmentRole", () => {
  it("filters experts including invited, excludes inactive", () => {
    expect(
      filterMembersForAssignmentRole(members, "expert").map((m) => m.id),
    ).toEqual([1, 7]);
  });

  it("filters legal_reviewer to legal staff", () => {
    expect(
      filterMembersForAssignmentRole(members, "legal_reviewer").map((m) => m.id),
    ).toEqual([2]);
  });

  it("filters coordinator to admin", () => {
    expect(
      filterMembersForAssignmentRole(members, "coordinator").map((m) => m.id),
    ).toEqual([5]);
  });
});

describe("isMemberEligibleForAssignment", () => {
  it("validates selection against filtered set", () => {
    expect(
      isMemberEligibleForAssignment({
        members,
        userId: 1,
        assignmentRole: "expert",
      }),
    ).toBe(true);
    expect(
      isMemberEligibleForAssignment({
        members,
        userId: 2,
        assignmentRole: "expert",
      }),
    ).toBe(false);
    expect(
      isMemberEligibleForAssignment({
        members,
        userId: "",
        assignmentRole: "expert",
      }),
    ).toBe(false);
  });
});

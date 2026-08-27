import { describe, expect, it } from "vitest";
import {
  buildStaffCaseVisibilityFilter,
  canAccessStaffCase,
  canCreateStaffCase,
  canListAllStaffCases,
  staffRoleToAssignmentRoles,
} from "./caseVisibilityRules";

describe("caseVisibilityRules", () => {
  it("lets admin and coordinator list all cases", () => {
    expect(canListAllStaffCases("admin")).toBe(true);
    expect(canListAllStaffCases("case_coordinator")).toBe(true);
    expect(canListAllStaffCases("expert")).toBe(false);
    expect(canListAllStaffCases("legal")).toBe(false);
    expect(canListAllStaffCases("logistics")).toBe(false);
    expect(canListAllStaffCases("accountant")).toBe(false);
  });

  it("restricts staff case creation to admin and coordinator", () => {
    expect(canCreateStaffCase("admin")).toBe(true);
    expect(canCreateStaffCase("case_coordinator")).toBe(true);
    expect(canCreateStaffCase("expert")).toBe(false);
    expect(canCreateStaffCase("legal")).toBe(false);
  });

  it("maps staff roles to assignment roles", () => {
    expect(staffRoleToAssignmentRoles("expert")).toEqual(["expert"]);
    expect(staffRoleToAssignmentRoles("legal")).toEqual(["legal_reviewer"]);
    expect(staffRoleToAssignmentRoles("case_coordinator")).toEqual([
      "coordinator",
    ]);
    expect(staffRoleToAssignmentRoles("admin")).toEqual([]);
  });

  it("builds no SQL filter for org-wide roles", () => {
    expect(
      buildStaffCaseVisibilityFilter({ role: "admin", userId: 1 }).sql,
    ).toBe("");
    expect(
      buildStaffCaseVisibilityFilter({
        role: "case_coordinator",
        userId: 1,
      }).sql,
    ).toBe("");
  });

  it("scopes experts to assignment rows + assigned_expert_id", () => {
    const filter = buildStaffCaseVisibilityFilter({
      role: "expert",
      userId: 2060002,
      casesAlias: "c",
    });
    expect(filter.sql).toContain("case_assignments");
    expect(filter.sql).toContain("assigned_expert_id = ?");
    expect(filter.sql).toContain("assignment_role IN (?)");
    expect(filter.params).toEqual([2060002, "expert", 2060002]);
  });

  it("scopes legal to legal_reviewer assignments only", () => {
    const filter = buildStaffCaseVisibilityFilter({
      role: "legal",
      userId: 9,
    });
    expect(filter.sql).toContain("case_assignments");
    expect(filter.sql).not.toContain("assigned_expert_id");
    expect(filter.params).toEqual([9, "legal_reviewer"]);
  });

  it("denies unknown roles with 1=0", () => {
    const filter = buildStaffCaseVisibilityFilter({
      role: "unknown",
      userId: 1,
    });
    expect(filter.sql).toBe("1 = 0");
  });

  it("checks membership for assigned experts", () => {
    expect(
      canAccessStaffCase({
        role: "expert",
        userId: 10,
        assignedExpertId: 10,
        activeAssignmentRoles: [],
      }),
    ).toBe(true);
    expect(
      canAccessStaffCase({
        role: "expert",
        userId: 10,
        assignedExpertId: 99,
        activeAssignmentRoles: ["expert"],
      }),
    ).toBe(true);
    expect(
      canAccessStaffCase({
        role: "expert",
        userId: 10,
        assignedExpertId: 99,
        activeAssignmentRoles: [],
      }),
    ).toBe(false);
  });

  it("does not grant legal access via expert denorm column", () => {
    expect(
      canAccessStaffCase({
        role: "legal",
        userId: 10,
        assignedExpertId: 10,
        activeAssignmentRoles: [],
      }),
    ).toBe(false);
  });
});

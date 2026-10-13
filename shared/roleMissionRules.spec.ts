import { describe, expect, it } from "vitest";
import {
  caseRelevantToRoleMission,
  missionFocusForStatus,
  missionStepSlugForRole,
  roleMission,
  visibleProcessPointIdsForRole,
} from "./roleMissionRules";

describe("roleMissionRules", () => {
  it("returns mission defs for staff roles", () => {
    expect(roleMission("admin")?.focusKey).toBe("admin_overview");
    expect(roleMission("expert")?.primaryPoints).toContain(2);
    expect(roleMission("legal")?.listHref).toBe("/portal/reviews");
    expect(roleMission("logistics")?.focusKey).toBe("field_ops");
    expect(roleMission("accountant")?.primaryPoints).toEqual([10]);
    expect(roleMission("unknown")).toBeNull();
  });

  it("maps case status to mission focus", () => {
    expect(missionFocusForStatus("field_ops")).toBe("field_ops");
    expect(missionFocusForStatus("validation_delivery")).toBe(
      "firm_validation",
    );
    expect(missionFocusForStatus("accounting")).toBe("billing");
    expect(missionFocusForStatus("on_hold")).toBe("admin_overview");
  });

  it("resolves a preferred step slug per role", () => {
    expect(missionStepSlugForRole("legal")).toBe(
      "legal_review_questionnaire",
    );
    expect(missionStepSlugForRole("logistics")).toBe("field_ops");
  });

  it("filters action queue by role mission points", () => {
    expect(
      caseRelevantToRoleMission({ role: "legal", processPoint: 4 }),
    ).toBe(true);
    expect(
      caseRelevantToRoleMission({ role: "legal", processPoint: 7 }),
    ).toBe(false);
    expect(
      caseRelevantToRoleMission({ role: "admin", processPoint: 7 }),
    ).toBe(true);
    expect(
      caseRelevantToRoleMission({
        role: "logistics",
        status: "field_ops",
      }),
    ).toBe(true);
    expect(
      caseRelevantToRoleMission({ role: "expert", processPoint: 2 }),
    ).toBe(true);
  });

  it("gates step-tree points to Miro mission + soft parallel + current", () => {
    expect(
      visibleProcessPointIdsForRole({ role: "admin", currentPoint: 2 }),
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    expect(
      visibleProcessPointIdsForRole({
        role: "expert",
        status: "assignment",
      }),
    ).toEqual([2, 3, 6, 7, 8, 9]);

    expect(
      visibleProcessPointIdsForRole({
        role: "legal",
        status: "legal_review_questionnaire",
      }),
    ).toEqual([2, 4]);

    expect(
      visibleProcessPointIdsForRole({
        role: "logistics",
        status: "assignment",
      }),
    ).toEqual([3, 7]);

    expect(
      visibleProcessPointIdsForRole({
        role: "accountant",
        status: "accounting",
      }),
    ).toEqual([10]);
  });
});

import { describe, expect, it } from "vitest";
import {
  canManageAdmin,
  canManageFinance,
  isLawFirmRole,
  isStaffRole,
} from "./rbac";

describe("rbac", () => {
  it("classifies staff vs law firm", () => {
    expect(isStaffRole("admin")).toBe(true);
    expect(isStaffRole("expert")).toBe(true);
    expect(isStaffRole("law_firm_user")).toBe(false);
    expect(isLawFirmRole("law_firm_user")).toBe(true);
  });

  it("gates finance and admin capabilities", () => {
    expect(canManageFinance("accountant")).toBe(true);
    expect(canManageFinance("expert")).toBe(false);
    expect(canManageAdmin("admin")).toBe(true);
    expect(canManageAdmin("case_coordinator")).toBe(false);
  });
});

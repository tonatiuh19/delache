import { describe, expect, it } from "vitest";
import {
  emailAssignmentRoleLabel,
  emailStaffRoleLabel,
} from "./emailLabels";

describe("emailLabels", () => {
  it("localizes staff roles for Spanish invites", () => {
    expect(emailStaffRoleLabel("expert", "es")).toBe("Perito");
    expect(emailStaffRoleLabel("case_coordinator", "es")).toBe("Coordinador");
    expect(emailStaffRoleLabel("logistics", "es")).toBe("Logística");
  });

  it("localizes staff roles for English invites", () => {
    expect(emailStaffRoleLabel("expert", "en")).toBe("Expert");
    expect(emailStaffRoleLabel("case_coordinator", "en")).toBe("Coordinator");
  });

  it("localizes assignment roles", () => {
    expect(emailAssignmentRoleLabel("legal_reviewer", "es")).toBe(
      "Revisor legal",
    );
    expect(emailAssignmentRoleLabel("technical_director", "en")).toBe(
      "Technical director",
    );
  });

  it("falls back to the raw key for unknown roles", () => {
    expect(emailStaffRoleLabel("custom_role", "es")).toBe("custom_role");
  });

  it("is case-insensitive on role keys", () => {
    expect(emailStaffRoleLabel("Expert", "es")).toBe("Perito");
  });
});

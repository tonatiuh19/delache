import { describe, expect, it } from "vitest";
import {
  canChangeOwnAccountStatus,
  canRemoveMember,
  canRequestLoginOtp,
  isInviteRole,
  isMutableMemberStatus,
  isStaffEditRole,
  resolveTeamMemberUpdate,
  shouldRevokeSessionsOnStatus,
  validateTeamInvite,
  type TeamMemberSnapshot,
} from "./teamMemberRules";

const member = (
  overrides: Partial<TeamMemberSnapshot> = {},
): TeamMemberSnapshot => ({
  id: 10,
  firstName: "Alex",
  lastName: "Admin",
  role: "admin",
  status: "active",
  phone: null,
  ...overrides,
});

describe("role / status classifiers", () => {
  it("accepts staff edit roles and rejects law_firm_user for edits", () => {
    expect(isStaffEditRole("expert")).toBe(true);
    expect(isStaffEditRole("law_firm_user")).toBe(false);
    expect(isInviteRole("law_firm_user")).toBe(true);
    expect(isInviteRole("hacker")).toBe(false);
  });

  it("only allows mutable statuses used by the product UI", () => {
    expect(isMutableMemberStatus("active")).toBe(true);
    expect(isMutableMemberStatus("inactive")).toBe(true);
    expect(isMutableMemberStatus("invited")).toBe(true);
    expect(isMutableMemberStatus("suspended")).toBe(false);
  });
});

describe("login + session revoke rules", () => {
  it("allows OTP for active and invited only", () => {
    expect(canRequestLoginOtp("active")).toBe(true);
    expect(canRequestLoginOtp("invited")).toBe(true);
    expect(canRequestLoginOtp("inactive")).toBe(false);
    expect(canRequestLoginOtp("suspended")).toBe(false);
  });

  it("revokes sessions when deactivated or legacy-suspended", () => {
    expect(shouldRevokeSessionsOnStatus("inactive")).toBe(true);
    expect(shouldRevokeSessionsOnStatus("suspended")).toBe(true);
    expect(shouldRevokeSessionsOnStatus("active")).toBe(false);
    expect(shouldRevokeSessionsOnStatus("invited")).toBe(false);
  });
});

describe("self-protection", () => {
  it("blocks changing your own status but allows no-op same status", () => {
    expect(canChangeOwnAccountStatus(5, 5, "active", "inactive")).toBe(false);
    expect(canChangeOwnAccountStatus(5, 5, "active", "active")).toBe(true);
    expect(canChangeOwnAccountStatus(5, 9, "active", "inactive")).toBe(true);
  });

  it("blocks removing yourself", () => {
    expect(canRemoveMember(5, 5)).toBe(false);
    expect(canRemoveMember(5, 9)).toBe(true);
  });
});

describe("resolveTeamMemberUpdate", () => {
  it("updates name and role for another member", () => {
    const result = resolveTeamMemberUpdate(1, member(), {
      firstName: "  Sam  ",
      lastName: " Expert ",
      role: "expert",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.next.firstName).toBe("Sam");
      expect(result.next.lastName).toBe("Expert");
      expect(result.next.role).toBe("expert");
      expect(result.statusChanged).toBe(false);
      expect(result.revokeSessions).toBe(false);
    }
  });

  it("deactivates another member and flags session revoke", () => {
    const result = resolveTeamMemberUpdate(1, member({ id: 10 }), {
      status: "inactive",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.next.status).toBe("inactive");
      expect(result.revokeSessions).toBe(true);
      expect(result.statusChanged).toBe(true);
    }
  });

  it("reactivates an inactive member without revoking sessions", () => {
    const result = resolveTeamMemberUpdate(
      1,
      member({ id: 10, status: "inactive" }),
      { status: "active" },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.next.status).toBe("active");
      expect(result.revokeSessions).toBe(false);
    }
  });

  it("blocks self-deactivation", () => {
    const result = resolveTeamMemberUpdate(10, member({ id: 10 }), {
      status: "inactive",
    });
    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        code: "self_status_change",
      }),
    );
  });

  it("allows editing own name/role without status change", () => {
    const result = resolveTeamMemberUpdate(10, member({ id: 10 }), {
      firstName: "Alexa",
      role: "admin",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.next.firstName).toBe("Alexa");
      expect(result.next.status).toBe("active");
    }
  });

  it("rejects blank names after trim", () => {
    const result = resolveTeamMemberUpdate(1, member(), {
      firstName: "   ",
      lastName: "Ok",
    });
    expect(result).toEqual(
      expect.objectContaining({ ok: false, code: "invalid_name" }),
    );
  });

  it("rejects law_firm_user as an editable staff role", () => {
    const result = resolveTeamMemberUpdate(1, member(), {
      role: "law_firm_user" as never,
    });
    expect(result).toEqual(
      expect.objectContaining({ ok: false, code: "invalid_role" }),
    );
  });

  it("rejects suspended status (removed from product actions)", () => {
    const result = resolveTeamMemberUpdate(1, member(), {
      status: "suspended",
    });
    expect(result).toEqual(
      expect.objectContaining({ ok: false, code: "invalid_status" }),
    );
  });

  it("normalizes empty phone to null when patched", () => {
    const result = resolveTeamMemberUpdate(
      1,
      member({ phone: "555" }),
      { phone: "  " },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.next.phone).toBeNull();
      expect(result.next.phoneChanged).toBe(true);
    }
  });

  it("leaves phone unchanged when patch omits phone", () => {
    const result = resolveTeamMemberUpdate(
      1,
      member({ phone: "555" }),
      { firstName: "Alex" },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.next.phone).toBe("555");
      expect(result.next.phoneChanged).toBe(false);
    }
  });
});

describe("validateTeamInvite", () => {
  it("accepts a staff invite", () => {
    const result = validateTeamInvite({
      email: "  Expert@Delache.mx ",
      firstName: "  Ana ",
      lastName: "Pérez",
      role: "expert",
    });
    expect(result).toEqual({
      ok: true,
      email: "expert@delache.mx",
      firstName: "Ana",
      lastName: "Pérez",
      role: "expert",
      lawFirmId: null,
    });
  });

  it("requires lawFirmId for law firm invites", () => {
    expect(
      validateTeamInvite({
        email: "a@b.com",
        firstName: "A",
        lastName: "B",
        role: "law_firm_user",
      }),
    ).toEqual(
      expect.objectContaining({ ok: false, code: "law_firm_required" }),
    );

    expect(
      validateTeamInvite({
        email: "a@b.com",
        firstName: "A",
        lastName: "B",
        role: "law_firm_user",
        lawFirmId: 3,
      }),
    ).toEqual(
      expect.objectContaining({
        ok: true,
        role: "law_firm_user",
        lawFirmId: 3,
      }),
    );
  });

  it("rejects incomplete invite payloads", () => {
    expect(
      validateTeamInvite({
        email: "",
        firstName: "A",
        lastName: "B",
        role: "expert",
      }).ok,
    ).toBe(false);
    expect(
      validateTeamInvite({
        email: "a@b.com",
        firstName: "A",
        lastName: "B",
        role: "unknown",
      }).ok,
    ).toBe(false);
  });
});

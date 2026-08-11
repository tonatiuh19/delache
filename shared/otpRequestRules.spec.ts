import { describe, expect, it } from "vitest";
import { resolveOtpRequestEligibility } from "./otpRequestRules";

describe("resolveOtpRequestEligibility", () => {
  it("rejects missing or deleted accounts", () => {
    expect(resolveOtpRequestEligibility({ found: false }).ok).toBe(false);
    const deleted = resolveOtpRequestEligibility({
      found: true,
      deleted: true,
      status: "active",
    });
    expect(deleted.ok).toBe(false);
    if (deleted.ok === false) expect(deleted.code).toBe("account_not_found");
  });

  it("rejects inactive/suspended accounts", () => {
    const inactive = resolveOtpRequestEligibility({
      found: true,
      status: "inactive",
    });
    expect(inactive.ok).toBe(false);
    if (inactive.ok === false) expect(inactive.code).toBe("account_inactive");
  });

  it("rejects staff when role is not allowed", () => {
    const denied = resolveOtpRequestEligibility({
      found: true,
      status: "active",
      roleAllowed: false,
    });
    expect(denied.ok).toBe(false);
    if (denied.ok === false) expect(denied.code).toBe("login_not_allowed");
  });

  it("allows active/invited accounts", () => {
    expect(
      resolveOtpRequestEligibility({
        found: true,
        status: "active",
        roleAllowed: true,
      }).ok,
    ).toBe(true);
    expect(
      resolveOtpRequestEligibility({
        found: true,
        status: "invited",
      }).ok,
    ).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  LEGACY_CLIENT_LOGIN_PATH,
  LEGACY_STAFF_LOGIN_PATH,
  nextOtpActorAfterRequestFailure,
  parseOtpPending,
  serializeOtpPending,
  shouldTryLawFirmAfterStaffOtpFailure,
  UNIFIED_LOGIN_PATH,
} from "./unifiedLoginRules";
import { resolveLoginEmailDualActor } from "./lawFirmMemberRules";
import { loginPathForActor } from "./authActors";

describe("unifiedLoginRules", () => {
  it("falls through to law_firm only on staff account_not_found", () => {
    expect(shouldTryLawFirmAfterStaffOtpFailure("account_not_found")).toBe(
      true,
    );
    expect(shouldTryLawFirmAfterStaffOtpFailure("account_inactive")).toBe(
      false,
    );
    expect(shouldTryLawFirmAfterStaffOtpFailure("login_not_allowed")).toBe(
      false,
    );
    expect(shouldTryLawFirmAfterStaffOtpFailure("rate_limited")).toBe(false);
    expect(shouldTryLawFirmAfterStaffOtpFailure(null)).toBe(false);
  });

  it("returns next actor only for staff → law_firm fallthrough", () => {
    expect(
      nextOtpActorAfterRequestFailure({
        attempted: "staff",
        code: "account_not_found",
      }),
    ).toBe("law_firm");
    expect(
      nextOtpActorAfterRequestFailure({
        attempted: "staff",
        code: "account_inactive",
      }),
    ).toBeNull();
    expect(
      nextOtpActorAfterRequestFailure({
        attempted: "law_firm",
        code: "account_not_found",
      }),
    ).toBeNull();
  });

  it("blocks login when the same email is alive in both tables", () => {
    expect(
      resolveLoginEmailDualActor({
        staffAlive: true,
        lawFirmAlive: true,
      }).ok,
    ).toBe(false);
    expect(
      resolveLoginEmailDualActor({
        staffAlive: true,
        lawFirmAlive: false,
      }).ok,
    ).toBe(true);
  });

  it("round-trips pending OTP session payload", () => {
    const raw = serializeOtpPending({
      email: "firm@example.com",
      actor: "law_firm",
    });
    expect(parseOtpPending(raw)).toEqual({
      email: "firm@example.com",
      actor: "law_firm",
    });
    expect(parseOtpPending("not-json")).toBeNull();
    expect(parseOtpPending('{"email":"x"}')).toBeNull();
  });

  it("exposes unified login path constants", () => {
    expect(UNIFIED_LOGIN_PATH).toBe("/login");
    expect(LEGACY_STAFF_LOGIN_PATH).toBe("/portal/login");
    expect(LEGACY_CLIENT_LOGIN_PATH).toBe("/client/login");
  });
});

describe("authActors loginPathForActor", () => {
  it("routes both actors to unified /login", () => {
    expect(loginPathForActor("staff")).toBe("/login");
    expect(loginPathForActor("law_firm")).toBe("/login");
  });
});

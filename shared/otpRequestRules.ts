/**
 * Auth OTP request eligibility — decide whether to send a code or return an error.
 */

import type { UserStatus } from "./api";
import { canRequestLoginOtp } from "./teamMemberRules";

export type OtpRequestDenyCode =
  | "account_not_found"
  | "account_inactive"
  | "login_not_allowed";

export type OtpRequestEligibility =
  | { ok: true }
  | { ok: false; code: OtpRequestDenyCode; error: string };

const MESSAGES: Record<OtpRequestDenyCode, string> = {
  account_not_found: "No account found for this email",
  account_inactive: "This account is not active",
  login_not_allowed: "Login is not allowed for this account",
};

export function resolveOtpRequestEligibility(opts: {
  found: boolean;
  deleted?: boolean | null;
  status?: string | null;
  /** When set (staff), role must be allowed to log in. */
  roleAllowed?: boolean;
}): OtpRequestEligibility {
  if (!opts.found || opts.deleted) {
    return {
      ok: false,
      code: "account_not_found",
      error: MESSAGES.account_not_found,
    };
  }
  if (!canRequestLoginOtp((opts.status || "") as UserStatus)) {
    return {
      ok: false,
      code: "account_inactive",
      error: MESSAGES.account_inactive,
    };
  }
  if (opts.roleAllowed === false) {
    return {
      ok: false,
      code: "login_not_allowed",
      error: MESSAGES.login_not_allowed,
    };
  }
  return { ok: true };
}

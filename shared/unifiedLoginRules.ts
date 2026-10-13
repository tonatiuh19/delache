/**
 * Unified /login — resolve which auth actor to use for OTP.
 * Staff is tried first; law_firm only after account_not_found.
 *
 * Dual alive rows (staff + law_firm) are blocked at OTP request
 * (`email_actor_conflict`) — see `resolveLoginEmailDualActor`.
 */

import type { AuthActor } from "./authActors";

/** Error codes that mean “no staff account” — safe to try law_firm next. */
export const STAFF_OTP_FALLTHROUGH_CODES = [
  "account_not_found",
] as const;

export type StaffOtpFallthroughCode =
  (typeof STAFF_OTP_FALLTHROUGH_CODES)[number];

export function shouldTryLawFirmAfterStaffOtpFailure(
  code: string | null | undefined,
): boolean {
  return (
    !!code &&
    (STAFF_OTP_FALLTHROUGH_CODES as readonly string[]).includes(code)
  );
}

/**
 * After a failed OTP request for `attempted`, return the next actor to try,
 * or null to stop and surface the error.
 */
export function nextOtpActorAfterRequestFailure(opts: {
  attempted: AuthActor;
  code: string | null | undefined;
}): AuthActor | null {
  if (
    opts.attempted === "staff" &&
    shouldTryLawFirmAfterStaffOtpFailure(opts.code)
  ) {
    return "law_firm";
  }
  return null;
}

/** Shared public login path for both actors. */
export const UNIFIED_LOGIN_PATH = "/login";

/** Legacy login paths — keep as redirects to UNIFIED_LOGIN_PATH. */
export const LEGACY_STAFF_LOGIN_PATH = "/portal/login";
export const LEGACY_CLIENT_LOGIN_PATH = "/client/login";

export const OTP_PENDING_STORAGE_KEY = "delache_otp_pending";

export type OtpPendingPayload = {
  email: string;
  actor: AuthActor;
};

export function serializeOtpPending(payload: OtpPendingPayload): string {
  return JSON.stringify(payload);
}

export function parseOtpPending(
  raw: string | null | undefined,
): OtpPendingPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<OtpPendingPayload>;
    if (
      typeof parsed.email === "string" &&
      parsed.email.trim() &&
      (parsed.actor === "staff" || parsed.actor === "law_firm")
    ) {
      return { email: parsed.email.trim(), actor: parsed.actor };
    }
  } catch {
    return null;
  }
  return null;
}

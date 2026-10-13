/**
 * Stable client-facing error codes. Map legacy English / snake_case API
 * strings so UI never renders raw technical text.
 */

export const USER_ERROR_CODES = [
  "UNKNOWN",
  "INTERNAL",
  "SYS_UNAVAILABLE",
  "AUTH_UNAUTHORIZED",
  "FETCH_FAILED",
  "UPLOAD_FAILED",
  "OTP_RATE_LIMITED",
  "OTP_ACCOUNT_NOT_FOUND",
  "OTP_EMAIL_ACTOR_CONFLICT",
  "OTP_EMAIL_SEND_FAILED",
  "TEAM_SELF_STATUS",
  "TEAM_LAW_FIRM_REQUIRED",
  "CASE_NOT_FOUND",
  "CASE_GATES_BLOCKED",
  "CASE_STATUS_INVALID",
  "CASE_FLAGS_INVALID",
  "REPORT_STATUS_INVALID",
] as const;

export type UserErrorCode = (typeof USER_ERROR_CODES)[number];

const USER_ERROR_CODE_SET = new Set<string>(USER_ERROR_CODES);

export const ERROR_ALIASES: Record<string, UserErrorCode> = {
  Unauthorized: "AUTH_UNAUTHORIZED",
  "JWT_SECRET not configured": "SYS_UNAVAILABLE",
  "Internal server error": "INTERNAL",
  "Process gates not satisfied": "CASE_GATES_BLOCKED",
  "Could not send verification email. Please try again.":
    "OTP_EMAIL_SEND_FAILED",
  account_not_found: "OTP_ACCOUNT_NOT_FOUND",
  email_actor_conflict: "OTP_EMAIL_ACTOR_CONFLICT",
  rate_limited: "OTP_RATE_LIMITED",
  self_status_change: "TEAM_SELF_STATUS",
  law_firm_required: "TEAM_LAW_FIRM_REQUIRED",
  flags_failed: "CASE_FLAGS_INVALID",
  fetch_failed: "FETCH_FAILED",
  upload_failed: "UPLOAD_FAILED",
  "Case not found": "CASE_NOT_FOUND",
};

function isUserErrorCode(value: unknown): value is UserErrorCode {
  return typeof value === "string" && USER_ERROR_CODE_SET.has(value);
}

export function resolveErrorCode(raw: unknown): UserErrorCode {
  if (typeof raw !== "string") return "UNKNOWN";
  const trimmed = raw.trim();
  if (!trimmed) return "UNKNOWN";
  if (isUserErrorCode(trimmed)) return trimmed;
  const aliased = ERROR_ALIASES[trimmed];
  if (aliased) return aliased;
  if (trimmed.startsWith("Cannot move from ")) return "CASE_STATUS_INVALID";
  if (trimmed.startsWith("Cannot move technical report from ")) {
    return "REPORT_STATUS_INVALID";
  }
  return "UNKNOWN";
}

export function rejectApiError(err: unknown, fallback: string): UserErrorCode {
  const data = (
    err as { response?: { data?: { code?: unknown; error?: unknown } } }
  )?.response?.data;
  if (isUserErrorCode(data?.code)) return data.code;
  const fromError = resolveErrorCode(data?.error);
  if (fromError !== "UNKNOWN") return fromError;
  return resolveErrorCode(fallback);
}

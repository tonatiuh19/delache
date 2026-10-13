/**
 * OTP request rate-limit rules (pure). API supplies storage + clock.
 */

export const OTP_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const OTP_RATE_LIMIT_MAX_ATTEMPTS = 5;
/** Separate IP spray limit (tighter window still uses same helper). */
export const OTP_IP_RATE_LIMIT_MAX_ATTEMPTS = 20;

/**
 * Vitest must not hit sticky DB rate buckets (shared TiDB IP keys → flaky 429).
 * Mirrors optimum-credit: tests never send real OTP email and must not block on
 * production-like rate limits. Callers still create OTP rows; sendEmail no-ops.
 */
export function shouldEnforceOtpRateLimits(
  vitestFlag: string | undefined,
): boolean {
  return vitestFlag !== "true";
}

export type OtpRateLimitBucket = {
  count: number;
  windowStartedAt: number;
};

export type OtpRateLimitResult =
  | { ok: true; remaining: number; resetAt: number }
  | {
      ok: false;
      code: "rate_limited";
      error: string;
      retryAfterSec: number;
      resetAt: number;
    };

export type OtpRateLimitScope = "email" | "ip";

export function buildOtpRateLimitKey(opts: {
  scope: OtpRateLimitScope;
  portal: "staff" | "client" | "unified";
  value: string;
}): string {
  const normalized = opts.value.trim().toLowerCase();
  return `${opts.scope}:${opts.portal}:${normalized}`;
}

export function resolveOtpRateLimit(
  bucket: OtpRateLimitBucket | null | undefined,
  nowMs: number,
  opts?: { windowMs?: number; maxAttempts?: number },
): OtpRateLimitResult & { nextBucket: OtpRateLimitBucket } {
  const windowMs = opts?.windowMs ?? OTP_RATE_LIMIT_WINDOW_MS;
  const maxAttempts = opts?.maxAttempts ?? OTP_RATE_LIMIT_MAX_ATTEMPTS;

  const fresh =
    !bucket || nowMs - bucket.windowStartedAt >= windowMs
      ? { count: 0, windowStartedAt: nowMs }
      : bucket;

  const resetAt = fresh.windowStartedAt + windowMs;
  if (fresh.count >= maxAttempts) {
    const retryAfterSec = Math.max(1, Math.ceil((resetAt - nowMs) / 1000));
    return {
      ok: false,
      code: "rate_limited",
      error: "Too many verification requests. Please try again later.",
      retryAfterSec,
      resetAt,
      nextBucket: fresh,
    };
  }

  const nextBucket = {
    count: fresh.count + 1,
    windowStartedAt: fresh.windowStartedAt,
  };
  return {
    ok: true,
    remaining: Math.max(0, maxAttempts - nextBucket.count),
    resetAt,
    nextBucket,
  };
}

/** Peek without incrementing — used to reject before charging email quota. */
export function peekOtpRateLimit(
  bucket: OtpRateLimitBucket | null | undefined,
  nowMs: number,
  opts?: { windowMs?: number; maxAttempts?: number },
): OtpRateLimitResult {
  const windowMs = opts?.windowMs ?? OTP_RATE_LIMIT_WINDOW_MS;
  const maxAttempts = opts?.maxAttempts ?? OTP_RATE_LIMIT_MAX_ATTEMPTS;
  const fresh =
    !bucket || nowMs - bucket.windowStartedAt >= windowMs
      ? { count: 0, windowStartedAt: nowMs }
      : bucket;
  const resetAt = fresh.windowStartedAt + windowMs;
  if (fresh.count >= maxAttempts) {
    return {
      ok: false,
      code: "rate_limited",
      error: "Too many verification requests. Please try again later.",
      retryAfterSec: Math.max(1, Math.ceil((resetAt - nowMs) / 1000)),
      resetAt,
    };
  }
  return {
    ok: true,
    remaining: Math.max(0, maxAttempts - fresh.count),
    resetAt,
  };
}

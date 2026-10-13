import { describe, expect, it } from "vitest";
import {
  OTP_RATE_LIMIT_MAX_ATTEMPTS,
  buildOtpRateLimitKey,
  peekOtpRateLimit,
  resolveOtpRateLimit,
  shouldEnforceOtpRateLimits,
} from "./otpRateLimitRules";

describe("shouldEnforceOtpRateLimits", () => {
  it("skips enforcement under VITEST (no real OTP email / no sticky 429)", () => {
    expect(shouldEnforceOtpRateLimits("true")).toBe(false);
    expect(shouldEnforceOtpRateLimits(undefined)).toBe(true);
    expect(shouldEnforceOtpRateLimits("")).toBe(true);
  });
});

describe("resolveOtpRateLimit", () => {
  const now = 1_000_000;

  it("allows first attempt and tracks remaining", () => {
    const r = resolveOtpRateLimit(null, now, { maxAttempts: 3, windowMs: 60_000 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.remaining).toBe(2);
    expect(r.nextBucket.count).toBe(1);
  });

  it("blocks when max attempts reached in window", () => {
    const bucket = { count: OTP_RATE_LIMIT_MAX_ATTEMPTS, windowStartedAt: now };
    const r = resolveOtpRateLimit(bucket, now + 1000);
    expect(r.ok).toBe(false);
    if (r.ok === false) {
      expect(r.code).toBe("rate_limited");
      expect(r.retryAfterSec).toBeGreaterThan(0);
    }
  });

  it("resets after window elapses", () => {
    const bucket = {
      count: OTP_RATE_LIMIT_MAX_ATTEMPTS,
      windowStartedAt: now,
    };
    const r = resolveOtpRateLimit(bucket, now + 16 * 60 * 1000, {
      windowMs: 15 * 60 * 1000,
      maxAttempts: 5,
    });
    expect(r.ok).toBe(true);
    expect(r.nextBucket.count).toBe(1);
  });

  it("builds stable email/ip keys and peeks without increment", () => {
    expect(
      buildOtpRateLimitKey({
        scope: "email",
        portal: "staff",
        value: "  Ada@Example.COM ",
      }),
    ).toBe("email:staff:ada@example.com");
    const peek = peekOtpRateLimit(
      { count: 4, windowStartedAt: now },
      now,
      { maxAttempts: 5 },
    );
    expect(peek.ok).toBe(true);
    if (peek.ok) expect(peek.remaining).toBe(1);
  });
});

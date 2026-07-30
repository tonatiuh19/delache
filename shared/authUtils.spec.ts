import { describe, expect, it } from "vitest";
import {
  generateOtpCode,
  isValidEmail,
  normalizeLookupEmail,
  otpExpiresAt,
  sha256,
  toMysqlDateTimeUtc,
} from "@shared/authUtils";
import {
  DEFAULT_LOCALE,
  detectBrowserLocale,
  localeFromAcceptLanguage,
  normalizeLocale,
  resolveLocale,
} from "@shared/i18n";

describe("authUtils", () => {
  it("normalizes emails for lookup", () => {
    expect(normalizeLookupEmail("  Felix@Delache.MX ")).toBe(
      "felix@delache.mx",
    );
  });

  it("validates email shape", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });

  it("generates 6-digit OTP codes", () => {
    for (let i = 0; i < 20; i++) {
      const code = generateOtpCode();
      expect(code).toMatch(/^\d{6}$/);
    }
  });

  it("hashes deterministically with sha256", () => {
    expect(sha256("123456")).toBe(sha256("123456"));
    expect(sha256("123456")).not.toBe(sha256("123457"));
    expect(sha256("123456")).toHaveLength(64);
  });

  it("formats MySQL UTC datetimes without timezone offset", () => {
    expect(toMysqlDateTimeUtc(new Date("2026-07-29T23:28:08.663Z"))).toBe(
      "2026-07-29 23:28:08",
    );
  });

  it("computes OTP expiry in the future", () => {
    const before = Date.now();
    const expires = otpExpiresAt(10).getTime();
    expect(expires).toBeGreaterThan(before + 9 * 60 * 1000);
    expect(expires).toBeLessThan(before + 11 * 60 * 1000);
  });
});

describe("i18n locale helpers", () => {
  it("defaults to Spanish", () => {
    expect(DEFAULT_LOCALE).toBe("es");
    expect(normalizeLocale(null)).toBe("es");
    expect(normalizeLocale("fr-FR")).toBe("es");
  });

  it("normalizes en/es tags", () => {
    expect(normalizeLocale("en-US")).toBe("en");
    expect(normalizeLocale("es-MX")).toBe("es");
    expect(normalizeLocale("EN")).toBe("en");
  });

  it("parses Accept-Language preferring first supported", () => {
    expect(localeFromAcceptLanguage("en-US,en;q=0.9,es;q=0.8")).toBe("en");
    expect(localeFromAcceptLanguage("es-MX,es;q=0.9")).toBe("es");
    expect(localeFromAcceptLanguage("fr-FR,fr;q=0.9")).toBe("es");
  });

  it("resolveLocale walks candidates", () => {
    expect(resolveLocale(undefined, "en-GB", "es")).toBe("en");
    expect(resolveLocale(null, null)).toBe("es");
  });

  it("detectBrowserLocale falls back safely in node", () => {
    expect(["es", "en"]).toContain(detectBrowserLocale());
  });
});

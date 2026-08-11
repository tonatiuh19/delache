import { describe, expect, it } from "vitest";
import {
  ERROR_ALIASES,
  rejectApiError,
  resolveErrorCode,
  USER_ERROR_CODES,
} from "./errorCodes";

describe("resolveErrorCode", () => {
  it("passes through canonical codes", () => {
    expect(resolveErrorCode("OTP_RATE_LIMITED")).toBe("OTP_RATE_LIMITED");
    expect(resolveErrorCode("CASE_GATES_BLOCKED")).toBe("CASE_GATES_BLOCKED");
  });

  it("maps legacy English API strings", () => {
    expect(resolveErrorCode("Unauthorized")).toBe("AUTH_UNAUTHORIZED");
    expect(resolveErrorCode("JWT_SECRET not configured")).toBe(
      "SYS_UNAVAILABLE",
    );
    expect(resolveErrorCode("Internal server error")).toBe("INTERNAL");
    expect(resolveErrorCode("Process gates not satisfied")).toBe(
      "CASE_GATES_BLOCKED",
    );
    expect(resolveErrorCode("Could not send verification email. Please try again.")).toBe(
      "OTP_EMAIL_SEND_FAILED",
    );
  });

  it("maps OTP and team rule codes", () => {
    expect(resolveErrorCode("account_not_found")).toBe("OTP_ACCOUNT_NOT_FOUND");
    expect(resolveErrorCode("rate_limited")).toBe("OTP_RATE_LIMITED");
    expect(resolveErrorCode("self_status_change")).toBe("TEAM_SELF_STATUS");
    expect(resolveErrorCode("law_firm_required")).toBe("TEAM_LAW_FIRM_REQUIRED");
  });

  it("maps Redux fallbacks", () => {
    expect(resolveErrorCode("flags_failed")).toBe("CASE_FLAGS_INVALID");
    expect(resolveErrorCode("fetch_failed")).toBe("FETCH_FAILED");
    expect(resolveErrorCode("upload_failed")).toBe("UPLOAD_FAILED");
  });

  it("maps workflow reason prefixes", () => {
    expect(
      resolveErrorCode("Cannot move from intake to completed. Allowed: assignment."),
    ).toBe("CASE_STATUS_INVALID");
    expect(
      resolveErrorCode("Cannot move technical report from draft to approved"),
    ).toBe("REPORT_STATUS_INVALID");
  });

  it("does not leak empty or unknown technical text as itself", () => {
    expect(resolveErrorCode("")).toBe("UNKNOWN");
    expect(resolveErrorCode(null)).toBe("UNKNOWN");
    expect(resolveErrorCode("ENOENT: no such file")).toBe("UNKNOWN");
  });

  it("keeps alias targets inside the published catalog", () => {
    for (const code of Object.values(ERROR_ALIASES)) {
      expect(USER_ERROR_CODES).toContain(code);
    }
  });
});

describe("rejectApiError", () => {
  it("prefers response code over English error", () => {
    expect(
      rejectApiError(
        {
          response: {
            data: { code: "OTP_RATE_LIMITED", error: "Too many verification requests. Please try again later." },
          },
        },
        "request_failed",
      ),
    ).toBe("OTP_RATE_LIMITED");
  });

  it("falls back to mapped English then fallback", () => {
    expect(
      rejectApiError({ response: { data: { error: "Case not found" } } }, "fetch_failed"),
    ).toBe("CASE_NOT_FOUND");
    expect(rejectApiError({}, "fetch_failed")).toBe("FETCH_FAILED");
  });
});

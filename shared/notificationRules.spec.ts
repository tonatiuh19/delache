import { describe, expect, it } from "vitest";
import {
  canResendInvite,
  resolveInviteLocale,
  shouldDualChannelEmail,
  toneForNotificationType,
} from "./notificationRules";

describe("notificationRules", () => {
  it("dual-channels ops types but not otp_login", () => {
    expect(shouldDualChannelEmail("missing_documents")).toBe(true);
    expect(shouldDualChannelEmail("deadline_approaching")).toBe(true);
    expect(shouldDualChannelEmail("general")).toBe(true);
    expect(shouldDualChannelEmail("otp_login")).toBe(false);
    expect(shouldDualChannelEmail(undefined)).toBe(true);
  });

  it("resolves invite locale", () => {
    expect(resolveInviteLocale("en-US")).toBe("en");
    expect(resolveInviteLocale(null)).toBe("es");
  });

  it("allows resend only for invited", () => {
    expect(canResendInvite("invited")).toBe(true);
    expect(canResendInvite("active")).toBe(false);
    expect(canResendInvite("inactive")).toBe(false);
  });

  it("maps tones", () => {
    expect(toneForNotificationType("deadline_approaching")).toBe("warn");
    expect(toneForNotificationType("payment_received")).toBe("success");
    expect(toneForNotificationType("qa_requested")).toBe("accent");
    expect(toneForNotificationType("court_filing")).toBe("info");
  });
});

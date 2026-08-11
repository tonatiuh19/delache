/**
 * Notification dual-channel + invite resend rules (unit-testable).
 */

import type { NotificationType, UserStatus } from "./api";
import { normalizeLocale, type AppLocale } from "./i18n";

/** Types that should also send email when creating an in-app notification. */
export const DUAL_CHANNEL_NOTIFICATION_TYPES: readonly NotificationType[] = [
  "new_assignment",
  "missing_documents",
  "deadline_approaching",
  "inspection_scheduled",
  "travel_confirmed",
  "qa_requested",
  "report_approved",
  "court_filing",
  "payment_received",
  "invoice_pending",
  "general",
] as const;

export function shouldDualChannelEmail(
  type: NotificationType | null | undefined,
): boolean {
  if (!type) return true;
  if (type === "otp_login") return false;
  return (DUAL_CHANNEL_NOTIFICATION_TYPES as readonly string[]).includes(type);
}

/** Invite emails / preferred_language on invite payload. */
export function resolveInviteLocale(
  preferredLanguage?: string | null,
): AppLocale {
  return normalizeLocale(preferredLanguage);
}

/** Only invited members can receive a resend invite email. */
export function canResendInvite(status: UserStatus | string | null | undefined): boolean {
  return status === "invited";
}

export type OpsEmailTone = "info" | "warn" | "success" | "accent";

export function toneForNotificationType(
  type: NotificationType | null | undefined,
): OpsEmailTone {
  switch (type) {
    case "missing_documents":
    case "deadline_approaching":
      return "warn";
    case "payment_received":
    case "report_approved":
      return "success";
    case "inspection_scheduled":
    case "travel_confirmed":
    case "qa_requested":
    case "new_assignment":
      return "accent";
    default:
      return "info";
  }
}

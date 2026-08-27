/**
 * Coordinator-set delivery date for the primary expert on a case.
 * Creates a case_deadlines row (type expert_delivery) and drives notifications.
 */

import type { AppLocale } from "./i18n";

export const EXPERT_DELIVERY_DEADLINE_TYPE = "expert_delivery" as const;

export type ExpertDeliveryDeadlineType = typeof EXPERT_DELIVERY_DEADLINE_TYPE;

export const EXPERT_DELIVERY_DEADLINE_TITLE = "Expert case delivery";

export function expertDeliveryDeadlineTitle(locale: AppLocale): string {
  return locale === "en"
    ? EXPERT_DELIVERY_DEADLINE_TITLE
    : "Entrega del expediente (perito)";
}

export function parseExpertDeliveryDueAt(
  raw: unknown,
):
  | { ok: true; dueAt: Date }
  | { ok: false; error: string } {
  if (raw == null || raw === "") {
    return { ok: false, error: "deliveryDueAt is required" };
  }
  const text = String(raw).trim();
  if (!text) {
    return { ok: false, error: "deliveryDueAt is required" };
  }
  const dueAt = new Date(text);
  if (Number.isNaN(dueAt.getTime())) {
    return { ok: false, error: "deliveryDueAt must be a valid date" };
  }
  return { ok: true, dueAt };
}

/** Date-only input (YYYY-MM-DD) at end of local day is acceptable for all-day deadlines. */
export function parseExpertDeliveryDueDateInput(
  raw: unknown,
):
  | { ok: true; dueAt: Date; dateOnly: boolean }
  | { ok: false; error: string } {
  if (raw == null || raw === "") {
    return { ok: false, error: "deliveryDueAt is required" };
  }
  const text = String(raw).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const parsed = parseExpertDeliveryDueAt(text);
    if (parsed.ok === false) return parsed;
    return { ok: true, dueAt: parsed.dueAt, dateOnly: false };
  }
  const dueAt = new Date(`${text}T23:59:59`);
  if (Number.isNaN(dueAt.getTime())) {
    return { ok: false, error: "deliveryDueAt must be a valid date" };
  }
  return { ok: true, dueAt, dateOnly: true };
}

export function formatExpertDeliveryDueForLocale(
  dueAt: Date,
  locale: AppLocale,
): string {
  return dueAt.toLocaleDateString(locale === "en" ? "en-US" : "es-MX", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function shouldApplyExpertDeliveryOnAssignment(opts: {
  assignmentRole: string;
  isPrimary: boolean;
  deliveryDueAt?: unknown;
}): boolean {
  return (
    opts.assignmentRole === "expert" &&
    opts.isPrimary &&
    opts.deliveryDueAt != null &&
    String(opts.deliveryDueAt).trim() !== ""
  );
}

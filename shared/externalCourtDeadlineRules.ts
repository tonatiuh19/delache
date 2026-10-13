/**
 * Optional per-case external court deadline (CRM PDF decision 6C).
 * When null/empty, only process SLAs apply — no external clock.
 */

export function hasExternalCourtClock(
  externalCourtDeadlineAt: string | null | undefined,
): boolean {
  if (externalCourtDeadlineAt == null) return false;
  const s = String(externalCourtDeadlineAt).trim();
  if (!s) return false;
  const d = new Date(s);
  return !Number.isNaN(d.getTime());
}

export type ParseExternalCourtDeadlineResult =
  | { ok: true; value: string | null }
  | { ok: false; error: string };

/**
 * Accept ISO/datetime string, empty string, or null to clear.
 * Returns ISO string for storage, or null when cleared/absent.
 */
export function parseExternalCourtDeadlineAt(
  raw: unknown,
): ParseExternalCourtDeadlineResult {
  if (raw === undefined) {
    return { ok: false, error: "externalCourtDeadlineAt is required when provided" };
  }
  if (raw === null || raw === "") {
    return { ok: true, value: null };
  }
  if (typeof raw !== "string" && typeof raw !== "number") {
    return { ok: false, error: "externalCourtDeadlineAt must be a date string or null" };
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    return { ok: false, error: "Invalid externalCourtDeadlineAt" };
  }
  return { ok: true, value: d.toISOString() };
}

/** Severity helper shared with CaseSlaStrip-style UI. */
export type ExternalDeadlineSeverity =
  | "none"
  | "safe"
  | "warning"
  | "critical"
  | "overdue";

export function externalCourtDeadlineSeverity(opts: {
  externalCourtDeadlineAt: string | null | undefined;
  nowMs?: number;
}): ExternalDeadlineSeverity {
  if (!hasExternalCourtClock(opts.externalCourtDeadlineAt)) return "none";
  const due = new Date(String(opts.externalCourtDeadlineAt)).getTime();
  const now = opts.nowMs ?? Date.now();
  const msLeft = due - now;
  if (msLeft < 0) return "overdue";
  const daysLeft = msLeft / (24 * 60 * 60 * 1000);
  if (daysLeft <= 1) return "critical";
  if (daysLeft <= 3) return "warning";
  return "safe";
}

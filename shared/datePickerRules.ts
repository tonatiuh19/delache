/**
 * Date / datetime-local string helpers for form fields.
 * Keep values as `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm` (browser-compatible).
 */

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_LOCAL_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export function isIsoDateOnly(value: string | null | undefined): boolean {
  return Boolean(value && DATE_ONLY_RE.test(value.trim()));
}

export function isDatetimeLocal(value: string | null | undefined): boolean {
  return Boolean(value && DATETIME_LOCAL_RE.test(value.trim()));
}

/** Parse `YYYY-MM-DD` as local calendar date (noon to avoid DST edge flips). */
export function parseIsoDateOnly(value: string | null | undefined): Date | null {
  const raw = String(value || "").trim();
  if (!DATE_ONLY_RE.test(raw)) return null;
  const [y, m, d] = raw.split("-").map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0, 0);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

export function formatIsoDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse `YYYY-MM-DDTHH:mm` as local datetime. */
export function parseDatetimeLocal(
  value: string | null | undefined,
): Date | null {
  const raw = String(value || "").trim();
  if (!DATETIME_LOCAL_RE.test(raw)) return null;
  const [datePart, timePart] = raw.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  const date = new Date(y, m - 1, d, hh, mm, 0, 0);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d ||
    date.getHours() !== hh ||
    date.getMinutes() !== mm
  ) {
    return null;
  }
  return date;
}

export function formatDatetimeLocal(date: Date): string {
  return `${formatIsoDateOnly(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** Merge a calendar day into an existing datetime-local value (keeps time or 09:00). */
export function mergeDateIntoDatetimeLocal(
  date: Date,
  previous: string | null | undefined,
): string {
  const prev = parseDatetimeLocal(previous);
  const hours = prev?.getHours() ?? 9;
  const minutes = prev?.getMinutes() ?? 0;
  const next = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes,
    0,
    0,
  );
  return formatDatetimeLocal(next);
}

export function setTimeOnDatetimeLocal(
  previous: string | null | undefined,
  hours: number,
  minutes: number,
): string | null {
  const base =
    parseDatetimeLocal(previous) ??
    (() => {
      const now = new Date();
      return new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        9,
        0,
        0,
        0,
      );
    })();
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  const next = new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    hours,
    minutes,
    0,
    0,
  );
  return formatDatetimeLocal(next);
}

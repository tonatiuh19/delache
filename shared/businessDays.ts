/** Official Mexican rest days (LFT Art. 74) plus inauguration day. UTC date parts. */

function nthWeekdayOfMonth(
  year: number,
  monthIndex: number,
  weekday: number,
  n: number,
): Date {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const firstDow = first.getUTCDay();
  const day = 1 + ((weekday - firstDow + 7) % 7) + (n - 1) * 7;
  return new Date(Date.UTC(year, monthIndex, day));
}

/** Presidential inauguration years (every 6 years from 2018). */
export function isMexicanInaugurationYear(year: number): boolean {
  return (year - 2018) % 6 === 0;
}

export function isMexicanPublicHoliday(date: Date): boolean {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  if (month === 0 && day === 1) return true;
  if (month === 4 && day === 1) return true;
  if (month === 8 && day === 16) return true;
  if (month === 11 && day === 25) return true;

  const constitution = nthWeekdayOfMonth(year, 1, 1, 1);
  if (
    month === constitution.getUTCMonth() &&
    day === constitution.getUTCDate()
  ) {
    return true;
  }
  const juarez = nthWeekdayOfMonth(year, 2, 1, 3);
  if (month === juarez.getUTCMonth() && day === juarez.getUTCDate()) {
    return true;
  }
  const revolution = nthWeekdayOfMonth(year, 10, 1, 3);
  if (
    month === revolution.getUTCMonth() &&
    day === revolution.getUTCDate()
  ) {
    return true;
  }

  if (isMexicanInaugurationYear(year)) {
    // Constitución: 1 Oct from 2024; LFT historically 1 Dec.
    if (year >= 2024 && month === 9 && day === 1) return true;
    if (year < 2024 && month === 11 && day === 1) return true;
  }

  return false;
}

export function isMexicanBusinessDay(date: Date): boolean {
  const dow = date.getUTCDay();
  if (dow === 0 || dow === 6) return false;
  return !isMexicanPublicHoliday(date);
}

/** Add N weekdays (Mon–Fri), skipping Mexican public holidays. Uses UTC date parts. */
export function addBusinessDays(from: Date, days: number): Date {
  if (!Number.isFinite(days) || days < 0) {
    throw new Error("days must be a non-negative number");
  }
  const result = new Date(from.getTime());
  let added = 0;
  while (added < days) {
    result.setUTCDate(result.getUTCDate() + 1);
    if (isMexicanBusinessDay(result)) added += 1;
  }
  return result;
}

export type DeadlineSeverity = "safe" | "warning" | "critical" | "overdue";

/** Traffic-light severity vs due date (calendar days remaining). */
export function computeDeadlineSeverity(
  dueAt: Date,
  now: Date = new Date(),
): DeadlineSeverity {
  const ms = dueAt.getTime() - now.getTime();
  const days = ms / 86_400_000;
  if (days < 0) return "overdue";
  if (days <= 2) return "critical";
  if (days <= 5) return "warning";
  return "safe";
}

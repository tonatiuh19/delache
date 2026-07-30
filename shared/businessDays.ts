/** Add N weekdays (Mon–Fri), skipping Saturday/Sunday. Uses UTC date parts. */
export function addBusinessDays(from: Date, days: number): Date {
  if (!Number.isFinite(days) || days < 0) {
    throw new Error("days must be a non-negative number");
  }
  const result = new Date(from.getTime());
  let added = 0;
  while (added < days) {
    result.setUTCDate(result.getUTCDate() + 1);
    const dow = result.getUTCDay();
    if (dow !== 0 && dow !== 6) added += 1;
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

import type { CalendarEventItem } from "@shared/api";

export type CalendarEventType =
  | "meeting"
  | "court_date"
  | "inspection"
  | "travel"
  | "deadline"
  | "ratification"
  | "other";

export const CALENDAR_EVENT_TYPES: CalendarEventType[] = [
  "meeting",
  "court_date",
  "inspection",
  "travel",
  "deadline",
  "ratification",
  "other",
];

/** Design-token chip styles per event type (no arbitrary palette colors). */
export const EVENT_TYPE_CHIP: Record<CalendarEventType, string> = {
  meeting: "bg-primary/10 text-primary border-primary/20",
  court_date: "bg-destructive/10 text-destructive border-destructive/20",
  inspection: "bg-accent/15 text-accent border-accent/25",
  travel: "bg-secondary text-secondary-foreground border-border",
  deadline: "bg-destructive/15 text-destructive border-destructive/25",
  ratification: "bg-primary/15 text-primary border-primary/25",
  other: "bg-muted text-muted-foreground border-border",
};

export function asEventType(value: string): CalendarEventType {
  return (CALENDAR_EVENT_TYPES as string[]).includes(value)
    ? (value as CalendarEventType)
    : "other";
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Monday-first month grid (6 weeks × 7 days). */
export function buildMonthGrid(month: Date): Date[] {
  const first = startOfMonth(month);
  const mondayOffset = (first.getDay() + 6) % 7; // Sun=0 → 6
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + i);
    return day;
  });
}

export function monthRangeIso(month: Date): { from: string; to: string } {
  const from = new Date(month.getFullYear(), month.getMonth(), 1);
  const to = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);
  // Include adjacent days visible in the grid (±7 days buffer)
  from.setDate(from.getDate() - 7);
  to.setDate(to.getDate() + 7);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function groupEventsByDay(
  events: CalendarEventItem[],
): Map<string, CalendarEventItem[]> {
  const map = new Map<string, CalendarEventItem[]>();
  for (const event of events) {
    const key = toDateKey(new Date(event.startsAt));
    const list = map.get(key) || [];
    list.push(event);
    map.set(key, list);
  }
  for (const list of map.values()) {
    list.sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
  }
  return map;
}

export function formatMonthTitle(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function weekdayLabels(locale: string): string[] {
  const monday = new Date(2024, 0, 1); // Monday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d);
  });
}

export function formatDayHeading(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function formatEventTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function toDatetimeLocalValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
}

export function defaultStartForDay(day: Date): string {
  const d = new Date(day);
  d.setHours(9, 0, 0, 0);
  return toDatetimeLocalValue(d);
}

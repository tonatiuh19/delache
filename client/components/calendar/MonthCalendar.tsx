import { motion } from "framer-motion";
import type { CalendarEventItem } from "@shared/api";
import {
  asEventType,
  buildMonthGrid,
  EVENT_TYPE_CHIP,
  isSameDay,
  isSameMonth,
  toDateKey,
  weekdayLabels,
} from "@/lib/calendarUtils";

type MonthCalendarProps = {
  month: Date;
  selected: Date;
  today: Date;
  eventsByDay: Map<string, CalendarEventItem[]>;
  locale: string;
  loading?: boolean;
  onSelectDay: (day: Date) => void;
  typeLabel: (type: string) => string;
  moreLabel: (count: number) => string;
};

const MAX_VISIBLE = 3;

export default function MonthCalendar({
  month,
  selected,
  today,
  eventsByDay,
  locale,
  loading,
  onSelectDay,
  typeLabel,
  moreLabel,
}: MonthCalendarProps) {
  const days = buildMonthGrid(month);
  const labels = weekdayLabels(locale);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="grid grid-cols-7 border-b border-border bg-secondary/40">
        {labels.map((label) => (
          <div
            key={label}
            className="px-1 py-3 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground sm:text-[11px]"
          >
            {label}
          </div>
        ))}
      </div>

      <motion.div
        key={`${month.getFullYear()}-${month.getMonth()}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className={`grid grid-cols-7 ${loading ? "opacity-60" : ""}`}
      >
        {days.map((day) => {
          const key = toDateKey(day);
          const dayEvents = eventsByDay.get(key) || [];
          const inMonth = isSameMonth(day, month);
          const isToday = isSameDay(day, today);
          const isSelected = isSameDay(day, selected);
          const overflow = Math.max(0, dayEvents.length - MAX_VISIBLE);

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay(day)}
              className={[
                "group relative flex min-h-[92px] flex-col gap-1 border-b border-r border-border p-1.5 text-left transition sm:min-h-[118px] sm:p-2",
                "hover:bg-secondary/50 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                !inMonth ? "bg-muted/30" : "bg-card",
                isSelected ? "bg-secondary/70 ring-1 ring-inset ring-primary/30" : "",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className={[
                    "grid h-7 w-7 place-items-center rounded-full text-xs font-semibold transition",
                    isToday
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                      : isSelected
                        ? "bg-accent/15 text-primary"
                        : inMonth
                          ? "text-foreground"
                          : "text-muted-foreground/50",
                  ].join(" ")}
                >
                  {day.getDate()}
                </span>
                {dayEvents.length > 0 ? (
                  <span className="hidden text-[9px] font-semibold text-muted-foreground sm:inline">
                    {dayEvents.length}
                  </span>
                ) : null}
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
                {dayEvents.slice(0, MAX_VISIBLE).map((event) => {
                  const type = asEventType(event.eventType);
                  return (
                    <span
                      key={event.publicUuid}
                      title={`${typeLabel(event.eventType)} · ${event.title}`}
                      className={[
                        "truncate rounded-md border px-1.5 py-0.5 text-[9px] font-semibold leading-tight sm:text-[10px]",
                        EVENT_TYPE_CHIP[type],
                      ].join(" ")}
                    >
                      {event.title}
                    </span>
                  );
                })}
                {overflow > 0 ? (
                  <span className="px-1 text-[9px] font-semibold text-muted-foreground">
                    {moreLabel(overflow)}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </motion.div>
    </div>
  );
}

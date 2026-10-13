import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { enUS, es } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  formatDatetimeLocal,
  mergeDateIntoDatetimeLocal,
  parseDatetimeLocal,
  setTimeOnDatetimeLocal,
} from "@shared/datePickerRules";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (next: string) => void;
  name?: string;
  id?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  allowClear?: boolean;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

export default function DateTimePicker({
  value,
  onChange,
  name,
  id,
  disabled,
  placeholder,
  className,
  allowClear = true,
}: Props) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => parseDatetimeLocal(value), [value]);
  const locale = i18n.language?.startsWith("es") ? es : enUS;

  const label = selected
    ? format(selected, "PPp", { locale })
    : placeholder || t("datePicker.pickDateTime");

  const hour = selected?.getHours() ?? 9;
  const minute = selected
    ? MINUTES.includes(selected.getMinutes())
      ? selected.getMinutes()
      : selected.getMinutes()
    : 0;

  return (
    <div className={cn("relative min-w-0", className)}>
      {name ? (
        <input type="hidden" name={name} value={value} readOnly />
      ) : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            disabled={disabled}
            aria-label={t("datePicker.pickDateTime")}
            className={cn(
              "inline-flex h-11 w-full items-center gap-2 rounded-xl border border-input bg-background px-3 text-left text-sm outline-none transition",
              "hover:border-primary/40 focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-ring/20",
              "disabled:cursor-not-allowed disabled:opacity-60",
              !selected && "text-muted-foreground",
            )}
          >
            <CalendarIcon
              size={16}
              className="shrink-0 self-center text-primary"
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
            {allowClear && selected && !disabled ? (
              <span
                role="button"
                tabIndex={0}
                aria-label={t("datePicker.clear")}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange("");
                  }
                }}
              >
                <X size={14} />
              </span>
            ) : null}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-auto max-w-[min(100vw-1.5rem,22rem)] overflow-hidden rounded-2xl border-border p-0 shadow-xl"
        >
          <div className="border-b border-border bg-gradient-to-br from-secondary/60 via-background to-background px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              {t("datePicker.calendarLabel")}
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
              {selected
                ? format(selected, "EEEE, d MMM yyyy · HH:mm", { locale })
                : t("datePicker.pickDateTime")}
            </p>
          </div>
          <Calendar
            mode="single"
            selected={selected ?? undefined}
            onSelect={(day) => {
              if (!day) return;
              onChange(mergeDateIntoDatetimeLocal(day, value));
            }}
            autoFocus
            className="p-3"
          />
          <div className="flex flex-wrap items-center gap-2 border-t border-border bg-muted/20 px-3 py-3">
            <Clock size={14} className="text-primary" aria-hidden />
            <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {t("datePicker.time")}
            </label>
            <select
              aria-label={t("datePicker.hour")}
              value={hour}
              disabled={disabled}
              onChange={(e) => {
                const next = setTimeOnDatetimeLocal(
                  value || formatDatetimeLocal(new Date()),
                  Number(e.target.value),
                  minute,
                );
                if (next) onChange(next);
              }}
              className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}
                </option>
              ))}
            </select>
            <span className="text-muted-foreground">:</span>
            <select
              aria-label={t("datePicker.minute")}
              value={minute}
              disabled={disabled}
              onChange={(e) => {
                const next = setTimeOnDatetimeLocal(
                  value || formatDatetimeLocal(new Date()),
                  hour,
                  Number(e.target.value),
                );
                if (next) onChange(next);
              }}
              className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
            >
              {[
                ...new Set([
                  ...MINUTES,
                  ...(selected && !MINUTES.includes(selected.getMinutes())
                    ? [selected.getMinutes()]
                    : []),
                ]),
              ]
                .sort((a, b) => a - b)
                .map((m) => (
                  <option key={m} value={m}>
                    {String(m).padStart(2, "0")}
                  </option>
                ))}
            </select>
            <button
              type="button"
              disabled={!selected}
              onClick={() => setOpen(false)}
              className="ml-auto inline-flex h-9 items-center rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              {t("datePicker.done")}
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

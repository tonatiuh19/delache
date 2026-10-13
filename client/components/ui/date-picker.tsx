import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { enUS, es } from "date-fns/locale";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  formatIsoDateOnly,
  parseIsoDateOnly,
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
  /** When true, disable past calendar days. */
  disablePast?: boolean;
};

export default function DatePicker({
  value,
  onChange,
  name,
  id,
  disabled,
  placeholder,
  className,
  allowClear = true,
  disablePast = false,
}: Props) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => parseIsoDateOnly(value), [value]);
  const locale = i18n.language?.startsWith("es") ? es : enUS;

  const label = selected
    ? format(selected, "PPP", { locale })
    : placeholder || t("datePicker.pickDate");

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
            aria-label={t("datePicker.pickDate")}
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
          className="w-auto overflow-hidden rounded-2xl border-border p-0 shadow-xl"
        >
          <div className="border-b border-border bg-gradient-to-br from-secondary/60 via-background to-background px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              {t("datePicker.calendarLabel")}
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
              {selected
                ? format(selected, "EEEE, d MMM yyyy", { locale })
                : t("datePicker.pickDate")}
            </p>
          </div>
          <Calendar
            mode="single"
            selected={selected ?? undefined}
            onSelect={(day) => {
              if (!day) return;
              onChange(formatIsoDateOnly(day));
              setOpen(false);
            }}
            disabled={
              disablePast
                ? (day) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return day < today;
                  }
                : undefined
            }
            autoFocus
            className="p-3"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

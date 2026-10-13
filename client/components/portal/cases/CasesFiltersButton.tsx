import { ListFilter, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CASE_STATUS_FLOW } from "@shared/caseWorkflow";
import { cn } from "@/lib/utils";

/** Status + priority filters collapsed into one toolbar button. */
export default function CasesFiltersButton({
  status,
  priority,
  onStatusChange,
  onPriorityChange,
  className,
}: {
  status: string;
  priority: string;
  onStatusChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const activeCount = (status ? 1 : 0) + (priority ? 1 : 0);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-input bg-background px-3 text-sm font-semibold text-foreground transition hover:border-primary/40",
            activeCount > 0 && "border-primary/50 bg-primary/5 text-primary",
            className,
          )}
          aria-label={t("cases.filtersButton")}
        >
          <ListFilter size={15} />
          <span className="hidden sm:inline">{t("cases.filtersButton")}</span>
          {activeCount > 0 ? (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {activeCount}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(100vw-2rem,18rem)] space-y-3 rounded-2xl border-border p-3 shadow-xl"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {t("cases.filtersTitle")}
          </p>
          {activeCount > 0 ? (
            <button
              type="button"
              onClick={() => {
                onStatusChange("");
                onPriorityChange("");
              }}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X size={12} />
              {t("cases.filtersClear")}
            </button>
          ) : null}
        </div>
        <label className="block text-xs font-semibold text-muted-foreground">
          {t("cases.colStatus")}
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="mt-1.5 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-ring/20"
          >
            <option value="">{t("cases.filterAllStatuses")}</option>
            {[...CASE_STATUS_FLOW, "on_hold", "cancelled"].map((s) => (
              <option key={s} value={s}>
                {t(`cases.status.${s}`, { defaultValue: s })}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold text-muted-foreground">
          {t("cases.colPriority")}
          <select
            value={priority}
            onChange={(e) => onPriorityChange(e.target.value)}
            className="mt-1.5 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-ring/20"
          >
            <option value="">{t("cases.filterAllPriorities")}</option>
            {(["low", "normal", "high", "urgent"] as const).map((p) => (
              <option key={p} value={p}>
                {t(`cases.priority.${p}`)}
              </option>
            ))}
          </select>
        </label>
      </PopoverContent>
    </Popover>
  );
}

import { useTranslation } from "react-i18next";
import {
  Calendar,
  Check,
  FileText,
  Info,
  Lock,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CaseSummary } from "@shared/api";
import { buildDespachoProgressSteps } from "@shared/despachoPanelRules";
import { processPointForStatus } from "@shared/processGates";
import { clientStepNumber } from "@shared/caseStepTreeRules";
import ListadoFlagStrip from "@/components/portal/ListadoFlagStrip";

function formatDeadline(
  value: string | null | undefined,
  locale: string,
): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(locale.startsWith("es") ? "es-MX" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function DespachoSeguimientoPanel({
  selected,
  observation,
  className,
}: {
  selected: CaseSummary | null;
  /** Latest admin observation (rejection / shared note). */
  observation?: { body: string; at: string } | null;
  className?: string;
}) {
  const { t, i18n } = useTranslation();

  if (!selected) {
    return (
      <aside
        className={cn(
          "flex min-h-[20rem] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-6 text-center shadow-sm",
          className,
        )}
      >
        <FileText className="text-muted-foreground" size={28} />
        <p className="mt-3 text-sm font-semibold text-foreground">
          {t("despacho.panel.seguimientoEmptyTitle")}
        </p>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          {t("despacho.panel.seguimientoEmptyHint")}
        </p>
      </aside>
    );
  }

  const steps = buildDespachoProgressSteps({ status: selected.status });
  const point = processPointForStatus(selected.status);
  const location = [selected.propertyCity, selected.propertyState]
    .filter(Boolean)
    .join(", ");

  return (
    <aside
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
        className,
      )}
    >
      <div className="border-b border-border px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-info/15 text-info">
              <FileText size={18} />
            </span>
            <h2 className="text-sm font-bold text-foreground">
              {t("despacho.panel.seguimientoTitle")}
            </h2>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-foreground">
            <Lock size={12} className="text-primary" />
            {t("despacho.panel.readOnly")}
          </span>
        </div>
        <p className="mt-3 font-[Manrope] text-xl font-bold tracking-tight text-foreground">
          {selected.caseNumber}
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
          {selected.title}
        </p>
        {location ? (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin size={12} className="shrink-0 text-primary" />
            <span className="truncate">{location}</span>
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground">
            <Calendar size={13} className="text-info" />
            {t("despacho.panel.deadline")}:{" "}
            {formatDeadline(
              selected.externalCourtDeadlineAt ?? selected.inspectionDeadlineAt,
              i18n.language,
            )}
          </span>
          {selected.listado ? (
            <ListadoFlagStrip
              listado={selected.listado}
              status={selected.status}
              compact
            />
          ) : null}
        </div>
      </div>

      <div className="border-b border-border px-4 pt-3 sm:px-5">
        <div className="flex gap-4">
          <button
            type="button"
            className="border-b-2 border-primary pb-2 text-xs font-bold text-foreground"
          >
            {t("despacho.panel.tabProgress")}
          </button>
          <span className="pb-2 text-xs font-semibold text-muted-foreground">
            {t("despacho.panel.tabInfo")}
          </span>
        </div>
      </div>

      <ol className="min-h-0 flex-1 space-y-0 overflow-y-auto px-4 py-3 sm:px-5">
        {steps.map((step) => (
          <li
            key={step.point}
            className="flex items-start gap-3 border-b border-border/60 py-2.5 last:border-0"
          >
            <span
              className={cn(
                "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                step.pill === "done" &&
                  "bg-success text-success-foreground",
                step.pill === "in_progress" &&
                  "bg-primary text-primary-foreground",
                step.pill === "pending" &&
                  "border border-border bg-background text-muted-foreground",
              )}
            >
              {step.pill === "done" ? (
                <Check size={12} strokeWidth={3} />
              ) : (
                step.clientNumber
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-sm font-semibold",
                  step.pill === "pending"
                    ? "text-muted-foreground"
                    : "text-foreground",
                )}
              >
                {step.clientNumber}.{" "}
                {t(`process.point.${step.point}.name`)}
              </p>
              {point === step.point ? (
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {t("despacho.panel.currentStepHint", {
                    n: clientStepNumber(step.point),
                  })}
                </p>
              ) : null}
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                step.pill === "done" &&
                  "bg-success/15 text-success",
                step.pill === "in_progress" &&
                  "bg-primary/15 text-foreground",
                step.pill === "pending" &&
                  "bg-muted text-muted-foreground",
              )}
            >
              {step.pill === "done"
                ? t("despacho.panel.pillDone")
                : step.pill === "in_progress"
                  ? t("despacho.panel.pillInProgress")
                  : t("despacho.panel.pillPending")}
            </span>
          </li>
        ))}
      </ol>

      {observation ? (
        <div className="m-4 rounded-2xl border border-destructive/25 bg-destructive/5 p-3 sm:m-5 sm:mt-0">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-destructive text-destructive-foreground">
              <Info size={12} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-xs font-bold text-destructive">
                  {t("despacho.panel.adminObservation")}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {formatDeadline(observation.at, i18n.language)}
                </p>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-foreground">
                {observation.body}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}

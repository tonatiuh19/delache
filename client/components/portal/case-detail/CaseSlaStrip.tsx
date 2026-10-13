import { useTranslation } from "react-i18next";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CaseStatus } from "@shared/api";
import {
  PROCESS_POINTS,
  processPointForStatus,
  type ListadoProgress,
} from "@shared/processGates";

export default function CaseSlaStrip({
  status,
  listado,
  externalCourtDeadlineAt,
  className,
}: {
  status: CaseStatus;
  listado?: ListadoProgress | null;
  externalCourtDeadlineAt?: string | null;
  className?: string;
}) {
  const { t } = useTranslation();
  const point = processPointForStatus(status);
  const externalDue =
    externalCourtDeadlineAt &&
    !Number.isNaN(Date.parse(externalCourtDeadlineAt))
      ? externalCourtDeadlineAt
      : null;
  const externalOverdue =
    externalDue != null && Date.parse(externalDue) < Date.now();

  if (point == null && !externalDue) return null;
  const def = point != null ? PROCESS_POINTS[point] : null;
  const dueAt = listado?.clock10DueAt;
  const overdue =
    dueAt != null &&
    !Number.isNaN(Date.parse(dueAt)) &&
    Date.parse(dueAt) < Date.now();

  if (point != null && !def?.sla && !def?.boundedByPoint && !dueAt && !externalDue) {
    return null;
  }
  if (point == null && !externalDue) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-xs",
        overdue || externalOverdue
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-border bg-muted/30 text-muted-foreground",
        className,
      )}
    >
      <Clock size={14} className="shrink-0" />
      {def?.sla ? (
        <span>
          {t("process.slaDays", { days: def.sla.businessDays })}
          {def.sla.nestedInside ? ` · ${t("process.nestedSla")}` : ""}
        </span>
      ) : def?.boundedByPoint ? (
        <span>
          {t("process.insideClock", { point: def.boundedByPoint })}
        </span>
      ) : null}
      {dueAt ? (
        <span className="font-semibold text-foreground">
          {t("cases.sla.due", {
            date: new Date(dueAt).toLocaleDateString(),
          })}
          {point === 6 && !listado?.protestaFiled
            ? ` · ${t("cases.protesta.clockPending")}`
            : null}
        </span>
      ) : point === 6 ? (
        <span>{t("cases.protesta.clockPending")}</span>
      ) : null}
      {externalDue ? (
        <span className="font-semibold text-foreground">
          {t("cases.externalCourtDeadline")}:{" "}
          {new Date(externalDue).toLocaleDateString()}
        </span>
      ) : null}
    </div>
  );
}

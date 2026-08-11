import { useTranslation } from "react-i18next";
import { Check, CircleDot, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CaseStatus } from "@shared/api";
import {
  evaluateProcessGates,
  PROCESS_POINT_IDS,
  PROCESS_POINTS,
  processPointForStatus,
  type CaseProcessGateSnapshot,
  type ProcessGateInput,
  type ProcessPointId,
} from "@shared/processGates";
import { SectionHelper } from "@/components/portal/FormHelpers";

export function processGateLabel(
  t: (key: string, opts?: { defaultValue?: string }) => string,
  code: string,
): string {
  const [kind, ...rest] = code.split(":");
  const slug = rest.join(".");
  return t(`process.gate.${kind}.${slug}`, { defaultValue: code });
}

export default function ProcessTimeline({
  status,
  gateInput,
  serverGate,
}: {
  status: CaseStatus;
  gateInput: ProcessGateInput;
  serverGate?: CaseProcessGateSnapshot | null;
}) {
  const { t } = useTranslation();
  const current = processPointForStatus(status);
  const localGates = current
    ? evaluateProcessGates(current, gateInput)
    : null;
  const currentGates =
    serverGate && serverGate.point === current
      ? { ok: serverGate.ok, missing: serverGate.missing }
      : localGates;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            {t("process.eyebrow")}
          </p>
          <h2 className="mt-1 text-sm font-bold text-foreground">
            {t("process.title")}
          </h2>
        </div>
        {current ? (
          <p className="text-xs text-muted-foreground">
            {t("process.current", {
              point: current,
              name: t(`process.point.${current}.name`),
            })}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {t(`cases.status.${status}`, { defaultValue: status })}
          </p>
        )}
      </div>
      <SectionHelper>{t("process.helper")}</SectionHelper>

      <ol className="mt-4 flex gap-2 overflow-x-auto pb-2">
        {PROCESS_POINT_IDS.map((id) => {
          const done = current != null && id < current;
          const active = id === current;
          return (
            <li
              key={id}
              className={cn(
                "min-w-[7.5rem] flex-1 rounded-xl border px-2.5 py-2",
                active && "border-primary bg-primary/5",
                done && "border-border bg-muted/40",
                !done && !active && "border-border/70 bg-background",
              )}
            >
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {done ? (
                  <Check size={12} className="text-primary" />
                ) : active ? (
                  <CircleDot size={12} className="text-primary" />
                ) : (
                  <Lock size={12} className="opacity-50" />
                )}
                {t("process.pointLabel", { point: id })}
              </div>
              <p className="mt-1 text-[11px] font-semibold leading-snug text-foreground">
                {t(`process.point.${id}.name`)}
              </p>
              {PROCESS_POINTS[id].sla ? (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {t("process.slaDays", {
                    days: PROCESS_POINTS[id].sla!.businessDays,
                  })}
                  {PROCESS_POINTS[id].sla!.nestedInside
                    ? ` · ${t("process.nestedSla")}`
                    : ""}
                </p>
              ) : PROCESS_POINTS[id].boundedByPoint ? (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {t("process.insideClock", {
                    point: PROCESS_POINTS[id].boundedByPoint,
                  })}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>

      {current && currentGates && currentGates.ok === false ? (
        <div className="mt-4 rounded-xl border border-border bg-secondary/50 px-3 py-2.5">
          <p className="text-[11px] font-semibold text-foreground">
            {t("process.blockedTitle")}
          </p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[11px] text-muted-foreground">
            {currentGates.missing.map((code) => (
              <li key={code}>{processGateLabel(t, code)}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

export function buildProcessGateInput(opts: {
  documentCategories: readonly string[];
  evidenceCategories: readonly string[];
  hasPrimaryExpert: boolean;
  questionnaireStatus?: string | null;
  hasStreetView: boolean;
  hasPropertyGps: boolean;
  plaintiffQuestionnairePresent: boolean;
  inspectionComplete: boolean;
  reportStatus?: string | null;
  logisticsReady: boolean;
  involvesFatality?: boolean;
  hasUnpaidInvoices?: boolean;
}): ProcessGateInput {
  return {
    documentCategories: opts.documentCategories,
    evidenceCategories: opts.evidenceCategories,
    hasPrimaryExpert: opts.hasPrimaryExpert,
    questionnaireStatus: opts.questionnaireStatus,
    hasStreetView: opts.hasStreetView,
    hasPropertyGps: opts.hasPropertyGps,
    plaintiffQuestionnairePresent: opts.plaintiffQuestionnairePresent,
    protestaFiled: opts.documentCategories.includes("protesta"),
    inspectionComplete: opts.inspectionComplete,
    reportStatus: opts.reportStatus,
    ratificationPresent: opts.documentCategories.includes("ratification"),
    courtFilingPresent: opts.documentCategories.includes("court_filing"),
    logisticsReady: opts.logisticsReady,
    involvesFatality: opts.involvesFatality,
    hasUnpaidInvoices: opts.hasUnpaidInvoices,
  };
}

export type { ProcessPointId };

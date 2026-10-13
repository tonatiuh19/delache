import { Link } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActionRequiredSummary } from "@shared/caseStepTreeRules";
import { caseStepPath } from "@shared/caseStepTreeRules";
import { processGateLabel } from "@/components/portal/ProcessTimeline";
import { canChangeCaseStatus } from "@shared/portalCapabilities";

function displayGateCodes(summary: ActionRequiredSummary): {
  yours: readonly string[];
  waiting: readonly string[];
} {
  const yours = summary.viewerMissingGateCodes ?? summary.missingGateCodes;
  const waiting = summary.waitingGateCodes ?? [];
  return { yours, waiting };
}

export default function CaseDetailStepHero({
  summary,
  pointTitle,
  pointNumber,
  compact = false,
}: {
  summary: ActionRequiredSummary;
  pointTitle: string;
  /** Process point id (1–10) for `1 · Title` labels. */
  pointNumber?: number | null;
  /** Compact banner when a subsection is already focused. */
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const { yours, waiting } = displayGateCodes(summary);
  const blocked = !summary.gatesOk;
  const hasYourTasks = yours.length > 0;
  const hasWaiting = waiting.length > 0;
  const heading =
    pointNumber != null && pointNumber > 0
      ? `${pointNumber} · ${pointTitle}`
      : pointTitle;

  if (compact) {
    const pendingLabel = hasYourTasks
      ? yours
      : hasWaiting
        ? waiting
        : summary.missingGateCodes;
    return (
      <section className="overflow-x-clip rounded-2xl border border-border bg-card px-4 py-3 shadow-sm sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
              {t("cases.stepHero.eyebrow")}
            </p>
            <h2 className="mt-0.5 truncate font-[Manrope] text-base font-bold text-foreground sm:text-lg">
              {heading}
            </h2>
            {blocked && pendingLabel.length > 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {hasYourTasks
                  ? t("cases.stepHero.pendingCount", {
                      count: yours.length,
                      defaultValue: `${yours.length} pending`,
                    })
                  : t("cases.stepHero.waitingCount", {
                      count: waiting.length,
                      defaultValue: `${waiting.length} waiting on others`,
                    })}
                {": "}
                {processGateLabel(t, pendingLabel[0]!)}
                {pendingLabel.length > 1
                  ? ` +${pendingLabel.length - 1}`
                  : ""}
              </p>
            ) : (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-foreground">
                <CheckCircle2 size={14} className="shrink-0 text-primary" />
                {t("cases.stepHero.gatesClear")}
              </p>
            )}
          </div>
          {blocked && hasYourTasks ? (
            <ul className="hidden max-w-md flex-wrap gap-1 sm:flex">
              {yours.slice(0, 3).map((code) => (
                <li
                  key={code}
                  className="rounded-lg border border-border bg-muted/40 px-2 py-1 text-[10px] font-medium text-muted-foreground"
                >
                  {processGateLabel(t, code)}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-primary/10 px-5 py-4 sm:px-6 xl:px-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
          {t("cases.stepHero.eyebrow")}
        </p>
        <h2 className="mt-1 font-[Manrope] text-xl font-bold text-foreground sm:text-2xl">
          {heading}
        </h2>
      </div>
      <div className="grid gap-4 p-5 sm:p-6 xl:grid-cols-12 xl:gap-6 xl:p-8">
        {blocked && (hasYourTasks || hasWaiting) ? (
          <div className="space-y-4 xl:col-span-8">
            {hasYourTasks ? (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-primary">
                  {t("cases.stepHero.yourTasks")}
                </p>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {yours.slice(0, 8).map((code) => (
                    <li
                      key={code}
                      className="flex items-start gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground"
                    >
                      <Circle
                        size={16}
                        className="mt-0.5 shrink-0 text-primary"
                      />
                      {processGateLabel(t, code)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {hasWaiting ? (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {t("cases.stepHero.waitingOnOthers")}
                </p>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {waiting.slice(0, 8).map((code) => (
                    <li
                      key={code}
                      className="flex items-start gap-2 rounded-xl border border-border/70 bg-background px-3 py-2.5 text-sm text-muted-foreground"
                    >
                      <Clock
                        size={16}
                        className="mt-0.5 shrink-0 text-muted-foreground"
                      />
                      {processGateLabel(t, code)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-xl bg-primary/10 px-4 py-3 text-sm text-foreground xl:col-span-8">
            <CheckCircle2 size={20} className="shrink-0 text-primary" />
            {t("cases.stepHero.gatesClear")}
          </div>
        )}

        {summary.gatesOk ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground xl:col-span-4 xl:items-start xl:pt-1">
            <AlertCircle size={16} className="shrink-0" />
            {t("cases.stepHero.advanceHint")}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function CaseActionRequiredCard({
  summary,
  pointTitle,
  className,
}: {
  summary: ActionRequiredSummary;
  pointTitle: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const { yours, waiting } = displayGateCodes(summary);
  const listCodes = yours.length > 0 ? yours : waiting;

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border bg-primary/10 px-5 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
          {t("cases.overview.actionRequired")}
        </p>
        {!summary.gatesOk ? (
          <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold text-destructive">
            {t("cases.overview.blocked")}
          </span>
        ) : null}
      </div>
      <div className="p-5">
        <h2 className="font-[Manrope] text-lg font-bold text-foreground">
          {pointTitle}
        </h2>
        {!summary.gatesOk && listCodes.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {listCodes.slice(0, 5).map((code) => (
              <li
                key={code}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <Circle size={14} className="mt-0.5 shrink-0" />
                {processGateLabel(t, code)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            {t("cases.stepHero.gatesClear")}
          </p>
        )}
        <Link
          to={summary.ctaHref}
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-bold text-accent-foreground transition hover:opacity-90 sm:w-auto"
        >
          {t(summary.ctaLabelKey, {
            defaultValue: t("cases.overview.continue"),
          })}
          <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}

export function StickyAdvanceBar({
  publicUuid,
  stepSlug,
  gatesOk,
  viewerRole,
  nextStatusLabel,
  onAdvance,
  advancing,
}: {
  publicUuid: string;
  stepSlug?: string | null;
  gatesOk: boolean;
  viewerRole?: string | null;
  nextStatusLabel?: string | null;
  onAdvance?: (reason: string) => void;
  advancing?: boolean;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  if (!gatesOk || !canChangeCaseStatus(viewerRole) || !onAdvance) return null;

  return (
    <div className="sticky bottom-3 z-20 overflow-x-clip px-1 sm:bottom-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-2 rounded-2xl border border-primary/40 bg-card/95 px-4 py-3 shadow-sm backdrop-blur sm:gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-primary">
              {t("cases.stickyAdvance.eyebrow")}
            </p>
            <p className="truncate text-sm font-semibold text-foreground">
              {nextStatusLabel
                ? t("cases.stickyAdvance.toStatus", { status: nextStatusLabel })
                : t("cases.stickyAdvance.ready")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to={caseStepPath(publicUuid, stepSlug ?? undefined, "workflow")}
              className="inline-flex h-11 items-center rounded-xl border border-border px-3 text-xs font-semibold text-foreground"
            >
              {t("cases.stickyAdvance.openWorkflow")}
            </Link>
            <button
              type="button"
              disabled={advancing}
              onClick={() => onAdvance(reason.trim())}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-4 text-xs font-bold text-accent-foreground disabled:opacity-50"
            >
              {t("cases.stickyAdvance.cta")}
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("cases.reasonPlaceholder")}
          className="h-10 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground"
          aria-label={t("cases.reasonPlaceholder")}
        />
      </div>
    </div>
  );
}

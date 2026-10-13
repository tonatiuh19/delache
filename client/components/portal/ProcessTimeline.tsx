import { Link } from "react-router-dom";
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
import {
  buildNextStepGuidance,
  canSeeProcessRaciDetail,
  partitionMissingGatesForViewer,
  processBlockedHowToKey,
  processGateQuickLink,
  processPointRaciBuckets,
  processQuickLinksForViewer,
  processViewerActionKey,
  shouldHighlightAssignment,
  whoCanAdvanceWorkflow,
} from "@shared/processGuidanceRules";
import { canManageCaseAssignments } from "@shared/portalCapabilities";

export function processGateLabel(
  t: (key: string, opts?: { defaultValue?: string }) => string,
  code: string,
): string {
  const [kind, ...rest] = code.split(":");
  const slug = rest.join(".");
  return t(`process.gate.${kind}.${slug}`, { defaultValue: code });
}

function QuickLinkRow({
  links,
}: {
  links: Array<{ id: string; href: string }>;
}) {
  const { t } = useTranslation();
  if (links.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {links.map((link) =>
        link.href.startsWith("/") ? (
          <Link
            key={link.id}
            to={link.href}
            className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-2.5 text-[11px] font-semibold text-foreground transition hover:border-primary hover:text-primary"
          >
            {t(`process.quickLink.${link.id}`)}
          </Link>
        ) : (
          <a
            key={link.id}
            href={link.href}
            className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-2.5 text-[11px] font-semibold text-foreground transition hover:border-primary hover:text-primary"
          >
            {t(`process.quickLink.${link.id}`)}
          </a>
        ),
      )}
    </div>
  );
}

export default function ProcessTimeline({
  status,
  gateInput,
  serverGate,
  viewerRole,
}: {
  status: CaseStatus;
  gateInput: ProcessGateInput;
  serverGate?: CaseProcessGateSnapshot | null;
  viewerRole?: string | null;
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

  const missing = currentGates?.missing ?? [];
  const gatesOk = currentGates?.ok === true;
  const { actionable: actionableMissing, waiting: waitingMissing } =
    partitionMissingGatesForViewer(missing, viewerRole);
  const guidance =
    current != null
      ? buildNextStepGuidance({
          point: current,
          missingGateCodes: missing,
        })
      : null;
  const raciBuckets = current != null ? processPointRaciBuckets(current) : [];
  const canAdvance = whoCanAdvanceWorkflow(viewerRole);
  const showRaci = canSeeProcessRaciDetail(viewerRole);
  const actionKey = processViewerActionKey(viewerRole);
  const blockedKey = processBlockedHowToKey({
    role: viewerRole,
    missingGateCodes: missing,
  });
  const quickLinks = processQuickLinksForViewer({
    role: viewerRole,
    missingGateCodes: missing,
    gatesOk,
    point: current,
  });
  const showDocsOwnerNote =
    showRaci &&
    guidance?.responsible.includes("law_firm") &&
    missing.some((c) => c.startsWith("doc:"));
  const showAssignmentExplainer =
    showRaci || canManageCaseAssignments(viewerRole);

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

      <ol className="mobile-scroll-x mt-4 flex gap-2 pb-2">
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

      {guidance ? (
        <div className="mt-4 space-y-3 rounded-xl border border-border bg-muted/30 px-3 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {showRaci
                ? t("process.ownershipTitle")
                : t("process.yourActionTitle")}
            </p>
            <p className="mt-1 text-[11px] text-foreground">
              {showRaci
                ? t("process.ownershipIntro", {
                    point: guidance.point,
                    name: t(`process.point.${guidance.point}.name`),
                  })
                : t(`process.yourAction.${actionKey}`, {
                    point: guidance.point,
                    name: t(`process.point.${guidance.point}.name`),
                  })}
            </p>
          </div>
          {showRaci ? (
            <ul className="space-y-1.5">
              {raciBuckets.map((bucket) => (
                <li key={bucket.letter} className="text-[11px]">
                  <span className="font-bold text-primary">
                    {t(`process.raci.${bucket.letter}`)}
                  </span>
                  <span className="text-muted-foreground"> — </span>
                  <span className="font-medium text-foreground">
                    {bucket.actors
                      .map((actor) => t(`process.actor.${actor}`))
                      .join(", ")}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {showRaci ? (
            <p className="text-[11px] text-muted-foreground">
              {canAdvance
                ? t("process.advanceYouCan")
                : t("process.advanceOnlyOps")}
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              {t("process.advanceOnlyOpsShort")}
            </p>
          )}
          {showAssignmentExplainer ? (
            shouldHighlightAssignment(guidance.point) ? (
              <p className="text-[11px] text-foreground">
                {t("process.assignmentHow")}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                {t("process.assignmentLater")}
              </p>
            )
          ) : null}
          {gatesOk ? <QuickLinkRow links={quickLinks} /> : null}
        </div>
      ) : null}

      {current && currentGates && currentGates.ok === false ? (
        <div className="mt-4 rounded-xl border border-border bg-secondary/50 px-3 py-2.5">
          <p className="text-[11px] font-semibold text-foreground">
            {t("process.blockedTitle")}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t(`process.${blockedKey}`)}
          </p>
          <ul className="mt-1.5 space-y-1 pl-0 text-[11px] text-muted-foreground">
            {actionableMissing.map((code) => {
              const link = processGateQuickLink(code, viewerRole);
              return (
                <li key={code} className="flex list-none items-start gap-1">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                  {link ? (
                    <a
                      href={link.href}
                      className="font-medium text-foreground underline-offset-2 hover:text-primary hover:underline"
                    >
                      {processGateLabel(t, code)}
                    </a>
                  ) : (
                    <span className="text-foreground">
                      {processGateLabel(t, code)}
                    </span>
                  )}
                </li>
              );
            })}
            {waitingMissing.map((code) => (
              <li key={code} className="flex list-none items-start gap-1">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                <span>{processGateLabel(t, code)}</span>
              </li>
            ))}
          </ul>
          {guidance?.needsPrimaryExpert && canManageCaseAssignments(viewerRole) ? (
            <p className="mt-2 text-[11px] font-semibold text-foreground">
              {t("process.blockedNeedsAssignment")}
            </p>
          ) : null}
          {showDocsOwnerNote ? (
            <p className="mt-2 text-[11px] text-muted-foreground">
              {t("process.blockedDocsOwner")}
            </p>
          ) : null}
          <QuickLinkRow links={quickLinks} />
        </div>
      ) : current && currentGates?.ok ? (
        <div className="mt-4 rounded-xl border border-border bg-primary/5 px-3 py-2.5">
          <p className="text-[11px] font-semibold text-foreground">
            {t("process.gatesClear")}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {canAdvance
              ? t("process.gatesClearAdvance")
              : t("process.gatesClearWaitOps")}
          </p>
          <QuickLinkRow
            links={quickLinks.filter((l) => l.id === "workflow" || l.id === "assignments")}
          />
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
  questionnaireContentJson?: unknown;
  hasStreetView: boolean;
  hasPropertyGps: boolean;
  plaintiffQuestionnairePresent: boolean;
  inspectionComplete: boolean;
  reportStatus?: string | null;
  logisticsReady: boolean;
  involvesFatality?: boolean;
  hasUnpaidInvoices?: boolean;
  documentsHandoffConfirmed?: boolean;
  ratificationScheduledAt?: string | null;
}): ProcessGateInput {
  return {
    documentCategories: opts.documentCategories,
    evidenceCategories: opts.evidenceCategories,
    hasPrimaryExpert: opts.hasPrimaryExpert,
    questionnaireStatus: opts.questionnaireStatus,
    questionnaireContentJson: opts.questionnaireContentJson,
    hasStreetView: opts.hasStreetView,
    hasPropertyGps: opts.hasPropertyGps,
    plaintiffQuestionnairePresent: opts.plaintiffQuestionnairePresent,
    protestaFiled: opts.documentCategories.includes("protesta"),
    inspectionComplete: opts.inspectionComplete,
    reportStatus: opts.reportStatus,
    ratificationPresent: opts.documentCategories.includes("ratification"),
    courtFilingPresent: opts.documentCategories.includes("court_filing"),
    ratificationScheduledAt: opts.ratificationScheduledAt ?? null,
    logisticsReady: opts.logisticsReady,
    involvesFatality: opts.involvesFatality,
    hasUnpaidInvoices: opts.hasUnpaidInvoices,
    documentsHandoffConfirmed: opts.documentsHandoffConfirmed,
  };
}

export type { ProcessPointId };

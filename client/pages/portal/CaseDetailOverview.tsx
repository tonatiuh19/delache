import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  FileText,
  Wallet,
} from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { buildProcessGateInput } from "@/components/portal/ProcessTimeline";
import {
  buildActionRequiredSummary,
  caseStepPath,
  completedProcessSteps,
  defaultSubsectionForStep,
  flattenStepTree,
  stepVisualStatus,
} from "@shared/caseStepTreeRules";
import {
  isActiveLogisticsTripStatus,
  mergeEvidenceCategories,
  pickCurrentProcessArtifact,
  questionnaireHasStreetView,
  QUESTIONNAIRE_STATUS_RANK,
  REPORT_STATUS_RANK,
} from "@shared/processGates";
import { processPointForStatus, PROCESS_POINTS } from "@shared/processGates";
import { isActiveDocumentStatus } from "@shared/documentCompleteness";
import { canViewCaseSection } from "@shared/portalCapabilities";
import { documentsHandoffConfirmed } from "@shared/handoffRules";
import HandoffPendingNotice from "@/components/portal/case-detail/HandoffPendingNotice";
import { CaseActionRequiredCard } from "@/components/portal/case-detail/CaseDetailStepHero";
import CaseIntakeWorkspace from "@/components/portal/case-detail/CaseIntakeWorkspace";
import CaseSlaStrip from "@/components/portal/case-detail/CaseSlaStrip";
import PortalPageHeader from "@/components/portal/PortalPageHeader";
import { formatStepNavLabel } from "@shared/caseStepNavRules";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

function OverviewStatCard({
  icon: Icon,
  title,
  body,
  actionLabel,
  actionTo,
  className,
}: {
  icon: typeof FileText;
  title: string;
  body: string;
  actionLabel: string;
  actionTo: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-border bg-card p-4 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-primary">
        <Icon size={18} />
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
      </div>
      <p className="mt-2 flex-1 text-sm text-muted-foreground">{body}</p>
      <Link
        to={actionTo}
        className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary transition hover:underline"
      >
        {actionLabel}
        <ArrowRight size={12} />
      </Link>
    </div>
  );
}

export default function CaseDetailOverview() {
  const { t } = useTranslation();
  const { publicUuid = "" } = useParams<{ publicUuid: string }>();
  const role = useAppSelector((s) => s.auth.user?.role);
  const {
    selected,
    documents,
    assignments,
    questionnaires,
    inspections,
    measurements,
    evidence,
    trips,
    technicalReports,
    hasUnpaidInvoices,
    processGate,
  } = useAppSelector((s) => s.cases);

  if (!selected || selected.publicUuid !== publicUuid) return null;

  const currentQuestionnaire = pickCurrentProcessArtifact(
    questionnaires.map((q) => ({
      status: q.status,
      createdAt: q.createdAt,
      contentJson: q.contentJson,
    })),
    QUESTIONNAIRE_STATUS_RANK,
  );
  const currentReport = pickCurrentProcessArtifact(
    technicalReports.map((r) => ({
      status: r.status,
      createdAt: r.createdAt,
    })),
    REPORT_STATUS_RANK,
  );

  const gateInput = buildProcessGateInput({
    documentCategories: documents
      .filter((d) => isActiveDocumentStatus(d.status))
      .map((d) => d.category),
    evidenceCategories: mergeEvidenceCategories(
      evidence.map((e) => e.category),
      measurements.map((m) => m.measurementType),
    ),
    hasPrimaryExpert: assignments.some(
      (a) => a.isPrimary && a.assignmentRole === "expert",
    ),
    questionnaireStatus: currentQuestionnaire?.status ?? null,
    questionnaireContentJson: currentQuestionnaire?.contentJson,
    hasStreetView:
      Boolean(selected.streetViewValidatedAt) ||
      questionnaireHasStreetView(currentQuestionnaire?.contentJson),
    hasPropertyGps:
      selected.propertyLat != null && selected.propertyLng != null,
    plaintiffQuestionnairePresent: documents.some(
      (d) =>
        d.category === "plaintiff_questionnaire" &&
        isActiveDocumentStatus(d.status),
    ),
    inspectionComplete: inspections.some((i) => i.status === "completed"),
    reportStatus: currentReport?.status ?? null,
    logisticsReady: trips.some((trip) => isActiveLogisticsTripStatus(trip.status)),
    involvesFatality: selected.involvesFatality,
    hasUnpaidInvoices,
    documentsHandoffConfirmed: Boolean(selected.documentsHandoffConfirmedAt),
    ratificationScheduledAt: selected.ratificationScheduledAt,
  });

  const actionSummary = buildActionRequiredSummary({
    publicUuid,
    caseStatus: selected.status,
    gateInput,
    serverGate: processGate ?? undefined,
    viewerRole: role,
  });

  const currentPoint = processPointForStatus(selected.status);
  const completed = completedProcessSteps(currentPoint, selected.status);
  const total = flattenStepTree().length;
  const progressPct = Math.round((completed / total) * 100);

  const activeDocs = documents.filter((d) => isActiveDocumentStatus(d.status));
  const inspectionScheduled = inspections.some(
    (i) => i.status === "scheduled" || i.status === "completed",
  );
  const primaryExpert = assignments.find(
    (a) => a.isPrimary && a.assignmentRole === "expert",
  );

  const pointTitle =
    actionSummary != null
      ? formatStepNavLabel(
          actionSummary.point,
          t(`process.point.${actionSummary.point}.name`, {
            defaultValue: `Punto ${actionSummary.point}`,
          }),
        )
      : t("cases.overview.noActiveStep");

  return (
    <div className="space-y-6">
      <PortalPageHeader
        eyebrow={selected.caseNumber}
        title={t("cases.overview.title")}
      />

      {!documentsHandoffConfirmed(selected.documentsHandoffConfirmedAt) &&
      (selected.status === "assignment" ||
        processGate?.missing?.includes("handoff:documents_confirmed")) ? (
        <HandoffPendingNotice
          role={role}
          confirmedAt={selected.documentsHandoffConfirmedAt}
          primaryExpertAssigned={Boolean(primaryExpert)}
          compact
        />
      ) : null}

      <CaseSlaStrip
        status={selected.status}
        listado={selected.listado}
        externalCourtDeadlineAt={selected.externalCourtDeadlineAt}
      />

      <div className="mobile-scroll-x pb-1">
        <ol className="flex min-w-max items-center gap-1">
          {flattenStepTree().map((pointId) => {
            const slug = PROCESS_POINTS[pointId].slug;
            const visual = stepVisualStatus(
              pointId,
              currentPoint,
              selected.status,
            );
            return (
              <li key={pointId} className="flex items-center">
                <Link
                  to={caseStepPath(
                    publicUuid,
                    slug,
                    defaultSubsectionForStep(slug) ?? undefined,
                  )}
                  className={cn(
                    "flex flex-col items-center rounded-xl px-2 py-1.5 transition sm:px-3",
                    visual === "current" && "bg-primary/10",
                    visual !== "current" && "hover:bg-muted/50",
                  )}
                  title={t(`process.point.${pointId}.name`)}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                      visual === "completed" &&
                        "bg-primary/20 text-primary",
                      visual === "current" &&
                        "bg-primary text-primary-foreground",
                      visual === "upcoming" &&
                        "border border-border bg-background text-muted-foreground",
                    )}
                  >
                    {pointId}
                  </span>
                  <span className="mt-1 hidden max-w-[4.5rem] truncate text-[9px] font-semibold text-muted-foreground sm:block">
                    {t(`process.point.${pointId}.name`, {
                      defaultValue: String(pointId),
                    })}
                  </span>
                </Link>
                {pointId !== 10 ? (
                  <span className="mx-0.5 h-px w-3 bg-border sm:w-5" />
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        {selected.status === "intake" ? (
          <div className="min-w-0 lg:col-span-7">
            <CaseIntakeWorkspace publicUuid={publicUuid} />
          </div>
        ) : actionSummary ? (
          <CaseActionRequiredCard
            summary={actionSummary}
            pointTitle={pointTitle}
            className="lg:col-span-7"
          />
        ) : (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-7">
            <p className="text-sm text-muted-foreground">
              {t("cases.overview.terminalState")}
            </p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <ClipboardList size={18} className="text-primary" />
              <h3 className="text-sm font-bold">{t("cases.overview.progress")}</h3>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {t("cases.overview.stepsCompleted", {
                done: completed,
                total,
              })}
            </p>
            <Progress value={progressPct} className="mt-3 h-2" />
          </div>

          <OverviewStatCard
            icon={FileText}
            title={t("cases.overview.documents")}
            body={t("cases.overview.documentsBody", {
              count: activeDocs.length,
            })}
            actionLabel={t("cases.overview.openDocuments")}
            actionTo={caseStepPath(publicUuid, "additional_docs", "documents")}
          />

          <OverviewStatCard
            icon={CalendarDays}
            title={t("cases.overview.inspection")}
            body={
              inspectionScheduled
                ? t("cases.overview.inspectionScheduled")
                : t("cases.overview.inspectionNotScheduled")
            }
            actionLabel={t("cases.overview.openInspection")}
            actionTo={caseStepPath(publicUuid, "field_ops", "inspections")}
          />

          {canViewCaseSection(role, "finance") ? (
          <OverviewStatCard
            icon={Wallet}
            title={t("cases.overview.finance")}
            body={
              hasUnpaidInvoices
                ? t("cases.overview.financePending")
                : t("cases.overview.financeClear")
            }
            actionLabel={t("cases.overview.openAccounting")}
            actionTo={caseStepPath(publicUuid, "accounting", "finance")}
          />
          ) : null}
        </div>
      </div>

      {primaryExpert ? (
        <p className="text-xs text-muted-foreground">
          {t("cases.overview.expertLine", {
            name: primaryExpert.userName,
          })}
        </p>
      ) : null}
    </div>
  );
}
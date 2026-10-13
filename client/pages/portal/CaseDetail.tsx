import { Suspense, useEffect } from "react";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  buildProcessGateInput,
  processGateLabel,
} from "@/components/portal/ProcessTimeline";
import {
  StickyAdvanceBar,
} from "@/components/portal/case-detail/CaseDetailStepHero";
import { CaseStepNavProvider } from "@/components/portal/case-detail/CaseStepNavContext";
import ProtestaModalityPanel from "@/components/portal/case-detail/ProtestaModalityPanel";
import ValidationDeliveryChecklist from "@/components/portal/case-detail/ValidationDeliveryChecklist";
import CaseSlaStrip from "@/components/portal/case-detail/CaseSlaStrip";
import PortalPageHeader from "@/components/portal/PortalPageHeader";
import PdfStepQuestionnaireWorkspace from "@/components/portal/case-detail/pdf-steps/PdfStepQuestionnaireWorkspace";
import PdfStepAssignmentWorkspace from "@/components/portal/case-detail/pdf-steps/PdfStepAssignmentWorkspace";
import PdfStepLegalReviewWorkspace from "@/components/portal/case-detail/pdf-steps/PdfStepLegalReviewWorkspace";
import PdfStepProtestaWorkspace from "@/components/portal/case-detail/pdf-steps/PdfStepProtestaWorkspace";
import PdfStepFieldOpsWorkspace from "@/components/portal/case-detail/pdf-steps/PdfStepFieldOpsWorkspace";
import PdfStepReportWorkspace from "@/components/portal/case-detail/pdf-steps/PdfStepReportWorkspace";
import PdfStepValidationWorkspace from "@/components/portal/case-detail/pdf-steps/PdfStepValidationWorkspace";
import PdfStepAccountingWorkspace from "@/components/portal/case-detail/pdf-steps/PdfStepAccountingWorkspace";
import { isPdfWorkspaceStep } from "@shared/pdfStepWorkspaceRules";
import {
  CaseDetailSectionFallback,
  LazyCaseLocationSection,
  LazyCaseCompletenessSection,
  LazyCaseDeadlinesSection,
  LazyCaseWorkflowSection,
  LazyCaseNotesSection,
  LazyCaseDocumentsSection,
  LazyCaseAssignmentsSection,
  LazyCaseQuestionnaireSection,
  LazyCaseReviewsSection,
  LazyCaseInspectionsSection,
  LazyCaseEvidenceSection,
  LazyCaseLogisticsSection,
  LazyCaseReportsSection,
  LazyCaseFinanceSection,
  LazyCaseAuditSection,
} from "@/components/portal/case-detail/sections";
import {
  clientStepNumber,
  processPointForSlug,
  resolveFocusedSection,
  sectionDomId,
  shouldShowSection,
  type CaseDetailSectionId,
} from "@shared/caseStepTreeRules";
import {
  evaluateProcessGates,
  isActiveLogisticsTripStatus,
  mergeEvidenceCategories,
  pickCurrentProcessArtifact,
  questionnaireHasStreetView,
  QUESTIONNAIRE_STATUS_RANK,
  REPORT_STATUS_RANK,
} from "@shared/processGates";
import { isForwardTransitionBlockedByGates } from "@shared/casePipelineRules";
import { isActiveDocumentStatus } from "@shared/documentCompleteness";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { notifyThunkSave } from "@/utils/formSave";
import {
  canChangeCaseStatus,
  canMutateCaseSection,
  canViewCaseSection,
} from "@shared/portalCapabilities";
import type { CaseStatus, ProtestaModality } from "@shared/api";
import {
  fetchCaseDetail,
  updateCaseFlags,
  updateCaseStatus,
} from "@/store/slices/casesSlice";
import type { ReactNode } from "react";

function SectionSuspense({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<CaseDetailSectionFallback />}>{children}</Suspense>
  );
}

export default function CaseDetailPage() {
  const { publicUuid = "", stepSlug } = useParams<{
    publicUuid: string;
    stepSlug?: string;
  }>();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const focusedSection = resolveFocusedSection(
    stepSlug,
    searchParams.get("section"),
  );
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const {
    selected,
    documents,
    assignments,
    questionnaires,
    inspections,
    measurements,
    evidence,
    technicalReports,
    trips,
    deadlines,
    documentCompleteness,
    processGate,
    statusGateMissing,
    allowedNextStatuses,
    hasUnpaidInvoices,
    updatingStatus,
    error,
  } = useAppSelector((s) => s.cases);
  const role = useAppSelector((s) => s.auth.user?.role);

  const showSection = (sectionId: CaseDetailSectionId) =>
    shouldShowSection(sectionId, stepSlug, false, focusedSection);

  useEffect(() => {
    if (!focusedSection) return;
    const id = sectionDomId(focusedSection);
    let cancelled = false;
    let tries = 0;
    const tick = () => {
      if (cancelled) return;
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      // Lazy sections may still be suspending — retry briefly.
      if (tries++ < 60) {
        requestAnimationFrame(tick);
      }
    };
    const frame = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [focusedSection, location.pathname, location.search]);

  const onStatus = async (status: CaseStatus, reason?: string) => {
    const result = await dispatch(
      updateCaseStatus({
        publicUuid,
        status,
        reason: reason?.trim() || undefined,
      }),
    );
    if (
      notifyThunkSave(result, {
        successTitle: t("cases.statusSaveSuccess"),
        failureTitle: t("cases.statusSaveFailed"),
        fallbackError: "status_failed",
      })
    ) {
      await dispatch(fetchCaseDetail(publicUuid));
    }
  };

  if (!selected || selected.publicUuid !== publicUuid) {
    return null;
  }

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
    logisticsReady: trips.some((trip) =>
      isActiveLogisticsTripStatus(trip.status),
    ),
    involvesFatality: selected.involvesFatality,
    hasUnpaidInvoices,
    documentsHandoffConfirmed: Boolean(selected.documentsHandoffConfirmedAt),
    ratificationScheduledAt: selected.ratificationScheduledAt,
  });

  const stepPoint = stepSlug ? processPointForSlug(stepSlug) : null;
  const stepGatesOk =
    stepPoint != null
      ? evaluateProcessGates(stepPoint, gateInput).ok
      : null;

  const showProtestaModality =
    selected.status === "court_acceptance" ||
    stepSlug === "court_acceptance" ||
    stepPoint === 6;
  const showP9Checklist =
    selected.status === "validation_delivery" ||
    stepSlug === "validation_delivery" ||
    stepSlug === "court_delivery" ||
    stepPoint === 9;

  const gatesOk = Boolean(processGate?.ok ?? stepGatesOk);
  const forwardStatus = allowedNextStatuses.find(
    (s) =>
      !isForwardTransitionBlockedByGates({
        fromStatus: selected.status,
        toStatus: s,
        gatesOk,
      }),
  );

  const intakeEditor =
    stepSlug === "intake" &&
    (focusedSection === "documents" || focusedSection == null);
  const pdfWorkspace = isPdfWorkspaceStep(stepSlug);

  if (pdfWorkspace && stepPoint != null && stepSlug) {
    const workspace =
      stepSlug === "questionnaire" ? (
        <PdfStepQuestionnaireWorkspace publicUuid={publicUuid} />
      ) : stepSlug === "assignment" ? (
        <PdfStepAssignmentWorkspace publicUuid={publicUuid} />
      ) : stepSlug === "legal_review_questionnaire" ? (
        <PdfStepLegalReviewWorkspace publicUuid={publicUuid} />
      ) : stepSlug === "court_acceptance" ? (
        <PdfStepProtestaWorkspace publicUuid={publicUuid} />
      ) :       stepSlug === "field_ops" ? (
        <PdfStepFieldOpsWorkspace publicUuid={publicUuid} />
      ) : stepSlug === "technical_report" ? (
        <PdfStepReportWorkspace publicUuid={publicUuid} />
      ) : stepSlug === "validation_delivery" ? (
        <PdfStepValidationWorkspace publicUuid={publicUuid} />
      ) : stepSlug === "accounting" ? (
        <PdfStepAccountingWorkspace publicUuid={publicUuid} />
      ) : null;
    if (workspace) {
      return (
        <CaseStepNavProvider
          point={stepPoint}
          stepSlug={stepSlug}
          viewerRole={role}
          activeSection={focusedSection}
        >
          {workspace}
        </CaseStepNavProvider>
      );
    }
  }

  const detailBody = (
    <div className="min-w-0 max-w-full space-y-5 overflow-x-clip xl:space-y-6">
      <PortalPageHeader
        eyebrow={selected.caseNumber}
        title={
          stepPoint != null
            ? `${clientStepNumber(stepPoint)} · ${t(`process.point.${stepPoint}.name`)}`
            : selected.title
        }
      />
      {intakeEditor ? null : (
      <CaseSlaStrip
        status={selected.status}
        listado={selected.listado}
        externalCourtDeadlineAt={selected.externalCourtDeadlineAt}
      />
      )}

      {showProtestaModality ? (
        <ProtestaModalityPanel
          modality={selected.protestaModality}
          protestaFiled={Boolean(selected.listado?.protestaFiled)}
          canEdit={Boolean(canChangeCaseStatus(role) || role === "expert")}
          saving={updatingStatus}
          publicUuid={publicUuid}
          documents={documents}
          canUpload={Boolean(
            canMutateCaseSection(role, "documents") &&
              (canChangeCaseStatus(role) || role === "expert"),
          )}
          onUploaded={() => {
            void dispatch(fetchCaseDetail(publicUuid));
          }}
          onChange={(next: ProtestaModality) => {
            void (async () => {
              const result = await dispatch(
                updateCaseFlags({
                  publicUuid,
                  protestaModality: next,
                }),
              );
              if (
                notifyThunkSave(result, {
                  successTitle: t("cases.flagsSaveSuccess", {
                    defaultValue: "Case flags saved",
                  }),
                  failureTitle: t("cases.flagsFailed"),
                  fallbackError: "flags_failed",
                })
              ) {
                await dispatch(fetchCaseDetail(publicUuid));
              }
            })();
          }}
        />
      ) : null}

      {showP9Checklist ? (
        <ValidationDeliveryChecklist
          listado={selected.listado}
          hasCourtFiling={documents.some(
            (d) =>
              d.category === "court_filing" &&
              isActiveDocumentStatus(d.status),
          )}
          hasRatificationPdf={documents.some(
            (d) =>
              d.category === "ratification" &&
              isActiveDocumentStatus(d.status),
          )}
          publicUuid={publicUuid}
          documents={documents}
          canUpload={Boolean(canMutateCaseSection(role, "documents"))}
          onUploaded={() => {
            void dispatch(fetchCaseDetail(publicUuid));
          }}
        />
      ) : null}

      {error ? (
        <div className="text-xs text-destructive" role="alert">
          <p>
            {error === "Process gates not satisfied"
              ? t("process.gatesBlocked")
              : error === "flags_failed"
                ? t("cases.flagsFailed")
                : error === "category_failed"
                  ? t("cases.categoryFailed")
                  : error}
          </p>
          {statusGateMissing.length > 0 ? (
            <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
              {statusGateMissing.map((code) => (
                <li key={code}>{processGateLabel(t, code)}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {showSection("location") ? (
        <SectionSuspense>
          <LazyCaseLocationSection publicUuid={publicUuid} />
        </SectionSuspense>
      ) : null}

      {showSection("completeness") &&
      documentCompleteness &&
      canViewCaseSection(role, "completeness") &&
      (!canViewCaseSection(role, "documents") ||
        focusedSection === "completeness") ? (
        <SectionSuspense>
          <LazyCaseCompletenessSection
            publicUuid={publicUuid}
            focusedSection={focusedSection}
          />
        </SectionSuspense>
      ) : null}

      {showSection("deadlines") &&
      deadlines.length > 0 &&
      canViewCaseSection(role, "deadlines") ? (
        <SectionSuspense>
          <LazyCaseDeadlinesSection publicUuid={publicUuid} />
        </SectionSuspense>
      ) : null}

      {(showSection("workflow") || showSection("timeline")) &&
      (canViewCaseSection(role, "workflow") ||
        canViewCaseSection(role, "timeline")) ? (
        <SectionSuspense>
          <LazyCaseWorkflowSection publicUuid={publicUuid} />
        </SectionSuspense>
      ) : null}

      {showSection("notes") && canViewCaseSection(role, "notes") ? (
        <SectionSuspense>
          <LazyCaseNotesSection publicUuid={publicUuid} />
        </SectionSuspense>
      ) : null}

      {showSection("documents") && canViewCaseSection(role, "documents") ? (
        <SectionSuspense>
          <LazyCaseDocumentsSection publicUuid={publicUuid} />
        </SectionSuspense>
      ) : null}

      <div className="flex min-w-0 max-w-full flex-col gap-6 overflow-x-clip">
        {showSection("assignments") &&
        canViewCaseSection(role, "assignments") ? (
          <SectionSuspense>
            <LazyCaseAssignmentsSection publicUuid={publicUuid} />
          </SectionSuspense>
        ) : null}

        {showSection("questionnaire") &&
        canViewCaseSection(role, "questionnaire") ? (
          <SectionSuspense>
            <LazyCaseQuestionnaireSection publicUuid={publicUuid} />
          </SectionSuspense>
        ) : null}

        {showSection("reviews") && canViewCaseSection(role, "reviews") ? (
          <SectionSuspense>
            <LazyCaseReviewsSection publicUuid={publicUuid} />
          </SectionSuspense>
        ) : null}

        {showSection("inspections") &&
        canViewCaseSection(role, "inspections") ? (
          <SectionSuspense>
            <LazyCaseInspectionsSection publicUuid={publicUuid} />
          </SectionSuspense>
        ) : null}

        {showSection("evidence") && canViewCaseSection(role, "evidence") ? (
          <SectionSuspense>
            <LazyCaseEvidenceSection publicUuid={publicUuid} />
          </SectionSuspense>
        ) : null}

        {showSection("logistics") && canViewCaseSection(role, "logistics") ? (
          <SectionSuspense>
            <LazyCaseLogisticsSection publicUuid={publicUuid} />
          </SectionSuspense>
        ) : null}

        {showSection("reports") && canViewCaseSection(role, "reports") ? (
          <SectionSuspense>
            <LazyCaseReportsSection publicUuid={publicUuid} />
          </SectionSuspense>
        ) : null}

        {showSection("finance") && canViewCaseSection(role, "finance") ? (
          <SectionSuspense>
            <LazyCaseFinanceSection publicUuid={publicUuid} />
          </SectionSuspense>
        ) : null}

        {showSection("audit") && canViewCaseSection(role, "audit") ? (
          <SectionSuspense>
            <LazyCaseAuditSection publicUuid={publicUuid} />
          </SectionSuspense>
        ) : null}
      </div>

      <StickyAdvanceBar
        publicUuid={publicUuid}
        stepSlug={stepSlug}
        gatesOk={gatesOk}
        viewerRole={role}
        nextStatusLabel={
          forwardStatus
            ? t(`cases.status.${forwardStatus}`, {
                defaultValue: forwardStatus,
              })
            : null
        }
        advancing={updatingStatus}
        onAdvance={
          forwardStatus
            ? (reason) => {
                void onStatus(forwardStatus, reason);
              }
            : undefined
        }
      />
    </div>
  );

  if (stepPoint != null && stepSlug) {
    return (
      <CaseStepNavProvider
        point={stepPoint}
        stepSlug={stepSlug}
        viewerRole={role}
        activeSection={focusedSection}
      >
        {detailBody}
      </CaseStepNavProvider>
    );
  }

  return detailBody;
}

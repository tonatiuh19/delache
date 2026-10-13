import { Suspense, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import CasePdfStepShell from "@/components/portal/case-detail/CasePdfStepShell";
import { buildCasePdfSummary } from "@/components/portal/case-detail/pdf-steps/buildCasePdfSummary";
import {
  CaseDetailSectionFallback,
  LazyCaseAssignmentsSection,
  LazyCaseNotesSection,
} from "@/components/portal/case-detail/sections";
import CategoryDocumentAttach from "@/components/portal/case-detail/CategoryDocumentAttach";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { notifyThunkSave } from "@/utils/formSave";
import {
  fetchCaseDetail,
  updateCaseStatus,
} from "@/store/slices/casesSlice";
import {
  canChangeCaseStatus,
  canMutateCaseSection,
} from "@shared/portalCapabilities";

export default function PdfStepAssignmentWorkspace({
  publicUuid,
}: {
  publicUuid: string;
}) {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const { selected, assignments, documents, allowedNextStatuses } =
    useAppSelector((s) => s.cases);
  const role = useAppSelector((s) => s.auth.user?.role);
  const [sending, setSending] = useState(false);
  const hasExpert = assignments.some(
    (a) => a.isPrimary && a.assignmentRole === "expert",
  );
  const canSend = hasExpert && canChangeCaseStatus(role);

  const summary = useMemo(() => {
    if (!selected) return [];
    return buildCasePdfSummary({
      t,
      locale: i18n.language,
      selected,
      assignments,
    });
  }, [assignments, i18n.language, selected, t]);

  if (!selected) return null;

  return (
    <CasePdfStepShell
      stepSlug="assignment"
      title={t("cases.pdfStep.assignment.title")}
      subtitle={t("cases.pdfStep.assignment.subtitle")}
      summary={summary}
      acceptedFormats={t("cases.pdfStep.assignment.formats")}
      onSendHint={t("cases.pdfStep.assignment.onSend")}
      sendLabel={t("cases.pdfStep.assignment.send")}
      sending={sending}
      canSend={canSend}
      onSend={() => {
        void (async () => {
          const next =
            allowedNextStatuses.find(
              (s) => s === "legal_review_questionnaire",
            ) ?? allowedNextStatuses[0];
          if (!next) return;
          setSending(true);
          try {
            const result = await dispatch(
              updateCaseStatus({ publicUuid, status: next }),
            );
            if (
              notifyThunkSave(result, {
                successTitle: t("cases.pdfStep.sent"),
                failureTitle: t("cases.statusFailed", {
                  defaultValue: "Could not update status",
                }),
                fallbackError: "status_failed",
              })
            ) {
              void dispatch(fetchCaseDetail(publicUuid));
            }
          } finally {
            setSending(false);
          }
        })();
      }}
    >
      <CategoryDocumentAttach
        publicUuid={publicUuid}
        category="questionnaire"
        documents={documents}
        canUpload={canMutateCaseSection(role, "documents")}
        title={t("cases.pdfStep.assignment.questionnaireReview")}
        onUploaded={() => void dispatch(fetchCaseDetail(publicUuid))}
      />
      <Suspense fallback={<CaseDetailSectionFallback />}>
        <LazyCaseAssignmentsSection publicUuid={publicUuid} />
      </Suspense>
      <Suspense fallback={<CaseDetailSectionFallback />}>
        <LazyCaseNotesSection publicUuid={publicUuid} />
      </Suspense>
    </CasePdfStepShell>
  );
}

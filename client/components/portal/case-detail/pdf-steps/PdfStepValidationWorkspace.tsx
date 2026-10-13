import { Suspense, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import CasePdfStepShell from "@/components/portal/case-detail/CasePdfStepShell";
import { buildCasePdfSummary } from "@/components/portal/case-detail/pdf-steps/buildCasePdfSummary";
import ValidationDeliveryChecklist from "@/components/portal/case-detail/ValidationDeliveryChecklist";
import {
  CaseDetailSectionFallback,
  LazyCaseDeadlinesSection,
  LazyCaseNotesSection,
  LazyCaseReportsSection,
  LazyCaseReviewsSection,
} from "@/components/portal/case-detail/sections";
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
import { isActiveDocumentStatus } from "@shared/documentCompleteness";
import { isPdfValidationDeliveryReady } from "@shared/pdfStepWorkspaceRules";

export default function PdfStepValidationWorkspace({
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

  const hasCourtFiling = documents.some(
    (d) =>
      d.category === "court_filing" && isActiveDocumentStatus(d.status),
  );
  const hasRatificationPdf = documents.some(
    (d) =>
      d.category === "ratification" && isActiveDocumentStatus(d.status),
  );
  const canSend =
    canChangeCaseStatus(role) &&
    isPdfValidationDeliveryReady({
      listado: selected?.listado,
      hasCourtFiling,
      hasRatificationPdf,
    });

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
      stepSlug="validation_delivery"
      title={t("cases.pdfStep.validation.title")}
      subtitle={t("cases.pdfStep.validation.subtitle")}
      summary={summary}
      acceptedFormats={t("cases.pdfStep.validation.formats")}
      onSendHint={t("cases.pdfStep.validation.onSend")}
      sendLabel={t("cases.pdfStep.validation.send")}
      sending={sending}
      canSend={canSend}
      onSend={() => {
        void (async () => {
          const next =
            allowedNextStatuses.find((s) => s === "accounting") ??
            allowedNextStatuses[0];
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
      <ValidationDeliveryChecklist
        listado={selected.listado}
        hasCourtFiling={hasCourtFiling}
        hasRatificationPdf={hasRatificationPdf}
        publicUuid={publicUuid}
        documents={documents}
        canUpload={canMutateCaseSection(role, "documents")}
        onUploaded={() => void dispatch(fetchCaseDetail(publicUuid))}
      />
      <Suspense fallback={<CaseDetailSectionFallback />}>
        <LazyCaseReviewsSection publicUuid={publicUuid} />
      </Suspense>
      <Suspense fallback={<CaseDetailSectionFallback />}>
        <LazyCaseReportsSection publicUuid={publicUuid} />
      </Suspense>
      <Suspense fallback={<CaseDetailSectionFallback />}>
        <LazyCaseDeadlinesSection publicUuid={publicUuid} />
      </Suspense>
      <Suspense fallback={<CaseDetailSectionFallback />}>
        <LazyCaseNotesSection publicUuid={publicUuid} />
      </Suspense>
    </CasePdfStepShell>
  );
}

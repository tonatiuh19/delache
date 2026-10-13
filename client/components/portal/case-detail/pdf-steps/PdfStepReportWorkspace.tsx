import { Suspense, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import CasePdfStepShell from "@/components/portal/case-detail/CasePdfStepShell";
import { buildCasePdfSummary } from "@/components/portal/case-detail/pdf-steps/buildCasePdfSummary";
import {
  CaseDetailSectionFallback,
  LazyCaseNotesSection,
  LazyCaseReportsSection,
} from "@/components/portal/case-detail/sections";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { notifyThunkSave } from "@/utils/formSave";
import {
  fetchCaseDetail,
  updateCaseStatus,
} from "@/store/slices/casesSlice";
import { canChangeCaseStatus } from "@shared/portalCapabilities";
import { isActiveDocumentStatus } from "@shared/documentCompleteness";
import { isPdfTechnicalReportReady } from "@shared/pdfStepWorkspaceRules";

export default function PdfStepReportWorkspace({
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

  const hasReportPdf = documents.some(
    (d) =>
      d.category === "technical_report" && isActiveDocumentStatus(d.status),
  );
  const canSend =
    canChangeCaseStatus(role) &&
    isPdfTechnicalReportReady({
      hasReportPdf,
      reportInternalOk: selected?.listado?.reportInternalOk,
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
      stepSlug="technical_report"
      title={t("cases.pdfStep.report.title")}
      subtitle={t("cases.pdfStep.report.subtitle")}
      summary={summary}
      acceptedFormats={t("cases.pdfStep.report.formats")}
      onSendHint={t("cases.pdfStep.report.onSend")}
      sendLabel={t("cases.pdfStep.report.send")}
      sending={sending}
      canSend={canSend}
      onSend={() => {
        void (async () => {
          const next =
            allowedNextStatuses.find((s) => s === "validation_delivery") ??
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
      <Suspense fallback={<CaseDetailSectionFallback />}>
        <LazyCaseReportsSection publicUuid={publicUuid} />
      </Suspense>
      <Suspense fallback={<CaseDetailSectionFallback />}>
        <LazyCaseNotesSection publicUuid={publicUuid} />
      </Suspense>
    </CasePdfStepShell>
  );
}

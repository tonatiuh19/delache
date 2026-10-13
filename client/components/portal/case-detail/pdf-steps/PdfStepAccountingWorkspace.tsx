import { Suspense, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import CasePdfStepShell from "@/components/portal/case-detail/CasePdfStepShell";
import { buildCasePdfSummary } from "@/components/portal/case-detail/pdf-steps/buildCasePdfSummary";
import {
  CaseDetailSectionFallback,
  LazyCaseAuditSection,
  LazyCaseFinanceSection,
  LazyCaseNotesSection,
} from "@/components/portal/case-detail/sections";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { notifyThunkSave } from "@/utils/formSave";
import {
  fetchCaseDetail,
  updateCaseStatus,
} from "@/store/slices/casesSlice";
import { canApplyCaseStatusChange } from "@shared/portalCapabilities";
import { isPdfAccountingReady } from "@shared/pdfStepWorkspaceRules";

export default function PdfStepAccountingWorkspace({
  publicUuid,
}: {
  publicUuid: string;
}) {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const { selected, assignments, allowedNextStatuses } = useAppSelector(
    (s) => s.cases,
  );
  const role = useAppSelector((s) => s.auth.user?.role);
  const [sending, setSending] = useState(false);

  const nextStatus =
    allowedNextStatuses.find((s) => s === "completed") ??
    allowedNextStatuses[0];
  const canSend =
    Boolean(selected && nextStatus) &&
    canApplyCaseStatusChange(role, selected?.status ?? "", nextStatus ?? "") &&
    isPdfAccountingReady({ listado: selected?.listado });

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
      stepSlug="accounting"
      title={t("cases.pdfStep.accounting.title")}
      subtitle={t("cases.pdfStep.accounting.subtitle")}
      summary={summary}
      acceptedFormats={t("cases.pdfStep.accounting.formats")}
      onSendHint={t("cases.pdfStep.accounting.onSend")}
      sendLabel={t("cases.pdfStep.accounting.send")}
      sending={sending}
      canSend={canSend}
      onSend={() => {
        void (async () => {
          if (!nextStatus) return;
          setSending(true);
          try {
            const result = await dispatch(
              updateCaseStatus({ publicUuid, status: nextStatus }),
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
        <LazyCaseFinanceSection publicUuid={publicUuid} />
      </Suspense>
      <Suspense fallback={<CaseDetailSectionFallback />}>
        <LazyCaseAuditSection publicUuid={publicUuid} />
      </Suspense>
      <Suspense fallback={<CaseDetailSectionFallback />}>
        <LazyCaseNotesSection publicUuid={publicUuid} />
      </Suspense>
    </CasePdfStepShell>
  );
}

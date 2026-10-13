import { Suspense, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import CasePdfStepShell from "@/components/portal/case-detail/CasePdfStepShell";
import { buildCasePdfSummary } from "@/components/portal/case-detail/pdf-steps/buildCasePdfSummary";
import ProtestaModalityPanel from "@/components/portal/case-detail/ProtestaModalityPanel";
import {
  CaseDetailSectionFallback,
  LazyCaseDeadlinesSection,
  LazyCaseNotesSection,
} from "@/components/portal/case-detail/sections";
import CategoryDocumentAttach from "@/components/portal/case-detail/CategoryDocumentAttach";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { notifyThunkSave } from "@/utils/formSave";
import {
  fetchCaseDetail,
  updateCaseFlags,
  updateCaseStatus,
} from "@/store/slices/casesSlice";
import {
  canChangeCaseStatus,
  canMutateCaseSection,
} from "@shared/portalCapabilities";
import type { ProtestaModality } from "@shared/api";
import { isActiveDocumentStatus } from "@shared/documentCompleteness";

export default function PdfStepProtestaWorkspace({
  publicUuid,
}: {
  publicUuid: string;
}) {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const { selected, assignments, documents, allowedNextStatuses, updatingStatus } =
    useAppSelector((s) => s.cases);
  const role = useAppSelector((s) => s.auth.user?.role);
  const [sending, setSending] = useState(false);

  const hasProtesta = documents.some(
    (d) => d.category === "protesta" && isActiveDocumentStatus(d.status),
  );
  const hasPlaintiffQ = documents.some(
    (d) =>
      d.category === "plaintiff_questionnaire" &&
      isActiveDocumentStatus(d.status),
  );
  const fatalityOk =
    !selected?.involvesFatality ||
    documents.some(
      (d) =>
        d.category === "death_certificate" &&
        isActiveDocumentStatus(d.status),
    );
  const canSend =
    Boolean(selected?.protestaModality) &&
    hasProtesta &&
    hasPlaintiffQ &&
    fatalityOk;

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
      stepSlug="court_acceptance"
      title={t("cases.pdfStep.protesta.title")}
      subtitle={t("cases.pdfStep.protesta.subtitle")}
      summary={summary}
      acceptedFormats={t("cases.pdfStep.protesta.formats")}
      onSendHint={t("cases.pdfStep.protesta.onSend")}
      sending={sending}
      canSend={canSend}
      onSend={() => {
        void (async () => {
          const next =
            allowedNextStatuses.find((s) => s === "field_ops") ??
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
        onUploaded={() => void dispatch(fetchCaseDetail(publicUuid))}
        onChange={(next: ProtestaModality) => {
          void (async () => {
            const result = await dispatch(
              updateCaseFlags({ publicUuid, protestaModality: next }),
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
              void dispatch(fetchCaseDetail(publicUuid));
            }
          })();
        }}
      />
      <CategoryDocumentAttach
        publicUuid={publicUuid}
        category="plaintiff_questionnaire"
        documents={documents}
        canUpload={canMutateCaseSection(role, "documents")}
        title={t("cases.docCategory.plaintiff_questionnaire")}
        onUploaded={() => void dispatch(fetchCaseDetail(publicUuid))}
      />
      {selected.involvesFatality ? (
        <CategoryDocumentAttach
          publicUuid={publicUuid}
          category="death_certificate"
          documents={documents}
          canUpload={canMutateCaseSection(role, "documents")}
          title={t("cases.docCategory.death_certificate")}
          onUploaded={() => void dispatch(fetchCaseDetail(publicUuid))}
        />
      ) : null}
      <Suspense fallback={<CaseDetailSectionFallback />}>
        <LazyCaseDeadlinesSection publicUuid={publicUuid} />
      </Suspense>
      <Suspense fallback={<CaseDetailSectionFallback />}>
        <LazyCaseNotesSection publicUuid={publicUuid} />
      </Suspense>
    </CasePdfStepShell>
  );
}

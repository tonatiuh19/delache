import { Suspense, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import CasePdfStepShell from "@/components/portal/case-detail/CasePdfStepShell";
import { buildCasePdfSummary } from "@/components/portal/case-detail/pdf-steps/buildCasePdfSummary";
import {
  CaseDetailSectionFallback,
  LazyCaseNotesSection,
  LazyCaseReviewsSection,
} from "@/components/portal/case-detail/sections";
import CategoryDocumentAttach from "@/components/portal/case-detail/CategoryDocumentAttach";
import QuestionnaireDocEditor from "@/components/portal/QuestionnaireDocEditor";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { notifyThunkSave } from "@/utils/formSave";
import {
  createQuestionnaire,
  fetchCaseDetail,
  updateCaseStatus,
} from "@/store/slices/casesSlice";
import {
  pickCurrentProcessArtifact,
  QUESTIONNAIRE_STATUS_RANK,
} from "@shared/processGates";
import {
  editorHtmlFromContentJson,
  mergeQuestionnaireEditorHtml,
} from "@shared/questionnaireDocxRules";
import { canMutateCaseSection } from "@shared/portalCapabilities";

export default function PdfStepLegalReviewWorkspace({
  publicUuid,
}: {
  publicUuid: string;
}) {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const {
    selected,
    assignments,
    documents,
    questionnaires,
    allowedNextStatuses,
  } = useAppSelector((s) => s.cases);
  const role = useAppSelector((s) => s.auth.user?.role);
  const [sending, setSending] = useState(false);
  const [drafting, setDrafting] = useState(false);

  const currentQ = pickCurrentProcessArtifact(
    questionnaires.map((q) => ({
      status: q.status,
      createdAt: q.createdAt,
      contentJson: q.contentJson,
    })),
    QUESTIONNAIRE_STATUS_RANK,
  );
  const [editorHtml, setEditorHtml] = useState(() =>
    editorHtmlFromContentJson(
      currentQ?.contentJson as Record<string, unknown> | undefined,
    ),
  );

  const canEdit =
    canMutateCaseSection(role, "questionnaire") ||
    canMutateCaseSection(role, "documents");

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
      stepSlug="legal_review_questionnaire"
      title={t("cases.pdfStep.legalReview.title")}
      subtitle={t("cases.pdfStep.legalReview.subtitle")}
      summary={summary}
      acceptedFormats={t("cases.pdfStep.legalReview.formats")}
      onSendHint={t("cases.pdfStep.legalReview.onSend")}
      sendLabel={t("cases.pdfStep.legalReview.send")}
      drafting={drafting}
      sending={sending}
      canDraft={canEdit}
      canSend={canEdit}
      onDraft={() => {
        void (async () => {
          setDrafting(true);
          try {
            const result = await dispatch(
              createQuestionnaire({
                publicUuid,
                contentJson: mergeQuestionnaireEditorHtml(
                  (currentQ?.contentJson as Record<string, unknown>) ?? {},
                  editorHtml,
                ),
                submit: false,
              }),
            );
            if (
              notifyThunkSave(result, {
                successTitle: t("cases.pdfStep.draftSaved"),
                failureTitle: t("cases.intakeCreate.saveFailed"),
                fallbackError: "questionnaire_failed",
              })
            ) {
              void dispatch(fetchCaseDetail(publicUuid));
            }
          } finally {
            setDrafting(false);
          }
        })();
      }}
      onSend={() => {
        void (async () => {
          setSending(true);
          try {
            await dispatch(
              createQuestionnaire({
                publicUuid,
                contentJson: mergeQuestionnaireEditorHtml(
                  (currentQ?.contentJson as Record<string, unknown>) ?? {},
                  editorHtml,
                ),
                submit: false,
              }),
            );
            const next =
              allowedNextStatuses.find((s) => s === "court_acceptance") ??
              allowedNextStatuses[0];
            if (!next) return;
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
        title={t("cases.pdfStep.legalReview.questionnaireCard")}
        onUploaded={() => void dispatch(fetchCaseDetail(publicUuid))}
      />
      <QuestionnaireDocEditor
        value={editorHtml}
        onChange={setEditorHtml}
        disabled={!canEdit}
      />
      <Suspense fallback={<CaseDetailSectionFallback />}>
        <LazyCaseReviewsSection publicUuid={publicUuid} />
      </Suspense>
      <Suspense fallback={<CaseDetailSectionFallback />}>
        <LazyCaseNotesSection publicUuid={publicUuid} />
      </Suspense>
    </CasePdfStepShell>
  );
}

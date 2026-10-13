import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Camera, FileText, MapPin, MessageSquare } from "lucide-react";
import CasePdfStepShell from "@/components/portal/case-detail/CasePdfStepShell";
import { buildCasePdfSummary } from "@/components/portal/case-detail/pdf-steps/buildCasePdfSummary";
import CategoryDocumentAttach from "@/components/portal/case-detail/CategoryDocumentAttach";
import QuestionnaireDocEditor from "@/components/portal/QuestionnaireDocEditor";
import LocationMapPanel from "@/components/portal/LocationMapPanel";
import DocumentDropzone from "@/components/portal/DocumentDropzone";
import { StagedFileList } from "@/components/portal/LocalFileDraft";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { notifyThunkSave } from "@/utils/formSave";
import { toast } from "@/hooks/use-toast";
import {
  createQuestionnaire,
  fetchCaseDetail,
  updateCaseStatus,
  uploadCaseDocumentsSmart,
} from "@/store/slices/casesSlice";
import {
  pickCurrentProcessArtifact,
  QUESTIONNAIRE_STATUS_RANK,
} from "@shared/processGates";
import { PDF_STEP_NOTE_MAX } from "@shared/pdfStepWorkspaceRules";
import {
  editorHtmlFromContentJson,
  isQuestionnaireEditorReady,
  mergeQuestionnaireEditorHtml,
} from "@shared/questionnaireDocxRules";
import { docxFileToHtml, htmlToDocxFile } from "@/utils/questionnaireDocx";
import { isBlobTokenMissingError } from "@shared/documentDmsRules";
import { canMutateCaseSection } from "@shared/portalCapabilities";
import { isActiveDocumentStatus } from "@shared/documentCompleteness";
import {
  isQuestionnaireDocxName,
  isQuestionnairePdfName,
} from "@shared/questionnaireContentRules";

export default function PdfStepQuestionnaireWorkspace({
  publicUuid,
}: {
  publicUuid: string;
}) {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const {
    selected,
    questionnaires,
    documents,
    assignments,
    allowedNextStatuses,
  } = useAppSelector((s) => s.cases);
  const role = useAppSelector((s) => s.auth.user?.role);
  const canEdit = canMutateCaseSection(role, "questionnaire");
  const canUpload = canMutateCaseSection(role, "documents");

  const currentQ = pickCurrentProcessArtifact(
    questionnaires.map((q) => ({
      status: q.status,
      createdAt: q.createdAt,
      contentJson: q.contentJson,
    })),
    QUESTIONNAIRE_STATUS_RANK,
  );
  const qRow =
    questionnaires.find(
      (q) =>
        q.status === currentQ?.status && q.createdAt === currentQ?.createdAt,
    ) ?? questionnaires[0];

  const [editorHtmlState, setEditorHtmlState] = useState(() =>
    editorHtmlFromContentJson(
      currentQ?.contentJson as Record<string, unknown> | undefined,
    ),
  );
  const [note, setNote] = useState(qRow?.technicalObservations ?? "");
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [docxStaged, setDocxStaged] = useState<File[]>([]);
  const [pdfStaged, setPdfStaged] = useState<File[]>([]);
  const [streetStaged, setStreetStaged] = useState<File[]>([]);

  const lat = selected?.propertyLat ?? null;
  const lng = selected?.propertyLng ?? null;

  const questionnaireFiles = documents.filter(
    (d) =>
      d.category === "questionnaire" && isActiveDocumentStatus(d.status),
  );
  const hasDocx =
    questionnaireFiles.some((d) =>
      isQuestionnaireDocxName(d.fileName, d.mimeType),
    ) || docxStaged.length > 0;
  const hasPdf =
    questionnaireFiles.some((d) =>
      isQuestionnairePdfName(d.fileName, d.mimeType),
    ) || pdfStaged.length > 0;
  const hasStreet =
    documents.some(
      (d) =>
        d.category === "street_view" && isActiveDocumentStatus(d.status),
    ) || streetStaged.length > 0;

  const canSend =
    Boolean(selected) &&
    canEdit &&
    isQuestionnaireEditorReady(editorHtmlState) &&
    hasDocx &&
    hasPdf &&
    hasStreet &&
    lat != null &&
    lng != null;

  const summary = useMemo(() => {
    if (!selected) return [];
    return buildCasePdfSummary({
      t,
      locale: i18n.language,
      selected,
      assignments,
    });
  }, [assignments, i18n.language, selected, t]);

  const refresh = () => void dispatch(fetchCaseDetail(publicUuid));

  const uploadBatch = async (
    files: File[],
    category: "questionnaire" | "street_view",
  ) => {
    if (files.length === 0) return true;
    const result = await dispatch(
      uploadCaseDocumentsSmart({ publicUuid, files, category }),
    );
    if (uploadCaseDocumentsSmart.fulfilled.match(result)) {
      if (result.payload.failures.length > 0) {
        toast({
          title: t("documents.partialUpload", {
            ok: result.payload.documents.length,
            failed: result.payload.failures.length,
          }),
          variant: "destructive",
        });
        return false;
      }
      return true;
    }
    const message = String(result.payload || "upload_failed");
    toast({
      title: t("documents.uploadFailed"),
      description: isBlobTokenMissingError(message)
        ? t("documents.blobNotConfigured")
        : message,
      variant: "destructive",
    });
    return false;
  };

  const persistDraft = async () => {
    if (!selected) return false;
    setDrafting(true);
    try {
      const contentJson = mergeQuestionnaireEditorHtml(
        (currentQ?.contentJson as Record<string, unknown>) ?? {},
        editorHtmlState,
      );
      const qResult = await dispatch(
        createQuestionnaire({
          publicUuid,
          contentJson,
          technicalObservations: note.trim() || undefined,
          submit: false,
        }),
      );
      if (!createQuestionnaire.fulfilled.match(qResult)) {
        notifyThunkSave(qResult, {
          failureTitle: t("cases.intakeCreate.saveFailed"),
          fallbackError: "questionnaire_failed",
        });
        return false;
      }

      let generatedDocx: File | null = null;
      if (docxStaged.length === 0 && isQuestionnaireEditorReady(editorHtmlState)) {
        generatedDocx = await htmlToDocxFile(
          editorHtmlState,
          `cuestionario_${selected.caseNumber}.docx`,
        );
      }
      const docxOk = await uploadBatch(
        generatedDocx ? [...docxStaged, generatedDocx] : docxStaged,
        "questionnaire",
      );
      const pdfOk = await uploadBatch(pdfStaged, "questionnaire");
      const streetOk = await uploadBatch(streetStaged, "street_view");
      if (!docxOk || !pdfOk || !streetOk) return false;
      setDocxStaged([]);
      setPdfStaged([]);
      setStreetStaged([]);
      refresh();
      toast({ title: t("cases.pdfStep.draftSaved") });
      return true;
    } finally {
      setDrafting(false);
    }
  };

  const onSend = async () => {
    if (!canSend || !selected) return;
    setSending(true);
    try {
      const ok = await persistDraft();
      if (!ok) return;
      const next =
        allowedNextStatuses.find((s) => s === "assignment") ??
        allowedNextStatuses[0];
      if (!next) {
        toast({
          title: t("cases.pdfStep.noNextStatus"),
          variant: "destructive",
        });
        return;
      }
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
        refresh();
      }
    } finally {
      setSending(false);
    }
  };

  if (!selected) return null;

  return (
    <CasePdfStepShell
      stepSlug="questionnaire"
      title={t("cases.pdfStep.questionnaire.title")}
      subtitle={t("cases.pdfStep.questionnaire.subtitle")}
      summary={summary}
      acceptedFormats={t("cases.pdfStep.questionnaire.formats")}
      onSendHint={t("cases.pdfStep.questionnaire.onSend")}
      drafting={drafting}
      sending={sending}
      canDraft={canEdit}
      canSend={canSend}
      onDraft={() => void persistDraft()}
      onSend={() => void onSend()}
    >
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <MapPin size={16} />
          </span>
          <h2 className="text-sm font-bold">
            {t("cases.pdfStep.questionnaire.locationTitle")}
          </h2>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {t("cases.pdfStep.questionnaire.locationHint")}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-xs font-semibold text-muted-foreground">
                {t("cases.latLabel", { defaultValue: "Latitud" })}
                <input
                  className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  value={lat ?? ""}
                  readOnly
                />
              </label>
              <label className="text-xs font-semibold text-muted-foreground">
                {t("cases.lngLabel", { defaultValue: "Longitud" })}
                <input
                  className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  value={lng ?? ""}
                  readOnly
                />
              </label>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t("cases.pdfStep.questionnaire.locationEditHint")}
            </p>
          </div>
          <LocationMapPanel
            mapSize="large"
            lat={lat}
            lng={lng}
            label={selected.propertyAddress || selected.title}
          />
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Camera size={16} />
            </span>
            <h2 className="text-sm font-bold">
              {t("cases.pdfStep.questionnaire.streetViewTitle")}
            </h2>
          </div>
          <div className="mt-3 space-y-3">
            <StagedFileList
              files={streetStaged}
              onRemove={(i) =>
                setStreetStaged((c) => c.filter((_, idx) => idx !== i))
              }
            />
            {canUpload ? (
              <DocumentDropzone
                compact
                showSizeLegend={false}
                onFiles={(files) =>
                  setStreetStaged((c) => [...c, ...files])
                }
              />
            ) : null}
            <CategoryDocumentAttach
              publicUuid={publicUuid}
              category="street_view"
              documents={documents}
              canUpload={false}
              title={t("cases.docCategory.street_view")}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <FileText size={16} />
            </span>
            <h2 className="text-sm font-bold">
              {t("cases.pdfStep.questionnaire.questionnaireTitle")}
            </h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("cases.pdfStep.questionnaire.bothFilesHint")}
          </p>
          <div className="mt-3 space-y-3">
            <StagedFileList
              files={[...docxStaged, ...pdfStaged]}
              onRemove={(i) => {
                const all = [...docxStaged, ...pdfStaged];
                const file = all[i];
                if (!file) return;
                if (docxStaged.includes(file)) {
                  setDocxStaged((c) => c.filter((f) => f !== file));
                } else {
                  setPdfStaged((c) => c.filter((f) => f !== file));
                }
              }}
            />
            {canUpload ? (
              <DocumentDropzone
                compact
                showSizeLegend={false}
                onFiles={(files) => {
                  void (async () => {
                    for (const file of files) {
                      if (isQuestionnaireDocxName(file.name, file.type)) {
                        setDocxStaged((c) => [...c, file]);
                        try {
                          const html = await docxFileToHtml(file);
                          setEditorHtmlState(html);
                        } catch {
                          /* keep editor */
                        }
                      } else if (isQuestionnairePdfName(file.name, file.type)) {
                        setPdfStaged((c) => [...c, file]);
                      } else {
                        toast({
                          title: t("cases.pdfStep.questionnaire.badFile"),
                          variant: "destructive",
                        });
                      }
                    }
                  })();
                }}
              />
            ) : null}
            <CategoryDocumentAttach
              publicUuid={publicUuid}
              category="questionnaire"
              documents={documents}
              canUpload={false}
              title={t("cases.docCategory.questionnaire")}
            />
          </div>
        </section>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-bold">
          {t("cases.pdfStep.questionnaire.editorTitle")}
        </h2>
        <QuestionnaireDocEditor
          value={editorHtmlState}
          onChange={setEditorHtmlState}
          disabled={!canEdit}
        />
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <MessageSquare size={16} />
          </span>
          <h2 className="text-sm font-bold">{t("cases.pdfStep.notesTitle")}</h2>
        </div>
        <textarea
          rows={4}
          maxLength={PDF_STEP_NOTE_MAX}
          value={note}
          disabled={!canEdit}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("cases.pdfStep.notesPlaceholder")}
          className="mt-3 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70"
        />
        <p className="mt-1 text-right text-[11px] text-muted-foreground">
          {note.length} / {PDF_STEP_NOTE_MAX}
        </p>
      </section>
    </CasePdfStepShell>
  );
}

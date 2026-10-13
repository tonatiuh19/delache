import { useTranslation } from "react-i18next";
import { FileText } from "lucide-react";
import { useFormik } from "formik";
import { cn } from "@/lib/utils";
import CaseDetailSectionPanel from "@/components/portal/case-detail/CaseDetailSectionPanel";
import CategoryDocumentAttach from "@/components/portal/case-detail/CategoryDocumentAttach";
import {
  CaseDetailFormCard,
  CaseDetailSplitBody,
  caseDetailFieldClass,
  caseDetailFormGrid3Class,
} from "@/components/portal/case-detail/caseDetailFormLayout";
import PendingSubmitButton from "@/components/portal/PendingSubmitButton";
import DatePicker from "@/components/ui/date-picker";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { notifyThunkSave } from "@/utils/formSave";
import { toast } from "@/hooks/use-toast";
import {
  canUpsertQuestionnaire,
  pickCurrentProcessArtifact,
  QUESTIONNAIRE_STATUS_RANK,
} from "@shared/processGates";
import {
  isQuestionnaireDocxName,
  isQuestionnairePdfName,
  normalizeChronologyJson,
  readQuestionnaireContent,
  STREET_VIEW_PREEXISTENCE_VALUES,
  validateQuestionnaireSubmitContent,
} from "@shared/questionnaireContentRules";
import {
  googleStreetViewUrl,
  parseGpsText,
} from "@shared/locationRules";
import type { QuestionnaireStatus } from "@shared/api";
import { canMutateCaseSection } from "@shared/portalCapabilities";
import { isActiveDocumentStatus } from "@shared/documentCompleteness";
import {
  createQuestionnaire,
  fetchCaseDetail,
  updateCaseLocation,
  updateQuestionnaireStatus,
} from "@/store/slices/casesSlice";
import type { CaseDetailSectionProps } from "./caseDetailSectionShared";

export default function CaseQuestionnaireSection({
  publicUuid,
}: CaseDetailSectionProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { selected, questionnaires, documents } = useAppSelector((s) => s.cases);
  const role = useAppSelector((s) => s.auth.user?.role);

  const refreshDetail = () => {
    if (publicUuid) void dispatch(fetchCaseDetail(publicUuid));
  };

  const formQuestionnaire = pickCurrentProcessArtifact(
    questionnaires.map((q) => ({
      status: q.status,
      createdAt: q.createdAt,
      contentJson: q.contentJson,
    })),
    QUESTIONNAIRE_STATUS_RANK,
  );
  const formQJson = (formQuestionnaire?.contentJson ?? {}) as Record<
    string,
    unknown
  >;
  const formQContent = readQuestionnaireContent(formQJson);
  const formQRow =
    questionnaires.find(
      (q) =>
        q.status === formQuestionnaire?.status &&
        q.createdAt === formQuestionnaire?.createdAt,
    ) ?? questionnaires[0];
  const formChronology =
    normalizeChronologyJson(formQRow?.chronologyJson) ?? [];
  const canEditQuestionnaire =
    !formQuestionnaire || canUpsertQuestionnaire(formQuestionnaire.status);
  const canUploadQuestionnairePdf = canMutateCaseSection(role, "documents");
  const questionnaireFiles = documents.filter(
    (d) =>
      d.category === "questionnaire" && isActiveDocumentStatus(d.status),
  );
  const hasQuestionnairePdf = questionnaireFiles.some((d) =>
    isQuestionnairePdfName(d.fileName, d.mimeType),
  );
  const hasQuestionnaireDocx = questionnaireFiles.some((d) =>
    isQuestionnaireDocxName(d.fileName, d.mimeType),
  );

  const questionnaireForm = useFormik({
    enableReinitialize: true,
    initialValues: {
      propertyGps: String(formQContent.propertyGps ?? ""),
      streetView: String(
        formQContent.streetViewValidated ?? formQContent.streetView ?? "",
      ),
      streetViewPreexistence: String(formQContent.streetViewPreexistence ?? ""),
      chronologyEntries:
        formChronology.length > 0
          ? formChronology.map((e) => ({
              date: e.date ?? "",
              event: e.event ?? "",
            }))
          : [{ date: "", event: "" }],
      observations: formQRow?.technicalObservations ?? "",
      editorBody: String(formQContent.defendantQuestionnaire ?? ""),
      submit: true,
    },
    onSubmit: async (values) => {
      if (values.submit) {
        const check = validateQuestionnaireSubmitContent(
          {
            propertyGps: values.propertyGps.trim(),
            streetViewValidated: values.streetView.trim(),
            streetViewPreexistence:
              values.streetViewPreexistence.trim() || undefined,
            defendantQuestionnaire: values.editorBody.trim(),
          },
          {
            hasQuestionnairePdf,
            hasQuestionnaireDocx,
            requireLiveEditor: true,
          },
        );
        if (check.ok === false) {
          toast({
            title: t("cases.questionnaireSaveFailed"),
            description: check.error,
            variant: "destructive",
          });
          return;
        }
      }
      const chronologyJson = normalizeChronologyJson(values.chronologyEntries);
      const result = await dispatch(
        createQuestionnaire({
          publicUuid,
          submit: values.submit,
          technicalObservations: values.observations.trim() || undefined,
          chronologyJson: chronologyJson ?? undefined,
          contentJson: {
            propertyGps: values.propertyGps.trim(),
            streetViewValidated: values.streetView.trim(),
            streetViewPreexistence:
              values.streetViewPreexistence.trim() || undefined,
            defendantQuestionnaire: values.editorBody.trim(),
          },
        }),
      );
      if (
        notifyThunkSave(result, {
          successTitle: t("cases.questionnaireSaveSuccess"),
          failureTitle: t("cases.questionnaireSaveFailed"),
          fallbackError: "questionnaire_failed",
        })
      ) {
        refreshDetail();
      }
    },
  });

  const persistPropertyCoords = async (lat: number, lng: number) => {
    if (!selected) return;
    const result = await dispatch(
      updateCaseLocation({
        publicUuid,
        propertyAddress: selected.propertyAddress,
        propertyCity: selected.propertyCity,
        propertyState: selected.propertyState,
        propertyPostalCode: selected.propertyPostalCode,
        propertyCountry: selected.propertyCountry || "MX",
        propertyLat: lat,
        propertyLng: lng,
      }),
    );
    if (updateCaseLocation.fulfilled.match(result)) {
      toast({ title: t("maps.locationSaved") });
      refreshDetail();
    } else {
      toast({
        title: t("maps.locationSaveFailed"),
        variant: "destructive",
      });
    }
  };

  if (!selected || selected.publicUuid !== publicUuid) return null;

  return (
    <CaseDetailSectionPanel
      id="case-questionnaire"
      sectionId="questionnaire"
      title={t("cases.questionnaire")}
      icon={<FileText size={18} />}
      helper={t("help.caseDetail.questionnaire")}
    >
      {!canEditQuestionnaire ? (
        <p className="mb-4 text-sm text-muted-foreground">
          {t("cases.questionnaireLocked")}
        </p>
      ) : null}
      <CategoryDocumentAttach
        publicUuid={publicUuid}
        category="questionnaire"
        documents={documents}
        canUpload={canUploadQuestionnairePdf && canEditQuestionnaire}
        title={t("cases.questionnaireAttachTitle")}
        hint={t("cases.questionnaireAttachHint")}
        className="mb-5"
        onUploaded={refreshDetail}
      />
      <CaseDetailSplitBody
        showAside={questionnaires.length > 0}
        primary={
          <CaseDetailFormCard title={t("cases.saveQuestionnaire")}>
            <form
              onSubmit={questionnaireForm.handleSubmit}
              className={caseDetailFormGrid3Class}
            >
              <label className="sm:col-span-2 lg:col-span-3 text-sm font-semibold text-foreground">
                {t("cases.questionnaireEditorTitle")}
                <textarea
                  name="editorBody"
                  value={questionnaireForm.values.editorBody}
                  onChange={questionnaireForm.handleChange}
                  disabled={!canEditQuestionnaire}
                  rows={8}
                  placeholder={t("cases.questionnaireEditorPlaceholder")}
                  className={cn(
                    caseDetailFieldClass,
                    "mt-1.5 min-h-[10rem] py-3 disabled:opacity-60",
                  )}
                />
              </label>
              <div className="sm:col-span-2 lg:col-span-3">
                <input
                  name="propertyGps"
                  value={questionnaireForm.values.propertyGps}
                  onChange={questionnaireForm.handleChange}
                  disabled={!canEditQuestionnaire}
                  placeholder={t("cases.gpsPlaceholder")}
                  className={cn(caseDetailFieldClass, "disabled:opacity-60")}
                />
              </div>
              <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
                <button
                  type="button"
                  className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-semibold"
                  onClick={() => {
                    const parsed = parseGpsText(
                      questionnaireForm.values.propertyGps,
                    );
                    if (parsed.ok === false) {
                      toast({
                        title: t("maps.invalidGpsText"),
                        variant: "destructive",
                      });
                      return;
                    }
                    void persistPropertyCoords(parsed.lat, parsed.lng);
                  }}
                >
                  {t("maps.applyGpsToProperty")}
                </button>
                <button
                  type="button"
                  className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-semibold"
                  onClick={() => {
                    const parsed = parseGpsText(
                      questionnaireForm.values.propertyGps,
                    );
                    if (parsed.ok === false) {
                      toast({
                        title: t("maps.invalidGpsText"),
                        variant: "destructive",
                      });
                      return;
                    }
                    const url = googleStreetViewUrl({
                      lat: parsed.lat,
                      lng: parsed.lng,
                    });
                    if (url) window.open(url, "_blank", "noreferrer");
                  }}
                >
                  {t("maps.streetView")}
                </button>
              </div>
              <input
                name="streetView"
                value={questionnaireForm.values.streetView}
                onChange={questionnaireForm.handleChange}
                disabled={!canEditQuestionnaire}
                placeholder={t("cases.streetViewPlaceholder")}
                className={cn(caseDetailFieldClass, "disabled:opacity-60")}
              />
              <select
                name="streetViewPreexistence"
                value={questionnaireForm.values.streetViewPreexistence}
                onChange={questionnaireForm.handleChange}
                disabled={!canEditQuestionnaire}
                className={cn(caseDetailFieldClass, "disabled:opacity-60")}
              >
                <option value="">
                  {t("cases.streetViewPreexistencePlaceholder")}
                </option>
                {STREET_VIEW_PREEXISTENCE_VALUES.map((v) => (
                  <option key={v} value={v}>
                    {t(`cases.streetViewPreexistence.${v}`, {
                      defaultValue: v,
                    })}
                  </option>
                ))}
              </select>
              <div className="sm:col-span-2 lg:col-span-3">
                <p className="text-sm font-semibold text-muted-foreground">
                  {t("cases.chronologyTitle")}
                </p>
                <ul className="mt-3 space-y-2">
                  {questionnaireForm.values.chronologyEntries.map((_, idx) => (
                    <li
                      key={idx}
                      className="grid gap-2 sm:grid-cols-[10rem_1fr_auto]"
                    >
                      <DatePicker
                        value={
                          questionnaireForm.values.chronologyEntries[idx]
                            ?.date ?? ""
                        }
                        disabled={!canEditQuestionnaire}
                        allowClear={false}
                        onChange={(next) => {
                          const nextEntries = [
                            ...questionnaireForm.values.chronologyEntries,
                          ];
                          nextEntries[idx] = {
                            ...nextEntries[idx],
                            date: next,
                          };
                          void questionnaireForm.setFieldValue(
                            "chronologyEntries",
                            nextEntries,
                          );
                        }}
                      />
                      <input
                        value={
                          questionnaireForm.values.chronologyEntries[idx]
                            ?.event ?? ""
                        }
                        disabled={!canEditQuestionnaire}
                        placeholder={t("cases.chronologyEventPlaceholder")}
                        onChange={(e) => {
                          const next = [
                            ...questionnaireForm.values.chronologyEntries,
                          ];
                          next[idx] = {
                            ...next[idx],
                            event: e.target.value,
                          };
                          void questionnaireForm.setFieldValue(
                            "chronologyEntries",
                            next,
                          );
                        }}
                        className={cn(
                          caseDetailFieldClass,
                          "disabled:opacity-60",
                        )}
                      />
                      {canEditQuestionnaire &&
                      questionnaireForm.values.chronologyEntries.length > 1 ? (
                        <button
                          type="button"
                          className="h-11 rounded-xl border border-border px-3 text-xs font-semibold text-destructive"
                          onClick={() => {
                            void questionnaireForm.setFieldValue(
                              "chronologyEntries",
                              questionnaireForm.values.chronologyEntries.filter(
                                (_, i) => i !== idx,
                              ),
                            );
                          }}
                        >
                          {t("cases.chronologyRemove")}
                        </button>
                      ) : (
                        <div />
                      )}
                    </li>
                  ))}
                </ul>
                {canEditQuestionnaire ? (
                  <button
                    type="button"
                    className="mt-2 text-xs font-semibold text-primary"
                    onClick={() => {
                      void questionnaireForm.setFieldValue("chronologyEntries", [
                        ...questionnaireForm.values.chronologyEntries,
                        { date: "", event: "" },
                      ]);
                    }}
                  >
                    {t("cases.chronologyAdd")}
                  </button>
                ) : null}
              </div>
              <textarea
                name="observations"
                rows={2}
                value={questionnaireForm.values.observations}
                onChange={questionnaireForm.handleChange}
                disabled={!canEditQuestionnaire}
                placeholder={t("cases.observationsPlaceholder")}
                className={cn(
                  "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm disabled:opacity-60 sm:col-span-2 lg:col-span-3",
                )}
              />
              <PendingSubmitButton
                pending={questionnaireForm.isSubmitting}
                disabled={!canEditQuestionnaire}
                className="h-11 bg-accent text-accent-foreground sm:col-span-2 lg:col-span-3"
              >
                {t("cases.saveQuestionnaire")}
              </PendingSubmitButton>
            </form>
          </CaseDetailFormCard>
        }
        aside={
          <ul className="space-y-3">
            {questionnaires.map((q) => (
              <li
                key={q.publicUuid}
                className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm"
              >
                <div className="font-semibold">
                  {t(`cases.questionnaireStatus.${q.status}`, {
                    defaultValue: q.status,
                  })}
                  {q.submittedAt
                    ? ` · ${new Date(q.submittedAt).toLocaleString()}`
                    : ""}
                </div>
                {(q.allowedNextStatuses?.length ?? 0) > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {q.allowedNextStatuses!.map((st) => (
                      <button
                        key={st}
                        type="button"
                        className="rounded-full border border-border px-2 py-1 text-[10px] font-semibold hover:border-primary hover:text-primary"
                        onClick={() =>
                          void dispatch(
                            updateQuestionnaireStatus({
                              publicUuid,
                              questionnaireUuid: q.publicUuid,
                              status: st as QuestionnaireStatus,
                            }),
                          ).then(() => {
                            void dispatch(fetchCaseDetail(publicUuid));
                          })
                        }
                      >
                        →{" "}
                        {t(`cases.questionnaireStatus.${st}`, {
                          defaultValue: st,
                        })}
                      </button>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        }
      />
    </CaseDetailSectionPanel>
  );
}

import { useRef, useState } from "react";
import { useFormik } from "formik";
import { useTranslation } from "react-i18next";
import { Camera, Crosshair, FileUp, Trash2 } from "lucide-react";
import DocumentPreviewSheet, {
  type PreviewableDocument,
} from "@/components/portal/DocumentPreviewSheet";
import DigitalSignaturePad, {
  type SignatureExport,
} from "@/components/portal/DigitalSignaturePad";
import LocationMapPanel from "@/components/portal/LocationMapPanel";
import LocationPermissionModal from "@/components/portal/LocationPermissionModal";
import CaseDetailSectionPanel from "@/components/portal/case-detail/CaseDetailSectionPanel";
import EvidenceChecklistGuide from "@/components/portal/case-detail/EvidenceChecklistGuide";
import {
  CaseDetailFormCard,
  CaseDetailSplitBody,
  caseDetailFieldClass,
  caseDetailFormGridClass,
} from "@/components/portal/case-detail/caseDetailFormLayout";
import PendingSubmitButton from "@/components/portal/PendingSubmitButton";
import { LocalFileRow } from "@/components/portal/LocalFileDraft";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { notifyThunkSave } from "@/utils/formSave";
import { fileToBase64 } from "@/utils/documentOcr";
import { requestDevicePosition, queryLocationPermission } from "@/utils/geolocation";
import {
  EVIDENCE_CATEGORIES,
  EVIDENCE_TYPES,
  evidenceRequiresFile,
} from "@shared/evidenceRules";
import {
  LOCATION_PROMPT_DISMISS_KEY,
  shouldSkipModalAndCapture,
} from "@shared/locationPermissionRules";
import { softParallelAllowed } from "@shared/softParallelRules";
import type { EvidenceCategory, EvidenceType } from "@shared/api";
import {
  createEvidence,
  deleteEvidence,
  fetchCaseDetail,
} from "@/store/slices/casesSlice";
import type { CaseDetailSectionProps } from "./caseDetailSectionShared";

export default function CaseEvidenceSection({
  publicUuid,
}: CaseDetailSectionProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { selected, evidence, evidenceChecklist, inspections } = useAppSelector(
    (s) => s.cases,
  );
  const signatureExportRef = useRef<(() => SignatureExport) | null>(null);
  const [signaturePadKey, setSignaturePadKey] = useState(0);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationPromptOpen, setLocationPromptOpen] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [evidencePreview, setEvidencePreview] =
    useState<PreviewableDocument | null>(null);

  const refreshDetail = () => {
    if (publicUuid) void dispatch(fetchCaseDetail(publicUuid));
  };

  const evidenceForm = useFormik({
    initialValues: {
      evidenceType: "photo" as EvidenceType,
      category: "facade" as EvidenceCategory,
      title: "",
      caption: "",
      lat: "",
      lng: "",
    },
    onSubmit: async (values, helpers) => {
      const isSignature = values.evidenceType === "signature";
      const needsFile = evidenceRequiresFile(values.evidenceType);
      if (isSignature) {
        const exported = signatureExportRef.current?.();
        if (!exported || exported.isEmpty) {
          helpers.setStatus(t("signature.required"));
          return;
        }
        helpers.setStatus(undefined);
        const lat = values.lat.trim() === "" ? null : Number(values.lat);
        const lng = values.lng.trim() === "" ? null : Number(values.lng);
        const result = await dispatch(
          createEvidence({
            publicUuid,
            evidenceType: values.evidenceType,
            category: values.category,
            title: values.title.trim() || undefined,
            caption: values.caption.trim() || undefined,
            inspectionId: inspections[0]?.id ?? null,
            lat,
            lng,
            fileName: exported.fileName,
            contentType: exported.contentType,
            data: exported.dataBase64,
          }),
        );
        if (
          notifyThunkSave(result, {
            successTitle: t("cases.evidenceSaveSuccess"),
            failureTitle: t("cases.evidenceSaveFailed"),
            fallbackError: "evidence_failed",
          })
        ) {
          helpers.resetForm();
          setEvidenceFile(null);
          setSignaturePadKey((k) => k + 1);
          refreshDetail();
        }
        return;
      }
      if (needsFile && !evidenceFile) {
        helpers.setStatus(t("cases.evidenceFileRequired"));
        return;
      }
      helpers.setStatus(undefined);
      const lat = values.lat.trim() === "" ? null : Number(values.lat);
      const lng = values.lng.trim() === "" ? null : Number(values.lng);
      const payload: Parameters<typeof createEvidence>[0] = {
        publicUuid,
        evidenceType: values.evidenceType,
        category: values.category,
        title: values.title.trim() || undefined,
        caption: values.caption.trim() || undefined,
        inspectionId: inspections[0]?.id ?? null,
        lat,
        lng,
      };
      if (evidenceFile) {
        payload.fileName = evidenceFile.name;
        payload.contentType = evidenceFile.type || "application/octet-stream";
        payload.data = await fileToBase64(evidenceFile);
      }
      const result = await dispatch(createEvidence(payload));
      if (
        notifyThunkSave(result, {
          successTitle: t("cases.evidenceSaveSuccess"),
          failureTitle: t("cases.evidenceSaveFailed"),
          fallbackError: "evidence_failed",
        })
      ) {
        helpers.resetForm();
        setEvidenceFile(null);
        refreshDetail();
      }
    },
  });

  const applyDevicePosition = async () => {
    setLocating(true);
    setLocationStatus(null);
    const pos = await requestDevicePosition();
    setLocating(false);
    if (pos.ok === false) {
      setLocationStatus(
        pos.code === "permission_denied"
          ? t("maps.permissionDenied")
          : pos.code === "unsupported"
            ? t("maps.unsupported")
            : t("maps.locationFailed"),
      );
      return;
    }
    await evidenceForm.setFieldValue("lat", String(pos.lat));
    await evidenceForm.setFieldValue("lng", String(pos.lng));
    setLocationStatus(t("maps.coordsFilled"));
  };

  const openLocationPromptOrCapture = async () => {
    const permission = await queryLocationPermission();
    if (shouldSkipModalAndCapture(permission)) {
      await applyDevicePosition();
      return;
    }
    if (permission === "denied") {
      setLocationStatus(t("maps.permissionDenied"));
      return;
    }
    setLocationPromptOpen(true);
  };

  const dismissLocationPrompt = () => {
    setLocationPromptOpen(false);
    try {
      sessionStorage.setItem(LOCATION_PROMPT_DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  if (!selected || selected.publicUuid !== publicUuid) return null;

  const evidenceAllowed = softParallelAllowed(
    selected.status,
    "upload_field_evidence",
    { holdResumeStatus: selected.listado?.holdResumeStatus },
  );
  const latestGpsEvidence = [...evidence]
    .reverse()
    .find((item) => item.lat != null && item.lng != null);

  return (
    <>
      {locationStatus ? (
        <p className="mb-2 text-xs text-muted-foreground">{locationStatus}</p>
      ) : null}
      <CaseDetailSectionPanel
        id="case-evidence"
      sectionId="evidence"
        title={t("cases.evidence")}
        icon={<Camera size={18} />}
        helper={t("help.caseDetail.evidence")}
        headerAside={
          evidenceChecklist ? (
            <p className="text-sm text-muted-foreground">
              {t("cases.evidenceChecklistProgress", {
                covered: evidenceChecklist.coveredCount,
                total: evidenceChecklist.totalCount,
              })}
              {evidenceChecklist.complete
                ? ` · ${t("cases.evidenceChecklistComplete")}`
                : ""}
            </p>
          ) : null
        }
      >
        {!evidenceAllowed ? (
          <p className="mb-4 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {t("cases.softParallel.evidenceLocked")}
          </p>
        ) : null}
        <EvidenceChecklistGuide checklist={evidenceChecklist} />
        {evidenceChecklist && evidenceChecklist.missing.length > 0 && (
          <p className="mb-4 text-sm text-muted-foreground">
            {t("cases.evidenceChecklistMissing")}:{" "}
            {evidenceChecklist.missing
              .map((c) =>
                t(`cases.evidenceCategory.${c}`, { defaultValue: c }),
              )
              .join(", ")}
          </p>
        )}
        <CaseDetailSplitBody
          showAside={evidence.length > 0 || Boolean(latestGpsEvidence)}
          primary={
            evidenceAllowed ? (
            <CaseDetailFormCard title={t("cases.addEvidence")}>
              <form
                onSubmit={evidenceForm.handleSubmit}
                className={caseDetailFormGridClass}
              >
                <select
                  name="evidenceType"
                  value={evidenceForm.values.evidenceType}
                  onChange={evidenceForm.handleChange}
                  className={caseDetailFieldClass}
                >
                  {EVIDENCE_TYPES.map((et) => (
                    <option key={et} value={et}>
                      {t(`cases.evidenceType.${et}`, { defaultValue: et })}
                    </option>
                  ))}
                </select>
                <select
                  name="category"
                  value={evidenceForm.values.category}
                  onChange={evidenceForm.handleChange}
                  className={caseDetailFieldClass}
                >
                  {EVIDENCE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {t(`cases.evidenceCategory.${cat}`, {
                        defaultValue: cat,
                      })}
                    </option>
                  ))}
                </select>
                <input
                  name="title"
                  value={evidenceForm.values.title}
                  onChange={evidenceForm.handleChange}
                  placeholder={t("cases.evidenceTitle")}
                  className={caseDetailFieldClass}
                />
                <input
                  name="caption"
                  value={evidenceForm.values.caption}
                  onChange={evidenceForm.handleChange}
                  placeholder={t("cases.evidenceCaption")}
                  className={caseDetailFieldClass}
                />
                <input
                  name="lat"
                  value={evidenceForm.values.lat}
                  onChange={evidenceForm.handleChange}
                  placeholder={t("cases.evidenceLat")}
                  className={caseDetailFieldClass}
                />
                <input
                  name="lng"
                  value={evidenceForm.values.lng}
                  onChange={evidenceForm.handleChange}
                  placeholder={t("cases.evidenceLng")}
                  className={caseDetailFieldClass}
                />
                <button
                  type="button"
                  disabled={locating}
                  onClick={() => void openLocationPromptOrCapture()}
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-semibold sm:col-span-2 lg:col-span-2 xl:col-span-2 disabled:opacity-50"
                >
                  <Crosshair className="h-3.5 w-3.5" />
                  {t("maps.useMyLocation")}
                </button>
                {evidenceForm.values.evidenceType === "signature" ? (
                  <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
                    <DigitalSignaturePad
                      key={signaturePadKey}
                      exportRef={signatureExportRef}
                    />
                  </div>
                ) : (
                  <div className="space-y-2 sm:col-span-2 lg:col-span-3 xl:col-span-4">
                    {evidenceFile ? (
                      <LocalFileRow
                        file={evidenceFile}
                        onRemove={() => setEvidenceFile(null)}
                      />
                    ) : null}
                    <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border bg-background px-3 text-xs text-muted-foreground">
                      <FileUp className="h-3.5 w-3.5" />
                      {evidenceFile
                        ? t("cases.intakeCreate.replace")
                        : t("cases.evidencePickFile")}
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,video/*,audio/*,.pdf"
                        onChange={(e) => {
                          setEvidenceFile(e.target.files?.[0] ?? null);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                )}
                {evidenceForm.status && (
                  <p className="text-xs text-destructive sm:col-span-2 lg:col-span-3 xl:col-span-4">
                    {String(evidenceForm.status)}
                  </p>
                )}
                <PendingSubmitButton
                  pending={evidenceForm.isSubmitting}
                  className="h-11 bg-accent text-accent-foreground sm:col-span-2 lg:col-span-1 xl:col-span-1"
                >
                  {t("cases.addEvidence")}
                </PendingSubmitButton>
              </form>
            </CaseDetailFormCard>
            ) : (
              <p className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                {t("cases.softParallel.evidenceLocked")}
              </p>
            )
          }
          aside={
            <div className="space-y-4">
              {latestGpsEvidence ? (
                <LocationMapPanel
                  mapSize="large"
                  lat={latestGpsEvidence.lat}
                  lng={latestGpsEvidence.lng}
                  label={
                    latestGpsEvidence.title ||
                    latestGpsEvidence.caption ||
                    undefined
                  }
                />
              ) : null}
              <ul className="grid gap-3 sm:grid-cols-2">
                {evidence.length === 0 && (
                  <li className="text-sm text-muted-foreground sm:col-span-2">
                    {t("cases.noEvidence")}
                  </li>
                )}
                {evidence.map((item) => (
                  <li
                    key={item.publicUuid}
                    className="flex items-start justify-between gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold">
                        {t(`cases.evidenceType.${item.evidenceType}`, {
                          defaultValue: item.evidenceType,
                        })}
                        {" · "}
                        {t(`cases.evidenceCategory.${item.category}`, {
                          defaultValue: item.category,
                        })}
                      </div>
                      {(item.title || item.caption) && (
                        <div className="mt-0.5 text-muted-foreground">
                          {item.title || item.caption}
                        </div>
                      )}
                      {item.lat != null && item.lng != null && (
                        <div className="mt-0.5 text-muted-foreground">
                          {item.lat}, {item.lng}
                        </div>
                      )}
                      {item.storageKey && (
                        <button
                          type="button"
                          onClick={() =>
                            setEvidencePreview({
                              publicUuid: item.publicUuid,
                              title:
                                item.title ||
                                item.caption ||
                                t(`cases.evidenceType.${item.evidenceType}`, {
                                  defaultValue: item.evidenceType,
                                }),
                              mimeType: item.mimeType,
                              storageKey: item.storageKey,
                            })
                          }
                          className="mt-1 inline-block text-left text-accent underline"
                        >
                          {t("cases.open")}
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label={t("cases.removeEvidence")}
                      onClick={() =>
                        void dispatch(
                          deleteEvidence({
                            publicUuid,
                            evidenceUuid: item.publicUuid,
                          }),
                        ).then(() => refreshDetail())
                      }
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          }
        />
      </CaseDetailSectionPanel>

      <DocumentPreviewSheet
        open={Boolean(evidencePreview)}
        document={evidencePreview}
        onOpenChange={(open) => {
          if (!open) setEvidencePreview(null);
        }}
      />

      <LocationPermissionModal
        open={locationPromptOpen}
        target="evidence"
        locating={locating}
        onOpenChange={(open) => {
          if (!open) dismissLocationPrompt();
          else setLocationPromptOpen(true);
        }}
        onAllow={() => void applyDevicePosition().then(() => setLocationPromptOpen(false))}
        onNotNow={dismissLocationPrompt}
      />
    </>
  );
}

import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  ArrowLeft,
  Crosshair,
  FileUp,
  MapPinned,
  MessageSquarePlus,
  Trash2,
} from "lucide-react";
import MetaHelmet from "@/components/MetaHelmet";
import { CaseDetailSkeleton } from "@/components/portal/PortalSkeletons";
import DocumentDropzone from "@/components/portal/DocumentDropzone";
import DocumentCategorySelect from "@/components/portal/DocumentCategorySelect";
import DocumentPreviewSheet, {
  asPreviewableDocument,
  type PreviewableDocument,
} from "@/components/portal/DocumentPreviewSheet";
import DigitalSignaturePad, {
  type SignatureExport,
} from "@/components/portal/DigitalSignaturePad";
import LocationMapPanel from "@/components/portal/LocationMapPanel";
import ProcessTimeline, {
  buildProcessGateInput,
  processGateLabel,
} from "@/components/portal/ProcessTimeline";
import {
  canUpsertQuestionnaire,
  isActiveLogisticsTripStatus,
  mergeEvidenceCategories,
  pickCurrentProcessArtifact,
  questionnaireHasStreetView,
  QUESTIONNAIRE_STATUS_RANK,
  REPORT_STATUS_RANK,
} from "@shared/processGates";
import { isActiveDocumentStatus } from "@shared/documentCompleteness";
import { SectionHelper, FieldHelper } from "@/components/portal/FormHelpers";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  canChangeCaseStatus,
  canEditCaseLocation,
  canViewCaseSection,
} from "@shared/portalCapabilities";
import {
  buildPropertyQuery,
  googleStreetViewUrl,
  parseGpsText,
  resolveOptionalLatLng,
} from "@shared/locationRules";
import { requestDevicePosition } from "@/utils/geolocation";
import {
  addCaseNote,
  assignCaseMember,
  bulkUploadCaseDocuments,
  completeReviewRequest,
  createEvidence,
  createExpense,
  createInspection,
  createMeasurement,
  createQuestionnaire,
  createTechnicalReport,
  createTrip,
  deleteEvidence,
  fetchCaseDetail,
  geocodeAddress,
  runDocumentOcr,
  unassignCaseMember,
  updateCaseFlags,
  updateCaseLocation,
  updateCaseStatus,
  updateInspectionStatus,
  updateQuestionnaireStatus,
  updateDocumentCategory,
  updateTechnicalReportStatus,
  uploadCaseDocument,
} from "@/store/slices/casesSlice";
import { fetchTeamMembers } from "@/store/slices/portalSlice";
import type {
  AssignmentRole,
  CaseStatus,
  DocumentCategory,
  EvidenceCategory,
  EvidenceType,
  ExpenseType,
  MeasurementType,
  QuestionnaireStatus,
} from "@shared/api";
import {
  EVIDENCE_CATEGORIES,
  EVIDENCE_TYPES,
  evidenceRequiresFile,
} from "@shared/evidenceRules";
import { fileToBase64 } from "@/utils/documentOcr";

const ASSIGNMENT_ROLES: AssignmentRole[] = [
  "expert",
  "coordinator",
  "legal_reviewer",
  "logistics",
  "accountant",
  "qa",
  "technical_director",
  "observer",
];

const MEASUREMENT_TYPES: MeasurementType[] = [
  "horizontal_distance",
  "vertical_distance",
  "pole_distance",
  "other",
];

function severityClass(level: string) {
  if (level === "overdue" || level === "critical") return "text-destructive";
  if (level === "warning") return "text-primary";
  return "text-muted-foreground";
}

export default function CaseDetailPage() {
  const { publicUuid = "" } = useParams();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const {
    selected,
    history,
    notes,
    documents,
    assignments,
    deadlines,
    questionnaires,
    inspections,
    measurements,
    evidence,
    evidenceChecklist,
    reviewRequests,
    documentCompleteness,
    auditLogs,
    trips,
    expenses,
    technicalReports,
    allowedNextStatuses,
    hasUnpaidInvoices,
    processGate,
    statusGateMissing,
    detailLoading,
    updatingStatus,
    error,
  } = useAppSelector((s) => s.cases);
  const { members } = useAppSelector((s) => s.portal);
  const role = useAppSelector((s) => s.auth.user?.role);
  const [reason, setReason] = useState("");
  const [docPreview, setDocPreview] = useState<PreviewableDocument | null>(
    null,
  );
  const [docsUploading, setDocsUploading] = useState(false);
  const [uploadCategory, setUploadCategory] =
    useState<DocumentCategory>("lawsuit");
  const signatureExportRef = useRef<(() => SignatureExport) | null>(null);
  const [signaturePadKey, setSignaturePadKey] = useState(0);
  const [locating, setLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  const refreshDetail = () => {
    if (publicUuid) void dispatch(fetchCaseDetail(publicUuid));
  };

  useEffect(() => {
    if (publicUuid) void dispatch(fetchCaseDetail(publicUuid));
    void dispatch(fetchTeamMembers({ limit: 100, sortBy: "first_name", sortDir: "ASC" }));
  }, [dispatch, publicUuid]);

  const locationForm = useFormik({
    enableReinitialize: true,
    initialValues: {
      propertyAddress: selected?.propertyAddress || "",
      propertyCity: selected?.propertyCity || "",
      propertyState: selected?.propertyState || "",
      propertyPostalCode: selected?.propertyPostalCode || "",
      propertyCountry: selected?.propertyCountry || "MX",
      propertyLat:
        selected?.propertyLat != null ? String(selected.propertyLat) : "",
      propertyLng:
        selected?.propertyLng != null ? String(selected.propertyLng) : "",
    },
    onSubmit: async (values) => {
      setLocationStatus(null);
      const coords = resolveOptionalLatLng(
        values.propertyLat,
        values.propertyLng,
      );
      if (coords.ok === false) {
        setLocationStatus(t("maps.invalidGpsText"));
        return;
      }
      const result = await dispatch(
        updateCaseLocation({
          publicUuid,
          propertyAddress: values.propertyAddress.trim() || null,
          propertyCity: values.propertyCity.trim() || null,
          propertyState: values.propertyState.trim() || null,
          propertyPostalCode: values.propertyPostalCode.trim() || null,
          propertyCountry: values.propertyCountry.trim() || "MX",
          propertyLat: coords.value?.lat ?? null,
          propertyLng: coords.value?.lng ?? null,
        }),
      );
      if (updateCaseLocation.fulfilled.match(result)) {
        setLocationStatus(t("maps.locationSaved"));
        refreshDetail();
      } else {
        setLocationStatus(t("maps.locationSaveFailed"));
      }
    },
  });

  const noteForm = useFormik({
    initialValues: { body: "" },
    validationSchema: Yup.object({ body: Yup.string().trim().required() }),
    onSubmit: async (values, helpers) => {
      await dispatch(addCaseNote({ publicUuid, body: values.body.trim() }));
      helpers.resetForm();
    },
  });

  const assignForm = useFormik({
    initialValues: {
      userId: "",
      assignmentRole: "expert" as AssignmentRole,
      isPrimary: true,
    },
    validationSchema: Yup.object({
      userId: Yup.string().required(),
      assignmentRole: Yup.string().required(),
    }),
    onSubmit: async (values, helpers) => {
      await dispatch(
        assignCaseMember({
          publicUuid,
          userId: Number(values.userId),
          assignmentRole: values.assignmentRole,
          isPrimary: values.isPrimary,
        }),
      );
      refreshDetail();
      helpers.resetForm({
        values: {
          userId: "",
          assignmentRole: "expert",
          isPrimary: true,
        },
      });
    },
  });

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
  const formQRow =
    questionnaires.find(
      (q) =>
        q.status === formQuestionnaire?.status &&
        q.createdAt === formQuestionnaire?.createdAt,
    ) ?? questionnaires[0];
  const canEditQuestionnaire =
    !formQuestionnaire || canUpsertQuestionnaire(formQuestionnaire.status);

  const questionnaireForm = useFormik({
    enableReinitialize: true,
    initialValues: {
      propertyGps: String(formQJson.propertyGps ?? ""),
      streetView: String(
        formQJson.streetViewValidated ?? formQJson.streetView ?? "",
      ),
      powerLine: String(
        formQJson.powerLineVerified ?? formQJson.powerLine ?? "",
      ),
      observations: formQRow?.technicalObservations ?? "",
      submit: true,
    },
    onSubmit: async (values) => {
      await dispatch(
        createQuestionnaire({
          publicUuid,
          submit: values.submit,
          technicalObservations: values.observations.trim() || undefined,
          contentJson: {
            propertyGps: values.propertyGps.trim(),
            streetViewValidated: values.streetView.trim(),
            powerLineVerified: values.powerLine.trim(),
          },
        }),
      );
      refreshDetail();
    },
  });

  const inspectionForm = useFormik({
    initialValues: { scheduledAt: "", notes: "" },
    onSubmit: async (values, helpers) => {
      await dispatch(
        createInspection({
          publicUuid,
          scheduledAt: values.scheduledAt || undefined,
          notes: values.notes.trim() || undefined,
        }),
      );
      refreshDetail();
      helpers.resetForm();
    },
  });

  const measurementForm = useFormik({
    initialValues: {
      measurementType: "horizontal_distance" as MeasurementType,
      valueNumeric: "",
      unit: "m" as const,
      poleId: "",
    },
    validationSchema: Yup.object({
      valueNumeric: Yup.number().typeError("n").required(),
    }),
    onSubmit: async (values, helpers) => {
      await dispatch(
        createMeasurement({
          publicUuid,
          measurementType: values.measurementType,
          valueNumeric: Number(values.valueNumeric),
          unit: values.unit,
          poleId: values.poleId.trim() || undefined,
          inspectionId: inspections[0]?.id ?? null,
        }),
      );
      refreshDetail();
      helpers.resetForm({
        values: {
          measurementType: "horizontal_distance",
          valueNumeric: "",
          unit: "m",
          poleId: "",
        },
      });
    },
  });

  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
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
        const lat =
          values.lat.trim() === "" ? null : Number(values.lat);
        const lng =
          values.lng.trim() === "" ? null : Number(values.lng);
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
        if (createEvidence.fulfilled.match(result)) {
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
      const lat =
        values.lat.trim() === "" ? null : Number(values.lat);
      const lng =
        values.lng.trim() === "" ? null : Number(values.lng);
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
      if (createEvidence.fulfilled.match(result)) {
        helpers.resetForm();
        setEvidenceFile(null);
        refreshDetail();
      }
    },
  });

  const fillFromDevice = async (target: "property" | "evidence") => {
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
    if (target === "property") {
      await locationForm.setFieldValue("propertyLat", String(pos.lat));
      await locationForm.setFieldValue("propertyLng", String(pos.lng));
      setLocationStatus(t("maps.coordsFilled"));
      return;
    }
    await evidenceForm.setFieldValue("lat", String(pos.lat));
    await evidenceForm.setFieldValue("lng", String(pos.lng));
    setLocationStatus(t("maps.coordsFilled"));
  };

  const geocodeProperty = async () => {
    const query =
      buildPropertyQuery({
        address: locationForm.values.propertyAddress,
        city: locationForm.values.propertyCity,
        state: locationForm.values.propertyState,
        postalCode: locationForm.values.propertyPostalCode,
        country: locationForm.values.propertyCountry,
      }) || locationForm.values.propertyAddress;
    if (!query || query.trim().length < 3) {
      setLocationStatus(t("maps.geocodeNeedAddress"));
      return;
    }
    setLocating(true);
    setLocationStatus(null);
    const result = await dispatch(geocodeAddress(query.trim()));
    setLocating(false);
    if (geocodeAddress.fulfilled.match(result)) {
      await locationForm.setFieldValue(
        "propertyLat",
        String(result.payload.lat),
      );
      await locationForm.setFieldValue(
        "propertyLng",
        String(result.payload.lng),
      );
      setLocationStatus(t("maps.geocodeOk"));
    } else {
      setLocationStatus(t("maps.geocodeFailed"));
    }
  };

  const tripForm = useFormik({
    initialValues: {
      originCity: "",
      destinationCity: "",
      departureAt: "",
      notes: "",
    },
    onSubmit: async (values, helpers) => {
      await dispatch(
        createTrip({
          publicUuid,
          originCity: values.originCity.trim() || undefined,
          destinationCity: values.destinationCity.trim() || undefined,
          departureAt: values.departureAt || undefined,
          notes: values.notes.trim() || undefined,
        }),
      );
      refreshDetail();
      helpers.resetForm();
    },
  });

  const expenseForm = useFormik({
    initialValues: {
      tripId: "",
      expenseType: "flight" as ExpenseType,
      amount: "",
      vendorName: "",
    },
    validationSchema: Yup.object({
      tripId: Yup.string().required(),
      amount: Yup.number().typeError("n").min(0).required(),
    }),
    onSubmit: async (values, helpers) => {
      await dispatch(
        createExpense({
          publicUuid,
          tripId: Number(values.tripId),
          expenseType: values.expenseType,
          amount: Number(values.amount),
          vendorName: values.vendorName.trim() || undefined,
        }),
      );
      helpers.resetForm({
        values: {
          tripId: trips[0] ? String(trips[0].id) : "",
          expenseType: "flight",
          amount: "",
          vendorName: "",
        },
      });
    },
  });

  const reportForm = useFormik({
    initialValues: {
      investigationSummary: "",
      conclusions: "",
    },
    onSubmit: async (values, helpers) => {
      await dispatch(
        createTechnicalReport({
          publicUuid,
          investigationSummary: values.investigationSummary.trim() || undefined,
          conclusions: values.conclusions.trim() || undefined,
          submit: true,
        }),
      );
      refreshDetail();
      helpers.resetForm();
    },
  });

  const onStatus = async (status: CaseStatus) => {
    await dispatch(
      updateCaseStatus({
        publicUuid,
        status,
        reason: reason.trim() || undefined,
      }),
    );
    await dispatch(fetchCaseDetail(publicUuid));
    setReason("");
  };

  const onBulkUpload = async (files: File[]) => {
    if (files.length === 0) return;
    setDocsUploading(true);
    try {
      if (files.length === 1) {
        const data = await fileToBase64(files[0]);
        await dispatch(
          uploadCaseDocument({
            publicUuid,
            title: files[0].name,
            fileName: files[0].name,
            contentType: files[0].type || "application/octet-stream",
            category: uploadCategory,
            data,
          }),
        );
      } else {
        const payloads = [];
        for (const file of files) {
          payloads.push({
            title: file.name,
            fileName: file.name,
            contentType: file.type || "application/octet-stream",
            category: uploadCategory,
            data: await fileToBase64(file),
          });
        }
        await dispatch(
          bulkUploadCaseDocuments({ publicUuid, files: payloads }),
        );
      }
      refreshDetail();
    } finally {
      setDocsUploading(false);
    }
  };

  if (detailLoading && !selected) {
    return <CaseDetailSkeleton />;
  }

  if (!selected) {
    return (
      <div className="p-8 text-sm text-muted-foreground">{t("cases.notFound")}</div>
    );
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

  const latestGpsEvidence = [...evidence]
    .reverse()
    .find((item) => item.lat != null && item.lng != null);

  const propertyMapDraft = resolveOptionalLatLng(
    locationForm.values.propertyLat,
    locationForm.values.propertyLng,
  );
  const propertyMapLat =
    propertyMapDraft.ok && propertyMapDraft.value
      ? propertyMapDraft.value.lat
      : selected.propertyLat;
  const propertyMapLng =
    propertyMapDraft.ok && propertyMapDraft.value
      ? propertyMapDraft.value.lng
      : selected.propertyLng;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <MetaHelmet title={selected.caseNumber} noindex />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to="/portal/cases"
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary"
          >
            <ArrowLeft size={14} /> {t("cases.backToList")}
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-secondary px-2 py-1 text-[10px] font-bold tracking-wide text-primary">
              {selected.caseNumber}
            </span>
            <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground">
              {t(`cases.status.${selected.status}`, {
                defaultValue: selected.status,
              })}
            </span>
          </div>
          <h1 className="mt-2 font-[Manrope] text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {selected.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {[selected.courtName, selected.propertyCity, selected.propertyState]
              .filter(Boolean)
              .join(" · ") || t("cases.noLocation")}
          </p>
          {canChangeCaseStatus(role) ? (
            <label className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-foreground">
              <input
                type="checkbox"
                checked={Boolean(selected.involvesFatality)}
                onChange={(e) => {
                  void dispatch(
                    updateCaseFlags({
                      publicUuid,
                      involvesFatality: e.target.checked,
                    }),
                  ).then(() => dispatch(fetchCaseDetail(publicUuid)));
                }}
                className="h-4 w-4 rounded border-input"
              />
              {t("cases.involvesFatality")}
            </label>
          ) : selected.involvesFatality ? (
            <p className="mt-2 text-xs font-semibold text-destructive">
              {t("cases.involvesFatalityBadge")}
            </p>
          ) : null}
        </div>
      </div>

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
      {locationStatus ? (
        <p className="text-xs text-muted-foreground">{locationStatus}</p>
      ) : null}

      <ProcessTimeline
        status={selected.status}
        serverGate={processGate}
        gateInput={buildProcessGateInput({
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
        })}
      />

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="inline-flex items-center gap-2 text-sm font-bold">
            <MapPinned className="h-4 w-4 text-primary" />
            {t("maps.propertyLocation")}
          </h2>
          {canEditCaseLocation(role) ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={locating}
                onClick={() => void fillFromDevice("property")}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-semibold disabled:opacity-50"
              >
                <Crosshair className="h-3.5 w-3.5" />
                {t("maps.useMyLocation")}
              </button>
              <button
                type="button"
                disabled={locating}
                onClick={() => void geocodeProperty()}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-semibold disabled:opacity-50"
              >
                {t("maps.geocodeAddress")}
              </button>
            </div>
          ) : null}
        </div>
        <SectionHelper className="mt-3">{t("help.caseDetail.location")}</SectionHelper>

        <LocationMapPanel
          className="mt-3"
          lat={propertyMapLat}
          lng={propertyMapLng}
          query={buildPropertyQuery({
            address: locationForm.values.propertyAddress || selected.propertyAddress,
            city: locationForm.values.propertyCity || selected.propertyCity,
            state: locationForm.values.propertyState || selected.propertyState,
            postalCode:
              locationForm.values.propertyPostalCode ||
              selected.propertyPostalCode,
            country:
              locationForm.values.propertyCountry || selected.propertyCountry,
          })}
          label={t("maps.propertyLocation")}
        />

        {canEditCaseLocation(role) ? (
          <form
            onSubmit={locationForm.handleSubmit}
            className="mt-3 grid gap-2 sm:grid-cols-2"
          >
            <div className="sm:col-span-2">
              <input
                name="propertyAddress"
                value={locationForm.values.propertyAddress}
                onChange={locationForm.handleChange}
                placeholder={t("maps.address")}
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              />
              <FieldHelper>{t("help.maps.address")}</FieldHelper>
            </div>
            <div>
              <input
                name="propertyCity"
                value={locationForm.values.propertyCity}
                onChange={locationForm.handleChange}
                placeholder={t("maps.city")}
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              />
              <FieldHelper>{t("help.maps.city")}</FieldHelper>
            </div>
            <div>
              <input
                name="propertyState"
                value={locationForm.values.propertyState}
                onChange={locationForm.handleChange}
                placeholder={t("maps.state")}
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              />
              <FieldHelper>{t("help.maps.state")}</FieldHelper>
            </div>
            <div>
              <input
                name="propertyPostalCode"
                value={locationForm.values.propertyPostalCode}
                onChange={locationForm.handleChange}
                placeholder={t("maps.postalCode")}
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              />
              <FieldHelper>{t("help.maps.postal")}</FieldHelper>
            </div>
            <div>
              <input
                name="propertyCountry"
                value={locationForm.values.propertyCountry}
                onChange={locationForm.handleChange}
                placeholder={t("maps.country")}
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              />
              <FieldHelper>{t("help.maps.country")}</FieldHelper>
            </div>
            <div>
              <input
                name="propertyLat"
                value={locationForm.values.propertyLat}
                onChange={locationForm.handleChange}
                placeholder={t("maps.lat")}
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              />
              <FieldHelper>{t("help.maps.lat")}</FieldHelper>
            </div>
            <div>
              <input
                name="propertyLng"
                value={locationForm.values.propertyLng}
                onChange={locationForm.handleChange}
                placeholder={t("maps.lng")}
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              />
              <FieldHelper>{t("help.maps.lng")}</FieldHelper>
            </div>
            <button
              type="submit"
              disabled={locationForm.isSubmitting}
              className="h-10 rounded-xl bg-primary text-xs font-bold text-primary-foreground sm:col-span-2 disabled:opacity-50"
            >
              {t("maps.saveLocation")}
            </button>
          </form>
        ) : null}
      </section>

      {documentCompleteness && canViewCaseSection(role, "completeness") ? (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-bold">{t("cases.documentCompleteness")}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ["intake", documentCompleteness.intake],
                ["additionalDocs", documentCompleteness.additionalDocs],
                ["courtFiling", documentCompleteness.courtFiling],
              ] as const
            )
              .filter((entry): entry is [typeof entry[0], NonNullable<typeof entry[1]>] =>
                Boolean(entry[1]),
              )
              .map(([key, info]) => (
              <div
                key={key}
                className="rounded-xl border border-border bg-background px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold">
                    {t(`cases.docPhase.${key}`)}
                  </span>
                  <span
                    className={
                      info.complete
                        ? "text-[10px] font-bold uppercase text-primary"
                        : "text-[10px] font-bold uppercase text-destructive"
                    }
                  >
                    {info.complete
                      ? t("cases.docComplete")
                      : t("cases.docIncomplete")}
                  </span>
                </div>
                {info.missing.length > 0 ? (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {t("cases.docMissing")}:{" "}
                    {info.missing
                      .map((c) =>
                        t(`cases.docCategory.${c}`, { defaultValue: c }),
                      )
                      .join(", ")}
                  </p>
                ) : (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {t("cases.docNoneMissing")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {deadlines.length > 0 && canViewCaseSection(role, "deadlines") ? (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-bold">{t("cases.deadlines")}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {deadlines.map((d) => (
              <li
                key={d.id}
                className="rounded-xl border border-border bg-background px-3 py-2 text-xs"
              >
                <div className="font-semibold">{d.title}</div>
                <div className={severityClass(d.severityLevel)}>
                  {new Date(d.dueAt).toLocaleDateString()} ·{" "}
                  {t(`cases.severity.${d.severityLevel}`, {
                    defaultValue: d.severityLevel,
                  })}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {(canViewCaseSection(role, "workflow") ||
        canViewCaseSection(role, "timeline") ||
        canViewCaseSection(role, "notes") ||
        canViewCaseSection(role, "documents")) && (
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {(canViewCaseSection(role, "workflow") ||
          canViewCaseSection(role, "timeline")) && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          {canViewCaseSection(role, "workflow") ? (
            <>
          <h2 className="text-sm font-bold text-foreground">
            {t("cases.workflow")}
          </h2>
          <SectionHelper>{t("help.caseDetail.workflow")}</SectionHelper>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("cases.workflowHint")}
          </p>
          {canChangeCaseStatus(role) || allowedNextStatuses.length > 0 ? (
            <>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("cases.reasonPlaceholder")}
            className="mt-4 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-ring/20"
          />
          {error === "Process gates not satisfied" ? (
            <div className="mt-3 text-xs text-destructive" role="alert">
              <p>{t("process.gatesBlocked")}</p>
              {statusGateMissing.length > 0 ? (
                <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
                  {statusGateMissing.map((code) => (
                    <li key={code}>{processGateLabel(t, code)}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {allowedNextStatuses.length === 0 ? (
              <span className="text-xs text-muted-foreground">
                {t("cases.noTransitions")}
              </span>
            ) : (
              allowedNextStatuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => onStatus(status)}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-primary hover:text-primary disabled:opacity-60"
                >
                  {t(`cases.status.${status}`, { defaultValue: status })}
                </button>
              ))
            )}
          </div>
            </>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              {t("cases.statusReadOnly")}
            </p>
          )}
            </>
          ) : null}

          {canViewCaseSection(role, "timeline") ? (
            <>
          <h3
            className={`${canViewCaseSection(role, "workflow") ? "mt-8" : ""} text-xs font-bold uppercase tracking-wider text-muted-foreground`}
          >
            {t("cases.timeline")}
          </h3>
          <ul className="mt-3 space-y-3">
            {history.map((h) => (
              <li
                key={h.id}
                className="rounded-xl border border-border/80 bg-muted/30 px-3 py-2"
              >
                <div className="text-xs font-semibold text-foreground">
                  {h.fromStatus
                    ? `${t(`cases.status.${h.fromStatus}`, { defaultValue: h.fromStatus })} → `
                    : ""}
                  {t(`cases.status.${h.toStatus}`, {
                    defaultValue: h.toStatus,
                  })}
                </div>
                {h.reason ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {h.reason}
                  </p>
                ) : null}
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {new Date(h.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
            </>
          ) : null}
        </section>
        )}

        <div className="space-y-4">
          {canViewCaseSection(role, "notes") ? (
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-foreground">
                {t("cases.notes")}
              </h2>
              <MessageSquarePlus size={16} className="text-primary" />
            </div>
            <SectionHelper className="mt-2">{t("help.caseDetail.notes")}</SectionHelper>
            <form onSubmit={noteForm.handleSubmit} className="mt-3 space-y-2">
              <textarea
                name="body"
                rows={3}
                value={noteForm.values.body}
                onChange={noteForm.handleChange}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-ring/20"
                placeholder={t("cases.notePlaceholder")}
              />
              <button
                type="submit"
                className="h-10 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground"
              >
                {t("cases.addNote")}
              </button>
            </form>
            <ul className="mt-4 space-y-2">
              {notes.map((n) => (
                <li
                  key={n.id}
                  className="rounded-xl bg-muted/40 px-3 py-2 text-xs text-foreground"
                >
                  {n.body}
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          </section>
          ) : null}

          {canViewCaseSection(role, "documents") ? (
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-bold text-foreground">
              {t("cases.documents")}
            </h2>
            <div className="mt-3 space-y-2">
              <DocumentCategorySelect
                value={uploadCategory}
                onChange={setUploadCategory}
              />
              <FieldHelper>{t("help.caseDetail.documentCategory")}</FieldHelper>
              <DocumentDropzone
                uploading={docsUploading}
                onFiles={onBulkUpload}
                compact
              />
            </div>
            <ul className="mt-4 space-y-2">
              {documents.length === 0 ? (
                <li className="text-xs text-muted-foreground">
                  {t("cases.noDocuments")}
                </li>
              ) : (
                documents.map((d) => (
                  <li
                    key={d.publicUuid}
                    className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-foreground">
                        {d.title}
                      </p>
                      <div className="mt-1 max-w-[14rem]">
                        <DocumentCategorySelect
                          value={d.category}
                          onChange={(category) => {
                            void dispatch(
                              updateDocumentCategory({
                                publicUuid,
                                documentUuid: d.publicUuid,
                                category,
                              }),
                            ).then(() => refreshDetail());
                          }}
                        />
                      </div>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        v{d.currentVersion}
                        {d.ocrStatus
                          ? ` · ${t(`documents.ocrStatus.${d.ocrStatus}`, {
                              defaultValue: d.ocrStatus,
                            })}`
                          : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDocPreview(asPreviewableDocument(d))}
                      className="shrink-0 text-[10px] font-bold uppercase text-primary"
                    >
                      {t("documents.preview")}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </section>
          ) : null}
        </div>
      </div>
      )}

      <DocumentPreviewSheet
        open={Boolean(docPreview)}
        document={docPreview}
        onOpenChange={(open) => {
          if (!open) setDocPreview(null);
        }}
        onRunOcr={async (doc, ocrText) => {
          const result = await dispatch(
            runDocumentOcr({
              publicUuid,
              documentUuid: doc.publicUuid,
              ocrText,
            }),
          );
          if (runDocumentOcr.fulfilled.match(result)) {
            setDocPreview(asPreviewableDocument(result.payload));
          }
        }}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {canViewCaseSection(role, "assignments") ? (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-bold">{t("cases.assignments")}</h2>
          <SectionHelper>{t("help.caseDetail.assignments")}</SectionHelper>
          <form
            onSubmit={assignForm.handleSubmit}
            className="mt-3 grid gap-2 sm:grid-cols-2"
          >
            <select
              name="userId"
              value={assignForm.values.userId}
              onChange={assignForm.handleChange}
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
            >
              <option value="">{t("cases.selectMember")}</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.firstName} {m.lastName} ({m.role})
                </option>
              ))}
            </select>
            <select
              name="assignmentRole"
              value={assignForm.values.assignmentRole}
              onChange={assignForm.handleChange}
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
            >
              {ASSIGNMENT_ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`cases.assignmentRole.${r}`, { defaultValue: r })}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-xs text-muted-foreground sm:col-span-2">
              <input
                type="checkbox"
                name="isPrimary"
                checked={assignForm.values.isPrimary}
                onChange={assignForm.handleChange}
              />
              {t("cases.primaryAssignment")}
            </label>
            <button
              type="submit"
              className="h-10 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground sm:col-span-2"
            >
              {t("cases.assign")}
            </button>
          </form>
          <ul className="mt-4 space-y-2">
            {assignments.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-xs"
              >
                <div>
                  <div className="font-semibold">{a.userName}</div>
                  <div className="text-muted-foreground">
                    {t(`cases.assignmentRole.${a.assignmentRole}`, {
                      defaultValue: a.assignmentRole,
                    })}
                    {a.isPrimary ? ` · ${t("cases.primary")}` : ""}
                  </div>
                </div>
                <button
                  type="button"
                  className="text-[10px] font-bold uppercase text-destructive"
                  onClick={() =>
                    void dispatch(
                      unassignCaseMember({
                        publicUuid,
                        assignmentId: a.id,
                      }),
                    ).then(() => refreshDetail())
                  }
                >
                  {t("cases.unassign")}
                </button>
              </li>
            ))}
          </ul>
        </section>
        ) : null}

        {canViewCaseSection(role, "questionnaire") ? (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-bold">{t("cases.questionnaire")}</h2>
          <SectionHelper>{t("help.caseDetail.questionnaire")}</SectionHelper>
          {!canEditQuestionnaire ? (
            <p className="mt-3 text-xs text-muted-foreground">
              {t("cases.questionnaireLocked")}
            </p>
          ) : null}
          <form
            onSubmit={questionnaireForm.handleSubmit}
            className="mt-3 space-y-2"
          >
            <input
              name="propertyGps"
              value={questionnaireForm.values.propertyGps}
              onChange={questionnaireForm.handleChange}
              disabled={!canEditQuestionnaire}
              placeholder={t("cases.gpsPlaceholder")}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm disabled:opacity-60"
            />
            <FieldHelper>{t("help.maps.gpsText")}</FieldHelper>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-semibold"
                onClick={() => {
                  const parsed = parseGpsText(
                    questionnaireForm.values.propertyGps,
                  );
                  if (parsed.ok === false) {
                    setLocationStatus(t("maps.invalidGpsText"));
                    return;
                  }
                  void locationForm.setFieldValue(
                    "propertyLat",
                    String(parsed.lat),
                  );
                  void locationForm.setFieldValue(
                    "propertyLng",
                    String(parsed.lng),
                  );
                  setLocationStatus(t("maps.coordsFilled"));
                }}
              >
                {t("maps.applyGpsToProperty")}
              </button>
              <button
                type="button"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-semibold"
                onClick={() => {
                  const parsed = parseGpsText(
                    questionnaireForm.values.propertyGps,
                  );
                  if (parsed.ok === false) {
                    setLocationStatus(t("maps.invalidGpsText"));
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
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm disabled:opacity-60"
            />
            <input
              name="powerLine"
              value={questionnaireForm.values.powerLine}
              onChange={questionnaireForm.handleChange}
              disabled={!canEditQuestionnaire}
              placeholder={t("cases.powerLinePlaceholder")}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm disabled:opacity-60"
            />
            <textarea
              name="observations"
              rows={2}
              value={questionnaireForm.values.observations}
              onChange={questionnaireForm.handleChange}
              disabled={!canEditQuestionnaire}
              placeholder={t("cases.observationsPlaceholder")}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!canEditQuestionnaire}
              className="h-10 rounded-xl bg-accent px-4 text-xs font-semibold text-accent-foreground disabled:opacity-60"
            >
              {t("cases.saveQuestionnaire")}
            </button>
          </form>
          <ul className="mt-4 space-y-2">
            {questionnaires.map((q) => (
              <li
                key={q.publicUuid}
                className="rounded-xl bg-muted/40 px-3 py-2 text-xs"
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
        </section>
        ) : null}

        {canViewCaseSection(role, "reviews") ? (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-bold">{t("cases.reviewRequests")}</h2>
          <SectionHelper>{t("help.caseDetail.reviewRequests")}</SectionHelper>
          <ul className="mt-3 space-y-2">
            {reviewRequests.filter((r) => r.status === "pending").length ===
            0 ? (
              <li className="text-xs text-muted-foreground">
                {t("cases.noPendingReviews")}
              </li>
            ) : (
              reviewRequests
                .filter((r) => r.status === "pending")
                .map((r) => (
                  <li
                    key={r.id}
                    className="rounded-xl border border-border px-3 py-2 text-xs"
                  >
                    <div className="font-semibold">
                      {t(`cases.reviewEntity.${r.entityType}`, {
                        defaultValue: r.entityType,
                      })}{" "}
                      ·{" "}
                      {t(`cases.reviewStage.${r.reviewStage}`, {
                        defaultValue: r.reviewStage,
                      })}
                    </div>
                    {r.dueAt ? (
                      <div className="mt-1 text-muted-foreground">
                        {t("cases.reviewDue")}:{" "}
                        {new Date(r.dueAt).toLocaleString()}
                      </div>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(
                        [
                          ["approved", "cases.reviewApprove"],
                          ["changes_requested", "cases.reviewChanges"],
                          ["rejected", "cases.reviewReject"],
                        ] as const
                      ).map(([outcome, labelKey]) => (
                        <button
                          key={outcome}
                          type="button"
                          className="rounded-full border border-border px-2 py-1 text-[10px] font-semibold hover:border-primary hover:text-primary"
                          onClick={() =>
                            void dispatch(
                              completeReviewRequest({
                                publicUuid,
                                reviewId: r.id,
                                outcome,
                              }),
                            ).then(() => {
                              void dispatch(fetchCaseDetail(publicUuid));
                            })
                          }
                        >
                          {t(labelKey)}
                        </button>
                      ))}
                    </div>
                  </li>
                ))
            )}
          </ul>
        </section>
        ) : null}

        {canViewCaseSection(role, "inspections") ? (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-bold">{t("cases.inspections")}</h2>
          <SectionHelper>{t("help.caseDetail.inspections")}</SectionHelper>
          <form
            onSubmit={inspectionForm.handleSubmit}
            className="mt-3 grid gap-2 sm:grid-cols-2"
          >
            <input
              type="datetime-local"
              name="scheduledAt"
              value={inspectionForm.values.scheduledAt}
              onChange={inspectionForm.handleChange}
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
            />
            <input
              name="notes"
              value={inspectionForm.values.notes}
              onChange={inspectionForm.handleChange}
              placeholder={t("cases.inspectionNotes")}
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
            />
            <button
              type="submit"
              className="h-10 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground sm:col-span-2"
            >
              {t("cases.scheduleInspection")}
            </button>
          </form>
          <form
            onSubmit={measurementForm.handleSubmit}
            className="mt-4 grid gap-2 sm:grid-cols-3"
          >
            <div className="sm:col-span-3">
              <SectionHelper>{t("help.caseDetail.measurements")}</SectionHelper>
            </div>
            <select
              name="measurementType"
              value={measurementForm.values.measurementType}
              onChange={measurementForm.handleChange}
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm sm:col-span-2"
            >
              {MEASUREMENT_TYPES.map((mt) => (
                <option key={mt} value={mt}>
                  {t(`cases.measurement.${mt}`, { defaultValue: mt })}
                </option>
              ))}
            </select>
            <input
              name="valueNumeric"
              value={measurementForm.values.valueNumeric}
              onChange={measurementForm.handleChange}
              placeholder={t("cases.value")}
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
            />
            <input
              name="poleId"
              value={measurementForm.values.poleId}
              onChange={measurementForm.handleChange}
              placeholder={t("cases.poleId")}
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm sm:col-span-2"
            />
            <button
              type="submit"
              className="h-10 rounded-xl border border-border bg-background text-xs font-semibold"
            >
              {t("cases.addMeasurement")}
            </button>
          </form>
          <ul className="mt-4 space-y-2 text-xs">
            {inspections.map((i) => (
              <li
                key={i.publicUuid}
                className="rounded-xl border border-border px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {t(`cases.inspectionStatus.${i.status}`, {
                      defaultValue: i.status,
                    })}
                    {i.scheduledAt
                      ? ` · ${new Date(i.scheduledAt).toLocaleString()}`
                      : ""}
                  </span>
                  {i.status === "scheduled" || i.status === "in_progress" ? (
                    <button
                      type="button"
                      className="rounded-full border border-border px-2 py-1 text-[10px] font-semibold hover:border-primary hover:text-primary"
                      onClick={() =>
                        void dispatch(
                          updateInspectionStatus({
                            publicUuid,
                            inspectionUuid: i.publicUuid,
                            status: "completed",
                          }),
                        ).then(() => refreshDetail())
                      }
                    >
                      {t("cases.markInspectionCompleted")}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
            {measurements.map((m) => (
              <li key={m.id} className="rounded-xl bg-muted/40 px-3 py-2">
                {t(`cases.measurement.${m.measurementType}`, {
                  defaultValue: m.measurementType,
                })}
                : {m.valueNumeric}
                {m.unit}
                {m.poleId ? ` · ${m.poleId}` : ""}
              </li>
            ))}
          </ul>
        </section>
        ) : null}

        {canViewCaseSection(role, "evidence") ? (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-sm font-bold">{t("cases.evidence")}</h2>
            {evidenceChecklist && (
              <p className="text-xs text-muted-foreground">
                {t("cases.evidenceChecklistProgress", {
                  covered: evidenceChecklist.coveredCount,
                  total: evidenceChecklist.totalCount,
                })}
                {evidenceChecklist.complete
                  ? ` · ${t("cases.evidenceChecklistComplete")}`
                  : ""}
              </p>
            )}
          </div>
          <SectionHelper className="mt-2">{t("help.caseDetail.evidence")}</SectionHelper>
          {evidenceChecklist && evidenceChecklist.missing.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t("cases.evidenceChecklistMissing")}:{" "}
              {evidenceChecklist.missing
                .map((c) =>
                  t(`cases.evidenceCategory.${c}`, { defaultValue: c }),
                )
                .join(", ")}
            </p>
          )}
          <form
            onSubmit={evidenceForm.handleSubmit}
            className="mt-3 grid gap-2 sm:grid-cols-2"
          >
            <select
              name="evidenceType"
              value={evidenceForm.values.evidenceType}
              onChange={evidenceForm.handleChange}
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
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
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
            >
              {EVIDENCE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t(`cases.evidenceCategory.${cat}`, { defaultValue: cat })}
                </option>
              ))}
            </select>
            <input
              name="title"
              value={evidenceForm.values.title}
              onChange={evidenceForm.handleChange}
              placeholder={t("cases.evidenceTitle")}
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
            />
            <input
              name="caption"
              value={evidenceForm.values.caption}
              onChange={evidenceForm.handleChange}
              placeholder={t("cases.evidenceCaption")}
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
            />
            <input
              name="lat"
              value={evidenceForm.values.lat}
              onChange={evidenceForm.handleChange}
              placeholder={t("cases.evidenceLat")}
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
            />
            <input
              name="lng"
              value={evidenceForm.values.lng}
              onChange={evidenceForm.handleChange}
              placeholder={t("cases.evidenceLng")}
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
            />
            <button
              type="button"
              disabled={locating}
              onClick={() => void fillFromDevice("evidence")}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-semibold sm:col-span-2 disabled:opacity-50"
            >
              <Crosshair className="h-3.5 w-3.5" />
              {t("maps.useMyLocation")}
            </button>
            {evidenceForm.values.evidenceType === "signature" ? (
              <div className="sm:col-span-2">
                <DigitalSignaturePad
                  key={signaturePadKey}
                  exportRef={signatureExportRef}
                />
              </div>
            ) : (
              <label className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border bg-background px-3 text-xs text-muted-foreground sm:col-span-2">
                <FileUp className="h-3.5 w-3.5" />
                {evidenceFile
                  ? evidenceFile.name
                  : t("cases.evidencePickFile")}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,video/*,audio/*,.pdf"
                  onChange={(e) =>
                    setEvidenceFile(e.target.files?.[0] ?? null)
                  }
                />
              </label>
            )}
            {evidenceForm.status && (
              <p className="text-xs text-destructive sm:col-span-2">
                {String(evidenceForm.status)}
              </p>
            )}
            <button
              type="submit"
              disabled={evidenceForm.isSubmitting}
              className="h-10 rounded-xl bg-accent px-4 text-xs font-semibold text-accent-foreground sm:col-span-2"
            >
              {t("cases.addEvidence")}
            </button>
          </form>
          {latestGpsEvidence ? (
            <div className="mt-4">
              <LocationMapPanel
                compact
                lat={latestGpsEvidence.lat}
                lng={latestGpsEvidence.lng}
                label={
                  latestGpsEvidence.title ||
                  latestGpsEvidence.caption ||
                  undefined
                }
              />
            </div>
          ) : null}
          <ul className="mt-4 space-y-2">
            {evidence.length === 0 && (
              <li className="text-xs text-muted-foreground">
                {t("cases.noEvidence")}
              </li>
            )}
            {evidence.map((item) => (
              <li
                key={item.publicUuid}
                className="flex items-start justify-between gap-2 rounded-xl border border-border px-3 py-2 text-xs"
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
                    <a
                      href={item.storageKey}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-accent underline"
                    >
                      {t("cases.open")}
                    </a>
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
        </section>
        ) : null}

        {canViewCaseSection(role, "logistics") ? (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-bold">{t("cases.logistics")}</h2>
          <SectionHelper>{t("help.caseDetail.logistics")}</SectionHelper>
          <form onSubmit={tripForm.handleSubmit} className="mt-3 grid gap-2 sm:grid-cols-2">
            <input
              name="originCity"
              value={tripForm.values.originCity}
              onChange={tripForm.handleChange}
              placeholder={t("cases.origin")}
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
            />
            <input
              name="destinationCity"
              value={tripForm.values.destinationCity}
              onChange={tripForm.handleChange}
              placeholder={t("cases.destination")}
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
            />
            <input
              type="datetime-local"
              name="departureAt"
              value={tripForm.values.departureAt}
              onChange={tripForm.handleChange}
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm sm:col-span-2"
            />
            <button
              type="submit"
              className="h-10 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground sm:col-span-2"
            >
              {t("cases.addTrip")}
            </button>
          </form>
          <ul className="mt-4 space-y-2">
            {trips.map((tr) => (
              <li
                key={tr.publicUuid}
                className="rounded-xl border border-border px-3 py-2 text-xs"
              >
                <div className="font-semibold">
                  {[tr.originCity, tr.destinationCity].filter(Boolean).join(" → ") ||
                    tr.status}
                </div>
                <div className="text-muted-foreground">
                  {tr.status}
                  {tr.departureAt
                    ? ` · ${new Date(tr.departureAt).toLocaleString()}`
                    : ""}
                </div>
                {tr.destinationCity ? (
                  <div className="mt-2">
                    <LocationMapPanel
                      compact
                      query={tr.destinationCity}
                      label={tr.destinationCity}
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          {trips.length > 0 ? (
            <form
              onSubmit={expenseForm.handleSubmit}
              className="mt-4 grid gap-2 sm:grid-cols-2"
            >
              <select
                name="tripId"
                value={expenseForm.values.tripId}
                onChange={expenseForm.handleChange}
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
              >
                {trips.map((tr) => (
                  <option key={tr.id} value={tr.id}>
                    {[tr.originCity, tr.destinationCity].filter(Boolean).join(" → ") ||
                      `#${tr.id}`}
                  </option>
                ))}
              </select>
              <select
                name="expenseType"
                value={expenseForm.values.expenseType}
                onChange={expenseForm.handleChange}
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
              >
                {(
                  [
                    "flight",
                    "hotel",
                    "rental_car",
                    "fuel",
                    "meals",
                    "other",
                  ] as const
                ).map((et) => (
                  <option key={et} value={et}>
                    {t(`cases.expenseType.${et}`, { defaultValue: et })}
                  </option>
                ))}
              </select>
              <input
                name="amount"
                value={expenseForm.values.amount}
                onChange={expenseForm.handleChange}
                placeholder={t("finance.amountPlaceholder")}
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
              />
              <input
                name="vendorName"
                value={expenseForm.values.vendorName}
                onChange={expenseForm.handleChange}
                placeholder={t("cases.vendor")}
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
              />
              <button
                type="submit"
                className="h-10 rounded-xl border border-border bg-background text-xs font-semibold sm:col-span-2"
              >
                {t("cases.addExpense")}
              </button>
            </form>
          ) : null}
          <ul className="mt-3 space-y-2 text-xs">
            {expenses.map((e) => (
              <li key={e.id} className="rounded-xl bg-muted/40 px-3 py-2">
                {t(`cases.expenseType.${e.expenseType}`, {
                  defaultValue: e.expenseType,
                })}{" "}
                · {e.amount.toLocaleString()} {e.currency}
                {e.vendorName ? ` · ${e.vendorName}` : ""}
              </li>
            ))}
          </ul>
        </section>
        ) : null}

        {canViewCaseSection(role, "reports") ? (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-bold">{t("cases.technicalReport")}</h2>
          <SectionHelper>{t("help.caseDetail.report")}</SectionHelper>
          <form
            onSubmit={reportForm.handleSubmit}
            className="mt-3 grid gap-2 sm:grid-cols-2"
          >
            <textarea
              name="investigationSummary"
              rows={3}
              value={reportForm.values.investigationSummary}
              onChange={reportForm.handleChange}
              placeholder={t("cases.investigationSummary")}
              className="rounded-xl border border-input bg-background px-3 py-2 text-sm sm:col-span-2"
            />
            <textarea
              name="conclusions"
              rows={3}
              value={reportForm.values.conclusions}
              onChange={reportForm.handleChange}
              placeholder={t("cases.conclusions")}
              className="rounded-xl border border-input bg-background px-3 py-2 text-sm sm:col-span-2"
            />
            <button
              type="submit"
              className="h-10 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground sm:col-span-2"
            >
              {t("cases.submitReport")}
            </button>
          </form>
          <ul className="mt-4 space-y-3">
            {technicalReports.map((r) => (
              <li
                key={r.publicUuid}
                className="rounded-xl border border-border px-3 py-3 text-xs"
              >
                <div className="font-semibold">
                  v{r.versionNumber} · {r.status}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {r.allowedNextStatuses.map((st) => (
                    <button
                      key={st}
                      type="button"
                      className="rounded-full border border-border px-2 py-1 text-[10px] font-semibold hover:border-primary hover:text-primary"
                      onClick={() =>
                        void dispatch(
                          updateTechnicalReportStatus({
                            publicUuid,
                            reportUuid: r.publicUuid,
                            status: st,
                          }),
                        ).then(() => refreshDetail())
                      }
                    >
                      → {st}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
        ) : null}

        {canViewCaseSection(role, "audit") ? (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-bold">{t("cases.auditLogs")}</h2>
          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {auditLogs.length === 0 ? (
              <li className="text-xs text-muted-foreground">
                {t("cases.noAuditLogs")}
              </li>
            ) : (
              auditLogs.slice(0, 40).map((log) => (
                <li
                  key={log.id}
                  className="rounded-xl bg-muted/40 px-3 py-2 text-[11px]"
                >
                  <div className="font-semibold text-foreground">
                    {log.action}
                    {log.entityType ? ` · ${log.entityType}` : ""}
                  </div>
                  <div className="text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
                    {log.comment ? ` · ${log.comment}` : ""}
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
        ) : null}
      </div>
    </div>
  );
}

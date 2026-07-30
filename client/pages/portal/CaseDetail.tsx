import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  ArrowLeft,
  FileUp,
  MessageSquarePlus,
} from "lucide-react";
import MetaHelmet from "@/components/MetaHelmet";
import { CaseDetailSkeleton } from "@/components/portal/PortalSkeletons";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  addCaseNote,
  assignCaseMember,
  createExpense,
  createInspection,
  createMeasurement,
  createQuestionnaire,
  createTechnicalReport,
  createTrip,
  fetchCaseDetail,
  unassignCaseMember,
  updateCaseStatus,
  updateTechnicalReportStatus,
  uploadCaseDocument,
} from "@/store/slices/casesSlice";
import { fetchTeamMembers } from "@/store/slices/portalSlice";
import type {
  AssignmentRole,
  CaseStatus,
  ExpenseType,
  MeasurementType,
} from "@shared/api";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

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
    trips,
    expenses,
    technicalReports,
    allowedNextStatuses,
    detailLoading,
    updatingStatus,
    error,
  } = useAppSelector((s) => s.cases);
  const { members } = useAppSelector((s) => s.portal);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (publicUuid) void dispatch(fetchCaseDetail(publicUuid));
    void dispatch(fetchTeamMembers({ limit: 100, sortBy: "first_name", sortDir: "ASC" }));
  }, [dispatch, publicUuid]);

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
      helpers.resetForm({
        values: {
          userId: "",
          assignmentRole: "expert",
          isPrimary: true,
        },
      });
    },
  });

  const questionnaireForm = useFormik({
    initialValues: {
      propertyGps: "",
      streetView: "",
      powerLine: "",
      observations: "",
      submit: true,
    },
    onSubmit: async (values, helpers) => {
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
      helpers.resetForm();
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

  const onUpload = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    const data = await fileToBase64(file);
    await dispatch(
      uploadCaseDocument({
        publicUuid,
        title: file.name,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        category: "other",
        data,
      }),
    );
  };

  if (detailLoading && !selected) {
    return <CaseDetailSkeleton />;
  }

  if (!selected) {
    return (
      <div className="p-8 text-sm text-muted-foreground">{t("cases.notFound")}</div>
    );
  }

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
        </div>
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {deadlines.length > 0 ? (
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

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-bold text-foreground">
            {t("cases.workflow")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("cases.workflowHint")}
          </p>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("cases.reasonPlaceholder")}
            className="mt-4 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-ring/20"
          />
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

          <h3 className="mt-8 text-xs font-bold uppercase tracking-wider text-muted-foreground">
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
        </section>

        <div className="space-y-4">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-foreground">
                {t("cases.notes")}
              </h2>
              <MessageSquarePlus size={16} className="text-primary" />
            </div>
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

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-foreground">
                {t("cases.documents")}
              </h2>
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-primary">
                <FileUp size={14} />
                {t("cases.upload")}
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    void onUpload(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
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
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground">
                        {d.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {d.category} · v{d.currentVersion}
                      </p>
                    </div>
                    {d.storageKey ? (
                      <a
                        href={d.storageKey}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 text-[10px] font-bold uppercase text-primary"
                      >
                        {t("cases.open")}
                      </a>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-bold">{t("cases.assignments")}</h2>
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
                    )
                  }
                >
                  {t("cases.unassign")}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-bold">{t("cases.questionnaire")}</h2>
          <form
            onSubmit={questionnaireForm.handleSubmit}
            className="mt-3 space-y-2"
          >
            <input
              name="propertyGps"
              value={questionnaireForm.values.propertyGps}
              onChange={questionnaireForm.handleChange}
              placeholder={t("cases.gpsPlaceholder")}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
            />
            <input
              name="streetView"
              value={questionnaireForm.values.streetView}
              onChange={questionnaireForm.handleChange}
              placeholder={t("cases.streetViewPlaceholder")}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
            />
            <input
              name="powerLine"
              value={questionnaireForm.values.powerLine}
              onChange={questionnaireForm.handleChange}
              placeholder={t("cases.powerLinePlaceholder")}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
            />
            <textarea
              name="observations"
              rows={2}
              value={questionnaireForm.values.observations}
              onChange={questionnaireForm.handleChange}
              placeholder={t("cases.observationsPlaceholder")}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="h-10 rounded-xl bg-accent px-4 text-xs font-semibold text-accent-foreground"
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
                {q.status}
                {q.submittedAt
                  ? ` · ${new Date(q.submittedAt).toLocaleString()}`
                  : ""}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-bold">{t("cases.inspections")}</h2>
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
              <li key={i.publicUuid} className="rounded-xl border border-border px-3 py-2">
                {i.status}
                {i.scheduledAt
                  ? ` · ${new Date(i.scheduledAt).toLocaleString()}`
                  : ""}
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

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-bold">{t("cases.logistics")}</h2>
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

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-bold">{t("cases.technicalReport")}</h2>
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
                        )
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
      </div>
    </div>
  );
}

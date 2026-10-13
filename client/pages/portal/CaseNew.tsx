import { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router-dom";
import { useFirmCapabilities } from "@/hooks/useFirmCapabilities";
import {
  Check,
  ClipboardList,
  FileText,
  FlaskConical,
  Plus,
  RefreshCw,
  Scale,
} from "lucide-react";
import MetaHelmet from "@/components/MetaHelmet";
import PortalPageHeader from "@/components/portal/PortalPageHeader";
import IntakeCreateForm, {
  EMPTY_INTAKE_CREATE_FILES,
  intakeCreateDraftFiles,
  type IntakeCreateFileMap,
} from "@/components/portal/IntakeCreateForm";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { createCase, uploadCaseDocumentsSmart } from "@/store/slices/casesSlice";
import { createLawFirm, fetchLawFirms } from "@/store/slices/portalSlice";
import {
  CREATE_CASE_LAW_FIRM_QUICK_ADD,
  INTAKE_CREATE_REQUIRED_CATEGORIES,
  buildCreateCaseDevFillValues,
  isCreateCaseDevFillEnabled,
  isLawFirmQuickAdd,
  isIntakeCreateReady,
  parseLawFirmSelectionId,
  validateIntakeCreateDraft,
  type IntakeCreateFieldError,
} from "@shared/createCaseFormRules";
import type { DocumentCategory } from "@shared/api";
import { canCreateStaffCase } from "@shared/caseVisibilityRules";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const createSchema = Yup.object({
  title: Yup.string().trim(),
  lawFirmSelection: Yup.string().trim().required(),
  quickAddName: Yup.string().trim().when("lawFirmSelection", {
    is: CREATE_CASE_LAW_FIRM_QUICK_ADD,
    then: (schema) => schema.required(),
    otherwise: (schema) => schema,
  }),
  quickAddEmail: Yup.string()
    .trim()
    .transform((v) => (v === "" ? undefined : v))
    .email()
    .notRequired(),
  quickAddCity: Yup.string().trim(),
  quickAddDefaultCourt: Yup.string().trim(),
  ownerEmail: Yup.string()
    .trim()
    .when("lawFirmSelection", {
      is: CREATE_CASE_LAW_FIRM_QUICK_ADD,
      then: (schema) => schema.email().required(),
      otherwise: (schema) => schema.notRequired(),
    }),
  ownerFirstName: Yup.string().trim().when("lawFirmSelection", {
    is: CREATE_CASE_LAW_FIRM_QUICK_ADD,
    then: (schema) => schema.required(),
    otherwise: (schema) => schema,
  }),
  ownerLastName: Yup.string().trim().when("lawFirmSelection", {
    is: CREATE_CASE_LAW_FIRM_QUICK_ADD,
    then: (schema) => schema.required(),
    otherwise: (schema) => schema,
  }),
});

/** Unsaved expediente. The row is created on Enviar. */
export default function CaseNewPage() {
  const actor = useAppSelector((s) => s.auth.user?.actor);
  if (actor === "law_firm") return <DespachoCaseNewPage />;
  return <StaffCaseNewPage />;
}

function DespachoCaseNewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { canMutate } = useFirmCapabilities();
  const [fieldError, setFieldError] = useState<IntakeCreateFieldError | null>(
    null,
  );
  const [files, setFiles] = useState<IntakeCreateFileMap>(
    EMPTY_INTAKE_CREATE_FILES,
  );
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const form = useFormik({
    initialValues: {
      title: "",
      deadline: "",
      note: "",
    },
    onSubmit: async (values) => {
      const draftError = validateIntakeCreateDraft({
        title: values.title,
        deadline: values.deadline,
        note: values.note,
        files: intakeCreateDraftFiles(files),
      });
      if (draftError) {
        setFieldError(draftError);
        return;
      }
      setFieldError(null);
      setLocalError(null);
      setSubmitting(true);
      try {
        const result = await dispatch(
          createCase({
            title: values.title.trim(),
            description: values.note.trim() || undefined,
            externalCourtDeadlineAt: new Date(
              `${values.deadline.trim().slice(0, 10)}T12:00:00`,
            ).toISOString(),
          }),
        );
        if (!createCase.fulfilled.match(result)) {
          setLocalError(t("cases.intakeCreate.saveFailed"));
          return;
        }
        const publicUuid = result.payload.publicUuid;
        const failed: string[] = [];
        const jobs: { category: DocumentCategory; batch: File[] }[] = [];
        for (const category of INTAKE_CREATE_REQUIRED_CATEGORIES) {
          const file = files[category];
          if (file) jobs.push({ category, batch: [file] });
        }
        if (files.extra.length > 0) {
          jobs.push({ category: "other", batch: files.extra });
        }
        for (const job of jobs) {
          const uploaded = await dispatch(
            uploadCaseDocumentsSmart({
              publicUuid,
              files: job.batch,
              category: job.category,
              actor: "law_firm",
            }),
          );
          if (uploadCaseDocumentsSmart.rejected.match(uploaded)) {
            failed.push(...job.batch.map((file) => file.name));
          }
        }
        if (failed.length > 0) {
          toast({
            title: t("cases.intakeCreate.uploadPartial"),
            description: failed.slice(0, 3).join(", "),
            variant: "destructive",
          });
        }
        navigate(`/portal/cases?selected=${encodeURIComponent(publicUuid)}`, {
          replace: true,
        });
      } finally {
        setSubmitting(false);
      }
    },
  });

  const canSend = isIntakeCreateReady({
    title: form.values.title,
    deadline: form.values.deadline,
    note: form.values.note,
    files: intakeCreateDraftFiles(files),
  });

  if (!canMutate) {
    return <Navigate to="/portal/cases" replace />;
  }

  return (
    <div className="mx-auto min-w-0 max-w-3xl space-y-5">
      <MetaHelmet title={t("cases.intakeCreate.pageTitle")} noindex />
      <header>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
          {t("cases.intakeCreate.stepLabel")}
        </p>
        <h1 className="mt-1 font-[Manrope] text-2xl font-bold tracking-tight sm:text-3xl">
          {t("cases.intakeCreate.pageTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("despacho.panel.createOnlyPaso1")}
        </p>
      </header>
      <form
        onSubmit={form.handleSubmit}
        className="space-y-5 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6"
      >
        <IntakeCreateForm
          title={form.values.title}
          deadline={form.values.deadline}
          note={form.values.note}
          files={files}
          fieldError={
            fieldError
              ? t(`cases.intakeCreate.error.${fieldError}`)
              : localError
          }
          onTitle={(next) => void form.setFieldValue("title", next)}
          onDeadline={(next) => void form.setFieldValue("deadline", next)}
          onNote={(next) => void form.setFieldValue("note", next)}
          onFiles={setFiles}
          onReject={(issue) =>
            setFieldError(issue === "type" ? "fileType" : "fileSize")
          }
        />
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="submit"
            disabled={submitting || !canSend}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/25 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {submitting ? (
              <RefreshCw className="animate-spin" size={16} />
            ) : (
              <Plus size={16} />
            )}
            {t("cases.intakeCreate.send")}
          </button>
          <button
            type="button"
            onClick={() => navigate("/portal/cases")}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted"
          >
            {t("cases.createSheet.cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}

function StaffCaseNewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const showDevFill = isCreateCaseDevFillEnabled(import.meta.env.DEV);
  const lawFirms = useAppSelector((s) => s.portal.lawFirms);
  const role = useAppSelector((s) => s.auth.user?.role);
  const [localError, setLocalError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<IntakeCreateFieldError | null>(
    null,
  );
  const [files, setFiles] = useState<IntakeCreateFileMap>(
    EMPTY_INTAKE_CREATE_FILES,
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (role && !canCreateStaffCase(role)) {
      navigate("/portal/cases", { replace: true });
    }
  }, [role, navigate]);

  useEffect(() => {
    void dispatch(fetchLawFirms());
  }, [dispatch]);

  const formik = useFormik({
    initialValues: {
      title: "",
      deadline: "",
      note: "",
      lawFirmSelection: "" as string,
      quickAddName: "",
      quickAddEmail: "",
      quickAddCity: "",
      quickAddDefaultCourt: "",
      ownerEmail: "",
      ownerFirstName: "",
      ownerLastName: "",
    },
    validationSchema: createSchema,
    onSubmit: async (values) => {
      setLocalError(null);
      if (!values.lawFirmSelection) {
        setFieldError(null);
        setLocalError(t("cases.createSheet.lawFirmRequired"));
        return;
      }
      const draftError = validateIntakeCreateDraft({
        title: values.title,
        deadline: values.deadline,
        note: values.note,
        files: intakeCreateDraftFiles(files),
      });
      if (draftError) {
        setFieldError(draftError);
        return;
      }
      setFieldError(null);
      setSubmitting(true);
      try {
        let lawFirmId = parseLawFirmSelectionId(values.lawFirmSelection);
        if (isLawFirmQuickAdd(values.lawFirmSelection)) {
          const firmResult = await dispatch(
            createLawFirm({
              name: values.quickAddName.trim(),
              email: values.quickAddEmail.trim() || undefined,
              city: values.quickAddCity.trim() || undefined,
              defaultCourtName:
                values.quickAddDefaultCourt.trim() || undefined,
              ownerEmail: values.ownerEmail.trim(),
              ownerFirstName: values.ownerFirstName.trim(),
              ownerLastName: values.ownerLastName.trim(),
            }),
          );
          if (!createLawFirm.fulfilled.match(firmResult)) {
            setLocalError(
              (firmResult.payload as string) || "law_firm_create_failed",
            );
            return;
          }
          lawFirmId = firmResult.payload.id;
        }

        const result = await dispatch(
          createCase({
            title: values.title.trim(),
            description: values.note.trim() || undefined,
            externalCourtDeadlineAt: new Date(
              `${values.deadline.trim().slice(0, 10)}T12:00:00`,
            ).toISOString(),
            lawFirmId: lawFirmId ?? undefined,
          }),
        );
        if (!createCase.fulfilled.match(result)) {
          setLocalError(t("cases.intakeCreate.saveFailed"));
          return;
        }

        const publicUuid = result.payload.publicUuid;
        const failed: string[] = [];
        const jobs: { category: DocumentCategory; batch: File[] }[] = [];
        for (const category of INTAKE_CREATE_REQUIRED_CATEGORIES) {
          const file = files[category];
          if (file) jobs.push({ category, batch: [file] });
        }
        if (files.extra.length > 0) {
          jobs.push({ category: "other", batch: files.extra });
        }
        for (const job of jobs) {
          const uploaded = await dispatch(
            uploadCaseDocumentsSmart({
              publicUuid,
              files: job.batch,
              category: job.category,
            }),
          );
          if (uploadCaseDocumentsSmart.rejected.match(uploaded)) {
            failed.push(...job.batch.map((file) => file.name));
          }
        }
        if (failed.length > 0) {
          toast({
            title: t("cases.intakeCreate.uploadPartial"),
            description: failed.slice(0, 3).join(", "),
            variant: "destructive",
          });
        }
        navigate(`/portal/cases/${publicUuid}`);
      } finally {
        setSubmitting(false);
      }
    },
  });

  const quickAdd = isLawFirmQuickAdd(formik.values.lawFirmSelection);
  const fieldClass =
    "mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring";
  const displayError =
    localError ||
    (fieldError ? t(`cases.intakeCreate.error.${fieldError}`) : null);
  const canSend =
    !submitting &&
    isIntakeCreateReady({
      title: formik.values.title,
      deadline: formik.values.deadline,
      note: formik.values.note,
      files: intakeCreateDraftFiles(files),
      lawFirmSelection: formik.values.lawFirmSelection,
      quickAddName: formik.values.quickAddName,
      ownerEmail: formik.values.ownerEmail,
      ownerFirstName: formik.values.ownerFirstName,
      ownerLastName: formik.values.ownerLastName,
    });

  const fillDevSample = () => {
    const sample = buildCreateCaseDevFillValues({ lawFirms });
    void formik.setValues({
      ...formik.values,
      title: sample.title,
      deadline: sample.deadline,
      note: sample.note,
      lawFirmSelection: sample.lawFirmSelection,
      quickAddName: sample.quickAddName,
      quickAddEmail: sample.quickAddEmail,
      quickAddCity: sample.quickAddCity,
      quickAddDefaultCourt: sample.quickAddDefaultCourt,
      ownerEmail: sample.ownerEmail,
      ownerFirstName: sample.ownerFirstName,
      ownerLastName: sample.ownerLastName,
    });
  };

  return (
    <div className="min-w-0 space-y-6">
      <MetaHelmet title={t("cases.intakeCreate.pageTitle")} noindex />
      <PortalPageHeader
        eyebrow={t("cases.intakeCreate.stepLabel")}
        title={t("cases.intakeCreate.pageTitle")}
        actions={
          showDevFill ? (
            <button
              type="button"
              onClick={fillDevSample}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-3 text-[10px] font-bold uppercase tracking-wide text-primary transition hover:bg-primary/10"
            >
              <FlaskConical size={12} />
              {t("cases.createSheet.devFill")}
            </button>
          ) : undefined
        }
      />

      <form onSubmit={formik.handleSubmit} className="grid gap-4 lg:grid-cols-12">
        <div className="min-w-0 space-y-5 lg:col-span-7">
          <label className="block text-xs font-semibold text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Scale size={12} className="text-primary" />
              {t("cases.lawFirmLabel")}
            </span>
            <select
              name="lawFirmSelection"
              value={formik.values.lawFirmSelection}
              onChange={formik.handleChange}
              className={fieldClass}
            >
              <option value="">{t("cases.createSheet.lawFirmPlaceholder")}</option>
              {lawFirms.map((firm) => (
                <option key={firm.id} value={String(firm.id)}>
                  {firm.name}
                  {firm.city ? ` · ${firm.city}` : ""}
                </option>
              ))}
              <option value={CREATE_CASE_LAW_FIRM_QUICK_ADD}>
                {t("cases.createSheet.lawFirmQuickAdd")}
              </option>
            </select>
            {formik.submitCount > 0 && formik.errors.lawFirmSelection ? (
              <p className="mt-1 text-xs text-destructive">
                {t("cases.createSheet.lawFirmRequired")}
              </p>
            ) : null}
          </label>

          {quickAdd ? (
            <div className="space-y-3 rounded-2xl border border-dashed border-primary/35 bg-primary/5 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                {t("cases.createSheet.quickAddTitle")}
              </p>
              <label className="block text-xs font-semibold text-muted-foreground">
                {t("settings.lawFirmName")}
                <input
                  name="quickAddName"
                  value={formik.values.quickAddName}
                  onChange={formik.handleChange}
                  className={fieldClass}
                />
                {formik.submitCount > 0 && formik.errors.quickAddName ? (
                  <p className="mt-1 text-xs text-destructive">
                    {t("cases.createSheet.quickAddNameRequired")}
                  </p>
                ) : null}
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-muted-foreground">
                  {t("team.emailPlaceholder")}
                  <input
                    name="quickAddEmail"
                    type="email"
                    value={formik.values.quickAddEmail}
                    onChange={formik.handleChange}
                    className={fieldClass}
                  />
                </label>
                <label className="block text-xs font-semibold text-muted-foreground">
                  {t("cases.cityLabel")}
                  <input
                    name="quickAddCity"
                    value={formik.values.quickAddCity}
                    onChange={formik.handleChange}
                    className={fieldClass}
                  />
                </label>
              </div>
              <label className="block text-xs font-semibold text-muted-foreground">
                {t("settings.defaultCourtName")}
                <input
                  name="quickAddDefaultCourt"
                  value={formik.values.quickAddDefaultCourt}
                  onChange={formik.handleChange}
                  placeholder={t("settings.defaultCourtNamePlaceholder")}
                  className={fieldClass}
                />
              </label>
              <p className="text-[11px] text-muted-foreground">
                {t("cases.createSheet.ownerRequiredHint")}
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block text-xs font-semibold text-muted-foreground">
                  {t("team.firstName")}
                  <input
                    name="ownerFirstName"
                    value={formik.values.ownerFirstName}
                    onChange={formik.handleChange}
                    className={fieldClass}
                  />
                </label>
                <label className="block text-xs font-semibold text-muted-foreground">
                  {t("team.lastName")}
                  <input
                    name="ownerLastName"
                    value={formik.values.ownerLastName}
                    onChange={formik.handleChange}
                    className={fieldClass}
                  />
                </label>
                <label className="block text-xs font-semibold text-muted-foreground">
                  {t("settings.ownerEmail")}
                  <input
                    name="ownerEmail"
                    type="email"
                    value={formik.values.ownerEmail}
                    onChange={formik.handleChange}
                    className={fieldClass}
                  />
                </label>
              </div>
            </div>
          ) : null}

          <IntakeCreateForm
            title={formik.values.title}
            deadline={formik.values.deadline}
            note={formik.values.note}
            files={files}
            fieldError={displayError}
            onTitle={(next) => void formik.setFieldValue("title", next)}
            onDeadline={(next) => void formik.setFieldValue("deadline", next)}
            onNote={(next) => void formik.setFieldValue("note", next)}
            onFiles={setFiles}
            onReject={(issue) =>
              setFieldError(issue === "type" ? "fileType" : "fileSize")
            }
            hideGuide
          />

          <div className="flex flex-col gap-2 sm:flex-row-reverse sm:items-center">
            <button
              type="submit"
              disabled={!canSend}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[10rem]"
            >
              {submitting ? (
                <RefreshCw className="animate-spin" size={16} />
              ) : (
                <Plus size={16} />
              )}
              {t("cases.intakeCreate.send")}
            </button>
            <button
              type="button"
              onClick={() => navigate("/portal/cases")}
              disabled={submitting}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-60 sm:w-auto"
            >
              {t("cases.createSheet.cancel")}
            </button>
          </div>
        </div>

        <aside className="grid content-start gap-3 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
          <div className="rounded-2xl border border-info/20 bg-info-muted p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <ClipboardList size={18} className="text-info" />
              <h3 className="text-sm font-bold">
                {t("cases.intakeCreate.requiredDocsTitle")}
              </h3>
            </div>
            <ul className="mt-3 space-y-2">
              {INTAKE_CREATE_REQUIRED_CATEGORIES.map((category) => {
                const ready = Boolean(files[category]);
                return (
                  <li
                    key={category}
                    className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground"
                  >
                    <span
                      className={cn(
                        "grid h-5 w-5 shrink-0 place-items-center rounded-full",
                        ready
                          ? "bg-success text-success-foreground"
                          : "border border-border bg-card text-transparent",
                      )}
                    >
                      <Check size={12} strokeWidth={3} />
                    </span>
                    <span className="truncate">
                      {t(`cases.docCategory.${category}`)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-primary" />
              <h3 className="text-sm font-bold">
                {t("cases.intakeCreate.acceptedTypesTitle")}
              </h3>
            </div>
            <p className="mt-3 text-sm font-semibold text-foreground">
              {t("cases.intakeCreate.acceptedTypes")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("cases.intakeCreate.acceptedSize")}
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}

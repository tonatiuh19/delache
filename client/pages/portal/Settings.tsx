import { useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useTranslation } from "react-i18next";
import MetaHelmet from "@/components/MetaHelmet";
import AppVersionLabel from "@/components/AppVersionLabel";
import PortalPageHeader from "@/components/portal/PortalPageHeader";
import { ContentPageSkeleton } from "@/components/portal/PortalSkeletons";
import LocalEmailCtaLegend from "@/components/portal/LocalEmailCtaLegend";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  createLawFirm,
  fetchCaseNumberSettings,
  fetchLawFirms,
  saveCaseNumberSettings,
} from "@/store/slices/portalSlice";
import { notifyThunkSave } from "@/utils/formSave";

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const { caseNumberSettings, lawFirms, loadingSettings, savingSettings, error } =
    useAppSelector((s) => s.portal);

  useEffect(() => {
    void dispatch(fetchCaseNumberSettings());
    void dispatch(fetchLawFirms());
  }, [dispatch]);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      format: caseNumberSettings?.format || "DEL-{YYYY}-{SEQ:4}",
    },
    validationSchema: Yup.object({
      format: Yup.string().trim().required(),
    }),
    onSubmit: async (values) => {
      const result = await dispatch(
        saveCaseNumberSettings(values.format.trim()),
      );
      notifyThunkSave(result, {
        successTitle: t("settings.caseNumberSaved"),
        failureTitle: t("settings.caseNumberSaveFailed"),
        fallbackError: "settings_save_failed",
      });
    },
  });

  const firmForm = useFormik({
    initialValues: {
      name: "",
      email: "",
      city: "",
      state: "",
      defaultCourtName: "",
      ownerEmail: "",
      ownerFirstName: "",
      ownerLastName: "",
    },
    validationSchema: Yup.object({
      name: Yup.string().trim().required(),
      ownerEmail: Yup.string().email().required(),
      ownerFirstName: Yup.string().trim().required(),
      ownerLastName: Yup.string().trim().required(),
    }),
    onSubmit: async (values, helpers) => {
      const result = await dispatch(
        createLawFirm({
          name: values.name.trim(),
          email: values.email.trim() || undefined,
          city: values.city.trim() || undefined,
          state: values.state.trim() || undefined,
          defaultCourtName: values.defaultCourtName.trim() || undefined,
          ownerEmail: values.ownerEmail.trim(),
          ownerFirstName: values.ownerFirstName.trim(),
          ownerLastName: values.ownerLastName.trim(),
          preferredLanguage: i18n.language,
        }),
      );
      if (
        notifyThunkSave(result, {
          failureTitle: t("settings.lawFirmSaveFailed"),
          fallbackError: "law_firm_create_failed",
          silentSuccess: true,
        })
      ) {
        helpers.resetForm();
        void dispatch(fetchLawFirms());
      }
    },
  });

  if (loadingSettings && !caseNumberSettings) {
    return (
      <div className="mx-auto max-w-3xl">
        <MetaHelmet title={t("portal.settings")} noindex />
        <ContentPageSkeleton variant="form" className="max-w-3xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <MetaHelmet title={t("portal.settings")} noindex />
      <PortalPageHeader
        eyebrow={t("settings.eyebrow")}
        title={t("portal.settings")}
        description={t("settings.subtitle")}
      />

      <form
        onSubmit={formik.handleSubmit}
        className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
      >
        <h2 className="text-sm font-bold">{t("settings.caseNumberTitle")}</h2>
        <label className="mt-4 block text-xs font-semibold text-muted-foreground">
          {t("settings.formatLabel")}
          <input
            name="format"
            value={formik.values.format}
            onChange={formik.handleChange}
            disabled={loadingSettings}
            className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 font-mono text-sm outline-none focus:border-accent focus:ring-4 focus:ring-ring/20"
          />
        </label>
        {caseNumberSettings ? (
          <p className="mt-3 text-xs text-muted-foreground">
            {t("settings.preview")}:{" "}
            <span className="font-semibold text-foreground">
              {caseNumberSettings.preview}
            </span>{" "}
            · seq {caseNumberSettings.nextSeq}
          </p>
        ) : null}
        {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
        <button
          type="submit"
          disabled={savingSettings}
          className="mt-4 h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {savingSettings ? t("common.loading") : t("common.save")}
        </button>
      </form>

      <form
        onSubmit={firmForm.handleSubmit}
        className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
      >
        <h2 className="text-sm font-bold">{t("settings.lawFirmsTitle")}</h2>
        <p className="text-xs text-muted-foreground">
          {t("settings.lawFirmsOwnerHint")}
        </p>
        <LocalEmailCtaLegend />
        <input
          name="name"
          value={firmForm.values.name}
          onChange={firmForm.handleChange}
          placeholder={t("settings.lawFirmName")}
          className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            name="ownerFirstName"
            value={firmForm.values.ownerFirstName}
            onChange={firmForm.handleChange}
            placeholder={t("team.firstName")}
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
          />
          <input
            name="ownerLastName"
            value={firmForm.values.ownerLastName}
            onChange={firmForm.handleChange}
            placeholder={t("team.lastName")}
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
          />
          <input
            name="ownerEmail"
            type="email"
            value={firmForm.values.ownerEmail}
            onChange={firmForm.handleChange}
            placeholder={t("settings.ownerEmail")}
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            name="email"
            value={firmForm.values.email}
            onChange={firmForm.handleChange}
            placeholder={t("settings.firmContactEmail")}
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
          />
          <input
            name="city"
            value={firmForm.values.city}
            onChange={firmForm.handleChange}
            placeholder={t("cases.cityLabel")}
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
          />
          <input
            name="state"
            value={firmForm.values.state}
            onChange={firmForm.handleChange}
            placeholder={t("settings.state")}
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
          />
        </div>
        <input
          name="defaultCourtName"
          value={firmForm.values.defaultCourtName}
          onChange={firmForm.handleChange}
          placeholder={t("settings.defaultCourtNamePlaceholder")}
          className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
        />
        <p className="text-[11px] text-muted-foreground">
          {t("settings.defaultCourtNameHint")}
        </p>
        <button
          type="submit"
          disabled={!firmForm.isValid || firmForm.isSubmitting}
          className="h-10 rounded-xl bg-accent px-4 text-xs font-semibold text-accent-foreground disabled:opacity-50"
        >
          {t("settings.createLawFirm")}
        </button>
        <ul className="divide-y divide-border rounded-xl border border-border">
          {lawFirms.map((f) => (
            <li key={f.publicUuid} className="px-3 py-2 text-xs">
              <span className="font-semibold">{f.name}</span>
              {f.city ? ` · ${f.city}` : ""}
              {f.email ? ` · ${f.email}` : ""}
            </li>
          ))}
        </ul>
      </form>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <h2 className="text-sm font-bold">{t("settings.appVersionTitle")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("settings.appVersionHint")}
        </p>
        <p className="mt-3">
          <AppVersionLabel className="text-sm font-semibold text-foreground" />
        </p>
      </section>
    </div>
  );
}

import { useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useTranslation } from "react-i18next";
import MetaHelmet from "@/components/MetaHelmet";
import PortalPageHeader from "@/components/portal/PortalPageHeader";
import { SectionHelper } from "@/components/portal/FormHelpers";
import { ContentPageSkeleton } from "@/components/portal/PortalSkeletons";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  createLawFirm,
  fetchCaseNumberSettings,
  fetchLawFirms,
  saveCaseNumberSettings,
} from "@/store/slices/portalSlice";

export default function SettingsPage() {
  const { t } = useTranslation();
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
      await dispatch(saveCaseNumberSettings(values.format.trim()));
    },
  });

  const firmForm = useFormik({
    initialValues: { name: "", email: "", city: "", state: "" },
    validationSchema: Yup.object({ name: Yup.string().trim().required() }),
    onSubmit: async (values, helpers) => {
      await dispatch(
        createLawFirm({
          name: values.name.trim(),
          email: values.email.trim() || undefined,
          city: values.city.trim() || undefined,
          state: values.state.trim() || undefined,
        }),
      );
      helpers.resetForm();
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
        <SectionHelper className="mt-2">{t("help.settings.caseNumber")}</SectionHelper>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("settings.caseNumberHint")}
        </p>
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
        <SectionHelper className="mt-2">{t("help.settings.lawFirm")}</SectionHelper>
        <p className="text-xs text-muted-foreground">
          {t("settings.lawFirmsHint")}
        </p>
        <input
          name="name"
          value={firmForm.values.name}
          onChange={firmForm.handleChange}
          placeholder={t("settings.lawFirmName")}
          className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            name="email"
            value={firmForm.values.email}
            onChange={firmForm.handleChange}
            placeholder={t("team.emailPlaceholder")}
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
        <button
          type="submit"
          className="h-10 rounded-xl bg-accent px-4 text-xs font-semibold text-accent-foreground"
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
    </div>
  );
}

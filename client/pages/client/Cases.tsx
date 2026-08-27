import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useFormik } from "formik";
import * as Yup from "yup";
import MetaHelmet from "@/components/MetaHelmet";
import { ContentPageSkeleton } from "@/components/portal/PortalSkeletons";
import { FieldHelper, SectionHelper } from "@/components/portal/FormHelpers";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  createClientCase,
  fetchClientCases,
} from "@/store/slices/clientSlice";
import { notifyThunkSave } from "@/utils/formSave";

export default function ClientCasesPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { cases, loading, creating, error } = useAppSelector((s) => s.client);

  useEffect(() => {
    void dispatch(fetchClientCases());
  }, [dispatch]);

  const form = useFormik({
    initialValues: {
      title: "",
      courtName: "",
      propertyCity: "",
      plaintiffName: "",
      defendantName: "",
      involvesFatality: false,
    },
    validationSchema: Yup.object({
      title: Yup.string().trim().required(),
    }),
    onSubmit: async (values, helpers) => {
      const result = await dispatch(
        createClientCase({
          title: values.title.trim(),
          courtName: values.courtName.trim() || undefined,
          propertyCity: values.propertyCity.trim() || undefined,
          plaintiffName: values.plaintiffName.trim() || undefined,
          defendantName: values.defendantName.trim() || undefined,
          involvesFatality: values.involvesFatality,
        }),
      );
      if (
        notifyThunkSave(result, {
          failureTitle: t("client.caseSaveFailed"),
          fallbackError: "create_failed",
          silentSuccess: true,
        })
      ) {
        helpers.resetForm();
      }
    },
  });

  if (loading && cases.length === 0) {
    return <ContentPageSkeleton variant="form" withActions />;
  }

  return (
    <div className="space-y-6">
      <MetaHelmet title={t("client.cases")} noindex />
      <h1 className="font-[Manrope] text-2xl font-bold tracking-tight">
        {t("client.cases")}
      </h1>
      <p className="text-sm text-muted-foreground">{t("client.subtitle")}</p>

      <form
        onSubmit={form.handleSubmit}
        className="grid gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm sm:grid-cols-2"
      >
        <h2 className="text-sm font-bold sm:col-span-2">{t("client.submitCase")}</h2>
        <div className="sm:col-span-2">
          <SectionHelper>{t("help.clientCases.section")}</SectionHelper>
        </div>
        <div className="sm:col-span-2">
          <input
            name="title"
            value={form.values.title}
            onChange={form.handleChange}
            placeholder={t("cases.titleLabel")}
            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
          />
          <FieldHelper>{t("help.clientCases.title")}</FieldHelper>
        </div>
        <div>
          <input
            name="courtName"
            value={form.values.courtName}
            onChange={form.handleChange}
            placeholder={t("cases.courtLabel")}
            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
          />
          <FieldHelper>{t("help.clientCases.court")}</FieldHelper>
        </div>
        <div>
          <input
            name="propertyCity"
            value={form.values.propertyCity}
            onChange={form.handleChange}
            placeholder={t("cases.cityLabel")}
            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
          />
          <FieldHelper>{t("help.clientCases.city")}</FieldHelper>
        </div>
        <div>
          <input
            name="plaintiffName"
            value={form.values.plaintiffName}
            onChange={form.handleChange}
            placeholder={t("client.plaintiff")}
            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
          />
          <FieldHelper>{t("help.clientCases.plaintiff")}</FieldHelper>
        </div>
        <div>
          <input
            name="defendantName"
            value={form.values.defendantName}
            onChange={form.handleChange}
            placeholder={t("client.defendant")}
            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
          />
          <FieldHelper>{t("help.clientCases.defendant")}</FieldHelper>
        </div>
        <label className="inline-flex items-center gap-2 text-xs font-semibold text-foreground sm:col-span-2">
          <input
            type="checkbox"
            name="involvesFatality"
            checked={form.values.involvesFatality}
            onChange={form.handleChange}
            className="h-4 w-4 rounded border-input"
          />
          {t("cases.involvesFatality")}
        </label>
        <div className="sm:col-span-2">
          <FieldHelper>{t("help.clientCases.fatality")}</FieldHelper>
        </div>
        <button
          type="submit"
          disabled={creating}
          className="h-10 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground sm:col-span-2 disabled:opacity-60"
        >
          {t("client.submit")}
        </button>
      </form>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {cases.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">{t("client.empty")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {cases.map((c) => (
              <li key={c.publicUuid}>
                <Link
                  to={`/client/cases/${c.publicUuid}`}
                  className="flex flex-col gap-1 px-4 py-3 transition hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="text-sm font-semibold">{c.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.caseNumber}
                    </div>
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-primary">
                    {t(`cases.status.${c.status}`, { defaultValue: c.status })}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

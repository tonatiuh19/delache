import { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import { Plus } from "lucide-react";
import MetaHelmet from "@/components/MetaHelmet";
import PortalPageHeader from "@/components/portal/PortalPageHeader";
import LocalEmailCtaLegend from "@/components/portal/LocalEmailCtaLegend";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchFirmMembers,
  inviteFirmMember,
} from "@/store/slices/portalSlice";
import type { LawFirmMemberRole } from "@shared/api";
import { cn } from "@/lib/utils";

const INVITE_ROLES: LawFirmMemberRole[] = ["admin", "member", "viewer"];

export default function FirmTeamPage() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const actor = useAppSelector((s) => s.auth.user?.actor);
  const {
    firmMembers,
    firmMembersMeta,
    loadingFirmMembers,
    error,
  } = useAppSelector((s) => s.portal);
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    if (actor === "law_firm") {
      void dispatch(fetchFirmMembers());
    }
  }, [dispatch, actor]);

  const form = useFormik({
    initialValues: {
      email: "",
      firstName: "",
      lastName: "",
      memberRole: "member" as LawFirmMemberRole,
    },
    validationSchema: Yup.object({
      email: Yup.string().email().required(),
      firstName: Yup.string().trim().required(),
      lastName: Yup.string().trim().required(),
      memberRole: Yup.string().oneOf(INVITE_ROLES).required(),
    }),
    onSubmit: async (values, helpers) => {
      const result = await dispatch(
        inviteFirmMember({
          email: values.email.trim(),
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          memberRole: values.memberRole,
          preferredLanguage: i18n.language,
        }),
      );
      if (inviteFirmMember.fulfilled.match(result)) {
        helpers.resetForm();
        setShowInvite(false);
        void dispatch(fetchFirmMembers());
      }
    },
  });

  if (actor && actor !== "law_firm") {
    return <Navigate to="/portal/team" replace />;
  }

  const canManage = firmMembersMeta?.canManage === true;

  return (
    <div className="min-w-0 w-full max-w-full space-y-6">
      <MetaHelmet title={t("despacho.team.title")} noindex />
      <PortalPageHeader
        eyebrow={t("despacho.team.eyebrow")}
        title={t("despacho.team.title")}
        description={
          firmMembersMeta?.lawFirmName
            ? t("despacho.team.subtitleNamed", {
                name: firmMembersMeta.lawFirmName,
              })
            : t("despacho.team.subtitle")
        }
        actions={
          canManage ? (
            <button
              type="button"
              onClick={() => setShowInvite((v) => !v)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/15 transition hover:bg-primary/90"
            >
              <Plus size={15} />
              {t("despacho.team.invite")}
            </button>
          ) : null
        }
      />

      {showInvite && canManage ? (
        <form
          onSubmit={form.handleSubmit}
          className="grid gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm sm:grid-cols-2 sm:p-6"
        >
          <div className="sm:col-span-2">
            <LocalEmailCtaLegend />
          </div>
          <input
            name="email"
            type="email"
            value={form.values.email}
            onChange={form.handleChange}
            placeholder={t("team.emailPlaceholder")}
            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm sm:col-span-2"
          />
          <input
            name="firstName"
            value={form.values.firstName}
            onChange={form.handleChange}
            placeholder={t("team.firstName")}
            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
          />
          <input
            name="lastName"
            value={form.values.lastName}
            onChange={form.handleChange}
            placeholder={t("team.lastName")}
            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
          />
          <select
            name="memberRole"
            value={form.values.memberRole}
            onChange={form.handleChange}
            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm sm:col-span-2"
          >
            {INVITE_ROLES.map((role) => (
              <option key={role} value={role}>
                {t(`despacho.team.memberRole.${role}`)}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!form.isValid || form.isSubmitting}
            className="h-10 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground sm:col-span-2 disabled:opacity-50"
          >
            {t("despacho.team.sendInvite")}
          </button>
        </form>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {loadingFirmMembers && firmMembers.length === 0 ? (
          <li className="px-4 py-6 text-sm text-muted-foreground">
            {t("common.loading")}
          </li>
        ) : null}
        {!loadingFirmMembers && firmMembers.length === 0 ? (
          <li className="px-4 py-6 text-sm text-muted-foreground">
            {t("despacho.team.empty")}
          </li>
        ) : null}
        {firmMembers.map((m) => (
          <li
            key={m.publicUuid}
            className="flex min-w-0 flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {m.firstName} {m.lastName}
                {m.isPrimaryContact ? (
                  <span className="ml-2 text-[10px] font-bold uppercase text-muted-foreground">
                    {t("despacho.team.primary")}
                  </span>
                ) : null}
              </p>
              <p className="truncate text-xs text-muted-foreground">{m.email}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                {t(`despacho.team.memberRole.${m.memberRole}`)}
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                  m.status === "active"
                    ? "bg-secondary text-primary"
                    : m.status === "invited"
                      ? "bg-accent/15 text-accent"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {t(`team.status.${m.status}`, { defaultValue: m.status })}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

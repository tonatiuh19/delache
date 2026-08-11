import { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  History,
  Mail,
  Pencil,
  Power,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { FieldHelper, SectionHelper } from "@/components/portal/FormHelpers";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearSelectedMember,
  fetchTeamMemberDetail,
  removeTeamMember,
  resendTeamInvite,
  updateTeamMember,
} from "@/store/slices/portalSlice";
import type { TeamMemberItem, UserRole, UserStatus } from "@shared/api";
import { cn } from "@/lib/utils";

const STAFF_ROLES: UserRole[] = [
  "admin",
  "case_coordinator",
  "expert",
  "legal",
  "logistics",
  "accountant",
];

type PanelTab = "overview" | "edit" | "history";

export default function TeamMemberSheet({
  open,
  onOpenChange,
  member,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: TeamMemberItem | null;
}) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const {
    selectedMemberDetail,
    loadingMemberDetail,
    updatingMember,
    error,
    user,
  } = useAppSelector((s) => ({
    selectedMemberDetail: s.portal.selectedMemberDetail,
    loadingMemberDetail: s.portal.loadingMemberDetail,
    updatingMember: s.portal.updatingMember,
    error: s.portal.error,
    user: s.auth.user,
  }));
  const [tab, setTab] = useState<PanelTab>("overview");

  const detail = selectedMemberDetail?.member ?? member;
  const isSelf = Boolean(user && detail && user.id === detail.id);

  useEffect(() => {
    if (open && member?.publicUuid) {
      setTab("overview");
      void dispatch(fetchTeamMemberDetail(member.publicUuid));
    }
    if (!open) {
      dispatch(clearSelectedMember());
    }
  }, [open, member?.publicUuid, dispatch]);

  const form = useFormik({
    enableReinitialize: true,
    initialValues: {
      firstName: detail?.firstName ?? "",
      lastName: detail?.lastName ?? "",
      role: (detail?.role === "law_firm_user"
        ? "expert"
        : detail?.role) as UserRole,
    },
    validationSchema: Yup.object({
      firstName: Yup.string().trim().required(),
      lastName: Yup.string().trim().required(),
      role: Yup.string().oneOf(STAFF_ROLES).required(),
    }),
    onSubmit: async (values) => {
      if (!detail) return;
      const result = await dispatch(
        updateTeamMember({
          publicUuid: detail.publicUuid,
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          role: values.role,
        }),
      );
      if (updateTeamMember.fulfilled.match(result)) {
        setTab("overview");
        void dispatch(fetchTeamMemberDetail(detail.publicUuid));
      }
    },
  });

  const setStatus = async (status: UserStatus) => {
    if (!detail) return;
    await dispatch(updateTeamMember({ publicUuid: detail.publicUuid, status }));
    void dispatch(fetchTeamMemberDetail(detail.publicUuid));
  };

  const onRemove = async () => {
    if (!detail) return;
    if (!window.confirm(t("team.confirmRemove"))) return;
    const result = await dispatch(removeTeamMember(detail.publicUuid));
    if (removeTeamMember.fulfilled.match(result)) {
      onOpenChange(false);
    }
  };

  const onResendInvite = async () => {
    if (!detail) return;
    await dispatch(resendTeamInvite(detail.publicUuid));
  };

  const statusClass = (status: UserStatus) => {
    if (status === "active") return "bg-secondary text-primary";
    if (status === "invited") return "bg-accent/15 text-accent";
    if (status === "suspended") return "bg-destructive/10 text-destructive";
    return "bg-muted text-muted-foreground";
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md"
      >
        <div className="border-b border-border bg-gradient-to-br from-secondary/60 via-background to-background px-6 pb-5 pt-6">
          <SheetHeader className="space-y-3 text-left">
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <UserRound size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <SheetTitle className="font-[Manrope] text-xl tracking-tight">
                  {detail
                    ? `${detail.firstName} ${detail.lastName}`
                    : t("team.memberPanel")}
                </SheetTitle>
                <SheetDescription className="truncate">
                  {detail?.email ?? t("team.memberPanelHint")}
                </SheetDescription>
              </div>
            </div>
            {detail ? (
              <div className="flex flex-wrap gap-2">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                    statusClass(detail.status),
                  )}
                >
                  {t(`team.status.${detail.status}`, {
                    defaultValue: detail.status,
                  })}
                </span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                  {t(`team.role.${detail.role}`, { defaultValue: detail.role })}
                </span>
              </div>
            ) : null}
          </SheetHeader>
        </div>

        <div className="flex gap-1 border-b border-border px-4 pt-3">
          {(
            [
              ["overview", t("team.tabOverview")],
              ["edit", t("team.tabEdit")],
              ["history", t("team.tabHistory")],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "rounded-t-lg px-3 py-2 text-xs font-semibold transition",
                tab === id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-4 px-6 py-5">
          {loadingMemberDetail && !detail ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : null}

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          {tab === "overview" && detail ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="rounded-2xl border border-border bg-card p-4 text-sm shadow-sm">
                <dl className="space-y-3">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{t("team.colRole")}</dt>
                    <dd className="font-semibold">
                      {t(`team.role.${detail.role}`, {
                        defaultValue: detail.role,
                      })}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">
                      {t("team.colLastLogin")}
                    </dt>
                    <dd className="text-right font-medium">
                      {detail.lastLoginAt
                        ? new Date(detail.lastLoginAt).toLocaleString()
                        : "—"}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  {t("team.quickActions")}
                </p>
                <div className="grid gap-2">
                  {detail.status === "invited" ? (
                    <button
                      type="button"
                      disabled={updatingMember}
                      onClick={() => void onResendInvite()}
                      className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold transition hover:bg-secondary disabled:opacity-50"
                    >
                      <Mail size={16} className="text-accent" />
                      {t("team.resendInvite")}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={updatingMember || isSelf}
                    onClick={() =>
                      void setStatus(
                        detail.status === "active" ? "inactive" : "active",
                      )
                    }
                    className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold transition hover:bg-secondary disabled:opacity-50"
                  >
                    <Power size={16} className="text-primary" />
                    {detail.status === "active"
                      ? t("team.deactivate")
                      : t("team.activate")}
                  </button>
                  <button
                    type="button"
                    disabled={updatingMember || isSelf}
                    onClick={() => void onRemove()}
                    className="inline-flex h-11 items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 text-sm font-semibold text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                    {t("team.remove")}
                  </button>
                </div>
                {isSelf ? (
                  <p className="text-[11px] text-muted-foreground">
                    {t("team.selfActionHint")}
                  </p>
                ) : null}
              </div>
            </motion.div>
          ) : null}

          {tab === "edit" && detail ? (
            <motion.form
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={form.handleSubmit}
              className="space-y-3"
            >
              <SectionHelper>{t("help.team.section")}</SectionHelper>
              <label className="block text-xs font-semibold text-muted-foreground">
                {t("team.firstName")}
                <input
                  name="firstName"
                  value={form.values.firstName}
                  onChange={form.handleChange}
                  className="mt-1.5 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                />
                <FieldHelper>{t("help.team.firstName")}</FieldHelper>
              </label>
              <label className="block text-xs font-semibold text-muted-foreground">
                {t("team.lastName")}
                <input
                  name="lastName"
                  value={form.values.lastName}
                  onChange={form.handleChange}
                  className="mt-1.5 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                />
                <FieldHelper>{t("help.team.lastName")}</FieldHelper>
              </label>
              <label className="block text-xs font-semibold text-muted-foreground">
                {t("team.colRole")}
                <select
                  name="role"
                  value={form.values.role}
                  onChange={form.handleChange}
                  className="mt-1.5 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  {STAFF_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {t(`team.role.${role}`, { defaultValue: role })}
                    </option>
                  ))}
                </select>
                <FieldHelper>{t("help.team.role")}</FieldHelper>
              </label>
              <button
                type="submit"
                disabled={updatingMember || !form.isValid}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/15 transition hover:bg-primary/90 disabled:opacity-50"
              >
                <Pencil size={15} />
                {t("team.saveChanges")}
              </button>
            </motion.form>
          ) : null}

          {tab === "history" ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              <section>
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <History size={14} />
                  {t("team.loginHistory")}
                </div>
                {loadingMemberDetail ? (
                  <Skeleton className="h-20 w-full rounded-xl" />
                ) : selectedMemberDetail?.sessions.length ? (
                  <ul className="space-y-2">
                    {selectedMemberDetail.sessions.map((s) => (
                      <li
                        key={s.id}
                        className="rounded-xl border border-border bg-card px-3 py-2.5 text-xs shadow-sm"
                      >
                        <div className="font-semibold text-foreground">
                          {new Date(s.createdAt).toLocaleString()}
                        </div>
                        <div className="mt-1 text-muted-foreground">
                          {s.ipAddress || "—"}
                          {s.isActive ? (
                            <span className="ml-2 font-semibold text-primary">
                              {t("team.sessionActive")}
                            </span>
                          ) : null}
                        </div>
                        {s.userAgent ? (
                          <div className="mt-1 line-clamp-2 text-[10px] text-muted-foreground/80">
                            {s.userAgent}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("team.noSessions")}
                  </p>
                )}
              </section>

              <section>
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {t("team.auditHistory")}
                </div>
                {selectedMemberDetail?.audit.length ? (
                  <ul className="space-y-2">
                    {selectedMemberDetail.audit.map((a) => (
                      <li
                        key={a.id}
                        className="rounded-xl border border-border bg-card px-3 py-2.5 text-xs shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold capitalize">
                            {a.action}
                          </span>
                          <span className="text-muted-foreground">
                            {new Date(a.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {a.comment ? (
                          <p className="mt-1 text-muted-foreground">
                            {a.comment}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("team.noAudit")}
                  </p>
                )}
              </section>
            </motion.div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

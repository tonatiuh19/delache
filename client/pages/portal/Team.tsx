import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFormik } from "formik";
import * as Yup from "yup";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search } from "lucide-react";
import MetaHelmet from "@/components/MetaHelmet";
import PortalPageHeader from "@/components/portal/PortalPageHeader";
import PortalListPanel from "@/components/portal/PortalListPanel";
import TeamMemberSheet from "@/components/portal/TeamMemberSheet";
import LocalEmailCtaLegend from "@/components/portal/LocalEmailCtaLegend";
import { DataGrid, type DataGridColumn } from "@/components/ui/data-grid";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchLawFirms,
  fetchTeamMembers,
  inviteTeamMember,
} from "@/store/slices/portalSlice";
import type {
  LawFirmMemberRole,
  TeamMemberItem,
  UserRole,
  UserStatus,
} from "@shared/api";
import { useGridListState } from "@/hooks/useGridListState";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const ROLES: (UserRole | "law_firm_user")[] = [
  "admin",
  "expert",
  "legal",
  "logistics",
  "accountant",
  "law_firm_user",
];

const FIRM_MEMBER_ROLES: LawFirmMemberRole[] = [
  "owner",
  "admin",
  "member",
  "viewer",
];

export default function TeamPage() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const { members, membersPagination, lawFirms, loadingMembers, error } =
    useAppSelector((s) => s.portal);
  const [showInvite, setShowInvite] = useState(false);
  const [selected, setSelected] = useState<TeamMemberItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [roster, setRoster] = useState<"staff" | "firm">("staff");
  const { page, setPage, sortBy, sortDir, onSort, gridParams } =
    useGridListState("created_at", 20);

  useEffect(() => {
    void dispatch(fetchLawFirms());
  }, [dispatch]);

  useEffect(() => {
    void dispatch(
      fetchTeamMembers({
        ...gridParams,
        q: query.trim() || undefined,
        roster,
      }),
    );
  }, [dispatch, gridParams, query, roster]);

  const form = useFormik({
    initialValues: {
      email: "",
      firstName: "",
      lastName: "",
      role: "expert" as UserRole | "law_firm_user",
      firmMode: "existing" as "existing" | "create",
      lawFirmId: "",
      memberRole: "member" as LawFirmMemberRole,
      firmName: "",
      firmCity: "",
      firmState: "",
      firmDefaultCourt: "",
    },
    validationSchema: Yup.object({
      email: Yup.string().email().required(),
      firstName: Yup.string().trim().required(),
      lastName: Yup.string().trim().required(),
      role: Yup.string().required(),
      firmMode: Yup.string().oneOf(["existing", "create"]),
      lawFirmId: Yup.string().when(["role", "firmMode"], {
        is: (role: string, firmMode: string) =>
          role === "law_firm_user" && firmMode === "existing",
        then: (schema) => schema.required(),
        otherwise: (schema) => schema.optional(),
      }),
      firmName: Yup.string().when(["role", "firmMode"], {
        is: (role: string, firmMode: string) =>
          role === "law_firm_user" && firmMode === "create",
        then: (schema) => schema.trim().required(),
        otherwise: (schema) => schema.optional(),
      }),
      memberRole: Yup.string().when(["role", "firmMode"], {
        is: (role: string, firmMode: string) =>
          role === "law_firm_user" && firmMode === "existing",
        then: (schema) => schema.oneOf(FIRM_MEMBER_ROLES).required(),
        otherwise: (schema) => schema.optional(),
      }),
    }),
    onSubmit: async (values, helpers) => {
      const isDespacho = values.role === "law_firm_user";
      const result = await dispatch(
        inviteTeamMember({
          email: values.email.trim(),
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          role: values.role,
          preferredLanguage: i18n.language,
          lawFirmId:
            isDespacho && values.firmMode === "existing" && values.lawFirmId
              ? Number(values.lawFirmId)
              : null,
          createLawFirm:
            isDespacho && values.firmMode === "create"
              ? {
                  name: values.firmName.trim(),
                  city: values.firmCity.trim() || null,
                  state: values.firmState.trim() || null,
                  defaultCourtName: values.firmDefaultCourt.trim() || null,
                }
              : null,
          memberRole:
            isDespacho && values.firmMode === "existing"
              ? values.memberRole
              : null,
        }),
      );
      if (inviteTeamMember.fulfilled.match(result)) {
        helpers.resetForm({
          values: {
            email: "",
            firstName: "",
            lastName: "",
            role: "expert",
            firmMode: "existing",
            lawFirmId: "",
            memberRole: "member",
            firmName: "",
            firmCity: "",
            firmState: "",
            firmDefaultCourt: "",
          },
        });
        setShowInvite(false);
        void dispatch(fetchLawFirms());
        if (isDespacho) {
          toast({
            title: t("team.despachoInviteSent"),
            description: t("team.despachoInviteSentHint"),
          });
          setRoster("firm");
        }
        void dispatch(
          fetchTeamMembers({
            ...gridParams,
            q: query.trim() || undefined,
            roster: isDespacho ? "firm" : "staff",
          }),
        );
      }
    },
  });

  const statusClass = (status: UserStatus) => {
    if (status === "active") return "bg-secondary text-primary";
    if (status === "invited") return "bg-accent/15 text-accent";
    if (status === "suspended") return "bg-destructive/10 text-destructive";
    return "bg-muted text-muted-foreground";
  };

  const columns = useMemo((): DataGridColumn<TeamMemberItem>[] => {
    return [
      {
        key: "first_name",
        label: t("team.firstName"),
        sortable: true,
        sticky: true,
        render: (m) => (
          <span className="font-semibold">
            {m.firstName} {m.lastName}
          </span>
        ),
      },
      {
        key: "email",
        label: t("team.emailPlaceholder"),
        sortable: true,
      },
      {
        key: "role",
        label: t("team.colRole"),
        sortable: true,
        shrink: true,
        render: (m) =>
          m.role === "law_firm_user" && m.memberRole
            ? `${t("team.role.law_firm_user")} · ${t(`team.memberRole.${m.memberRole}`)}`
            : t(`team.role.${m.role}`, { defaultValue: m.role }),
      },
      ...(roster === "firm"
        ? [
            {
              key: "law_firm",
              label: t("team.colFirm"),
              sortable: false,
              render: (m: TeamMemberItem) => m.lawFirmName || "—",
            } satisfies DataGridColumn<TeamMemberItem>,
          ]
        : []),
      {
        key: "status",
        label: t("team.colStatus"),
        sortable: true,
        shrink: true,
        render: (m) => (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
              statusClass(m.status),
            )}
          >
            {t(`team.status.${m.status}`, { defaultValue: m.status })}
          </span>
        ),
      },
      {
        key: "last_login_at",
        label: t("team.colLastLogin"),
        sortable: true,
        shrink: true,
        render: (m) =>
          m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleString() : "—",
      },
    ];
  }, [t, roster]);

  const isDespachoInvite = form.values.role === "law_firm_user";

  return (
    <div className="min-w-0 w-full max-w-full space-y-6">
      <MetaHelmet title={t("portal.team")} noindex />
      <PortalPageHeader
        eyebrow={t("team.eyebrow")}
        title={t("portal.team")}
        description={t("team.subtitle")}
        actions={
          <button
            type="button"
            onClick={() => setShowInvite((v) => !v)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/15 transition hover:bg-primary/90"
          >
            <Plus size={15} />
            {t("team.newMember")}
          </button>
        }
      />

      <AnimatePresence initial={false}>
        {showInvite ? (
          <motion.form
            key="invite"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            onSubmit={form.handleSubmit}
            className="grid gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm sm:grid-cols-2 sm:p-6"
          >
            <div className="sm:col-span-2">
              <LocalEmailCtaLegend />
            </div>
            <div className="sm:col-span-2">
              <input
                name="email"
                type="email"
                value={form.values.email}
                onChange={form.handleChange}
                placeholder={t("team.emailPlaceholder")}
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              />
            </div>
            <div>
              <input
                name="firstName"
                value={form.values.firstName}
                onChange={form.handleChange}
                placeholder={t("team.firstName")}
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              />
            </div>
            <div>
              <input
                name="lastName"
                value={form.values.lastName}
                onChange={form.handleChange}
                placeholder={t("team.lastName")}
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              />
            </div>
            <div className={isDespachoInvite ? "" : "sm:col-span-2"}>
              <select
                name="role"
                value={form.values.role}
                onChange={form.handleChange}
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {t(`team.role.${role}`, { defaultValue: role })}
                  </option>
                ))}
              </select>
            </div>
            {isDespachoInvite ? (
              <>
                <div>
                  <select
                    name="firmMode"
                    value={form.values.firmMode}
                    onChange={form.handleChange}
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="existing">{t("team.firmModeExisting")}</option>
                    <option value="create">{t("team.firmModeCreate")}</option>
                  </select>
                </div>
                {form.values.firmMode === "existing" ? (
                  <>
                    <div>
                      <select
                        name="lawFirmId"
                        value={form.values.lawFirmId}
                        onChange={form.handleChange}
                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                      >
                        <option value="">{t("team.selectLawFirm")}</option>
                        {lawFirms.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <select
                        name="memberRole"
                        value={form.values.memberRole}
                        onChange={form.handleChange}
                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                      >
                        {FIRM_MEMBER_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {t(`team.memberRole.${role}`)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="sm:col-span-2">
                      <p className="mb-2 text-[11px] text-muted-foreground">
                        {t("team.createFirmOwnerHint")}
                      </p>
                      <input
                        name="firmName"
                        value={form.values.firmName}
                        onChange={form.handleChange}
                        placeholder={t("settings.lawFirmName")}
                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                      />
                    </div>
                    <input
                      name="firmCity"
                      value={form.values.firmCity}
                      onChange={form.handleChange}
                      placeholder={t("cases.cityLabel")}
                      className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                    />
                    <input
                      name="firmState"
                      value={form.values.firmState}
                      onChange={form.handleChange}
                      placeholder={t("settings.state")}
                      className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                    />
                    <div className="sm:col-span-2">
                      <input
                        name="firmDefaultCourt"
                        value={form.values.firmDefaultCourt}
                        onChange={form.handleChange}
                        placeholder={t("settings.defaultCourtNamePlaceholder")}
                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                      />
                    </div>
                  </>
                )}
              </>
            ) : null}
            <button
              type="submit"
              disabled={!form.isValid || form.isSubmitting}
              className="h-10 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground sm:col-span-2 disabled:opacity-50"
            >
              {t("team.invite")}
            </button>
          </motion.form>
        ) : null}
      </AnimatePresence>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setRoster("staff");
            setPage(1);
          }}
          className={cn(
            "h-9 rounded-xl px-3 text-xs font-semibold transition",
            roster === "staff"
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-card text-muted-foreground hover:text-foreground",
          )}
        >
          {t("team.rosterStaff")}
        </button>
        <button
          type="button"
          onClick={() => {
            setRoster("firm");
            setPage(1);
          }}
          className={cn(
            "h-9 rounded-xl px-3 text-xs font-semibold transition",
            roster === "firm"
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-card text-muted-foreground hover:text-foreground",
          )}
        >
          {t("team.rosterFirm")}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        {roster === "firm" ? t("team.firmListHint") : t("team.staffListHint")}
      </p>

      <PortalListPanel
        toolbar={
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder={t("team.searchPlaceholder")}
              className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-3 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-ring/20"
            />
          </div>
        }
      >
        <DataGrid<TeamMemberItem>
          data={members}
          columns={columns}
          rowKey={(m) => m.publicUuid}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={onSort}
          pagination={membersPagination}
          onPageChange={setPage}
          isLoading={loadingMembers}
          emptyMessage={t("team.empty")}
          noBleeding
          onRowClick={(m) => {
            if (m.role === "law_firm_user") return;
            setSelected(m);
            setSheetOpen(true);
          }}
          showingLabel={({ from, to, total }) =>
            t("grid.showing", { from, to, total })
          }
          pageLabel={({ page: p, totalPages }) =>
            t("grid.pageOf", { page: p, totalPages })
          }
        />
      </PortalListPanel>

      <TeamMemberSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setSelected(null);
        }}
        member={selected}
      />
    </div>
  );
}

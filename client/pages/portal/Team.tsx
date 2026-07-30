import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Search } from "lucide-react";
import MetaHelmet from "@/components/MetaHelmet";
import PortalPageHeader from "@/components/portal/PortalPageHeader";
import { DataGrid, type DataGridColumn } from "@/components/ui/data-grid";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchLawFirms,
  fetchTeamMembers,
  inviteTeamMember,
} from "@/store/slices/portalSlice";
import type { TeamMemberItem, UserRole } from "@shared/api";
import { useGridListState } from "@/hooks/useGridListState";

const ROLES: (UserRole | "law_firm_user")[] = [
  "admin",
  "case_coordinator",
  "expert",
  "legal",
  "logistics",
  "accountant",
  "law_firm_user",
];

export default function TeamPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { members, membersPagination, lawFirms, loadingMembers, error } =
    useAppSelector((s) => s.portal);
  const [query, setQuery] = useState("");
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
      }),
    );
  }, [dispatch, gridParams, query]);

  const form = useFormik({
    initialValues: {
      email: "",
      firstName: "",
      lastName: "",
      role: "expert" as UserRole | "law_firm_user",
      lawFirmId: "",
    },
    validationSchema: Yup.object({
      email: Yup.string().email().required(),
      firstName: Yup.string().trim().required(),
      lastName: Yup.string().trim().required(),
      role: Yup.string().required(),
      lawFirmId: Yup.string().when("role", {
        is: "law_firm_user",
        then: (schema) => schema.required(),
        otherwise: (schema) => schema.optional(),
      }),
    }),
    onSubmit: async (values, helpers) => {
      await dispatch(
        inviteTeamMember({
          email: values.email.trim(),
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          role: values.role,
          lawFirmId:
            values.role === "law_firm_user" && values.lawFirmId
              ? Number(values.lawFirmId)
              : null,
        }),
      );
      helpers.resetForm({
        values: {
          email: "",
          firstName: "",
          lastName: "",
          role: "expert",
          lawFirmId: "",
        },
      });
      void dispatch(
        fetchTeamMembers({
          ...gridParams,
          q: query.trim() || undefined,
        }),
      );
    },
  });

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
        render: (m) => t(`team.role.${m.role}`, { defaultValue: m.role }),
      },
      {
        key: "status",
        label: t("team.colStatus"),
        sortable: true,
        shrink: true,
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
  }, [t]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <MetaHelmet title={t("portal.team")} noindex />
      <PortalPageHeader
        eyebrow={t("team.eyebrow")}
        title={t("portal.team")}
        description={t("team.subtitle")}
      />

      <form
        onSubmit={form.handleSubmit}
        className="grid gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm sm:grid-cols-2"
      >
        <input
          name="email"
          type="email"
          value={form.values.email}
          onChange={form.handleChange}
          placeholder={t("team.emailPlaceholder")}
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm sm:col-span-2"
        />
        <input
          name="firstName"
          value={form.values.firstName}
          onChange={form.handleChange}
          placeholder={t("team.firstName")}
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
        />
        <input
          name="lastName"
          value={form.values.lastName}
          onChange={form.handleChange}
          placeholder={t("team.lastName")}
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
        />
        <select
          name="role"
          value={form.values.role}
          onChange={form.handleChange}
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
        >
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {t(`team.role.${role}`, { defaultValue: role })}
            </option>
          ))}
        </select>
        {form.values.role === "law_firm_user" ? (
          <select
            name="lawFirmId"
            value={form.values.lawFirmId}
            onChange={form.handleChange}
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
          >
            <option value="">{t("team.selectLawFirm")}</option>
            {lawFirms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        ) : null}
        <button
          type="submit"
          className="h-10 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground sm:col-span-2"
        >
          {t("team.invite")}
        </button>
      </form>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

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
          className="h-11 w-full rounded-xl border border-input bg-card pl-10 pr-3 text-sm"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
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
          showingLabel={({ from, to, total }) =>
            t("grid.showing", { from, to, total })
          }
          pageLabel={({ page: p, totalPages }) =>
            t("grid.pageOf", { page: p, totalPages })
          }
        />
      </div>
    </div>
  );
}

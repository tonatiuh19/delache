import { useEffect, useMemo, useRef, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Columns3, LayoutList, Plus, RefreshCw, Search } from "lucide-react";
import MetaHelmet from "@/components/MetaHelmet";
import PortalPageHeader from "@/components/portal/PortalPageHeader";
import PortalListPanel from "@/components/portal/PortalListPanel";
import ListadoFlagStrip from "@/components/portal/ListadoFlagStrip";
import CasesPipelineBoard from "@/components/portal/CasesPipelineBoard";
import CasesPipelineSkeleton from "@/components/portal/CasesPipelineSkeleton";
import CasesListSkeleton from "@/components/portal/CasesListSkeleton";
import { FieldHelper, SectionHelper } from "@/components/portal/FormHelpers";
import { DataGrid, type DataGridColumn } from "@/components/ui/data-grid";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  createCase,
  fetchCases,
  fetchCasesPipeline,
} from "@/store/slices/casesSlice";
import { CASE_STATUS_FLOW } from "@shared/caseWorkflow";
import { canCreateStaffCase } from "@shared/caseVisibilityRules";
import type { CasePriority, CaseSummary } from "@shared/api";
import { useGridListState } from "@/hooks/useGridListState";
import { useCasesViewMode } from "@/hooks/useCasesViewMode";
import { cn } from "@/lib/utils";

const createSchema = Yup.object({
  title: Yup.string().trim().required(),
  courtName: Yup.string().trim(),
  propertyCity: Yup.string().trim(),
  priority: Yup.mixed<CasePriority>()
    .oneOf(["low", "normal", "high", "urgent"])
    .required(),
});

export default function CasesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const { items, pagination, loading, creating, error } = useAppSelector(
    (s) => s.cases,
  );
  const role = useAppSelector((s) => s.auth.user?.role);
  const canCreate = canCreateStaffCase(role);
  const { view, setViewMode } = useCasesViewMode();
  const [showCreate, setShowCreate] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  /** First paint + view switch: show preference-matched skeleton before fetch settles. */
  const [viewBooting, setViewBooting] = useState(true);
  const bootViewRef = useRef(view);
  const { page, setPage, sortBy, sortDir, onSort, gridParams } =
    useGridListState("created_at", 20);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(id);
  }, [query]);

  useEffect(() => {
    if (searchParams.get("create") !== "1" || !canCreate) return;
    setShowCreate(true);
    const next = new URLSearchParams(searchParams);
    next.delete("create");
    setSearchParams(next, { replace: true });
  }, [searchParams, canCreate, setSearchParams]);

  useEffect(() => {
    if (bootViewRef.current === view) return;
    bootViewRef.current = view;
    setViewBooting(true);
  }, [view]);

  const listParams = useMemo(
    () => ({
      ...gridParams,
      q: debouncedQuery.trim() || undefined,
      status: status || undefined,
      priority: priority || undefined,
    }),
    [gridParams, debouncedQuery, status, priority],
  );

  const pipelineParams = useMemo(
    () => ({
      q: debouncedQuery.trim() || undefined,
      status: status || undefined,
      priority: priority || undefined,
    }),
    [debouncedQuery, status, priority],
  );

  useEffect(() => {
    if (view !== "list") return;
    setViewBooting(true);
    let cancelled = false;
    void dispatch(fetchCases(listParams)).finally(() => {
      if (!cancelled) setViewBooting(false);
    });
    return () => {
      cancelled = true;
    };
  }, [dispatch, view, listParams]);

  useEffect(() => {
    if (view !== "pipeline") return;
    setViewBooting(true);
    let cancelled = false;
    void dispatch(fetchCasesPipeline(pipelineParams)).finally(() => {
      if (!cancelled) setViewBooting(false);
    });
    return () => {
      cancelled = true;
    };
  }, [dispatch, view, pipelineParams]);

  /** Refresh when returning to the tab (e.g. completed gates in another tab). */
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      if (view === "pipeline") {
        void dispatch(
          fetchCasesPipeline({ ...pipelineParams, resetColumns: false }),
        );
      } else {
        void dispatch(fetchCases(listParams));
      }
    };
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [dispatch, view, listParams, pipelineParams]);

  const formik = useFormik({
    initialValues: {
      title: "",
      courtName: "",
      propertyCity: "",
      priority: "normal" as CasePriority,
      involvesFatality: false,
    },
    validationSchema: createSchema,
    onSubmit: async (values, helpers) => {
      const result = await dispatch(
        createCase({
          title: values.title.trim(),
          courtName: values.courtName.trim() || undefined,
          propertyCity: values.propertyCity.trim() || undefined,
          priority: values.priority,
          involvesFatality: values.involvesFatality,
        }),
      );
      if (createCase.fulfilled.match(result)) {
        helpers.resetForm();
        setShowCreate(false);
        if (view === "list") {
          void dispatch(fetchCases(listParams));
        } else {
          void dispatch(
            fetchCasesPipeline({ ...pipelineParams, resetColumns: false }),
          );
        }
      }
    },
  });

  const columns = useMemo((): DataGridColumn<CaseSummary>[] => {
    return [
      {
        key: "case_number",
        label: t("cases.colCaseNumber"),
        sortable: true,
        sticky: true,
        shrink: true,
        render: (c) => (
          <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold tracking-wide text-primary">
            {c.caseNumber}
          </span>
        ),
      },
      {
        key: "title",
        label: t("cases.colTitle"),
        sortable: true,
        wrap: true,
        render: (c) => (
          <span className="font-semibold text-foreground">{c.title}</span>
        ),
      },
      {
        key: "status",
        label: t("cases.colStatus"),
        sortable: true,
        shrink: true,
        render: (c) => (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
            {t(`cases.status.${c.status}`, { defaultValue: c.status })}
          </span>
        ),
      },
      {
        key: "priority",
        label: t("cases.colPriority"),
        sortable: true,
        shrink: true,
        render: (c) =>
          t(`cases.priority.${c.priority}`, { defaultValue: c.priority }),
      },
      {
        key: "process_point",
        label: t("cases.colPoint"),
        shrink: true,
        render: (c) =>
          c.listado?.processPoint != null
            ? t("process.pointLabel", { point: c.listado.processPoint })
            : "—",
      },
      {
        key: "primary_expert",
        label: t("cases.colExpert"),
        render: (c) => c.primaryExpertName || "—",
      },
      {
        key: "law_firm",
        label: t("cases.colFirm"),
        render: (c) => c.lawFirmName || "—",
      },
      {
        key: "clock",
        label: t("cases.colClock"),
        shrink: true,
        render: (c) =>
          c.listado?.clock10DueAt
            ? new Date(c.listado.clock10DueAt).toLocaleDateString()
            : "—",
      },
      {
        key: "listado",
        label: t("cases.colListado"),
        wrap: true,
        render: (c) =>
          c.listado ? (
            <ListadoFlagStrip listado={c.listado} compact />
          ) : (
            "—"
          ),
      },
      {
        key: "court_name",
        label: t("cases.colCourt"),
        sortable: true,
        render: (c) => c.courtName || "—",
      },
      {
        key: "property_city",
        label: t("cases.colCity"),
        sortable: true,
        render: (c) => c.propertyCity || "—",
      },
      {
        key: "created_at",
        label: t("cases.colCreated"),
        sortable: true,
        shrink: true,
        render: (c) => new Date(c.createdAt).toLocaleDateString(),
      },
    ];
  }, [t]);

  const viewToggle = (
    <div
      className="flex shrink-0 rounded-xl border border-input bg-background p-0.5"
      role="group"
      aria-label={t("cases.pipeline.viewToggle")}
    >
      <button
        type="button"
        onClick={() => setViewMode("list")}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition",
          view === "list"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <LayoutList size={14} />
        <span className="hidden sm:inline">{t("cases.pipeline.viewList")}</span>
      </button>
      <button
        type="button"
        onClick={() => setViewMode("pipeline")}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition",
          view === "pipeline"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Columns3 size={14} />
        <span className="hidden sm:inline">
          {t("cases.pipeline.viewBoard")}
        </span>
      </button>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl">
      <MetaHelmet title={t("portal.cases")} noindex />

      <PortalPageHeader
        eyebrow={t("cases.eyebrow")}
        title={t("portal.cases")}
        description={t("cases.subtitle")}
        actions={
          canCreate ? (
            <button
              type="button"
              onClick={() => setShowCreate((v) => !v)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/15 transition hover:bg-primary/90"
            >
              <Plus size={15} />
              {t("cases.newCase")}
            </button>
          ) : undefined
        }
      />

      {showCreate && canCreate ? (
        <motion.form
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={formik.handleSubmit}
          className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
        >
          <SectionHelper>{t("help.cases.createSection")}</SectionHelper>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-muted-foreground sm:col-span-2">
              {t("cases.titleLabel")}
              <input
                name="title"
                value={formik.values.title}
                onChange={formik.handleChange}
                className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
              />
              <FieldHelper>{t("help.cases.title")}</FieldHelper>
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              {t("cases.courtLabel")}
              <input
                name="courtName"
                value={formik.values.courtName}
                onChange={formik.handleChange}
                className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
              />
              <FieldHelper>{t("help.cases.court")}</FieldHelper>
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              {t("cases.cityLabel")}
              <input
                name="propertyCity"
                value={formik.values.propertyCity}
                onChange={formik.handleChange}
                className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
              />
              <FieldHelper>{t("help.cases.city")}</FieldHelper>
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              {t("cases.priorityLabel")}
              <select
                name="priority"
                value={formik.values.priority}
                onChange={formik.handleChange}
                className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                {(["low", "normal", "high", "urgent"] as const).map((p) => (
                  <option key={p} value={p}>
                    {t(`cases.priority.${p}`)}
                  </option>
                ))}
              </select>
              <FieldHelper>{t("help.cases.priority")}</FieldHelper>
            </label>
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-foreground sm:col-span-2">
              <input
                type="checkbox"
                name="involvesFatality"
                checked={formik.values.involvesFatality}
                onChange={formik.handleChange}
                className="h-4 w-4 rounded border-input"
              />
              {t("cases.involvesFatality")}
            </label>
            <FieldHelper>{t("help.cases.fatality")}</FieldHelper>
          </div>
          {error ? (
            <p className="mt-3 text-xs text-destructive">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={creating}
            className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {creating ? (
              <RefreshCw className="animate-spin" size={16} />
            ) : null}
            {t("cases.create")}
          </button>
        </motion.form>
      ) : null}

      <PortalListPanel
        toolbar={
          <div className="space-y-2">
            {error && !creating ? (
              <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {t("cases.loadFailed")}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[12rem] flex-1">
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
                  placeholder={t("cases.searchPlaceholder")}
                  className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-3 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-ring/20"
                />
              </div>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="">{t("cases.filterAllStatuses")}</option>
                {[...CASE_STATUS_FLOW, "on_hold", "cancelled"].map((s) => (
                  <option key={s} value={s}>
                    {t(`cases.status.${s}`, { defaultValue: s })}
                  </option>
                ))}
              </select>
              <select
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value);
                  setPage(1);
                }}
                className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="">{t("cases.filterAllPriorities")}</option>
                {(["low", "normal", "high", "urgent"] as const).map((p) => (
                  <option key={p} value={p}>
                    {t(`cases.priority.${p}`)}
                  </option>
                ))}
              </select>
              {viewToggle}
            </div>
            <FieldHelper>
              {view === "pipeline"
                ? t("help.cases.pipeline")
                : t("help.cases.search")}
            </FieldHelper>
          </div>
        }
      >
        {viewBooting ? (
          view === "pipeline" ? (
            <CasesPipelineSkeleton />
          ) : (
            <CasesListSkeleton />
          )
        ) : view === "pipeline" ? (
          <CasesPipelineBoard
            q={debouncedQuery}
            statusFilter={status}
            priority={priority}
            viewerRole={role}
          />
        ) : (
          <DataGrid<CaseSummary>
            data={items}
            columns={columns}
            rowKey={(c) => c.publicUuid}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={onSort}
            pagination={pagination}
            onPageChange={setPage}
            isLoading={loading}
            emptyMessage={t("cases.empty")}
            noBleeding
            onRowClick={(c) => navigate(`/portal/cases/${c.publicUuid}`)}
            showingLabel={({ from, to, total }) =>
              t("grid.showing", { from, to, total })
            }
            pageLabel={({ page: p, totalPages }) =>
              t("grid.pageOf", { page: p, totalPages })
            }
            mobileCard={(c) => (
              <Link
                to={`/portal/cases/${c.publicUuid}`}
                className="block rounded-xl border border-border bg-background p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold text-primary">
                    {c.caseNumber}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                    {t(`cases.status.${c.status}`, {
                      defaultValue: c.status,
                    })}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold">{c.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[
                    c.listado?.processPoint != null
                      ? t("process.pointLabel", {
                          point: c.listado.processPoint,
                        })
                      : null,
                    c.courtName,
                    c.propertyCity,
                    c.primaryExpertName,
                    c.lawFirmName,
                  ]
                    .filter(Boolean)
                    .join(" · ") || t("cases.noLocation")}
                </p>
                {c.listado ? (
                  <div className="mt-2">
                    <ListadoFlagStrip listado={c.listado} compact />
                  </div>
                ) : null}
              </Link>
            )}
          />
        )}
      </PortalListPanel>
    </div>
  );
}

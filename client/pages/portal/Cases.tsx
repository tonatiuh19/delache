import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Columns3, LayoutList, Plus, Search } from "lucide-react";
import MetaHelmet from "@/components/MetaHelmet";
import PortalPageHeader from "@/components/portal/PortalPageHeader";
import PortalListPanel from "@/components/portal/PortalListPanel";
import ListadoFlagStrip from "@/components/portal/ListadoFlagStrip";
import CaseOwnershipBadges from "@/components/portal/CaseOwnershipBadges";
import CasesKpiStrip from "@/components/portal/cases/CasesKpiStrip";
import CasesFiltersButton from "@/components/portal/cases/CasesFiltersButton";
import CasesPipelineBoard from "@/components/portal/CasesPipelineBoard";
import CasesPipelineSkeleton from "@/components/portal/CasesPipelineSkeleton";
import CasesListSkeleton from "@/components/portal/CasesListSkeleton";
import { DataGrid, type DataGridColumn } from "@/components/ui/data-grid";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchCases, fetchCasesPipeline } from "@/store/slices/casesSlice";
import { canCreateStaffCase } from "@shared/caseVisibilityRules";
import {
  casesKpiInPageAction,
  casesKpiIsSelected,
  parseCasesKpiParam,
  type CasesKpiKey,
} from "@shared/casesKpiRules";
import type { CaseSummary } from "@shared/api";
import { useGridListState } from "@/hooks/useGridListState";
import { useCasesViewMode } from "@/hooks/useCasesViewMode";
import { cn } from "@/lib/utils";
import DespachoCasesHome from "@/components/portal/DespachoCasesHome";

export default function CasesPage() {
  const actor = useAppSelector((s) => s.auth.user?.actor);
  if (actor === "law_firm") return <DespachoCasesHome />;
  return <StaffCasesPage />;
}

function StaffCasesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const { items, pagination, loading, creating, error } =
    useAppSelector((s) => s.cases);
  const role = useAppSelector((s) => s.auth.user?.role);
  const canCreate = canCreateStaffCase(role);
  const { view, setViewMode } = useCasesViewMode();
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
    navigate("/portal/cases/new", { replace: true });
  }, [searchParams, canCreate, navigate]);

  const selectedKpi = parseCasesKpiParam(searchParams.get("kpi"));

  useEffect(() => {
    const action = selectedKpi ? casesKpiInPageAction(selectedKpi) : null;
    if (!action) return;
    setStatus(action.statusFilter);
    if (action.view) setViewMode(action.view);
    setPage(1);
  }, [selectedKpi, setViewMode, setPage]);

  const handleKpiSelect = (key: CasesKpiKey) => {
    const action = casesKpiInPageAction(key);
    if (!action) return;
    const next = new URLSearchParams(searchParams);
    next.set("kpi", key);
    setSearchParams(next, { replace: true });
    setStatus(action.statusFilter);
    if (action.view) setViewMode(action.view);
    setPage(1);
    window.requestAnimationFrame(() => {
      document.getElementById("cases-list")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const kpiSelected = (key: CasesKpiKey) =>
    casesKpiIsSelected(key, {
      kpiParam: selectedKpi,
      statusFilter: status,
      view,
    });

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

  const refreshCases = () => {
    if (view === "list") {
      void dispatch(fetchCases(listParams));
    } else {
      void dispatch(
        fetchCasesPipeline({ ...pipelineParams, resetColumns: false }),
      );
    }
  };

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
            <ListadoFlagStrip listado={c.listado} status={c.status} compact />
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
    <div className="inline-flex h-11 shrink-0 items-center rounded-xl border border-border bg-muted/40 p-1">
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
    <div className="min-w-0 w-full max-w-full">
      <MetaHelmet title={t("portal.cases")} noindex />

      <PortalPageHeader
        eyebrow={t("cases.eyebrow")}
        title={t("portal.cases")}
        description={t("cases.subtitle")}
        actions={
          canCreate ? (
            <button
              type="button"
              onClick={() => navigate("/portal/cases/new")}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/15 transition hover:bg-primary/90"
            >
              <Plus size={15} />
              {t("cases.newCase")}
            </button>
          ) : undefined
        }
      />

      <CasesKpiStrip
        className="mt-4"
        selectedKpi={
          (["active", "dueSoon", "inReview", "completed"] as const).find(
            (k) => kpiSelected(k),
          ) ?? null
        }
        onKpiSelect={handleKpiSelect}
      />

      <PortalListPanel
        id="cases-list"
        toolbar={
          <div className="space-y-2">
            {error && !creating ? (
              <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {t("cases.loadFailed")}
              </p>
            ) : null}
            <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative min-w-0 w-full flex-1">
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
              <div className="flex shrink-0 items-center gap-2">
                <CasesFiltersButton
                  status={status}
                  priority={priority}
                  onStatusChange={(value) => {
                    setStatus(value);
                    setPage(1);
                  }}
                  onPriorityChange={(value) => {
                    setPriority(value);
                    setPage(1);
                  }}
                />
                {viewToggle}
              </div>
            </div>
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
                    c.lawFirmName,
                  ]
                    .filter(Boolean)
                    .join(" · ") || t("cases.noLocation")}
                </p>
                <CaseOwnershipBadges caseItem={c} className="mt-2" max={3} />
                {c.listado ? (
                  <div className="mt-2">
                    <ListadoFlagStrip listado={c.listado} status={c.status} compact />
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

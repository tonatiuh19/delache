import { useEffect, useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Bell,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  FileWarning,
  Kanban,
  MapPinned,
  PauseCircle,
  Plus,
  Receipt,
  Siren,
  Users,
  type LucideIcon,
} from "lucide-react";
import MetaHelmet from "@/components/MetaHelmet";
import PortalPageHeader from "@/components/portal/PortalPageHeader";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchDashboardStats,
  fetchReportsKpis,
} from "@/store/slices/portalSlice";
import { fetchCases } from "@/store/slices/casesSlice";
import { DashboardSkeleton } from "@/components/portal/PortalSkeletons";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardStatsResponse } from "@shared/api";
import {
  canSeeOrgKpiStrip,
  dashboardCtasForRole,
  dashboardMetricCtaHref,
  dashboardMetricsForRole,
  dashboardPersonaKey,
  type DashboardCtaId,
  type DashboardMetricKey,
} from "@shared/dashboardPersonaRules";
import { roleMission } from "@shared/roleMissionRules";
import { cn } from "@/lib/utils";

const METRIC_ICONS: Record<DashboardMetricKey, LucideIcon> = {
  totalCases: Briefcase,
  urgentOpen: Siren,
  completed: CheckCircle2,
  onHold: PauseCircle,
  pendingReviews: ClipboardList,
  pendingInvoices: Receipt,
  delayedDeadlines: AlertTriangle,
  missingDocsCases: FileWarning,
};

const METRIC_LABEL_KEYS: Record<DashboardMetricKey, string> = {
  totalCases: "dashboard.totalCases",
  urgentOpen: "dashboard.urgent",
  completed: "dashboard.completed",
  onHold: "dashboard.onHold",
  pendingReviews: "dashboard.pendingReviews",
  pendingInvoices: "dashboard.pendingInvoices",
  delayedDeadlines: "dashboard.delayedDeadlines",
  missingDocsCases: "dashboard.missingDocsCases",
};

const CTA_ICONS: Record<DashboardCtaId, LucideIcon> = {
  cases: Briefcase,
  createCase: Plus,
  calendar: CalendarDays,
  documents: FileText,
  finance: Receipt,
  team: Users,
  notifications: Bell,
  reviews: ClipboardList,
  pipeline: Kanban,
  fieldOps: MapPinned,
};

function metricValue(
  stats: DashboardStatsResponse | null,
  key: DashboardMetricKey,
): number {
  if (!stats) return 0;
  return Number(stats[key] ?? 0);
}

function DashboardMetricTile({
  metricKey,
  value,
  loading,
}: {
  metricKey: DashboardMetricKey;
  value: number;
  loading: boolean;
}) {
  const { t } = useTranslation();
  const Icon = METRIC_ICONS[metricKey];
  const href = dashboardMetricCtaHref(metricKey);
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">
          {t(METRIC_LABEL_KEYS[metricKey])}
        </span>
        <Icon size={16} className="text-primary" />
      </div>
      <div className="mt-3 font-[Manrope] text-3xl font-bold text-foreground">
        {loading ? <Skeleton className="h-8 w-14" /> : value}
      </div>
      {href ? (
        <p
          className={cn(
            "mt-3 text-[10px] font-semibold uppercase tracking-wide text-primary transition",
            value > 0 && metricKey === "pendingReviews"
              ? "opacity-100"
              : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100",
          )}
        >
          {t("dashboard.metricOpen")} →
        </p>
      ) : null}
    </>
  );

  if (!href) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        {body}
      </div>
    );
  }

  return (
    <Link
      to={href}
      className={cn(
        "group block rounded-2xl border border-border bg-card p-4 shadow-sm transition-all",
        "hover:border-primary/40 hover:shadow-md hover:shadow-primary/5",
        value > 0 && metricKey === "pendingReviews"
          ? "ring-1 ring-primary/20"
          : "",
      )}
    >
      {body}
    </Link>
  );
}

export default function PortalDashboard() {
  const actor = useAppSelector((s) => s.auth.user?.actor);
  if (actor === "law_firm") {
    return <Navigate to="/portal/cases" replace />;
  }
  return <StaffDashboard />;
}

function StaffDashboard() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const role = useAppSelector((s) => s.auth.user?.role);
  const { stats, kpis, loadingStats, loadingKpis } = useAppSelector(
    (s) => s.portal,
  );
  const { items, loading: loadingCases } = useAppSelector((s) => s.cases);

  const persona = dashboardPersonaKey(role);
  const mission = useMemo(() => roleMission(role), [role]);
  const metricKeys = useMemo(() => dashboardMetricsForRole(role), [role]);
  const ctas = useMemo(() => dashboardCtasForRole(role), [role]);
  const showOrgKpis = canSeeOrgKpiStrip(role);

  useEffect(() => {
    void dispatch(fetchDashboardStats());
    void dispatch(fetchReportsKpis());
    void dispatch(
      fetchCases({ limit: 5, sortBy: "created_at", sortDir: "DESC" }),
    );
  }, [dispatch]);

  if ((loadingStats && !stats) || (loadingCases && items.length === 0)) {
    return <DashboardSkeleton />;
  }

  const statusEntries = Object.entries(kpis?.casesByStatus || {}).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <div className="min-w-0 w-full max-w-full space-y-6">
      <MetaHelmet title={t("portal.dashboard")} noindex />
      <PortalPageHeader
        eyebrow={t("dashboard.eyebrow")}
        title={t("portal.dashboard")}
        description={t(`dashboard.persona.${persona}`)}
      />

      {mission ? (
        <section className="overflow-x-clip rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-4 shadow-sm sm:p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
            {t("missionControl.eyebrow")}
          </p>
          <h2 className="mt-1 font-[Manrope] text-lg font-bold text-foreground sm:text-xl">
            {t(mission.titleKey)}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {t(mission.subtitleKey)}
          </p>
          <Link
            to={mission.listHref}
            className="mt-3 inline-flex h-11 min-h-[44px] items-center rounded-xl bg-accent px-4 text-xs font-semibold text-accent-foreground transition hover:opacity-90"
          >
            {t("missionControl.openQueue")} →
          </Link>
        </section>
      ) : null}

      {items.some(
        (c) => c.listado?.advanceReleased && !c.listado?.advancePaid,
      ) &&
      (role === "accountant" || role === "admin") ? (
        <section className="overflow-x-clip rounded-2xl border border-primary/30 bg-card p-4 shadow-sm sm:p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
            {t("cases.anticipoCue.title")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("cases.anticipoCue.body")}
          </p>
          <Link
            to="/portal/finance"
            className="mt-3 inline-flex h-11 min-h-[44px] items-center rounded-xl border border-border bg-background px-4 text-xs font-semibold text-foreground transition hover:border-primary hover:text-primary"
          >
            {t("cases.anticipoCue.cta")} →
          </Link>
        </section>
      ) : null}

      <section className="overflow-x-clip rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-bold">{t("dashboard.quickActions")}</h2>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
            {t(`dashboard.personaBadge.${persona}`)}
          </p>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ctas.map((cta) => {
            const Icon = CTA_ICONS[cta.id];
            const primary = Boolean(cta.primary);
            return (
              <Link
                key={`${cta.id}-${cta.href}`}
                to={cta.href}
                className={cn(
                  "group flex min-h-[52px] items-center gap-3 rounded-2xl border px-3.5 py-3 transition",
                  primary
                    ? "border-primary/40 bg-gradient-to-br from-primary/15 via-card to-card shadow-sm hover:border-primary"
                    : "border-border bg-background hover:border-primary/40 hover:bg-muted/40",
                )}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                    primary
                      ? "border-primary/30 bg-primary text-primary-foreground"
                      : "border-border bg-card text-primary",
                  )}
                >
                  <Icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {t(`dashboard.cta.${cta.id}`)}
                  </span>
                  <span className="mt-0.5 block text-[10px] font-medium text-muted-foreground opacity-0 transition group-hover:opacity-100">
                    {t("dashboard.metricOpen")} →
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metricKeys.map((key) => (
          <DashboardMetricTile
            key={key}
            metricKey={key}
            value={metricValue(stats, key)}
            loading={loadingStats}
          />
        ))}
      </div>

      {showOrgKpis ? (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-bold">{t("dashboard.kpiTitle")}</h2>
          {loadingKpis && !kpis ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-background px-3 py-3">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {t("dashboard.kpiDelayed")}
                  </div>
                  <div className="mt-1 font-[Manrope] text-2xl font-bold">
                    {kpis?.delayedCount ?? 0}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-background px-3 py-3">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {t("dashboard.kpiAvgCompletion")}
                  </div>
                  <div className="mt-1 font-[Manrope] text-2xl font-bold">
                    {kpis?.averageCompletionDays != null
                      ? t("dashboard.kpiAvgDays", {
                          days: Math.round(kpis.averageCompletionDays),
                        })
                      : "—"}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-background px-3 py-3">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {t("dashboard.kpiCompleted")}
                  </div>
                  <div className="mt-1 font-[Manrope] text-2xl font-bold">
                    {kpis?.completedCount ?? 0}
                  </div>
                </div>
              </div>
              {statusEntries.length > 0 ? (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {statusEntries.map(([status, count]) => (
                    <li
                      key={status}
                      className="rounded-full border border-border bg-background px-3 py-1 text-[11px]"
                    >
                      <span className="font-semibold">
                        {t(`cases.status.${status}`, { defaultValue: status })}
                      </span>
                      <span className="ml-1 text-muted-foreground">{count}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {(kpis?.casesByExpert?.length ?? 0) > 0 ? (
                <div className="mt-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {t("dashboard.byExpert")}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {kpis!.casesByExpert.slice(0, 5).map((row) => (
                      <li
                        key={row.userId}
                        className="flex justify-between text-xs"
                      >
                        <span className="font-medium">{row.name}</span>
                        <span className="text-muted-foreground">{row.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}
        </section>
      ) : (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-bold">{t("dashboard.myLoadTitle")}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-background px-3 py-3">
              <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {t("dashboard.kpiDelayed")}
              </div>
              <div className="mt-1 font-[Manrope] text-2xl font-bold">
                {kpis?.delayedCount ?? stats?.delayedDeadlines ?? 0}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-background px-3 py-3">
              <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {t("dashboard.completed")}
              </div>
              <div className="mt-1 font-[Manrope] text-2xl font-bold">
                {kpis?.completedCount ?? stats?.completed ?? 0}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold">{t("dashboard.recentCases")}</h2>
          <Link
            to="/portal/cases"
            className="text-xs font-semibold text-primary hover:underline"
          >
            {t("dashboard.viewAll")}
          </Link>
        </div>
        <ul className="mt-4 divide-y divide-border">
          {loadingCases && items.length === 0
            ? Array.from({ length: 4 }).map((_, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-3 w-14" />
                </li>
              ))
            : null}
          {items.slice(0, 5).map((c) => (
            <li key={c.publicUuid}>
              <Link
                to={`/portal/cases/${c.publicUuid}`}
                className="flex items-center justify-between gap-3 py-3 text-sm hover:text-primary"
              >
                <span className="truncate font-semibold">
                  {c.caseNumber} · {c.title}
                </span>
                <span className="shrink-0 text-[10px] uppercase text-muted-foreground">
                  {t(`cases.status.${c.status}`, { defaultValue: c.status })}
                </span>
              </Link>
            </li>
          ))}
          {!loadingCases && items.length === 0 ? (
            <li className="py-6 text-xs text-muted-foreground">
              {t("cases.empty")}
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}

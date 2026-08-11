import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  FileWarning,
  PauseCircle,
  Receipt,
  Siren,
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

export default function PortalDashboard() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { stats, kpis, loadingStats, loadingKpis } = useAppSelector(
    (s) => s.portal,
  );
  const { items, loading: loadingCases } = useAppSelector((s) => s.cases);

  useEffect(() => {
    void dispatch(fetchDashboardStats());
    void dispatch(fetchReportsKpis());
    void dispatch(fetchCases({ limit: 5, sortBy: "created_at", sortDir: "DESC" }));
  }, [dispatch]);

  const cards = [
    {
      label: t("dashboard.totalCases"),
      value: stats?.totalCases ?? 0,
      icon: Briefcase,
    },
    {
      label: t("dashboard.urgent"),
      value: stats?.urgentOpen ?? 0,
      icon: Siren,
    },
    {
      label: t("dashboard.completed"),
      value: stats?.completed ?? 0,
      icon: CheckCircle2,
    },
    {
      label: t("dashboard.onHold"),
      value: stats?.onHold ?? 0,
      icon: PauseCircle,
    },
    {
      label: t("dashboard.pendingReviews"),
      value: stats?.pendingReviews ?? 0,
      icon: ClipboardList,
    },
    {
      label: t("dashboard.pendingInvoices"),
      value: stats?.pendingInvoices ?? 0,
      icon: Receipt,
    },
    {
      label: t("dashboard.delayedDeadlines"),
      value: stats?.delayedDeadlines ?? 0,
      icon: AlertTriangle,
    },
    {
      label: t("dashboard.missingDocsCases"),
      value: stats?.missingDocsCases ?? 0,
      icon: FileWarning,
    },
  ];

  if ((loadingStats && !stats) || (loadingCases && items.length === 0)) {
    return <DashboardSkeleton />;
  }

  const statusEntries = Object.entries(kpis?.casesByStatus || {}).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <MetaHelmet title={t("portal.dashboard")} noindex />
      <PortalPageHeader
        eyebrow={t("dashboard.eyebrow")}
        title={t("portal.dashboard")}
        description={t("dashboard.subtitle")}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-2xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                {label}
              </span>
              <Icon size={16} className="text-primary" />
            </div>
            <div className="mt-3 font-[Manrope] text-3xl font-bold text-foreground">
              {loadingStats ? <Skeleton className="h-8 w-14" /> : value}
            </div>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-bold">{t("dashboard.kpiTitle")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("dashboard.kpiHint")}
        </p>
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
          </>
        )}
      </section>

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

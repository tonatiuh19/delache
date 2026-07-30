import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Briefcase, CheckCircle2, PauseCircle, Siren } from "lucide-react";
import MetaHelmet from "@/components/MetaHelmet";
import PortalPageHeader from "@/components/portal/PortalPageHeader";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchDashboardStats } from "@/store/slices/portalSlice";
import { fetchCases } from "@/store/slices/casesSlice";
import { DashboardSkeleton } from "@/components/portal/PortalSkeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function PortalDashboard() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { stats, loadingStats } = useAppSelector((s) => s.portal);
  const { items, loading: loadingCases } = useAppSelector((s) => s.cases);

  useEffect(() => {
    void dispatch(fetchDashboardStats());
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
  ];

  if ((loadingStats && !stats) || (loadingCases && items.length === 0)) {
    return <DashboardSkeleton />;
  }

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

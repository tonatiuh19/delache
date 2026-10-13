import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchDashboardStats } from "@/store/slices/portalSlice";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardStatsResponse } from "@shared/api";
import {
  casesKpiCtaHref,
  type CasesKpiKey,
} from "@shared/casesKpiRules";
import { cn } from "@/lib/utils";

const KPI_COLLAPSED_KEY = "delache_cases_kpi_collapsed_v2";

/** Default collapsed; only "0" means user expanded. */
function readCollapsedPref(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(KPI_COLLAPSED_KEY) !== "0";
}

function KpiCtaTile({
  kpiKey,
  label,
  value,
  icon: Icon,
  loading,
  accent,
  selected,
  href,
  ctaLabel,
  onSelect,
}: {
  kpiKey: CasesKpiKey;
  label: string;
  value: number;
  icon: LucideIcon;
  loading: boolean;
  accent?: boolean;
  selected?: boolean;
  href?: string | null;
  ctaLabel: string;
  onSelect?: (key: CasesKpiKey) => void;
}) {
  const showCtaAlways =
    selected || accent || (kpiKey === "inReview" && value > 0);

  const body = (
    <>
      <div className="flex items-center justify-between gap-1.5">
        <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <Icon size={13} className="shrink-0 text-primary" />
      </div>
      <div className="mt-1 font-[Manrope] text-lg font-bold leading-none text-foreground sm:text-xl">
        {loading ? <Skeleton className="h-5 w-8" /> : value}
      </div>
      <p
        className={cn(
          "mt-1.5 flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary transition",
          showCtaAlways
            ? "opacity-100"
            : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100",
        )}
      >
        {ctaLabel}
        <ArrowRight
          size={10}
          className="transition-transform group-hover:translate-x-0.5"
        />
      </p>
    </>
  );

  const tileClass = cn(
    "group block rounded-xl border border-border bg-card px-2.5 py-2 shadow-sm transition-all sm:px-3 sm:py-2.5",
    "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
    selected && "border-primary ring-2 ring-primary/25",
    accent && !selected && "border-destructive/40",
  );

  if (href && !onSelect) {
    return (
      <Link to={href} className={tileClass}>
        {body}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect?.(kpiKey)}
      className={cn(tileClass, "w-full text-left")}
    >
      {body}
    </button>
  );
}

/** Compact KPI strip for Cases — collapsible so the board gets vertical room. */
export default function CasesKpiStrip({
  className,
  selectedKpi = null,
  onKpiSelect,
}: {
  className?: string;
  selectedKpi?: CasesKpiKey | null;
  onKpiSelect?: (key: CasesKpiKey) => void;
}) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { stats, loadingStats } = useAppSelector((s) => s.portal);
  // Always start collapsed; restore expand only after mount if user opted in.
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    void dispatch(fetchDashboardStats());
  }, [dispatch]);

  useEffect(() => {
    if (readCollapsedPref() === false) {
      setCollapsed(false);
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(KPI_COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  };

  const s = stats as DashboardStatsResponse | null;
  const active =
    (s?.totalCases ?? 0) - (s?.completed ?? 0) - (s?.onHold ?? 0);

  const tiles: {
    key: CasesKpiKey;
    label: string;
    value: number;
    icon: LucideIcon;
    accent?: boolean;
  }[] = [
    {
      key: "active",
      label: t("cases.kpi.active"),
      value: Math.max(0, active),
      icon: Briefcase,
    },
    {
      key: "dueSoon",
      label: t("cases.kpi.dueSoon"),
      value: s?.delayedDeadlines ?? 0,
      icon: Clock,
      accent: (s?.delayedDeadlines ?? 0) > 0,
    },
    {
      key: "inReview",
      label: t("cases.kpi.inReview"),
      value: s?.pendingReviews ?? 0,
      icon: ClipboardList,
    },
    {
      key: "completed",
      label: t("cases.kpi.completedMonth"),
      value: s?.completed ?? 0,
      icon: CheckCircle2,
    },
  ];

  const collapsedSummary = tiles
    .map((tile) => `${tile.value} ${tile.label}`)
    .join(" · ");

  return (
    <div className={cn("min-w-0", className)}>
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-expanded={!collapsed}
        aria-controls="cases-kpi-grid"
        className="flex w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2 text-left shadow-sm transition hover:border-primary/30 sm:px-3.5"
      >
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
            {t("cases.kpi.stripLabel")}
          </p>
          {collapsed ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {loadingStats ? t("common.loading") : collapsedSummary}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("cases.kpi.stripHint")}
            </p>
          )}
        </div>
        <span
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground"
          aria-hidden
        >
          <ChevronDown
            size={16}
            className={cn(
              "transition-transform duration-200",
              collapsed && "-rotate-90",
            )}
          />
        </span>
        <span className="sr-only">
          {collapsed ? t("cases.kpi.expand") : t("cases.kpi.collapse")}
        </span>
      </button>

      {!collapsed ? (
        <div
          id="cases-kpi-grid"
          className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4"
        >
          {tiles.map((tile) => (
            <KpiCtaTile
              key={tile.key}
              kpiKey={tile.key}
              label={tile.label}
              value={tile.value}
              icon={tile.icon}
              loading={loadingStats}
              accent={tile.accent}
              selected={selectedKpi === tile.key}
              href={casesKpiCtaHref(tile.key)}
              ctaLabel={t(`cases.kpi.cta.${tile.key}`)}
              onSelect={onKpiSelect}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

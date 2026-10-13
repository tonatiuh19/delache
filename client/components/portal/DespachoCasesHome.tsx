import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Briefcase,
  Calendar,
  Info,
  Lock,
  MapPin,
  Plus,
  Search,
} from "lucide-react";
import MetaHelmet from "@/components/MetaHelmet";
import { ContentPageSkeleton } from "@/components/portal/PortalSkeletons";
import DespachoSeguimientoPanel from "@/components/portal/DespachoSeguimientoPanel";
import ListadoFlagStrip from "@/components/portal/ListadoFlagStrip";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchCases } from "@/store/slices/casesSlice";
import { useFirmCapabilities } from "@/hooks/useFirmCapabilities";
import { filterDespachoCases } from "@shared/despachoPanelRules";
import { clientStepNumber } from "@shared/caseStepTreeRules";
import { processPointForStatus } from "@shared/processGates";
import { cn } from "@/lib/utils";
import type { CaseSummary } from "@shared/api";
import type { ListadoBadgeId } from "@shared/listadoBadgeRules";

const BADGE_FILTERS: Array<ListadoBadgeId | "all"> = [
  "all",
  "activo",
  "en_revision",
  "en_espera",
  "vencido",
  "cerrado",
  "pagado",
];

function formatDate(value: string | null | undefined, locale: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(locale.startsWith("es") ? "es-MX" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function stepLabel(
  c: CaseSummary,
  t: (key: string, opts?: Record<string, unknown>) => string,
): { n: number; name: string } {
  const point = processPointForStatus(c.status);
  if (!point) {
    return { n: 0, name: t(`cases.status.${c.status}`, { defaultValue: c.status }) };
  }
  return {
    n: clientStepNumber(point),
    name: t(`process.point.${point}.name`),
  };
}

/** Despacho home: Mis expedientes + Solo lectura Seguimiento. */
export default function DespachoCasesHome() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const { canMutate, isViewer } = useFirmCapabilities();
  const [searchParams, setSearchParams] = useSearchParams();
  const { items: cases, loading } = useAppSelector((s) => s.cases);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [badgeFilter, setBadgeFilter] = useState<ListadoBadgeId | "all">(
    "all",
  );
  const selectedUuid =
    searchParams.get("selected") ?? cases[0]?.publicUuid ?? null;

  useEffect(() => {
    void dispatch(fetchCases({ page: 1, limit: 100 }));
  }, [dispatch]);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q != null) setQuery(q);
  }, [searchParams]);

  const filtered = useMemo(
    () =>
      filterDespachoCases({
        cases,
        query,
        badgeId: badgeFilter,
      }),
    [badgeFilter, cases, query],
  );

  const selected =
    filtered.find((c) => c.publicUuid === selectedUuid) ??
    filtered[0] ??
    null;

  useEffect(() => {
    if (!selected) return;
    if (searchParams.get("selected") === selected.publicUuid) return;
    const next = new URLSearchParams(searchParams);
    next.set("selected", selected.publicUuid);
    setSearchParams(next, { replace: true });
  }, [selected, searchParams, setSearchParams]);

  if (loading && cases.length === 0) {
    return <ContentPageSkeleton variant="split" withActions />;
  }

  return (
    <div className="min-w-0 space-y-5">
      <MetaHelmet title={t("despacho.panel.title")} noindex />
      <header className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="font-[Manrope] text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {t("despacho.panel.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("despacho.panel.subtitle")}
          </p>
        </div>
        {canMutate ? (
          <Link
            to="/portal/cases/new"
            className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm shadow-primary/25"
          >
            <Plus size={16} />
            {t("despacho.panel.newCase")}
          </Link>
        ) : null}
      </header>

      <div className="flex items-start gap-3 rounded-2xl border border-info/25 bg-info-muted px-4 py-3">
        <Lock size={18} className="mt-0.5 shrink-0 text-info" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {isViewer
              ? t("despacho.panel.viewerBanner")
              : t("despacho.panel.roleBanner")}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isViewer
              ? t("despacho.panel.viewerBannerHint")
              : t("despacho.panel.roleBannerHint")}
          </p>
        </div>
        <Info size={16} className="shrink-0 text-info" />
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Briefcase size={16} />
              </span>
              <h2 className="text-sm font-bold">{t("despacho.cases")}</h2>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t("despacho.panel.showing", {
                shown: filtered.length,
                total: cases.length,
              })}
            </p>
          </div>

          <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:px-5">
            <div className="relative min-w-0 flex-1">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("despacho.panel.tableSearch")}
                className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <select
              value={badgeFilter}
              onChange={(e) =>
                setBadgeFilter(e.target.value as ListadoBadgeId | "all")
              }
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm sm:w-auto"
            >
              {BADGE_FILTERS.map((id) => (
                <option key={id} value={id}>
                  {id === "all"
                    ? t("despacho.panel.allStatuses")
                    : t(`listado.badge.${id}`)}
                </option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              {t("despacho.empty")}
            </p>
          ) : (
            <>
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[40rem] text-left text-sm">
                  <thead className="border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5">{t("despacho.panel.colFolio")}</th>
                      <th className="px-4 py-2.5">{t("despacho.panel.colName")}</th>
                      <th className="px-4 py-2.5">
                        {t("despacho.panel.colDeadline")}
                      </th>
                      <th className="px-4 py-2.5">{t("despacho.panel.colStep")}</th>
                      <th className="px-4 py-2.5">
                        {t("despacho.panel.colReview")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((c) => {
                      const step = stepLabel(c, t);
                      const active = selected?.publicUuid === c.publicUuid;
                      return (
                        <tr
                          key={c.publicUuid}
                          onClick={() => {
                            const next = new URLSearchParams(searchParams);
                            next.set("selected", c.publicUuid);
                            setSearchParams(next, { replace: true });
                          }}
                          className={cn(
                            "cursor-pointer transition",
                            active
                              ? "bg-info-muted"
                              : "hover:bg-muted/40",
                          )}
                        >
                          <td className="px-4 py-3 font-semibold text-foreground">
                            {c.caseNumber}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-foreground">
                              {c.title}
                            </p>
                            {c.propertyCity ? (
                              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                                <MapPin size={11} />
                                {c.propertyCity}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Calendar size={12} />
                              {formatDate(
                                c.externalCourtDeadlineAt ??
                                  c.inspectionDeadlineAt,
                                i18n.language,
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="grid h-6 w-6 place-items-center rounded-full bg-info/15 text-[11px] font-bold text-info">
                                {step.n || "—"}
                              </span>
                              <span className="max-w-[8rem] truncate text-xs font-semibold">
                                {step.name}
                              </span>
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {c.listado ? (
                              <ListadoFlagStrip
                                listado={c.listado}
                                status={c.status}
                                compact
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-border sm:hidden">
                {filtered.map((c) => {
                  const step = stepLabel(c, t);
                  const active = selected?.publicUuid === c.publicUuid;
                  return (
                    <li key={c.publicUuid}>
                      <button
                        type="button"
                        onClick={() => {
                          const next = new URLSearchParams(searchParams);
                          next.set("selected", c.publicUuid);
                          setSearchParams(next, { replace: true });
                        }}
                        className={cn(
                          "w-full px-4 py-3 text-left",
                          active ? "bg-info-muted" : "",
                        )}
                      >
                        <p className="text-sm font-bold">{c.caseNumber}</p>
                        <p className="text-sm font-semibold">{c.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {step.n}. {step.name}
                        </p>
                        {c.listado ? (
                          <div className="mt-2">
                            <ListadoFlagStrip
                              listado={c.listado}
                              status={c.status}
                              compact
                            />
                          </div>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {selected ? (
            <div className="border-t border-border px-4 py-3 sm:px-5">
              <Link
                to={`/portal/cases/${selected.publicUuid}`}
                className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
              >
                {t("despacho.panel.openActions")}
              </Link>
            </div>
          ) : null}
        </section>

        <DespachoSeguimientoPanel
          selected={selected}
          className="lg:col-span-5 lg:min-h-[32rem]"
        />
      </div>
    </div>
  );
}

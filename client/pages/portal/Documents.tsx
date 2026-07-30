import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import MetaHelmet from "@/components/MetaHelmet";
import PortalPageHeader from "@/components/portal/PortalPageHeader";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchCases } from "@/store/slices/casesSlice";
import { ListCardSkeleton, PageHeaderSkeleton } from "@/components/portal/PortalSkeletons";

/** Cross-case document index (documents live on each case). */
export default function DocumentsPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { items, loading } = useAppSelector((s) => s.cases);

  useEffect(() => {
    void dispatch(fetchCases({ limit: 100, sortBy: "created_at", sortDir: "DESC" }));
  }, [dispatch]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <MetaHelmet title={t("portal.documents")} noindex />
      {loading && items.length === 0 ? (
        <>
          <PageHeaderSkeleton />
          <ListCardSkeleton rows={6} />
        </>
      ) : (
        <>
          <PortalPageHeader
            eyebrow={t("documents.eyebrow")}
            title={t("portal.documents")}
            description={t("documents.hint")}
          />
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <ul className="divide-y divide-border">
              {items.map((c) => (
                <li key={c.publicUuid} className="py-3">
                  <Link
                    to={`/portal/cases/${c.publicUuid}`}
                    className="text-sm font-semibold text-foreground hover:text-primary"
                  >
                    {c.caseNumber} · {c.title}
                  </Link>
                </li>
              ))}
              {items.length === 0 ? (
                <li className="py-4 text-sm text-muted-foreground">
                  {t("cases.empty")}
                </li>
              ) : null}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

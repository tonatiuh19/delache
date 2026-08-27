import { useEffect, useCallback } from "react";
import { Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ClipboardList, RefreshCw } from "lucide-react";
import MetaHelmet from "@/components/MetaHelmet";
import PortalPageHeader from "@/components/portal/PortalPageHeader";
import PortalListPanel from "@/components/portal/PortalListPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchPendingReviews } from "@/store/slices/portalSlice";
import { canAccessReviewsQueue } from "@shared/reviewQueueRules";

export default function ReviewsPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const role = useAppSelector((s) => s.auth.user?.role);
  const {
    pendingReviews,
    pendingReviewsTotal,
    loadingPendingReviews,
    pendingReviewsError,
  } = useAppSelector((s) => s.portal);

  const canAccess = canAccessReviewsQueue(role);

  const loadReviews = useCallback(() => {
    void dispatch(fetchPendingReviews({}));
  }, [dispatch]);

  useEffect(() => {
    if (!canAccess) return;
    loadReviews();
  }, [canAccess, loadReviews]);

  useEffect(() => {
    if (!canAccess) return;
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      loadReviews();
    };
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [canAccess, loadReviews]);

  if (!canAccess) {
    return <Navigate to="/portal" replace />;
  }

  const forbidden =
    !loadingPendingReviews &&
    pendingReviewsError === "Insufficient permissions" &&
    pendingReviews.length === 0;

  const loadFailed =
    !loadingPendingReviews &&
    pendingReviewsError != null &&
    pendingReviewsError !== "Insufficient permissions";

  return (
    <div className="mx-auto max-w-4xl">
      <MetaHelmet title={t("portal.reviews")} noindex />
      <PortalPageHeader
        eyebrow={t("reviews.eyebrow")}
        title={t("portal.reviews")}
        description={t("reviews.subtitle")}
      />

      <PortalListPanel>
        {loadingPendingReviews && pendingReviews.length === 0 && !loadFailed ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : forbidden ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <p className="text-sm font-semibold text-foreground">
              {t("reviews.forbiddenTitle")}
            </p>
            <p className="max-w-sm text-xs text-muted-foreground">
              {t("reviews.forbiddenBody")}
            </p>
            <Link
              to="/portal"
              className="text-xs font-semibold text-primary hover:underline"
            >
              {t("reviews.backToDashboard")}
            </Link>
          </div>
        ) : loadFailed ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <p className="text-sm font-semibold text-foreground">
              {t("reviews.loadFailed")}
            </p>
            <p className="max-w-sm text-xs text-muted-foreground">
              {pendingReviewsError}
            </p>
            <button
              type="button"
              onClick={loadReviews}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-primary hover:border-primary"
            >
              <RefreshCw size={14} />
              {t("reviews.retry")}
            </button>
          </div>
        ) : pendingReviews.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">
              {t("reviews.emptyTitle")}
            </p>
            <p className="max-w-sm text-xs text-muted-foreground">
              {t("reviews.emptyBody")}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {pendingReviews.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/portal/cases/${r.casePublicUuid}#case-reviews`}
                  className="flex flex-col gap-2 px-4 py-4 transition hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold tracking-wide text-primary">
                        {r.caseNumber}
                      </span>
                      <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                        {t(`cases.reviewEntity.${r.entityType}`, {
                          defaultValue: r.entityType,
                        })}{" "}
                        ·{" "}
                        {t(`cases.reviewStage.${r.reviewStage}`, {
                          defaultValue: r.reviewStage,
                        })}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm font-semibold text-foreground">
                      {r.caseTitle}
                    </p>
                    {r.dueAt ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("cases.reviewDue")}:{" "}
                        {new Date(r.dueAt).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-primary">
                    {t("reviews.openCase")} →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {!loadingPendingReviews && pendingReviewsTotal > pendingReviews.length ? (
          <p className="border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
            {t("reviews.showingCount", {
              shown: pendingReviews.length,
              total: pendingReviewsTotal,
            })}
          </p>
        ) : null}
      </PortalListPanel>
    </div>
  );
}

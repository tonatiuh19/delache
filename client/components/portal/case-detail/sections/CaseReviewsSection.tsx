import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Scale } from "lucide-react";
import CaseDetailSectionPanel from "@/components/portal/case-detail/CaseDetailSectionPanel";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  canCompleteReviewStage,
  canViewCaseSection,
} from "@shared/portalCapabilities";
import {
  completeReviewRequest,
  fetchCaseDetail,
} from "@/store/slices/casesSlice";
import type { CaseDetailSectionProps } from "./caseDetailSectionShared";

export default function CaseReviewsSection({
  publicUuid,
}: CaseDetailSectionProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { selected, reviewRequests, detailLoading } = useAppSelector(
    (s) => s.cases,
  );
  const role = useAppSelector((s) => s.auth.user?.role);

  useEffect(() => {
    if (detailLoading) return;
    if (!selected || selected.publicUuid !== publicUuid) return;
    if (!canViewCaseSection(role, "reviews")) return;
    // Prefer focused section scroll from CaseDetail shell; keep hash fallback.
    if (
      location.hash !== "#case-reviews" &&
      !location.search.includes("section=reviews")
    ) {
      return;
    }
    let cancelled = false;
    let tries = 0;
    const tick = () => {
      if (cancelled) return;
      const el = document.getElementById("case-reviews");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (tries++ < 60) requestAnimationFrame(tick);
    };
    const frame = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [
    location.hash,
    location.search,
    detailLoading,
    reviewRequests.length,
    publicUuid,
    role,
    selected?.publicUuid,
  ]);

  if (!selected || selected.publicUuid !== publicUuid) return null;

  return (
    <CaseDetailSectionPanel
      id="case-reviews"
      sectionId="reviews"
      title={t("cases.reviewRequests")}
      icon={<Scale size={18} />}
      helper={t("help.caseDetail.reviewRequests")}
    >
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {reviewRequests.filter((r) => r.status === "pending").length === 0 ? (
          <li className="text-sm text-muted-foreground sm:col-span-2 xl:col-span-3">
            {t("cases.noPendingReviews")}
          </li>
        ) : (
          reviewRequests
            .filter((r) => r.status === "pending")
            .map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-border bg-background px-4 py-3 text-sm"
              >
                <div className="font-semibold">
                  {t(`cases.reviewEntity.${r.entityType}`, {
                    defaultValue: r.entityType,
                  })}{" "}
                  ·{" "}
                  {t(`cases.reviewStage.${r.reviewStage}`, {
                    defaultValue: r.reviewStage,
                  })}
                </div>
                {r.dueAt ? (
                  <div className="mt-1 text-muted-foreground">
                    {t("cases.reviewDue")}: {new Date(r.dueAt).toLocaleString()}
                  </div>
                ) : null}
                {canCompleteReviewStage(role, r.reviewStage) ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(
                      [
                        ["approved", "cases.reviewApprove"],
                        ["changes_requested", "cases.reviewChanges"],
                        ["rejected", "cases.reviewReject"],
                      ] as const
                    ).map(([outcome, labelKey]) => (
                      <button
                        key={outcome}
                        type="button"
                        className="rounded-full border border-border px-2 py-1 text-[10px] font-semibold hover:border-primary hover:text-primary"
                        onClick={() =>
                          void dispatch(
                            completeReviewRequest({
                              publicUuid,
                              reviewId: r.id,
                              outcome,
                            }),
                          ).then(() => {
                            void dispatch(fetchCaseDetail(publicUuid));
                          })
                        }
                      >
                        {t(labelKey)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    {t("cases.reviewAwaitingRole")}
                  </p>
                )}
              </li>
            ))
        )}
      </ul>
    </CaseDetailSectionPanel>
  );
}

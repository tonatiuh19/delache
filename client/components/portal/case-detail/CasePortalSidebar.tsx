import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Circle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import CaseProcessStepTree from "@/components/portal/case-detail/CaseProcessStepTree";
import type { CaseDetail } from "@shared/api";
import { clientStepNumber, visibleStepTreeForRole } from "@shared/caseStepTreeRules";
import { cn } from "@/lib/utils";

export default function CasePortalSidebar({
  publicUuid,
  selected,
  loading,
  viewerRole,
  draft = false,
  compact,
  onNavigate,
}: {
  publicUuid: string;
  selected: CaseDetail | null;
  loading: boolean;
  viewerRole?: string | null;
  /** Unsaved create page: same rail, steps stay on this screen until Enviar. */
  draft?: boolean;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className={cn(
          "shrink-0 border-b border-white/10 px-3 py-3",
          compact && "px-2 py-2",
        )}
      >
        <Link
          to="/portal/cases"
          onClick={onNavigate}
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-semibold text-white/55 transition hover:text-primary",
            compact && "justify-center",
          )}
          title={t("cases.backToList")}
        >
          <ArrowLeft size={14} className="shrink-0" />
          {!compact ? <span>{t("cases.backToList")}</span> : null}
        </Link>
        {!compact ? (
          draft ? (
            <div className="mt-3 min-w-0">
              <p className="truncate font-[Manrope] text-sm font-bold text-white">
                {t("cases.intakeCreate.pageTitle")}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-white/45">
                {t("cases.intakeCreate.stepLabel")}
              </p>
            </div>
          ) : loading || !selected ? (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-4 w-28 bg-white/10" />
              <Skeleton className="h-3 w-full bg-white/10" />
            </div>
          ) : (
            <div className="mt-3 min-w-0">
              <p className="truncate font-[Manrope] text-sm font-bold text-white">
                {selected.caseNumber}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-white/45">
                {selected.title}
              </p>
            </div>
          )
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 py-3">
        {draft ? (
          <DraftStepRail viewerRole={viewerRole} />
        ) : loading || !selected ? (
          <div className="space-y-2 px-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-xl bg-white/10" />
            ))}
          </div>
        ) : (
          <CaseProcessStepTree
            variant="sidebar"
            caseStatus={selected.status}
            publicUuid={publicUuid}
            viewerRole={viewerRole}
            onNavigate={onNavigate}
            className="px-1"
          />
        )}
      </div>
    </div>
  );
}

function DraftStepRail({
  viewerRole,
}: {
  viewerRole?: string | null;
}) {
  const { t } = useTranslation();
  const steps = visibleStepTreeForRole({
    role: viewerRole,
    status: "intake",
    currentPoint: 1,
  });

  return (
    <nav className="flex min-h-0 flex-1 flex-col px-1" aria-label={t("cases.stepTree.label")}>
      <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
        {t("cases.stepTree.eyebrow")}
      </p>
      <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
        <li>
          <span className="flex items-center gap-2 rounded-xl bg-white/[0.09] px-2.5 py-2 text-[13px] font-semibold text-white shadow-[inset_3px_0_0_0_hsl(var(--primary))]">
            <Circle size={14} className="fill-current" />
            {t("cases.intakeCreate.pageTitle")}
          </span>
        </li>
        {steps.map((node) => {
          const current = node.id === 1;
          return (
            <li key={node.id}>
              <span
                className={cn(
                  "flex items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] font-semibold",
                  current ? "text-white" : "text-white/35",
                )}
              >
                <span
                  className={cn(
                    "grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold",
                    current
                      ? "bg-primary text-primary-foreground"
                      : "border border-white/15 text-white/40",
                  )}
                >
                  {clientStepNumber(node.id)}
                </span>
                <span className="truncate">
                  {t(`process.point.${node.id}.name`)}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

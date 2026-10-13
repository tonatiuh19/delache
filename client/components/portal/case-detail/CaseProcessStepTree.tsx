import { Link, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronRight, Check, Circle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  caseStepPath,
  clientStepNumber,
  defaultSubsectionForStep,
  resolveFocusedSection,
  stepVisualStatus,
  visibleStepTreeForRole,
  type CaseDetailSectionId,
  type ProcessStepSlug,
  type StepTreeNode,
} from "@shared/caseStepTreeRules";
import {
  formatSubstepNavLabel,
  numberedSubstepsForStep,
} from "@shared/caseStepNavRules";
import { processPointForStatus } from "@shared/processGates";
import { shouldHideStepSubsections } from "@shared/pdfStepWorkspaceRules";
import type { CaseStatus } from "@shared/api";

export type CaseProcessStepTreeVariant = "card" | "sidebar";

function useStepTreeTheme(variant: CaseProcessStepTreeVariant) {
  const sidebar = variant === "sidebar";
  return {
    linkActive: sidebar
      ? "bg-white/[0.09] text-white shadow-[inset_3px_0_0_0_hsl(var(--primary))]"
      : "bg-primary/10 text-foreground ring-1 ring-primary/25",
    linkIdle: sidebar
      ? "text-white/55 hover:bg-white/[0.06] hover:text-white"
      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
    subLinkActive: sidebar
      ? "bg-white/[0.07] font-semibold text-white shadow-[inset_2px_0_0_0_hsl(var(--primary))]"
      : "bg-primary/10 font-semibold text-foreground",
    subLinkIdle: sidebar
      ? "text-white/45 hover:bg-white/[0.05] hover:text-white/80"
      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
    overviewActive: sidebar
      ? "bg-white/[0.09] text-white shadow-[inset_3px_0_0_0_hsl(var(--primary))]"
      : "bg-accent text-accent-foreground",
    nestedBorder: sidebar ? "border-white/10" : "border-border",
    badgeCompleted: sidebar
      ? "border-primary/40 bg-primary/20 text-primary"
      : "border-primary/40 bg-primary/15 text-primary",
    badgeCurrent: "border-primary bg-primary text-primary-foreground",
    badgeUpcoming: sidebar
      ? "border-white/15 bg-white/5 text-white/45"
      : "border-border bg-background text-muted-foreground",
    badgeLocked: sidebar
      ? "border-white/10 bg-white/[0.04] text-white/35"
      : "border-border bg-muted text-muted-foreground",
    currentLabel: sidebar ? "text-primary" : "text-primary",
    chevron: sidebar ? "group-hover:text-white/60" : "group-hover:opacity-60",
  };
}

function StepTreeSubsections({
  stepSlug,
  publicUuid,
  activeSection,
  viewerRole,
  variant,
  onNavigate,
}: {
  stepSlug: ProcessStepSlug;
  publicUuid: string;
  activeSection?: CaseDetailSectionId | null;
  viewerRole?: string | null;
  variant: CaseProcessStepTreeVariant;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  const theme = useStepTreeTheme(variant);
  const substeps = numberedSubstepsForStep({
    stepSlug,
    viewerRole,
  });
  if (substeps.length === 0) return null;

  return (
    <ul
      className={cn("ml-6 space-y-0.5 border-l py-0.5 pl-2", theme.nestedBorder)}
    >
      {substeps.map((sub) => {
        const isActive = activeSection === sub.sectionId;
        const label = formatSubstepNavLabel(
          clientStepNumber(sub.point),
          sub.index,
          t(sub.labelKey),
        );
        return (
          <li key={sub.sectionId}>
            <Link
              to={caseStepPath(publicUuid, stepSlug, sub.sectionId)}
              onClick={onNavigate}
              className={cn(
                "block rounded-lg px-2 py-1.5 text-[11px] font-medium transition",
                isActive ? theme.subLinkActive : theme.subLinkIdle,
              )}
            >
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function StepTreeRow({
  node,
  currentPoint,
  caseStatus,
  publicUuid,
  activeSlug,
  activeSection,
  viewerRole,
  variant,
  onNavigate,
}: {
  node: StepTreeNode;
  currentPoint: ReturnType<typeof processPointForStatus>;
  caseStatus: CaseStatus;
  publicUuid: string;
  activeSlug?: string;
  activeSection?: CaseDetailSectionId | null;
  viewerRole?: string | null;
  variant: CaseProcessStepTreeVariant;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  const theme = useStepTreeTheme(variant);
  const status = stepVisualStatus(node.id, currentPoint, caseStatus);
  const isActive = activeSlug === node.slug;
  const defaultSection = defaultSubsectionForStep(node.slug, viewerRole);
  const href = caseStepPath(
    publicUuid,
    node.slug,
    isActive && activeSection ? activeSection : defaultSection ?? undefined,
  );

  return (
    <li className="space-y-0.5">
      <Link
        to={href}
        onClick={onNavigate}
        className={cn(
          "group flex items-start gap-2 rounded-xl px-2.5 py-2 text-[13px] font-medium transition",
          isActive ? theme.linkActive : theme.linkIdle,
        )}
      >
        <span
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold",
            status === "completed" && theme.badgeCompleted,
            status === "current" && theme.badgeCurrent,
            status === "upcoming" && theme.badgeUpcoming,
            status === "locked" && theme.badgeLocked,
          )}
        >
          {status === "completed" ? (
            <Check size={12} strokeWidth={2.5} />
          ) : status === "locked" ? (
            <Lock size={10} />
          ) : (
            clientStepNumber(node.id)
          )}
        </span>
        <span className="min-w-0 flex-1 leading-snug">
          <span className="block truncate">
            {t(`process.point.${node.id}.name`, {
              defaultValue: `Punto ${node.id}`,
            })}
          </span>
          {status === "current" ? (
            <span
              className={cn(
                "mt-0.5 block text-[10px] font-semibold uppercase tracking-wide",
                theme.currentLabel,
              )}
            >
              {t("cases.stepTree.current")}
            </span>
          ) : null}
        </span>
        {!isActive ? (
          <ChevronRight
            size={14}
            className={cn("mt-1 shrink-0 opacity-0 transition", theme.chevron)}
          />
        ) : null}
      </Link>
      {isActive && !shouldHideStepSubsections(node.slug) ? (
        <StepTreeSubsections
          stepSlug={node.slug}
          publicUuid={publicUuid}
          activeSection={activeSection}
          viewerRole={viewerRole}
          variant={variant}
          onNavigate={onNavigate}
        />
      ) : null}
    </li>
  );
}

export default function CaseProcessStepTree({
  caseStatus,
  publicUuid,
  viewerRole,
  className,
  variant = "card",
  onNavigate,
}: {
  caseStatus: CaseStatus;
  publicUuid: string;
  viewerRole?: string | null;
  className?: string;
  variant?: CaseProcessStepTreeVariant;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  const { stepSlug } = useParams();
  const [searchParams] = useSearchParams();
  const activeSection = resolveFocusedSection(
    stepSlug,
    searchParams.get("section"),
  );
  const currentPoint = processPointForStatus(caseStatus);
  const theme = useStepTreeTheme(variant);
  const sidebar = variant === "sidebar";
  const visibleSteps = visibleStepTreeForRole({
    role: viewerRole,
    currentPoint,
    status: caseStatus,
  });

  return (
    <nav
      className={cn(
        sidebar
          ? "flex min-h-0 flex-1 flex-col"
          : "rounded-2xl border border-border bg-card p-3 shadow-sm",
        className,
      )}
      aria-label={t("cases.stepTree.label")}
    >
      <div className={cn("mb-2", sidebar ? "px-1" : "px-2")}>
        <p
          className={cn(
            "text-[10px] font-bold uppercase tracking-[0.18em]",
            sidebar ? "text-primary" : "text-primary",
          )}
        >
          {t("cases.stepTree.eyebrow")}
        </p>
        <p
          className={cn(
            "mt-0.5 text-xs",
            sidebar ? "text-white/45" : "text-muted-foreground",
          )}
        >
          {t("cases.stepTree.hint")}
        </p>
      </div>
      <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
        <li>
          <Link
            to={caseStepPath(publicUuid)}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] font-semibold transition",
              !stepSlug ? theme.overviewActive : theme.linkIdle,
            )}
          >
            <Circle size={14} className={!stepSlug ? "fill-current" : ""} />
            {t("cases.stepTree.overview")}
          </Link>
        </li>
        {visibleSteps.map((node) => (
          <StepTreeRow
            key={node.id}
            node={node}
            currentPoint={currentPoint}
            caseStatus={caseStatus}
            publicUuid={publicUuid}
            activeSlug={stepSlug}
            activeSection={activeSection}
            viewerRole={viewerRole}
            variant={variant}
            onNavigate={onNavigate}
          />
        ))}
      </ul>
    </nav>
  );
}

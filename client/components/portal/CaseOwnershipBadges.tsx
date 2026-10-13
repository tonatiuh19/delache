import { useTranslation } from "react-i18next";
import type { CaseSummary } from "@shared/api";
import {
  buildCaseCardOwnershipBadges,
  type CaseCardOwnershipBadge,
} from "@shared/caseCardOwnershipRules";
import { cn } from "@/lib/utils";

function OwnershipBadge({ badge }: { badge: CaseCardOwnershipBadge }) {
  const { t } = useTranslation();
  const roleLabel =
    badge.labelNamespace === "actor"
      ? t(`process.actor.${badge.labelKey}`, {
          defaultValue: badge.labelKey,
        })
      : t(`team.role.${badge.labelKey}`, {
          defaultValue: badge.labelKey,
        });
  const text = badge.personName?.trim() || roleLabel;
  const title = badge.personName
    ? `${roleLabel} — ${badge.personName}`
    : roleLabel;

  return (
    <span
      title={title}
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold leading-tight",
        badge.emphasis === "working"
          ? "border-primary/35 bg-primary/10 text-foreground"
          : "border-border bg-muted/40 text-muted-foreground",
      )}
    >
      {badge.letter ? (
        <span
          className={cn(
            "grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full text-[8px] font-bold",
            badge.emphasis === "working"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {badge.letter}
        </span>
      ) : (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
      )}
      <span className="min-w-0 truncate">{text}</span>
    </span>
  );
}

/** R/A + assignee chips for pipeline / list case cards. */
export default function CaseOwnershipBadges({
  caseItem,
  className,
  max = 3,
}: {
  caseItem: CaseSummary;
  className?: string;
  max?: number;
}) {
  const badges = buildCaseCardOwnershipBadges({
    status: caseItem.status,
    holdResumeStatus: caseItem.listado?.holdResumeStatus ?? null,
    assignments: caseItem.activeAssignments ?? null,
    max,
  });

  if (badges.length === 0) return null;

  return (
    <div className={cn("flex min-w-0 flex-wrap gap-1", className)}>
      {badges.map((badge, i) => (
        <OwnershipBadge
          key={`${badge.letter ?? "x"}-${badge.labelKey}-${badge.personName ?? i}`}
          badge={badge}
        />
      ))}
    </div>
  );
}

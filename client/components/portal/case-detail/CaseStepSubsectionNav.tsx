import { Link, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  caseStepPath,
  processPointForSlug,
  resolveFocusedSection,
  type ProcessStepSlug,
} from "@shared/caseStepTreeRules";
import {
  buildStepOwnershipChips,
  formatStickyOrientation,
  formatSubstepNavLabel,
  numberedSubstepsForStep,
  substepOrdinalForSection,
} from "@shared/caseStepNavRules";
import { useAppSelector } from "@/store/hooks";
import { cn } from "@/lib/utils";

function OwnershipStrip({ point }: { point: number }) {
  const { t } = useTranslation();
  const assignments = useAppSelector((s) => s.cases.assignments);
  const chips = buildStepOwnershipChips({
    point: point as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10,
    assignments,
  });
  if (chips.length === 0) return null;

  return (
    <div
      className="flex min-w-0 flex-wrap items-center gap-1.5"
      aria-label={t("cases.stepOwnership.label")}
    >
      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {t("cases.stepOwnership.eyebrow")}
      </span>
      {chips.map((chip) => {
        const roleLabel = t(`process.actor.${chip.actor}`, {
          defaultValue: chip.actor,
        });
        const letterLabel = t(`process.raci.${chip.letter}`);
        return (
          <span
            key={`${chip.letter}-${chip.actor}`}
            title={`${letterLabel}: ${roleLabel}${
              chip.personName ? ` — ${chip.personName}` : ""
            }`}
            className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-semibold text-foreground"
          >
            <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-primary/15 text-[9px] font-bold text-primary">
              {chip.letter}
            </span>
            <span className="min-w-0 truncate">
              {chip.personName ? (
                <>
                  <span className="text-foreground">{chip.personName}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {roleLabel}
                  </span>
                </>
              ) : (
                roleLabel
              )}
            </span>
          </span>
        );
      })}
    </div>
  );
}

/**
 * Unified sticky orientation: `1 · Step · 1.1 Substep` + ownership + numbered pills.
 * Replaces the old title-only subsection nav (decision Q6C / Q7C).
 */
export default function CaseStepSubsectionNav({
  publicUuid,
  viewerRole,
}: {
  publicUuid: string;
  viewerRole?: string | null;
}) {
  const { t } = useTranslation();
  const { stepSlug } = useParams<{ stepSlug?: string }>();
  const [searchParams] = useSearchParams();

  if (!stepSlug) return null;

  const stepPoint = processPointForSlug(stepSlug);
  if (stepPoint == null) return null;

  const substeps = numberedSubstepsForStep({
    stepSlug,
    viewerRole,
  });
  const activeSection = resolveFocusedSection(
    stepSlug,
    searchParams.get("section"),
  );
  const activeOrd = substepOrdinalForSection({
    stepSlug,
    sectionId: activeSection,
    viewerRole,
  });
  const activeSub = substeps.find((s) => s.sectionId === activeSection);
  const stepName = t(`process.point.${stepPoint}.name`, {
    defaultValue: `Punto ${stepPoint}`,
  });
  const substepName = activeSub
    ? t(activeSub.labelKey)
    : activeSection
      ? t(`cases.subsection.${activeSection}`, {
          defaultValue: activeSection,
        })
      : null;

  const orientation = formatStickyOrientation({
    point: stepPoint,
    stepName,
    substepIndex: activeOrd,
    substepName,
  });

  return (
    <nav
      aria-label={t("cases.subsectionNav.label")}
      className="sticky top-0 z-20 rounded-2xl border border-border bg-card/95 px-5 py-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/85 sm:px-6 sm:py-5 xl:px-8"
    >
      <div className="flex min-w-0 flex-col gap-3.5 sm:gap-4">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              {t("cases.subsectionNav.eyebrow")}
            </p>
            <h2 className="mt-1 truncate font-[Manrope] text-base font-bold text-foreground sm:text-lg">
              {orientation}
            </h2>
          </div>
          <OwnershipStrip point={stepPoint} />
        </div>

        {substeps.length > 0 ? (
          <ul
            className="flex min-w-0 gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
          >
            {substeps.map((sub) => {
              const isActive = activeSection === sub.sectionId;
              const label = formatSubstepNavLabel(
                sub.point,
                sub.index,
                t(sub.labelKey),
              );
              return (
                <li key={sub.sectionId} role="presentation">
                  <Link
                    to={caseStepPath(
                      publicUuid,
                      stepSlug as ProcessStepSlug,
                      sub.sectionId,
                    )}
                    role="tab"
                    aria-selected={isActive}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "inline-flex h-11 shrink-0 items-center rounded-full px-4 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "border border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    )}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </nav>
  );
}

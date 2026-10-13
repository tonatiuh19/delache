import { useTranslation } from "react-i18next";
import CaseDetailSectionPanel from "@/components/portal/case-detail/CaseDetailSectionPanel";
import { useAppSelector } from "@/store/hooks";
import { canViewCaseSection } from "@shared/portalCapabilities";
import type { CaseDetailSectionProps } from "./caseDetailSectionShared";

export default function CaseCompletenessSection({
  publicUuid,
  focusedSection = null,
}: CaseDetailSectionProps) {
  const { t } = useTranslation();
  const { selected, documentCompleteness } = useAppSelector((s) => s.cases);
  const role = useAppSelector((s) => s.auth.user?.role);

  if (!selected || selected.publicUuid !== publicUuid) return null;
  if (!documentCompleteness) return null;
  if (!canViewCaseSection(role, "completeness")) return null;
  if (
    canViewCaseSection(role, "documents") &&
    focusedSection !== "completeness"
  ) {
    return null;
  }

  return (
    <CaseDetailSectionPanel
      id="case-completeness"
      sectionId="completeness"
      title={t("cases.documentCompleteness")}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(
          [
            ["intake", documentCompleteness.intake],
            ["additionalDocs", documentCompleteness.additionalDocs],
            ["courtFiling", documentCompleteness.courtFiling],
          ] as const
        )
          .filter(
            (
              entry,
            ): entry is [typeof entry[0], NonNullable<(typeof entry)[1]>] =>
              Boolean(entry[1]),
          )
          .map(([key, info]) => (
            <div
              key={key}
              className="rounded-xl border border-border bg-background px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold">
                  {t(`cases.docPhase.${key}`)}
                </span>
                <span
                  className={
                    info.complete
                      ? "text-[10px] font-bold uppercase text-primary"
                      : "text-[10px] font-bold uppercase text-destructive"
                  }
                >
                  {info.complete
                    ? t("cases.docComplete")
                    : t("cases.docIncomplete")}
                </span>
              </div>
              {info.missing.length > 0 ? (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {t("cases.docMissing")}:{" "}
                  {info.missing
                    .map((c) =>
                      t(`cases.docCategory.${c}`, { defaultValue: c }),
                    )
                    .join(", ")}
                </p>
              ) : (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {t("cases.docNoneMissing")}
                </p>
              )}
            </div>
          ))}
      </div>
    </CaseDetailSectionPanel>
  );
}

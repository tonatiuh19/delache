import { useTranslation } from "react-i18next";
import { Check, Minus } from "lucide-react";
import { EVIDENCE_CHECKLIST_CATEGORIES } from "@shared/evidenceRules";
import type { EvidenceChecklistStatus } from "@shared/api";
import { cn } from "@/lib/utils";

const EVIDENCE_GROUPS: {
  labelKey: string;
  categories: (typeof EVIDENCE_CHECKLIST_CATEGORIES)[number][];
}[] = [
  {
    labelKey: "cases.evidenceGroup.measurements",
    categories: ["horizontal_distance", "vertical_distance", "pole_distance"],
  },
  {
    labelKey: "cases.evidenceGroup.network",
    categories: ["facade", "pole_id", "electrical_structure", "conductor"],
  },
  {
    labelKey: "cases.evidenceGroup.environment",
    categories: ["sidewalk", "construction"],
  },
  {
    labelKey: "cases.evidenceGroup.risk",
    categories: ["property_invasion", "oversized_construction", "safety"],
  },
];

export default function EvidenceChecklistGuide({
  checklist,
}: {
  checklist: EvidenceChecklistStatus | null;
}) {
  const { t } = useTranslation();
  const covered = new Set(checklist?.covered ?? []);

  return (
    <div className="mb-6 rounded-xl border border-border bg-muted/20 p-4 sm:p-5">
      <p className="text-sm font-bold text-foreground">
        {t("cases.evidenceProtocolTitle")}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("cases.evidenceProtocolHint")}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {EVIDENCE_GROUPS.map((group) => (
          <div
            key={group.labelKey}
            className="rounded-2xl border border-primary/30 bg-primary/5 p-3"
          >
            <p className="text-xs font-bold uppercase tracking-wide text-foreground">
              {t(group.labelKey)}
            </p>
            <ul className="mt-2 space-y-1.5">
              {group.categories.map((cat) => {
                const on = covered.has(cat);
                return (
                  <li
                    key={cat}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2 py-1 text-xs",
                      on ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {on ? <Check size={12} /> : <Minus size={12} />}
                    {t(`cases.evidenceCategory.${cat}`, { defaultValue: cat })}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

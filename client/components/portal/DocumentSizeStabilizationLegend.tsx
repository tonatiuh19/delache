import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DMS_SHOW_SIZE_STABILIZATION_LEGEND,
  dmsMaxFileSizeMb,
} from "@shared/documentDmsRules";

/**
 * Temporary notice while DMS keeps a conservative per-file cap.
 * Hidden automatically when `DMS_SHOW_SIZE_STABILIZATION_LEGEND` is flipped off.
 */
export default function DocumentSizeStabilizationLegend({
  className,
}: {
  className?: string;
}) {
  const { t } = useTranslation();
  if (!DMS_SHOW_SIZE_STABILIZATION_LEGEND) return null;

  return (
    <aside
      role="note"
      className={
        className ||
        "rounded-xl border border-primary/25 bg-secondary/50 px-3 py-2.5 text-xs text-foreground"
      }
    >
      <div className="flex gap-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 space-y-1">
          <p className="font-bold tracking-wide text-primary">
            {t("documents.sizeStabilizationTitle")}
          </p>
          <p className="leading-relaxed text-muted-foreground">
            {t("documents.sizeStabilizationBody", {
              mb: dmsMaxFileSizeMb(),
            })}
          </p>
        </div>
      </div>
    </aside>
  );
}

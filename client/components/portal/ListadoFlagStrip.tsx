import { useTranslation } from "react-i18next";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CaseStatus } from "@shared/api";
import type { ListadoProgress } from "@shared/processGates";
import {
  deriveListadoBadges,
  type ListadoBadgeTone,
} from "@shared/listadoBadgeRules";

const FLAG_KEYS = [
  "intakeComplete",
  "primaryExpert",
  "questionnaireApproved",
  "streetViewDone",
  "advanceReleased",
  "advancePaid",
  "plaintiffQuestionnaire",
  "protestaFiled",
  "logisticsReady",
  "inspectionComplete",
  "reportInternalOk",
  "reportFirmOk",
  "ratified",
  "attendedWithReport",
  "finalReleased",
  "finalPaid",
] as const satisfies readonly (keyof ListadoProgress)[];

type FlagKey = (typeof FLAG_KEYS)[number];

/** PDF Panel despacho / Miro listado pill colors. */
const TONE_CLASS: Record<ListadoBadgeTone, string> = {
  primary: "border-info/25 bg-info/10 text-info",
  warning: "border-primary/40 bg-primary/15 text-foreground",
  destructive: "border-destructive/30 bg-destructive/10 text-destructive",
  muted: "border-border bg-muted text-muted-foreground",
  success: "border-success/30 bg-success/15 text-success",
};

export default function ListadoFlagStrip({
  listado,
  status,
  compact = false,
  showDetailChips = false,
}: {
  listado: ListadoProgress;
  /** Required for correct Miro badge derivation. */
  status: CaseStatus | string;
  compact?: boolean;
  /** When false (default), only Miro primary badges show. */
  showDetailChips?: boolean;
}) {
  const { t } = useTranslation();
  const badges = deriveListadoBadges({ status, listado });

  return (
    <div className="flex min-w-0 flex-wrap gap-1">
      {badges.map((badge) => (
        <span
          key={badge.id}
          title={t(`listado.badge.${badge.id}`)}
          className={cn(
            "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
            TONE_CLASS[badge.tone],
          )}
        >
          {t(`listado.badge.${badge.id}`)}
        </span>
      ))}
      {showDetailChips
        ? FLAG_KEYS.map((key: FlagKey) => {
            const on = Boolean(listado[key]);
            return (
              <span
                key={key}
                title={t(`listado.flag.${key}`)}
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                  on
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {on ? <Check size={10} /> : <Minus size={10} />}
                {compact
                  ? t(`listado.short.${key}`)
                  : t(`listado.flag.${key}`)}
              </span>
            );
          })
        : null}
    </div>
  );
}

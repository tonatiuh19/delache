import { useTranslation } from "react-i18next";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ListadoProgress } from "@shared/processGates";

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

export default function ListadoFlagStrip({
  listado,
  compact = false,
}: {
  listado: ListadoProgress;
  compact?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap gap-1">
      {FLAG_KEYS.map((key: FlagKey) => {
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
            {compact ? t(`listado.short.${key}`) : t(`listado.flag.${key}`)}
          </span>
        );
      })}
    </div>
  );
}

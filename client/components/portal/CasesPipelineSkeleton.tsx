import { useTranslation } from "react-i18next";
import { CASE_PIPELINE_STATUSES } from "@shared/casePipelineRules";
import { cn } from "@/lib/utils";

const COLUMN_CARD_COUNTS = [2, 3, 1, 2, 3, 2, 1, 2, 3, 2, 1, 2, 1, 1, 1];

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted-foreground/15",
        className,
      )}
    />
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
      <div className="flex gap-2.5">
        <Shimmer className="h-8 w-8 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Shimmer className="h-3 w-3/4" />
          <Shimmer className="h-2.5 w-1/2" />
        </div>
      </div>
      <Shimmer className="mt-3 h-2 w-full rounded-full" />
      <Shimmer className="mt-2 h-2 w-2/3 rounded-full" />
    </div>
  );
}

function SkeletonColumn({ cardCount }: { cardCount: number }) {
  return (
    <div className="flex w-[min(280px,calc(100vw-2.5rem))] shrink-0 flex-col rounded-2xl border border-border bg-muted/40">
      <div className="border-b border-border px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <Shimmer className="h-3 w-24" />
          <Shimmer className="h-5 w-8 rounded-full" />
        </div>
      </div>
      <div className="flex flex-col gap-2 p-2">
        {Array.from({ length: cardCount }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

/** Light-surface kanban placeholder (visible on portal cream/card backgrounds). */
export default function CasesPipelineSkeleton() {
  const { t } = useTranslation();
  const columns = CASE_PIPELINE_STATUSES.length;

  return (
    <div
      className="table-scroll -mx-1 max-w-full px-1 pb-4 pt-1"
      role="status"
      aria-busy="true"
      aria-label={t("cases.pipeline.loadingBoard")}
    >
      <div className="flex w-max min-w-full gap-3 pr-2">
        {Array.from({ length: Math.min(columns, 8) }).map((_, i) => (
          <SkeletonColumn
            key={i}
            cardCount={COLUMN_CARD_COUNTS[i] ?? 2}
          />
        ))}
      </div>
      <span className="sr-only">{t("cases.pipeline.loadingBoard")}</span>
    </div>
  );
}

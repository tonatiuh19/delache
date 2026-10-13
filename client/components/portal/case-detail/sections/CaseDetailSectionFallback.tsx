import { Skeleton } from "@/components/ui/skeleton";

/** Suspense fallback for lazy-loaded case-detail section panels. */
export function CaseDetailSectionFallback() {
  return (
    <div
      className="scroll-mt-36 w-full min-w-0 max-w-full overflow-x-clip rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6 xl:p-8"
      aria-busy="true"
      aria-label="Loading"
    >
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-4 h-3 w-full max-w-md" />
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  );
}

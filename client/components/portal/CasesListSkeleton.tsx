import { Skeleton } from "@/components/ui/skeleton";

/** List-shaped placeholder for staff Cases while the grid fetch settles. */
export default function CasesListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div
      className="space-y-2 py-1"
      role="status"
      aria-busy="true"
    >
      <div className="hidden gap-2 border-b border-border pb-2 sm:flex">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="ml-auto h-3 w-20" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-3"
        >
          <Skeleton className="h-5 w-20 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-[min(100%,16rem)]" />
            <Skeleton className="h-2.5 w-[min(100%,10rem)]" />
          </div>
          <Skeleton className="hidden h-5 w-16 shrink-0 rounded-full sm:block" />
          <Skeleton className="hidden h-5 w-14 shrink-0 rounded-full md:block" />
        </div>
      ))}
    </div>
  );
}

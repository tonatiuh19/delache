import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function DarkSkeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-white/10", className)}
      {...props}
    />
  );
}

/** Full portal shell while auth/user resolves (includes sidebar). */
export function PortalShellSkeleton({
  collapsed = false,
}: {
  collapsed?: boolean;
}) {
  return (
    <div className="min-h-screen bg-muted/40">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card/90 px-4 lg:hidden">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-9 w-9 rounded-lg" />
      </header>

      <div className="lg:flex">
        <aside
          className={cn(
            "sticky top-0 hidden h-screen shrink-0 border-r border-sidebar-border bg-delache-950 lg:block",
            collapsed ? "w-[88px]" : "w-[280px]",
          )}
        >
          <PortalSidebarSkeleton compact={collapsed} />
        </aside>

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          <ContentPageSkeleton variant="dashboard" />
        </main>
      </div>
    </div>
  );
}

/** Law-firm portal shell while auth resolves. */
export function ClientShellSkeleton() {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-secondary/40 via-background to-background">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="space-y-2">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
      </header>
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 md:grid-cols-[200px_1fr]">
        <aside className="hidden space-y-2 md:block">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-xl" />
          ))}
          <Skeleton className="mt-6 h-3 w-16" />
        </aside>
        <main>
          <ContentPageSkeleton variant="list" />
        </main>
      </div>
    </div>
  );
}

export function PortalSidebarSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex items-center gap-3 px-4 py-5", compact && "justify-center px-2")}>
        <DarkSkeleton className="h-9 w-9 rounded-xl" />
        {!compact ? <DarkSkeleton className="h-3 w-28" /> : null}
      </div>
      <nav className="flex-1 space-y-2 px-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5",
              compact && "justify-center px-2",
            )}
          >
            <DarkSkeleton className="h-5 w-5 rounded-md" />
            {!compact ? <DarkSkeleton className="h-3 w-28" /> : null}
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className={cn("mb-3 rounded-xl bg-white/5 px-3 py-3", compact && "px-2")}>
          {!compact ? (
            <>
              <DarkSkeleton className="h-3 w-32" />
              <DarkSkeleton className="mt-2 h-2.5 w-40" />
            </>
          ) : (
            <DarkSkeleton className="mx-auto h-6 w-8 rounded" />
          )}
        </div>
        <DarkSkeleton className={cn("h-10 w-full rounded-xl", compact && "mx-auto w-10")} />
      </div>
    </div>
  );
}

export function PageHeaderSkeleton({
  withActions = false,
}: {
  withActions?: boolean;
}) {
  return (
    <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-2.5 w-24" />
        <Skeleton className="h-8 w-48 sm:w-64" />
        <Skeleton className="h-3 w-64 max-w-full sm:w-80" />
      </div>
      {withActions ? (
        <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto sm:flex-nowrap">
          <Skeleton className="h-10 w-16 rounded-xl" />
          <Skeleton className="h-10 w-40 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      ) : null}
    </div>
  );
}

export function CardsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-4 rounded" />
          </div>
          <Skeleton className="mt-4 h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

export function ListCardSkeleton({
  rows = 6,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
        className,
      )}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 border-b border-border px-4 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:px-5"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20 rounded-md" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-56 max-w-full" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

export function FormCardSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-2 h-3 w-64 max-w-full" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: fields }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-xl" />
        ))}
        <Skeleton className="mt-2 h-10 w-32 rounded-xl" />
      </div>
    </div>
  );
}

export type ContentPageSkeletonVariant =
  | "list"
  | "dashboard"
  | "form"
  | "detail"
  | "split"
  | "inbox";

/**
 * One reusable content-area skeleton for portal + client pages.
 * Compose header + layout blocks to match the page shape.
 */
export function ContentPageSkeleton({
  variant = "list",
  withHeader = true,
  withActions = false,
  className,
}: {
  variant?: ContentPageSkeletonVariant;
  withHeader?: boolean;
  withActions?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl space-y-6", className)}>
      {withHeader ? <PageHeaderSkeleton withActions={withActions} /> : null}

      {variant === "dashboard" ? (
        <>
          <CardsGridSkeleton />
          <ListCardSkeleton rows={5} />
        </>
      ) : null}

      {variant === "list" ? <ListCardSkeleton rows={6} /> : null}

      {variant === "inbox" ? (
        <ListCardSkeleton rows={8} className="border-0 shadow-none" />
      ) : null}

      {variant === "form" ? (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <FormCardSkeleton fields={5} />
          <ListCardSkeleton rows={4} />
        </div>
      ) : null}

      {variant === "detail" ? (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <div className="flex gap-2">
                <Skeleton className="h-6 w-24 rounded-md" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-8 w-72 max-w-full" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-10 w-36 rounded-xl" />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <FormCardSkeleton fields={3} />
              <ListCardSkeleton rows={4} />
            </div>
            <div className="space-y-4">
              <FormCardSkeleton fields={2} />
              <ListCardSkeleton rows={3} />
            </div>
          </div>
        </>
      ) : null}

      {variant === "split" ? (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <FormCardSkeleton fields={4} />
          <div className="space-y-4">
            <FormCardSkeleton fields={2} />
            <ListCardSkeleton rows={3} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function CalendarPageSkeleton() {
  return (
    <div className="space-y-5">
      <PageHeaderSkeleton withActions />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-20 rounded-full" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="grid grid-cols-7 border-b border-border bg-secondary/40 p-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="mx-auto h-3 w-8" />
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: 35 }).map((_, i) => (
              <div
                key={i}
                className="min-h-[92px] space-y-1 border-b border-r border-border p-2 sm:min-h-[110px]"
              >
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="hidden h-4 w-16 rounded-md sm:block" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-2.5 w-24" />
                <Skeleton className="h-5 w-40" />
              </div>
            </div>
            <div className="mt-5 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          </div>
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export function CaseDetailSkeleton() {
  return <ContentPageSkeleton variant="detail" withHeader={false} />;
}

export function DashboardSkeleton() {
  return <ContentPageSkeleton variant="dashboard" />;
}

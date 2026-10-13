import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Standard height + focus ring for case detail inputs. */
export const caseDetailFieldClass =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-ring/20";

/** Full-width responsive form grid (up to 4 columns on XL). */
export const caseDetailFormGridClass =
  "grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

/** Full-width form grid capped at 3 columns (medium forms). */
export const caseDetailFormGrid3Class =
  "grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3";

/** Side-by-side only when the aside panel has content; otherwise primary is full width. */
export function CaseDetailSplitBody({
  primary,
  aside,
  showAside,
  className,
}: {
  primary: ReactNode;
  aside?: ReactNode;
  showAside: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid w-full gap-8",
        showAside && aside ? "xl:grid-cols-2" : "grid-cols-1",
        className,
      )}
    >
      <div className="min-w-0 w-full">{primary}</div>
      {showAside && aside ? (
        <div className="min-w-0 w-full">{aside}</div>
      ) : null}
    </div>
  );
}

/** Bordered form surface for grouping related fields. */
export function CaseDetailFormCard({
  title,
  children,
  className,
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-muted/20 p-4 sm:p-5",
        className,
      )}
    >
      {title ? (
        <p className="mb-3 text-sm font-bold text-foreground">{title}</p>
      ) : null}
      {children}
    </div>
  );
}

/** Full-width record list below forms. */
export function CaseDetailRecordGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <ul
      className={cn(
        "mt-8 grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-3",
        className,
      )}
    >
      {children}
    </ul>
  );
}

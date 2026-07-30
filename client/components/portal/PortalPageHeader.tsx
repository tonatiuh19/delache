import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PortalPageHeaderProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

/**
 * Shared admin portal page header: eyebrow + title + description on the left,
 * optional actions flush right across the full content width.
 */
export default function PortalPageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PortalPageHeaderProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {eyebrow ? (
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h1
          className={cn(
            "font-[Manrope] text-2xl font-bold tracking-tight text-foreground sm:text-3xl",
            eyebrow ? "mt-1" : undefined,
          )}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:shrink-0 sm:flex-nowrap">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

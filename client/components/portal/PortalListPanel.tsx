import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Unified list surface: filters/search sit in a toolbar strip above the grid
 * so they read as one panel under the page header.
 */
export default function PortalListPanel({
  toolbar,
  children,
  className,
}: {
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
        className,
      )}
    >
      {toolbar ? (
        <div className="border-b border-border bg-muted/30 p-3 sm:p-4">
          {toolbar}
        </div>
      ) : null}
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

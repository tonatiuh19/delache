import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { CaseDetailSectionId } from "@shared/caseStepTreeRules";
import {
  useCaseStepNav,
  useNumberedSectionTitle,
} from "@/components/portal/case-detail/CaseStepNavContext";

function NumberedTitle({
  sectionId,
  title,
}: {
  sectionId: CaseDetailSectionId;
  title: string;
}) {
  return <>{useNumberedSectionTitle(sectionId, title)}</>;
}

/** Full-width case subsection shell — header band + padded body. */
export default function CaseDetailSectionPanel({
  id,
  title,
  sectionId,
  icon,
  headerAside,
  children,
  className,
  bodyClassName,
}: {
  id: string;
  title: ReactNode;
  /** When set inside a step view, string titles become `1.2 …`. */
  sectionId?: CaseDetailSectionId;
  /** Leading mark so every step section uses the same card header. */
  icon?: ReactNode;
  /** @deprecated Tip helpers removed — ignored. */
  helper?: ReactNode;
  headerAside?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  const nav = useCaseStepNav();
  const heading =
    typeof title === "string" && sectionId && nav ? (
      <NumberedTitle sectionId={sectionId} title={title} />
    ) : (
      title
    );

  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-36 w-full rounded-2xl border border-border bg-card shadow-sm",
        className,
      )}
    >
      <div className="border-b border-border px-5 py-4 sm:px-6 xl:px-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {icon ? (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                {icon}
              </span>
            ) : null}
            <h2 className="min-w-0 text-base font-bold text-foreground sm:text-lg">
              {heading}
            </h2>
          </div>
          {headerAside ? <div className="shrink-0">{headerAside}</div> : null}
        </div>
      </div>
      <div
        className={cn(
          "px-5 py-5 sm:px-6 sm:py-6 xl:px-8 xl:py-8",
          bodyClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}

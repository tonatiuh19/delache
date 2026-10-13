import { type ReactNode } from "react";
import { Outlet, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import CaseDetailHeader from "@/components/portal/case-detail/CaseDetailHeader";
import type { CaseDetail } from "@shared/api";

export default function CaseDetailShell({
  selected,
  children,
}: {
  selected: CaseDetail;
  children?: ReactNode;
}) {
  const { stepSlug } = useParams<{ stepSlug?: string }>();
  const stepView = Boolean(stepSlug);

  return (
    <div
      className={cn(
        "w-full min-w-0",
        stepView ? "" : "min-w-0 w-full max-w-full space-y-5",
      )}
    >
      <CaseDetailHeader />
      <div className="min-w-0">{children ?? <Outlet />}</div>
    </div>
  );
}

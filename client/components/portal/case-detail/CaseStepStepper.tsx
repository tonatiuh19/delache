import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  caseStepPath,
  clientStepNumber,
  defaultSubsectionForStep,
  stepVisualStatus,
  visibleStepTreeForRole,
} from "@shared/caseStepTreeRules";
import { processPointForStatus } from "@shared/processGates";
import type { CaseStatus } from "@shared/api";

export default function CaseStepStepper({
  publicUuid,
  status,
  viewerRole,
}: {
  publicUuid: string;
  status: CaseStatus;
  viewerRole?: string | null;
}) {
  const { t } = useTranslation();
  const currentPoint = processPointForStatus(status);
  const steps = visibleStepTreeForRole({
    role: viewerRole,
    currentPoint,
    status,
  });

  return (
    <div className="mobile-scroll-x pb-1">
      <ol className="flex min-w-max items-center gap-1">
        {steps.map((node, index) => {
          const visual = stepVisualStatus(node.id, currentPoint, status);
          return (
            <li key={node.id} className="flex items-center">
              <Link
                to={caseStepPath(
                  publicUuid,
                  node.slug,
                  defaultSubsectionForStep(node.slug) ?? undefined,
                )}
                className={cn(
                  "flex min-h-11 flex-col items-center justify-center rounded-xl px-2 py-1.5 transition sm:px-3",
                  visual === "current" && "bg-primary/10",
                  visual !== "current" && "hover:bg-muted/50",
                )}
                title={t(`process.point.${node.id}.name`)}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                    visual === "completed" && "bg-primary/20 text-primary",
                    visual === "current" &&
                      "bg-primary text-primary-foreground",
                    visual === "upcoming" &&
                      "border border-border bg-background text-muted-foreground",
                  )}
                >
                  {clientStepNumber(node.id)}
                </span>
                <span className="mt-1 hidden max-w-[4.5rem] truncate text-[9px] font-semibold text-muted-foreground sm:block">
                  {t(`process.point.${node.id}.name`, {
                    defaultValue: String(node.id),
                  })}
                </span>
              </Link>
              {index < steps.length - 1 ? (
                <span className="mx-0.5 h-px w-3 bg-border sm:w-5" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

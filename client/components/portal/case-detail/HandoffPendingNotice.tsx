import { useTranslation } from "react-i18next";
import { Clock, PackageCheck } from "lucide-react";
import {
  canConfirmDocumentsHandoff,
  handoffPendingAudience,
} from "@shared/handoffRules";
import PendingSubmitButton from "@/components/portal/PendingSubmitButton";
import { cn } from "@/lib/utils";

export default function HandoffPendingNotice({
  role,
  confirmedAt,
  primaryExpertAssigned = false,
  onConfirm,
  compact = false,
  className,
}: {
  role: string | null | undefined;
  confirmedAt: string | null;
  primaryExpertAssigned?: boolean;
  onConfirm?: () => void;
  compact?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();

  if (confirmedAt) {
    return (
      <p
        className={cn(
          "flex items-center gap-2 text-sm text-primary",
          className,
        )}
      >
        <PackageCheck size={16} className="shrink-0" />
        {t("cases.handoffConfirmedAt", {
          date: new Date(confirmedAt).toLocaleString(),
        })}
      </p>
    );
  }

  const audience = handoffPendingAudience(role);
  const titleKey =
    audience === "coordinator"
      ? "cases.handoffPendingTitle"
      : audience === "expert"
        ? "cases.handoffWaitingExpertTitle"
        : "cases.handoffWaitingObserverTitle";
  const hintKey =
    audience === "coordinator"
      ? "cases.handoffPendingHint"
      : audience === "expert"
        ? "cases.handoffWaitingExpertHint"
        : "cases.handoffWaitingObserverHint";

  const showConfirm =
    canConfirmDocumentsHandoff(role) && primaryExpertAssigned && onConfirm;

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        audience === "expert"
          ? "border-primary/25 bg-primary/5"
          : "border-border bg-muted/20",
        compact && "py-2.5",
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <Clock
          size={compact ? 16 : 18}
          className={cn(
            "mt-0.5 shrink-0",
            audience === "expert" ? "text-primary" : "text-muted-foreground",
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">{t(titleKey)}</p>
          <p className="mt-1 text-muted-foreground">{t(hintKey)}</p>
          {showConfirm ? (
            <PendingSubmitButton
              type="button"
              className="mt-3 h-10 px-4"
              onClick={onConfirm}
            >
              {t("cases.handoffConfirmAction")}
            </PendingSubmitButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}

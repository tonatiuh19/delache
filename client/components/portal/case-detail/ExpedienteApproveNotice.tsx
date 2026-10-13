import { useTranslation } from "react-i18next";
import { CheckCircle2, Stamp } from "lucide-react";
import {
  canApproveExpediente,
  canApproveExpedienteNow,
  expedienteApproved,
  type DocumentApprovalRow,
} from "@shared/documentApprovalRules";
import PendingSubmitButton from "@/components/portal/PendingSubmitButton";
import { cn } from "@/lib/utils";

export default function ExpedienteApproveNotice({
  role,
  approvedAt,
  documents,
  onApprove,
  className,
}: {
  role: string | null | undefined;
  approvedAt: string | null | undefined;
  documents: readonly DocumentApprovalRow[];
  onApprove?: () => void;
  className?: string;
}) {
  const { t } = useTranslation();

  if (expedienteApproved(approvedAt)) {
    return (
      <p
        className={cn(
          "flex items-center gap-2 text-sm text-primary",
          className,
        )}
      >
        <CheckCircle2 size={16} className="shrink-0" />
        {t("cases.expedienteApprovedAt", {
          date: new Date(String(approvedAt)).toLocaleString(),
        })}
      </p>
    );
  }

  if (!canApproveExpediente(role)) {
    return (
      <div
        className={cn(
          "rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm",
          className,
        )}
      >
        <p className="font-semibold text-foreground">
          {t("cases.expedientePendingTitle")}
        </p>
        <p className="mt-1 text-muted-foreground">
          {t("cases.expedientePendingObserverHint")}
        </p>
      </div>
    );
  }

  const gate = canApproveExpedienteNow({
    role,
    docs: documents,
    alreadyApproved: false,
  });
  const ready = gate.ok;

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        ready
          ? "border-primary/25 bg-primary/5"
          : "border-border bg-muted/20",
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <Stamp
          size={18}
          className={cn(
            "mt-0.5 shrink-0",
            ready ? "text-primary" : "text-muted-foreground",
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">
            {t("cases.expedientePendingTitle")}
          </p>
          <p className="mt-1 text-muted-foreground">
            {ready
              ? t("cases.expedientePendingReadyHint")
              : t("cases.expedientePendingDocsHint")}
          </p>
          {ready && onApprove ? (
            <PendingSubmitButton
              type="button"
              className="mt-3 h-10 px-4"
              onClick={onApprove}
            >
              {t("cases.expedienteApproveAction")}
            </PendingSubmitButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}

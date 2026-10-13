import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Building2,
  Calendar,
  Check,
  FileText,
  Info,
  Save,
  Send,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  clientStepNumber,
  processPointForSlug,
  type ProcessStepSlug,
} from "@shared/caseStepTreeRules";
import type { ProcessPointId } from "@shared/processGates";
import { pdfStatusRailAround } from "@shared/pdfStepWorkspaceRules";
import PendingSubmitButton from "@/components/portal/PendingSubmitButton";

export type CasePdfSummaryItem = {
  icon?: "folio" | "firm" | "calendar" | "person" | "status";
  label: string;
  value: string;
  sub?: string | null;
};

const ICONS = {
  folio: FileText,
  firm: Building2,
  calendar: Calendar,
  person: User,
  status: Info,
} as const;

export default function CasePdfStepShell({
  stepSlug,
  title,
  subtitle,
  summary,
  children,
  acceptedFormats,
  onSendHint,
  onDraft,
  onSend,
  draftLabel,
  sendLabel,
  drafting,
  sending,
  canDraft = true,
  canSend = false,
  className,
}: {
  stepSlug: ProcessStepSlug;
  title: string;
  subtitle?: string | null;
  summary: readonly CasePdfSummaryItem[];
  children: ReactNode;
  acceptedFormats: string;
  onSendHint: string;
  onDraft?: () => void;
  onSend?: () => void;
  draftLabel?: string;
  sendLabel?: string;
  drafting?: boolean;
  sending?: boolean;
  canDraft?: boolean;
  canSend?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const point = processPointForSlug(stepSlug) ?? 1;
  const rail = pdfStatusRailAround(point as ProcessPointId);

  return (
    <div className={cn("min-w-0 space-y-5", className)}>
      <header className="min-w-0 space-y-1">
        <h1 className="font-[Manrope] text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="max-w-3xl text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </header>

      {summary.length > 0 ? (
        <div className="grid gap-3 rounded-2xl border border-info/20 bg-info-muted p-3 shadow-sm sm:grid-cols-2 lg:grid-cols-5 lg:gap-0 lg:divide-x lg:divide-info/15 lg:p-0">
          {summary.map((item) => {
            const Icon = ICONS[item.icon ?? "folio"];
            return (
              <div
                key={`${item.label}-${item.value}`}
                className="flex min-w-0 items-start gap-2.5 px-3 py-3"
              >
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <Icon size={15} />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="truncate text-sm font-semibold text-foreground">
                    {item.value}
                  </p>
                  {item.sub ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {item.sub}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="min-w-0 space-y-4 lg:col-span-8">{children}</div>

        <aside className="grid content-start gap-3 lg:col-span-4">
          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Info size={16} className="text-info" />
              <h2 className="text-sm font-bold">
                {t("cases.pdfStep.statusTitle")}
              </h2>
            </div>
            <ol className="mt-4 space-y-3">
              {rail.completed.map((id) => (
                <li key={id} className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-success text-success-foreground">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {clientStepNumber(id)}. {t(`process.point.${id}.name`)}
                    </p>
                  </div>
                </li>
              ))}
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {clientStepNumber(rail.current)}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {t(`process.point.${rail.current}.name`)}
                  </p>
                  <span className="mt-1 inline-flex rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                    {t("cases.pdfStep.inProgress")}
                  </span>
                </div>
              </li>
              {rail.upcoming.slice(0, 2).map((id) => (
                <li key={id} className="flex items-start gap-2.5 opacity-60">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-border text-[10px] font-bold text-muted-foreground">
                    {clientStepNumber(id)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {t(`process.point.${id}.name`)}
                    </p>
                    <span className="mt-1 inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      {t("cases.pdfStep.pending")}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-2xl border border-info/20 bg-info-muted p-4">
            <div className="flex items-start gap-2">
              <Info size={16} className="mt-0.5 shrink-0 text-info" />
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  {t("cases.pdfStep.onSendTitle")}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {onSendHint}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-primary" />
              <h3 className="text-sm font-bold">
                {t("cases.pdfStep.acceptedFormats")}
              </h3>
            </div>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {acceptedFormats}
            </p>
          </section>

          <div className="flex flex-col gap-2">
            {onDraft ? (
              <PendingSubmitButton
                type="button"
                pending={Boolean(drafting)}
                disabled={!canDraft || drafting || sending}
                onClick={onDraft}
                className="h-11 w-full border border-border bg-card text-foreground hover:bg-muted"
              >
                <Save size={15} className="mr-1.5" />
                {draftLabel ?? t("cases.pdfStep.saveDraft")}
              </PendingSubmitButton>
            ) : null}
            {onSend ? (
              <PendingSubmitButton
                type="button"
                pending={Boolean(sending)}
                disabled={!canSend || drafting || sending}
                onClick={onSend}
                className="h-11 w-full bg-primary text-primary-foreground shadow-sm shadow-primary/25 disabled:opacity-45"
              >
                <Send size={15} className="mr-1.5" />
                {sendLabel ?? t("cases.pdfStep.send")}
              </PendingSubmitButton>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}

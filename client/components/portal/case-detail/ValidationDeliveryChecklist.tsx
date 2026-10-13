import { useTranslation } from "react-i18next";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CaseDocumentItem } from "@shared/api";
import type { ListadoProgress } from "@shared/processGates";
import { buildValidationDeliveryChecklist } from "@shared/validationDeliveryRules";
import CategoryDocumentAttach from "@/components/portal/case-detail/CategoryDocumentAttach";

export default function ValidationDeliveryChecklist({
  listado,
  hasCourtFiling,
  hasRatificationPdf,
  publicUuid,
  documents,
  canUpload,
  onUploaded,
}: {
  listado?: ListadoProgress | null;
  hasCourtFiling?: boolean;
  hasRatificationPdf?: boolean;
  publicUuid: string;
  documents: readonly CaseDocumentItem[];
  canUpload: boolean;
  onUploaded?: () => void;
}) {
  const { t } = useTranslation();
  const steps = buildValidationDeliveryChecklist({
    listado,
    hasCourtFiling,
    hasRatificationPdf,
  });

  return (
    <section className="overflow-x-clip rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
        {t("cases.p9.eyebrow")}
      </p>
      <h2 className="mt-1 text-sm font-bold text-foreground">
        {t("cases.p9.title")}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">{t("cases.p9.hint")}</p>
      <ol className="mt-4 space-y-2">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className={cn(
              "flex items-start gap-3 rounded-xl border px-3 py-2.5",
              step.active
                ? "border-primary/40 bg-primary/10"
                : "border-border bg-background",
            )}
          >
            {step.done ? (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-primary" />
            ) : (
              <Circle
                size={18}
                className={cn(
                  "mt-0.5 shrink-0",
                  step.active ? "text-primary" : "text-muted-foreground",
                )}
              />
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-muted-foreground">
                {t("cases.p9.stepLabel", { n: index + 1 })}
              </p>
              <p className="text-sm font-semibold text-foreground">
                {t(`cases.p9.step.${step.id}`)}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <CategoryDocumentAttach
          publicUuid={publicUuid}
          category="court_filing"
          documents={documents}
          canUpload={canUpload}
          title={t("cases.courtFilingAttachTitle")}
          hint={t("cases.courtFilingAttachHint")}
          onUploaded={onUploaded}
        />
        <CategoryDocumentAttach
          publicUuid={publicUuid}
          category="ratification"
          documents={documents}
          canUpload={canUpload}
          title={t("cases.ratificationAttachTitle")}
          hint={t("cases.ratificationAttachHint")}
          onUploaded={onUploaded}
        />
      </div>
    </section>
  );
}

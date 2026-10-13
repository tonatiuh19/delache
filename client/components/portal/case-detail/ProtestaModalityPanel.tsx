import { useTranslation } from "react-i18next";
import { Monitor, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { requiresProtestaScanUpload } from "@shared/softParallelRules";
import type { CaseDocumentItem, ProtestaModality } from "@shared/api";
import CategoryDocumentAttach from "@/components/portal/case-detail/CategoryDocumentAttach";

export default function ProtestaModalityPanel({
  modality,
  protestaFiled,
  canEdit,
  saving,
  onChange,
  publicUuid,
  documents,
  canUpload,
  onUploaded,
}: {
  modality: ProtestaModality | null | undefined;
  protestaFiled: boolean;
  canEdit: boolean;
  saving?: boolean;
  onChange: (next: ProtestaModality) => void;
  publicUuid: string;
  documents: readonly CaseDocumentItem[];
  canUpload: boolean;
  onUploaded?: () => void;
}) {
  const { t } = useTranslation();
  const needsScan = requiresProtestaScanUpload(modality);

  return (
    <section
      id="case-protesta-modality"
      className="overflow-x-clip rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
        {t("cases.protesta.eyebrow")}
      </p>
      <h2 className="mt-1 text-sm font-bold text-foreground">
        {t("cases.protesta.title")}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {t("cases.protesta.hint")}
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {(
          [
            { id: "virtual" as const, Icon: Monitor },
            { id: "presencial" as const, Icon: Printer },
          ] as const
        ).map(({ id, Icon }) => {
          const selected = modality === id;
          return (
            <button
              key={id}
              type="button"
              disabled={!canEdit || saving}
              onClick={() => onChange(id)}
              className={cn(
                "flex min-h-[72px] items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition",
                selected
                  ? "border-primary/50 bg-primary/10"
                  : "border-border bg-background hover:border-primary/40",
                (!canEdit || saving) && "cursor-not-allowed opacity-70",
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                  selected
                    ? "border-primary/30 bg-primary text-primary-foreground"
                    : "border-border bg-card text-primary",
                )}
              >
                <Icon size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">
                  {t(`cases.protesta.modality.${id}`)}
                </span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  {t(`cases.protesta.modalityHint.${id}`)}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {modality ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {needsScan
            ? t("cases.protesta.scanPath")
            : t("cases.protesta.virtualPath")}
        </p>
      ) : null}

      <CategoryDocumentAttach
        publicUuid={publicUuid}
        category="protesta"
        documents={documents}
        canUpload={canUpload}
        title={t("cases.protestaAttachTitle")}
        hint={t("cases.protestaAttachHint")}
        className="mt-4"
        onUploaded={onUploaded}
      />

      <p
        className={cn(
          "mt-3 text-xs font-semibold",
          protestaFiled ? "text-primary" : "text-muted-foreground",
        )}
      >
        {protestaFiled
          ? t("cases.protesta.clockStarted")
          : t("cases.protesta.clockPending")}
      </p>
    </section>
  );
}

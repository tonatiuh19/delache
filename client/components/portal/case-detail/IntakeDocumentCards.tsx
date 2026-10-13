import { useTranslation } from "react-i18next";
import { Camera, FileText, HeartPulse, Scale, Zap } from "lucide-react";
import type { CaseDocumentItem, DocumentCategory } from "@shared/api";
import { isActiveDocumentStatus } from "@shared/documentCompleteness";
import {
  intakeCardCategories,
  intakeCardStatus,
  intakeDocumentTone,
  type IntakeDocumentTone,
} from "@shared/intakeDocumentCardRules";
import { cn } from "@/lib/utils";
import { LocalFileRow } from "@/components/portal/LocalFileDraft";

const TONE_CLASS: Record<IntakeDocumentTone, string> = {
  demand: "bg-doc-demand text-white",
  medical: "bg-doc-medical text-white",
  cfe: "bg-doc-cfe text-white",
  photos: "bg-doc-photos text-white",
};

const ICONS = {
  lawsuit: Scale,
  medical_record: HeartPulse,
  cfe_report: Zap,
  preliminary_photo: Camera,
} as const;

const STATUS_CLASS = {
  complete: "border-primary/40 bg-primary/15 text-foreground",
  rejected: "border-destructive/40 bg-destructive/10 text-destructive",
  review: "border-border bg-secondary text-secondary-foreground",
  pending: "border-border bg-muted text-muted-foreground",
} as const;

export default function IntakeDocumentCards({
  documents,
  canUpload,
  canReview,
  onUpload,
  pendingFiles,
  onRemovePending,
  onPreview,
  onApprove,
  onReject,
}: {
  documents: readonly CaseDocumentItem[];
  canUpload: boolean;
  canReview: boolean;
  onUpload: (category: DocumentCategory, files: File[]) => void;
  /** Files chosen on this card, held until the step submit. */
  pendingFiles?: Readonly<Partial<Record<string, readonly File[]>>>;
  onRemovePending?: (category: DocumentCategory, index: number) => void;
  onPreview: (doc: CaseDocumentItem) => void;
  onApprove: (documentUuid: string) => void;
  onReject: (documentUuid: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {intakeCardCategories().map((category) => {
        const tone = intakeDocumentTone(category);
        const Icon =
          ICONS[category as keyof typeof ICONS] ?? FileText;
        const files = documents.filter(
          (d) =>
            d.category === category && isActiveDocumentStatus(d.status),
        );
        const queued = pendingFiles?.[category] ?? [];
        const latest = files[0];
        const status = intakeCardStatus({
          hasFile: Boolean(latest),
          status: latest?.status,
        });
        return (
          <article
            key={category}
            className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-card p-4"
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  tone ? TONE_CLASS[tone] : "bg-secondary text-foreground",
                )}
              >
                <Icon size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {t(`cases.docCategory.${category}`, { defaultValue: category })}
                </p>
                <span
                  className={cn(
                    "mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                    STATUS_CLASS[status],
                  )}
                >
                  {t(`cases.intakeCard.status.${status}`)}
                </span>
              </div>
            </div>
            {queued.length > 0 ? (
              <ul className="space-y-2">
                {queued.map((file, index) => (
                  <li key={`${file.name}-${file.size}-${index}`}>
                    <LocalFileRow
                      file={file}
                      onRemove={() =>
                        onRemovePending?.(category as DocumentCategory, index)
                      }
                    />
                  </li>
                ))}
              </ul>
            ) : latest ? (
              <button
                type="button"
                className="truncate text-left text-xs font-medium text-foreground underline-offset-2 hover:underline"
                onClick={() => onPreview(latest)}
              >
                {latest.fileName || t("cases.intakeCard.viewFile")}
              </button>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t("cases.intakeCard.empty")}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {canUpload ? (
                <label className="inline-flex h-11 cursor-pointer items-center rounded-xl border border-border bg-background px-3 text-xs font-semibold">
                  {t("cases.intakeCard.upload")}
                  <input
                    type="file"
                    className="sr-only"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,application/pdf,image/*"
                    onChange={(e) => {
                      const list = e.target.files
                        ? Array.from(e.target.files)
                        : [];
                      e.target.value = "";
                      if (list.length > 0) {
                        onUpload(category as DocumentCategory, list);
                      }
                    }}
                  />
                </label>
              ) : null}
              {canReview && latest && status !== "complete" ? (
                <button
                  type="button"
                  className="inline-flex h-11 items-center rounded-xl bg-accent px-3 text-xs font-semibold text-accent-foreground"
                  onClick={() => onApprove(latest.publicUuid)}
                >
                  {t("cases.intakeCard.approve")}
                </button>
              ) : null}
              {canReview && latest && status !== "rejected" ? (
                <button
                  type="button"
                  className="inline-flex h-11 items-center rounded-xl border border-destructive/40 px-3 text-xs font-semibold text-destructive"
                  onClick={() => onReject(latest.publicUuid)}
                >
                  {t("cases.intakeCard.reject")}
                </button>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

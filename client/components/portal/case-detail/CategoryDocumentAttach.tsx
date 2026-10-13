import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, FileText } from "lucide-react";
import DocumentDropzone from "@/components/portal/DocumentDropzone";
import DocumentPreviewSheet, {
  asPreviewableDocument,
  type PreviewableDocument,
} from "@/components/portal/DocumentPreviewSheet";
import { useAppDispatch } from "@/store/hooks";
import { uploadCaseDocumentsSmart } from "@/store/slices/casesSlice";
import { toast } from "@/hooks/use-toast";
import { isBlobTokenMissingError } from "@shared/documentDmsRules";
import { isActiveDocumentStatus } from "@shared/documentCompleteness";
import type { CaseDocumentItem, DocumentCategory } from "@shared/api";
import { cn } from "@/lib/utils";
import { StagedFileList } from "@/components/portal/LocalFileDraft";

/** Compact category-locked upload for step sections (e.g. P3 questionnaire PDF). */
export default function CategoryDocumentAttach({
  publicUuid,
  category,
  documents,
  canUpload,
  title,
  hint: _hint,
  className,
  onUploaded,
}: {
  publicUuid: string;
  category: DocumentCategory;
  documents: readonly CaseDocumentItem[];
  canUpload: boolean;
  title: string;
  /** Kept for call-site compatibility; tip copy is no longer shown. */
  hint?: string;
  className?: string;
  onUploaded?: () => void;
}) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [uploading, setUploading] = useState(false);
  const [staged, setStaged] = useState<File[]>([]);
  const [preview, setPreview] = useState<PreviewableDocument | null>(null);

  const onFile = documents.filter(
    (d) =>
      d.category === category && isActiveDocumentStatus(d.status),
  );
  const hasFile = onFile.length > 0;

  const onFiles = async (files: File[]) => {
    if (files.length === 0 || !canUpload) return;
    setUploading(true);
    try {
      const result = await dispatch(
        uploadCaseDocumentsSmart({
          publicUuid,
          files,
          category,
        }),
      );
      if (uploadCaseDocumentsSmart.fulfilled.match(result)) {
        if (result.payload.failures.length === 0) setStaged([]);
        onUploaded?.();
        if (result.payload.failures.length > 0) {
          toast({
            title: t("documents.partialUpload", {
              ok: result.payload.documents.length,
              failed: result.payload.failures.length,
            }),
            description: result.payload.failures
              .slice(0, 3)
              .map((f) => f.name)
              .join(", "),
            variant: "destructive",
          });
        } else {
          toast({
            title: t("cases.categoryAttach.uploadSuccess", {
              defaultValue: "Document uploaded",
            }),
          });
        }
        return;
      }
      const message = String(result.payload || "upload_failed");
      toast({
        title: t("documents.uploadFailed"),
        description: isBlobTokenMissingError(message)
          ? t("documents.blobNotConfigured")
          : message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className={cn(
        "overflow-x-clip rounded-xl border border-border bg-muted/20 p-3 sm:p-4",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
        </div>
        {hasFile ? (
          <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
            <CheckCircle2 size={12} />
            {t("cases.categoryAttach.onFile")}
          </span>
        ) : (
          <span className="rounded-lg border border-border bg-background px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {t("cases.categoryAttach.required")}
          </span>
        )}
      </div>

      {onFile.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {onFile.map((doc) => (
            <li key={doc.publicUuid}>
              <button
                type="button"
                onClick={() => setPreview(asPreviewableDocument(doc))}
                className="flex w-full min-w-0 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-xs font-medium text-foreground transition hover:border-primary hover:text-primary"
              >
                <FileText size={14} className="shrink-0 text-primary" />
                <span className="min-w-0 truncate">
                  {doc.title || doc.fileName || doc.publicUuid}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {canUpload ? (
        <div className="mt-3 space-y-3">
          <StagedFileList
            files={staged}
            sending={uploading}
            onRemove={(index) =>
              setStaged((current) => current.filter((_, i) => i !== index))
            }
            onSend={() => void onFiles(staged)}
          />
          <DocumentDropzone
            compact
            showSizeLegend={false}
            disabled={!canUpload}
            uploading={uploading}
            onFiles={(files) =>
              setStaged((current) => [...current, ...files])
            }
          />
        </div>
      ) : null}

      <DocumentPreviewSheet
        open={Boolean(preview)}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
        document={preview}
      />
    </div>
  );
}

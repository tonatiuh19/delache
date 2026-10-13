import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, X } from "lucide-react";
import DocumentPreviewSheet from "@/components/portal/DocumentPreviewSheet";
import type { PreviewableDocument } from "@/components/portal/DocumentPreviewSheet";

function localPreviewDoc(file: File, url: string): PreviewableDocument {
  return {
    publicUuid: `local-${file.name}-${file.size}-${file.lastModified}`,
    title: file.name,
    mimeType: file.type || "application/octet-stream",
    storageKey: url,
  };
}

/** A file kept in the browser until the user presses Enviar. */
export function LocalFileRow({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const url = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => {
    return () => URL.revokeObjectURL(url);
  }, [url]);

  return (
    <>
      <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-background px-2 py-1.5">
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
          {file.name}
        </span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
        >
          <Eye size={14} />
          {t("documents.preview")}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-destructive transition hover:bg-destructive/10"
        >
          <X size={14} />
          {t("documents.removeDraft")}
        </button>
      </div>
      <DocumentPreviewSheet
        open={open}
        document={open ? localPreviewDoc(file, url) : null}
        onOpenChange={setOpen}
      />
    </>
  );
}

export function StagedFileList({
  files,
  onRemove,
  onSend,
  sending = false,
}: {
  files: readonly File[];
  onRemove: (index: number) => void;
  onSend?: () => void;
  sending?: boolean;
}) {
  const { t } = useTranslation();
  if (files.length === 0) return null;

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {files.map((file, index) => (
          <li key={`${file.name}-${file.size}-${file.lastModified}-${index}`}>
            <LocalFileRow file={file} onRemove={() => onRemove(index)} />
          </li>
        ))}
      </ul>
      {onSend ? (
        <p className="text-[11px] text-muted-foreground">
          {t("documents.stagedHint")}
        </p>
      ) : null}
      {onSend ? (
        <button
          type="button"
          disabled={sending}
          onClick={onSend}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {t("cases.intakeCreate.send")}
        </button>
      ) : null}
    </div>
  );
}

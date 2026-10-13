import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  Download,
  ExternalLink,
  FileText,
  Loader2,
  ScanText,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PdfPreview from "@/components/portal/PdfPreview";
import { isOcrableMime, isPreviewableMime } from "@shared/documentDmsRules";
import { extractClientOcrText } from "@/utils/documentOcr";
import type { CaseDocumentItem, DocumentsIndexItem, OcrStatus } from "@shared/api";
import { cn } from "@/lib/utils";

export type PreviewableDocument = {
  publicUuid: string;
  title: string;
  mimeType: string | null;
  storageKey: string | null;
  ocrStatus?: OcrStatus | null;
  ocrText?: string | null;
  ocrTextPreview?: string | null;
  casePublicUuid?: string;
};

type Props = {
  open: boolean;
  document: PreviewableDocument | null;
  onOpenChange: (open: boolean) => void;
  onRunOcr?: (doc: PreviewableDocument, ocrText?: string) => Promise<void>;
};

function toPreviewable(
  doc: CaseDocumentItem | DocumentsIndexItem | PreviewableDocument,
): PreviewableDocument {
  return {
    publicUuid: doc.publicUuid,
    title: doc.title,
    mimeType: doc.mimeType,
    storageKey: doc.storageKey,
    ocrStatus: "ocrStatus" in doc ? doc.ocrStatus : null,
    ocrText: "ocrText" in doc ? doc.ocrText : null,
    ocrTextPreview: "ocrTextPreview" in doc ? doc.ocrTextPreview : null,
    casePublicUuid: "casePublicUuid" in doc ? doc.casePublicUuid : undefined,
  };
}

export function asPreviewableDocument(
  doc: CaseDocumentItem | DocumentsIndexItem,
): PreviewableDocument {
  return toPreviewable(doc);
}

function mimeKind(mime: string): "pdf" | "image" | "text" | "other" {
  const m = mime.toLowerCase();
  if (m === "application/pdf") return "pdf";
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("text/")) return "text";
  return "other";
}

export default function DocumentPreviewSheet({
  open,
  document: doc,
  onOpenChange,
  onRunOcr,
}: Props) {
  const { t } = useTranslation();
  const [ocrBusy, setOcrBusy] = useState(false);
  const [localOcr, setLocalOcr] = useState<string | null>(null);
  const [ocrOpen, setOcrOpen] = useState(false);

  useEffect(() => {
    setLocalOcr(null);
    setOcrOpen(false);
  }, [doc?.publicUuid]);

  const mime = doc?.mimeType || "";
  const url = doc?.storageKey || "";
  const previewable = isPreviewableMime(mime);
  const ocrable = isOcrableMime(mime);
  const kind = mimeKind(mime);
  const ocrText =
    localOcr || doc?.ocrText || doc?.ocrTextPreview || "";

  const runOcr = async () => {
    if (!doc || !onRunOcr) return;
    setOcrBusy(true);
    try {
      let text = "";
      if (url) {
        text = await extractClientOcrText({
          mimeType: mime,
          url,
        });
      }
      if (text.trim()) {
        setLocalOcr(text);
        setOcrOpen(true);
        await onRunOcr(doc, text);
      } else {
        await onRunOcr(doc);
        setOcrOpen(true);
      }
    } finally {
      setOcrBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[min(92vh,900px)] w-[min(100%,56rem)] max-w-[min(100vw-1rem,56rem)] flex-col gap-0 overflow-hidden border-border p-0 sm:rounded-2xl",
          "bg-background shadow-2xl",
        )}
      >
        <div className="relative overflow-hidden border-b border-border bg-gradient-to-br from-secondary/70 via-background to-background px-5 pb-4 pt-5 sm:px-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-primary/15 blur-2xl"
          />
          <DialogHeader className="relative space-y-3 pr-8 text-left">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
                <FileText size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate font-[Manrope] text-lg tracking-tight sm:text-xl">
                  {doc?.title ?? t("documents.preview")}
                </DialogTitle>
                <DialogDescription className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className="truncate">
                    {mime || t("documents.unknownType")}
                  </span>
                  {doc?.ocrStatus ? (
                    <span className="rounded-full bg-secondary px-2 py-0.5 font-semibold text-primary">
                      {t(`documents.ocrStatus.${doc.ocrStatus}`, {
                        defaultValue: doc.ocrStatus,
                      })}
                    </span>
                  ) : null}
                </DialogDescription>
              </div>
            </div>

            {url ? (
              <div className="flex flex-wrap gap-2">
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground transition hover:bg-secondary"
                >
                  <ExternalLink size={14} />
                  {t("documents.openExternal")}
                </a>
                <a
                  href={url}
                  download={doc?.title || undefined}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground transition hover:bg-secondary"
                >
                  <Download size={14} />
                  {t("documents.download")}
                </a>
                {ocrable && onRunOcr ? (
                  <button
                    type="button"
                    disabled={ocrBusy}
                    onClick={() => void runOcr()}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent px-3 text-xs font-semibold text-accent-foreground disabled:opacity-60"
                  >
                    {ocrBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ScanText className="h-3.5 w-3.5" />
                    )}
                    {t("documents.runOcr")}
                  </button>
                ) : null}
              </div>
            ) : null}
          </DialogHeader>
        </div>

        {!doc ? null : (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div className="min-h-0 flex-1 bg-muted/20 p-3 sm:p-4">
              {previewable && url ? (
                <motion.div
                  key={doc.publicUuid}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                  className="mx-auto max-w-full"
                >
                  {kind === "pdf" ? (
                    <PdfPreview url={url} />
                  ) : kind === "image" ? (
                    <div className="flex max-h-[min(62vh,640px)] items-center justify-center overflow-auto rounded-xl border border-border bg-card p-2">
                      <img
                        src={url}
                        alt={doc.title}
                        className="max-h-[min(60vh,620px)] w-auto max-w-full object-contain"
                      />
                    </div>
                  ) : kind === "text" ? (
                    <iframe
                      title={doc.title}
                      src={url}
                      className="h-[min(60vh,620px)] w-full rounded-xl border border-border bg-background"
                    />
                  ) : null}
                </motion.div>
              ) : (
                <div className="flex min-h-[12rem] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card px-4 py-10 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground" />
                  <p className="max-w-sm text-sm text-muted-foreground">
                    {t("documents.noPreview")}
                  </p>
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary underline"
                    >
                      <ExternalLink size={14} />
                      {t("documents.openExternal")}
                    </a>
                  ) : null}
                </div>
              )}
            </div>

            <section className="border-t border-border bg-background px-4 py-3 sm:px-5">
              <button
                type="button"
                onClick={() => setOcrOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-2 text-left"
              >
                <h3 className="text-sm font-bold text-foreground">
                  {t("documents.ocrTitle")}
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {ocrOpen
                    ? t("documents.ocrCollapse")
                    : t("documents.ocrExpand")}
                </span>
              </button>
              {ocrOpen ? (
                <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-muted/40 p-3 text-xs text-foreground sm:max-h-52">
                  {ocrText.trim() ? ocrText : t("documents.ocrEmpty")}
                </pre>
              ) : null}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, ScanText } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import PdfPreview from "@/components/portal/PdfPreview";
import { isOcrableMime, isPreviewableMime } from "@shared/documentDmsRules";
import { extractClientOcrText } from "@/utils/documentOcr";
import type { CaseDocumentItem, DocumentsIndexItem, OcrStatus } from "@shared/api";

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

export default function DocumentPreviewSheet({
  open,
  document: doc,
  onOpenChange,
  onRunOcr,
}: Props) {
  const { t } = useTranslation();
  const [ocrBusy, setOcrBusy] = useState(false);
  const [localOcr, setLocalOcr] = useState<string | null>(null);

  const mime = doc?.mimeType || "";
  const url = doc?.storageKey || "";
  const previewable = isPreviewableMime(mime);
  const ocrable = isOcrableMime(mime);
  const ocrText =
    localOcr ||
    doc?.ocrText ||
    doc?.ocrTextPreview ||
    "";

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
        await onRunOcr(doc, text);
      } else {
        await onRunOcr(doc);
      }
    } finally {
      setOcrBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-xl lg:max-w-2xl"
      >
        <SheetHeader>
          <SheetTitle className="pr-8 text-left">{doc?.title}</SheetTitle>
        </SheetHeader>

        {!doc ? null : (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{mime || t("documents.unknownType")}</span>
              {doc.ocrStatus ? (
                <span className="rounded-full bg-secondary px-2 py-0.5 font-semibold text-primary">
                  {t(`documents.ocrStatus.${doc.ocrStatus}`, {
                    defaultValue: doc.ocrStatus,
                  })}
                </span>
              ) : null}
            </div>

            {previewable && url ? (
              mime.toLowerCase() === "application/pdf" ? (
                <PdfPreview url={url} />
              ) : mime.toLowerCase().startsWith("image/") ? (
                <img
                  src={url}
                  alt={doc.title}
                  className="max-h-[60vh] w-full rounded-xl border border-border object-contain bg-muted/30"
                />
              ) : mime.toLowerCase().startsWith("text/") ? (
                <iframe
                  title={doc.title}
                  src={url}
                  className="h-80 w-full rounded-xl border border-border bg-background"
                />
              ) : null
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("documents.noPreview")}
              </p>
            )}

            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex text-xs font-bold text-primary underline"
              >
                {t("documents.openExternal")}
              </a>
            ) : null}

            <section className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold">{t("documents.ocrTitle")}</h3>
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
              <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-muted/40 p-3 text-xs text-foreground">
                {ocrText.trim()
                  ? ocrText
                  : t("documents.ocrEmpty")}
              </pre>
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

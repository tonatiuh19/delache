import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { loadPdfDocumentFromUrl } from "@/utils/pdfDocument";

type Props = {
  url: string;
};

export default function PdfPreview({ url }: Props) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useIframeFallback, setUseIframeFallback] = useState(false);
  const pdfRef = useRef<import("pdfjs-dist").PDFDocumentProxy | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setUseIframeFallback(false);
    setPage(1);
    setPageCount(0);

    (async () => {
      try {
        const pdf = await loadPdfDocumentFromUrl(url);
        if (cancelled) {
          await pdf.destroy();
          return;
        }
        pdfRef.current = pdf;
        setPageCount(pdf.numPages);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setUseIframeFallback(true);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      void pdfRef.current?.destroy();
      pdfRef.current = null;
    };
  }, [url]);

  useEffect(() => {
    if (useIframeFallback || loading) return;
    const pdf = pdfRef.current;
    const canvas = canvasRef.current;
    if (!pdf || !canvas || page < 1 || pageCount < 1) return;
    let cancelled = false;

    (async () => {
      try {
        const pdfPage = await pdf.getPage(page);
        if (cancelled) return;
        const base = pdfPage.getViewport({ scale: 1 });
        const wrapWidth = canvasWrapRef.current?.clientWidth ?? 720;
        const maxWidth = Math.min(Math.max(wrapWidth - 16, 280), 900);
        const scale = Math.min(1.75, Math.max(1.1, maxWidth / base.width));
        const viewport = pdfPage.getViewport({ scale });
        const context = canvas.getContext("2d");
        if (!context) return;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await pdfPage.render({
          canvasContext: context,
          viewport,
          canvas,
        }).promise;
      } catch {
        if (!cancelled) {
          setUseIframeFallback(true);
          setError(t("documents.previewFailed"));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, pageCount, url, t, loading, useIframeFallback]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (useIframeFallback) {
    return (
      <div className="space-y-3">
        {error ? (
          <p className="px-1 text-xs text-muted-foreground">{error}</p>
        ) : null}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <iframe
            title={t("documents.preview")}
            src={url}
            className="h-[min(58vh,620px)] w-full bg-background"
          />
        </div>
        <p className="text-center text-[11px] text-muted-foreground">
          {t("documents.previewIframeHint")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card transition hover:bg-secondary disabled:opacity-40"
          aria-label={t("documents.prevPage")}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[7rem] text-center text-xs font-semibold text-muted-foreground">
          {t("documents.pageOf", { page, total: pageCount })}
        </span>
        <button
          type="button"
          disabled={page >= pageCount}
          onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card transition hover:bg-secondary disabled:opacity-40"
          aria-label={t("documents.nextPage")}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div
        ref={canvasWrapRef}
        className="max-h-[min(58vh,620px)] overflow-auto rounded-xl border border-border bg-card p-2 shadow-sm"
      >
        <canvas ref={canvasRef} className="mx-auto max-w-full" />
      </div>
    </div>
  );
}

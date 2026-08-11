import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

type Props = {
  url: string;
};

export default function PdfPreview({ url }: Props) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pdfRef = useRef<import("pdfjs-dist").PDFDocumentProxy | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPage(1);

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        const pdf = await pdfjs.getDocument(url).promise;
        if (cancelled) {
          await pdf.destroy();
          return;
        }
        pdfRef.current = pdf;
        setPageCount(pdf.numPages);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError(t("documents.previewFailed"));
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      void pdfRef.current?.destroy();
      pdfRef.current = null;
    };
  }, [url, t]);

  useEffect(() => {
    const pdf = pdfRef.current;
    const canvas = canvasRef.current;
    if (!pdf || !canvas || page < 1) return;
    let cancelled = false;

    (async () => {
      try {
        const pdfPage = await pdf.getPage(page);
        if (cancelled) return;
        const viewport = pdfPage.getViewport({ scale: 1.25 });
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
        if (!cancelled) setError(t("documents.previewFailed"));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, pageCount, url, t]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3 p-4 text-sm text-muted-foreground">
        <p>{error}</p>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-primary underline"
        >
          {t("documents.openExternal")}
        </a>
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
          className="rounded-lg border border-border p-2 disabled:opacity-40"
          aria-label={t("documents.prevPage")}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs font-semibold text-muted-foreground">
          {t("documents.pageOf", { page, total: pageCount })}
        </span>
        <button
          type="button"
          disabled={page >= pageCount}
          onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          className="rounded-lg border border-border p-2 disabled:opacity-40"
          aria-label={t("documents.nextPage")}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="overflow-auto rounded-xl border border-border bg-muted/30 p-2">
        <canvas ref={canvasRef} className="mx-auto max-w-full" />
      </div>
    </div>
  );
}

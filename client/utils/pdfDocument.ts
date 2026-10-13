import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

/** Load a PDF for client preview/OCR (fetch bytes avoids many blob CORS issues). */
export async function loadPdfDocumentFromUrl(
  url: string,
): Promise<import("pdfjs-dist").PDFDocumentProxy> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

  const response = await fetch(url, { credentials: "omit", mode: "cors" });
  if (!response.ok) {
    throw new Error(`pdf_fetch_failed:${response.status}`);
  }
  const data = await response.arrayBuffer();
  if (!data.byteLength) {
    throw new Error("pdf_empty");
  }
  const loadingTask = pdfjs.getDocument({
    data,
    useSystemFonts: true,
  });
  return loadingTask.promise;
}

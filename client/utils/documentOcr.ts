import { classifyDmsFiles, isOcrableMime } from "@shared/documentDmsRules";

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function filterDmsFiles(files: FileList | File[]): File[] {
  return classifyDmsFiles(Array.from(files)).accepted as File[];
}

/** Extract text from PDF via pdf.js (client). */
export async function extractPdfTextFromUrl(url: string): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  const doc = await pdfjs.getDocument(url).promise;
  const parts: string[] = [];
  const maxPages = Math.min(doc.numPages, 40);
  for (let pageNum = 1; pageNum <= maxPages; pageNum += 1) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const line = content.items
      .map((item) => ("str" in item ? String(item.str) : ""))
      .join(" ");
    if (line.trim()) parts.push(line.trim());
  }
  return parts.join("\n\n");
}

/** OCR image with Tesseract.js (client). */
export async function extractImageOcrText(
  source: string | File | Blob,
): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng+spa");
  try {
    const result = await worker.recognize(source);
    return result.data.text || "";
  } finally {
    await worker.terminate();
  }
}

export async function extractClientOcrText(opts: {
  mimeType: string | null | undefined;
  url?: string | null;
  file?: File | null;
}): Promise<string> {
  const mime = (opts.mimeType || "").toLowerCase();
  if (!isOcrableMime(mime)) return "";
  if (mime === "application/pdf") {
    if (opts.url) return extractPdfTextFromUrl(opts.url);
    if (opts.file) {
      const url = URL.createObjectURL(opts.file);
      try {
        return await extractPdfTextFromUrl(url);
      } finally {
        URL.revokeObjectURL(url);
      }
    }
    return "";
  }
  if (mime.startsWith("image/")) {
    if (opts.file) return extractImageOcrText(opts.file);
    if (opts.url) return extractImageOcrText(opts.url);
  }
  return "";
}

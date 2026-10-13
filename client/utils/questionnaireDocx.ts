import { Document, Packer, Paragraph, TextRun } from "docx";
import { plainTextFromHtml } from "@shared/questionnaireDocxRules";

/** Convert a DOCX File to HTML for TipTap (browser). */
export async function docxFileToHtml(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const buffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
  return result.value?.trim() || "<p></p>";
}

/** Build a DOCX blob from TipTap HTML (simple paragraph export). */
export async function htmlToDocxBlob(
  html: string,
  title = "Cuestionario",
): Promise<Blob> {
  const plain = plainTextFromHtml(html);
  const paragraphs = plain
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(
      (line) =>
        new Paragraph({
          children: [new TextRun(line)],
        }),
    );
  if (paragraphs.length === 0) {
    paragraphs.push(
      new Paragraph({
        children: [new TextRun(title)],
      }),
    );
  }
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });
  return Packer.toBlob(doc);
}

export async function htmlToDocxFile(
  html: string,
  fileName = "cuestionario.docx",
): Promise<File> {
  const blob = await htmlToDocxBlob(html);
  return new File([blob], fileName, {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

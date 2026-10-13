/**
 * TipTap HTML ↔ DOCX helpers for Paso 2–4 questionnaire editing (J1).
 * Browser packages (mammoth/docx) are called from the client; these rules stay pure.
 */

export const QUESTIONNAIRE_EDITOR_MIN_CHARS = 20;

/** Strip tags for length / emptiness checks. */
export function plainTextFromHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function isQuestionnaireEditorReady(
  html: string | null | undefined,
): boolean {
  return plainTextFromHtml(html).length >= QUESTIONNAIRE_EDITOR_MIN_CHARS;
}

/** Store TipTap HTML inside questionnaire contentJson. */
export function mergeQuestionnaireEditorHtml(
  contentJson: Record<string, unknown> | null | undefined,
  html: string,
): Record<string, unknown> {
  const base =
    contentJson && typeof contentJson === "object" ? { ...contentJson } : {};
  return {
    ...base,
    editorHtml: html,
    defendantQuestionnaire: plainTextFromHtml(html),
  };
}

export function editorHtmlFromContentJson(
  contentJson: Record<string, unknown> | null | undefined,
): string {
  if (!contentJson || typeof contentJson !== "object") return "";
  const html = contentJson.editorHtml;
  if (typeof html === "string" && html.trim()) return html;
  const plain = contentJson.defendantQuestionnaire;
  if (typeof plain === "string" && plain.trim()) {
    return `<p>${escapeHtml(plain)}</p>`;
  }
  return "";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

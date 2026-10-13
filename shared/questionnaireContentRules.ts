/**
 * P3 questionnaire content: Street View preexistence, defendant Q body, chronology.
 */

export const STREET_VIEW_PREEXISTENCE_VALUES = [
  "preexists",
  "not_preexists",
  "inconclusive",
] as const;

export type StreetViewPreexistence =
  (typeof STREET_VIEW_PREEXISTENCE_VALUES)[number];

export function isStreetViewPreexistence(
  value: unknown,
): value is StreetViewPreexistence {
  return (
    typeof value === "string" &&
    (STREET_VIEW_PREEXISTENCE_VALUES as readonly string[]).includes(value)
  );
}

export type QuestionnaireContentFields = {
  propertyGps?: string;
  streetViewValidated?: string;
  streetView?: string;
  streetViewPreexistence?: StreetViewPreexistence | string;
  powerLineVerified?: string;
  powerLine?: string;
  defendantQuestionnaire?: string;
  plaintiffQuestionnaireOutline?: string;
};

export function readQuestionnaireContent(
  contentJson: unknown,
): QuestionnaireContentFields {
  if (!contentJson || typeof contentJson !== "object") return {};
  const rec = contentJson as Record<string, unknown>;
  return {
    propertyGps:
      typeof rec.propertyGps === "string" ? rec.propertyGps : undefined,
    streetViewValidated:
      typeof rec.streetViewValidated === "string"
        ? rec.streetViewValidated
        : undefined,
    streetView: typeof rec.streetView === "string" ? rec.streetView : undefined,
    streetViewPreexistence:
      typeof rec.streetViewPreexistence === "string"
        ? rec.streetViewPreexistence
        : undefined,
    powerLineVerified:
      typeof rec.powerLineVerified === "string"
        ? rec.powerLineVerified
        : undefined,
    powerLine: typeof rec.powerLine === "string" ? rec.powerLine : undefined,
    defendantQuestionnaire:
      typeof rec.defendantQuestionnaire === "string"
        ? rec.defendantQuestionnaire
        : undefined,
    plaintiffQuestionnaireOutline:
      typeof rec.plaintiffQuestionnaireOutline === "string"
        ? rec.plaintiffQuestionnaireOutline
        : undefined,
  };
}

/** P3 gate: Street View URL + preexistence conclusion recorded. */
export function questionnaireStreetViewComplete(contentJson: unknown): boolean {
  const c = readQuestionnaireContent(contentJson);
  const url = (c.streetViewValidated ?? c.streetView ?? "").trim();
  if (!url) return false;
  return isStreetViewPreexistence(c.streetViewPreexistence);
}

/** Minimum defendant questionnaire body (legacy form — PDF is SoT). */
export function questionnaireDefendantBodyComplete(
  contentJson: unknown,
): boolean {
  const body = readQuestionnaireContent(contentJson).defendantQuestionnaire;
  return Boolean(body && body.trim().length >= 20);
}

export type ChronologyEntry = {
  date?: string;
  event?: string;
};

export function normalizeChronologyJson(
  value: unknown,
): ChronologyEntry[] | null {
  if (!value) return null;
  if (!Array.isArray(value)) return null;
  const entries: ChronologyEntry[] = value
    .map((row): ChronologyEntry | null => {
      if (!row || typeof row !== "object") return null;
      const rec = row as Record<string, unknown>;
      const date = typeof rec.date === "string" ? rec.date.trim() : "";
      const event = typeof rec.event === "string" ? rec.event.trim() : "";
      if (!date && !event) return null;
      return { date: date || undefined, event: event || undefined };
    })
    .filter((e): e is ChronologyEntry => e != null);
  return entries.length > 0 ? entries : null;
}

export type QuestionnaireSubmitOpts = {
  /** Miro artifact: defendant questionnaire PDF (`category: questionnaire`). */
  hasQuestionnairePdf?: boolean;
  /** Word file in the same category (version chain). */
  hasQuestionnaireDocx?: boolean;
  /** In-app editor body must be present when the caller requires it. */
  requireLiveEditor?: boolean;
};

export function isQuestionnaireDocxName(
  fileName: string | null | undefined,
  mimeType?: string | null,
): boolean {
  const name = (fileName ?? "").toLowerCase();
  const mime = (mimeType ?? "").toLowerCase();
  return (
    name.endsWith(".docx") ||
    name.endsWith(".doc") ||
    mime.includes("wordprocessingml") ||
    mime.includes("msword")
  );
}

export function isQuestionnairePdfName(
  fileName: string | null | undefined,
  mimeType?: string | null,
): boolean {
  const name = (fileName ?? "").toLowerCase();
  const mime = (mimeType ?? "").toLowerCase();
  return name.endsWith(".pdf") || mime === "application/pdf";
}

/**
 * P3 submit: Street View preexistence + defendant questionnaire PDF.
 * Form body text is optional (PDF is the SoT artifact).
 */
export function validateQuestionnaireSubmitContent(
  contentJson: unknown,
  opts?: QuestionnaireSubmitOpts,
): { ok: true } | { ok: false; error: string } {
  if (opts?.hasQuestionnairePdf === false) {
    return {
      ok: false,
      error: "Defendant questionnaire PDF required",
    };
  }
  if (opts?.hasQuestionnaireDocx === false) {
    return {
      ok: false,
      error: "Questionnaire Word file required",
    };
  }
  if (
    opts?.requireLiveEditor &&
    !questionnaireDefendantBodyComplete(contentJson)
  ) {
    return {
      ok: false,
      error: "Questionnaire editor text required",
    };
  }
  if (!questionnaireStreetViewComplete(contentJson)) {
    return {
      ok: false,
      error: "Street View URL and preexistence conclusion required",
    };
  }
  return { ok: true };
}

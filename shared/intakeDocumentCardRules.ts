/**
 * Intake document cards from the approved CRM PDF.
 * Four category hues plus a semantic review status.
 */

import { INTAKE_REQUIRED_CATEGORIES } from "./documentCompleteness";

export const INTAKE_DOCUMENT_TONES = {
  lawsuit: "demand",
  medical_record: "medical",
  cfe_report: "cfe",
  preliminary_photo: "photos",
} as const;

export type IntakeDocumentTone =
  (typeof INTAKE_DOCUMENT_TONES)[keyof typeof INTAKE_DOCUMENT_TONES];

export type IntakeCardStatus = "complete" | "rejected" | "review" | "pending";

export function intakeDocumentTone(
  category: string,
): IntakeDocumentTone | null {
  if (category in INTAKE_DOCUMENT_TONES) {
    return INTAKE_DOCUMENT_TONES[
      category as keyof typeof INTAKE_DOCUMENT_TONES
    ];
  }
  return null;
}

export function intakeCardStatus(opts: {
  hasFile: boolean;
  status?: string | null;
}): IntakeCardStatus {
  if (!opts.hasFile) return "pending";
  if (opts.status === "approved") return "complete";
  if (opts.status === "rejected") return "rejected";
  return "review";
}

export function intakeCardCategories(): readonly string[] {
  return INTAKE_REQUIRED_CATEGORIES;
}

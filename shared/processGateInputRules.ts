/**
 * Build ProcessGateInput from structured case rows (batch list + detail parity).
 */

import type { FinanceInvoiceInput, ProcessGateInput } from "./processGates";
import {
  hasBlockingFinanceForCompletion,
  mergeEvidenceCategories,
  questionnaireHasStreetView,
} from "./processGates";

export type ProcessGateInputSource = {
  documentCategories: readonly string[];
  evidenceCategories?: readonly string[];
  measurementTypes?: readonly string[];
  hasPrimaryExpert: boolean;
  questionnaireStatus?: string | null;
  questionnaireContentJson?: unknown;
  streetViewValidatedAt?: unknown;
  propertyLat?: unknown;
  propertyLng?: unknown;
  involvesFatality?: boolean;
  inspectionComplete: boolean;
  reportStatus?: string | null;
  logisticsReady: boolean;
  invoices: readonly FinanceInvoiceInput[];
};

export function hasPropertyGpsFromCoords(
  lat: unknown,
  lng: unknown,
): boolean {
  return (
    lat != null &&
    lng != null &&
    String(lat).trim() !== "" &&
    String(lng).trim() !== ""
  );
}

export function buildProcessGateInputFromSource(
  source: ProcessGateInputSource,
): ProcessGateInput {
  const documentCategories = source.documentCategories;
  return {
    documentCategories,
    evidenceCategories: mergeEvidenceCategories(
      source.evidenceCategories ?? [],
      source.measurementTypes ?? [],
    ),
    hasPrimaryExpert: source.hasPrimaryExpert,
    questionnaireStatus: source.questionnaireStatus ?? null,
    hasStreetView:
      Boolean(source.streetViewValidatedAt) ||
      questionnaireHasStreetView(source.questionnaireContentJson),
    hasPropertyGps: hasPropertyGpsFromCoords(
      source.propertyLat,
      source.propertyLng,
    ),
    plaintiffQuestionnairePresent: documentCategories.includes(
      "plaintiff_questionnaire",
    ),
    protestaFiled: documentCategories.includes("protesta"),
    inspectionComplete: source.inspectionComplete,
    reportStatus: source.reportStatus ?? null,
    ratificationPresent: documentCategories.includes("ratification"),
    courtFilingPresent: documentCategories.includes("court_filing"),
    involvesFatality: Boolean(source.involvesFatality),
    logisticsReady: source.logisticsReady,
    hasUnpaidInvoices: hasBlockingFinanceForCompletion(source.invoices),
  };
}

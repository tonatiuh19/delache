/**
 * PDF-aligned composed workspaces for process steps 2–9 (P2–P10 minus intake).
 * Left process rail stays; subsection pills are hidden; main column is one page.
 */

import type { EvidenceCategory } from "./api";
import type { ProcessStepSlug } from "./caseStepTreeRules";
import type { ListadoProgress, ProcessPointId } from "./processGates";

/** Steps that use the PDF composed page (hide subsection pills). */
export const PDF_WORKSPACE_STEP_SLUGS = [
  "questionnaire",
  "assignment",
  "legal_review_questionnaire",
  "court_acceptance",
  "field_ops",
  "technical_report",
  "validation_delivery",
  "accounting",
] as const satisfies readonly ProcessStepSlug[];

export type PdfWorkspaceStepSlug = (typeof PDF_WORKSPACE_STEP_SLUGS)[number];

export function isPdfWorkspaceStep(
  slug: string | null | undefined,
): slug is PdfWorkspaceStepSlug {
  return (
    typeof slug === "string" &&
    (PDF_WORKSPACE_STEP_SLUGS as readonly string[]).includes(slug)
  );
}

/**
 * Hide subsection pills / sidebar 1.1–1.n links.
 * PDF workspaces compose one page; intake uses the same Resumen layout without sub-nav.
 */
export function shouldHideStepSubsections(
  slug: string | null | undefined,
): boolean {
  if (!slug) return false;
  return isPdfWorkspaceStep(slug) || slug === "intake";
}

/** Miro P8 gate: technical report PDF + internal approval. */
export function isPdfTechnicalReportReady(opts: {
  hasReportPdf: boolean;
  reportInternalOk?: boolean | null;
}): boolean {
  return Boolean(opts.hasReportPdf && opts.reportInternalOk);
}

/** Miro P9 gate: firm OK + court filing PDF + ratification PDF. */
export function isPdfValidationDeliveryReady(opts: {
  listado?: ListadoProgress | null;
  hasCourtFiling: boolean;
  hasRatificationPdf: boolean;
}): boolean {
  return Boolean(
    opts.listado?.reportFirmOk &&
      opts.hasCourtFiling &&
      opts.hasRatificationPdf,
  );
}

/** Miro P10 gate: anticipo + finiquito paid before close. */
export function isPdfAccountingReady(opts: {
  listado?: ListadoProgress | null;
}): boolean {
  return Boolean(opts.listado?.advancePaid && opts.listado?.finalPaid);
}

export type PdfEvidenceTileId =
  | "distances"
  | "facade_pole"
  | "electrical_structure"
  | "condition"
  | "oversize";

export type PdfEvidenceTile = {
  id: PdfEvidenceTileId;
  labelKey: string;
  categories: readonly EvidenceCategory[];
};

/** PDF Paso 6: five multi-file tiles mapped onto existing evidence categories. */
export const PDF_EVIDENCE_TILES: readonly PdfEvidenceTile[] = [
  {
    id: "distances",
    labelKey: "cases.pdfStep.evidence.distances",
    categories: ["horizontal_distance", "vertical_distance", "pole_distance"],
  },
  {
    id: "facade_pole",
    labelKey: "cases.pdfStep.evidence.facadePole",
    categories: ["facade", "pole_id"],
  },
  {
    id: "electrical_structure",
    labelKey: "cases.pdfStep.evidence.electricalStructure",
    categories: ["electrical_structure"],
  },
  {
    id: "condition",
    labelKey: "cases.pdfStep.evidence.condition",
    categories: [
      "conductor",
      "sidewalk",
      "construction",
      "property_invasion",
      "safety",
    ],
  },
  {
    id: "oversize",
    labelKey: "cases.pdfStep.evidence.oversize",
    categories: ["oversized_construction"],
  },
];

export function pdfEvidenceTileForCategory(
  category: string | null | undefined,
): PdfEvidenceTile | null {
  if (!category) return null;
  return (
    PDF_EVIDENCE_TILES.find((tile) =>
      (tile.categories as readonly string[]).includes(category),
    ) ?? null
  );
}

/** Primary category used when uploading into a tile (first in the map). */
export function primaryCategoryForPdfEvidenceTile(
  tileId: PdfEvidenceTileId,
): EvidenceCategory {
  const tile = PDF_EVIDENCE_TILES.find((t) => t.id === tileId);
  return tile?.categories[0] ?? "general";
}

export type PdfStatusRailStep = {
  point: ProcessPointId;
  labelKey: string;
};

/** Compact Estado del expediente rail for a PDF workspace (current + neighbors). */
export function pdfStatusRailAround(current: ProcessPointId): {
  completed: ProcessPointId[];
  current: ProcessPointId;
  upcoming: ProcessPointId[];
} {
  const all: ProcessPointId[] = [1, 2, 3, 4, 6, 7, 8, 9, 10];
  const idx = all.indexOf(current);
  return {
    completed: idx > 0 ? all.slice(0, idx) : [],
    current,
    upcoming: idx >= 0 ? all.slice(idx + 1) : all,
  };
}

export const PDF_STEP_NOTE_MAX = 500;

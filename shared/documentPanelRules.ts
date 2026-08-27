/**
 * Staff case-detail documents panel: checklist rows, category anchors,
 * and grouping so process-gate links land on a specific requirement.
 */

import {
  ADDITIONAL_DOCS_CATEGORIES,
  COURT_FILING_CATEGORIES,
  INTAKE_REQUIRED_CATEGORIES,
} from "./documentCompleteness";

const PHASE_ORDER = [
  ...INTAKE_REQUIRED_CATEGORIES,
  ...ADDITIONAL_DOCS_CATEGORIES,
  ...COURT_FILING_CATEGORIES,
] as const;

export function documentCategoryFromGateCode(
  code: string,
): string | null {
  if (!code.startsWith("doc:")) return null;
  const category = code.slice(4).trim();
  return category || null;
}

export function documentCategoryAnchorId(category: string): string {
  return `case-documents-cat-${category}`;
}

export function documentCategoryHref(category: string): string {
  return `#${documentCategoryAnchorId(category)}`;
}

/** Parse `#case-documents-cat-medical_record` (with or without leading #). */
export function parseDocumentCategoryFromHash(
  hash: string | null | undefined,
): string | null {
  if (!hash) return null;
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const prefix = "case-documents-cat-";
  if (!raw.startsWith(prefix)) return null;
  const category = raw.slice(prefix.length).trim();
  return category || null;
}

export function blockingDocCategoriesFromGates(
  missingGateCodes: readonly string[],
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const code of missingGateCodes) {
    const cat = documentCategoryFromGateCode(code);
    if (!cat || seen.has(cat)) continue;
    seen.add(cat);
    out.push(cat);
  }
  return out;
}

export type DocumentPhaseKey = "intake" | "additionalDocs" | "courtFiling";

export type DocumentPhaseSummary = {
  key: DocumentPhaseKey;
  complete: boolean;
  presentCount: number;
  requiredCount: number;
  missing: string[];
};

export function buildDocumentPhaseSummaries(opts: {
  intake?: { complete: boolean; present: string[]; missing: string[]; required: string[] } | null;
  additionalDocs?: { complete: boolean; present: string[]; missing: string[]; required: string[] } | null;
  courtFiling?: { complete: boolean; present: string[]; missing: string[]; required: string[] } | null;
}): DocumentPhaseSummary[] {
  const rows: DocumentPhaseSummary[] = [];
  const push = (
    key: DocumentPhaseKey,
    info:
      | {
          complete: boolean;
          present: string[];
          missing: string[];
          required: string[];
        }
      | null
      | undefined,
  ) => {
    if (!info) return;
    rows.push({
      key,
      complete: info.complete,
      presentCount: info.present.length,
      requiredCount: info.required.length,
      missing: [...info.missing],
    });
  };
  push("intake", opts.intake);
  push("additionalDocs", opts.additionalDocs);
  push("courtFiling", opts.courtFiling);
  return rows;
}

export type DocumentCategoryGroup<T extends { category: string }> = {
  category: string;
  documents: T[];
};

function categorySortKey(category: string): number {
  const idx = (PHASE_ORDER as readonly string[]).indexOf(category);
  return idx === -1 ? 1000 + category.charCodeAt(0) : idx;
}

export function groupDocumentsByCategory<T extends { category: string }>(
  documents: readonly T[],
): DocumentCategoryGroup<T>[] {
  const map = new Map<string, T[]>();
  for (const doc of documents) {
    const list = map.get(doc.category) ?? [];
    list.push(doc);
    map.set(doc.category, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => categorySortKey(a) - categorySortKey(b))
    .map(([category, docs]) => ({ category, documents: docs }));
}

/** Prefer focusing upload on the first blocking category when hash is empty. */
export function preferredUploadCategory(opts: {
  hashCategory: string | null;
  blockingCategories: readonly string[];
  fallback: string;
}): string {
  if (opts.hashCategory) return opts.hashCategory;
  if (opts.blockingCategories.length > 0) return opts.blockingCategories[0]!;
  return opts.fallback;
}

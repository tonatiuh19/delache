/**
 * Field evidence capture rules (Product.md Phase 8).
 * Keep API handlers thin — validation and checklist coverage live here.
 */

export const EVIDENCE_TYPES = [
  "photo",
  "video",
  "voice_note",
  "measurement",
  "signature",
  "gps_point",
  "observation",
  "court_filing",
  "other",
] as const;

export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

export const EVIDENCE_CATEGORIES = [
  "horizontal_distance",
  "vertical_distance",
  "pole_distance",
  "pole_id",
  "electrical_structure",
  "conductor",
  "facade",
  "sidewalk",
  "construction",
  "property_invasion",
  "oversized_construction",
  "safety",
  "general",
] as const;

export type EvidenceCategory = (typeof EVIDENCE_CATEGORIES)[number];

/** Product.md Phase 8 mandatory checklist categories (excludes general). */
export const EVIDENCE_CHECKLIST_CATEGORIES: readonly EvidenceCategory[] = [
  "horizontal_distance",
  "vertical_distance",
  "pole_distance",
  "pole_id",
  "electrical_structure",
  "conductor",
  "facade",
  "sidewalk",
  "construction",
  "property_invasion",
  "oversized_construction",
  "safety",
] as const;

/** Types that must include an uploaded file. */
export const EVIDENCE_TYPES_REQUIRING_FILE: readonly EvidenceType[] = [
  "photo",
  "video",
  "voice_note",
  "signature",
  "court_filing",
] as const;

export const EVIDENCE_MAX_FILE_BYTES = 15 * 1024 * 1024;

export type CreateEvidenceInput = {
  evidenceType?: unknown;
  category?: unknown;
  title?: unknown;
  caption?: unknown;
  inspectionId?: unknown;
  lat?: unknown;
  lng?: unknown;
  capturedAt?: unknown;
  fileName?: unknown;
  contentType?: unknown;
  data?: unknown;
  fileSizeBytes?: unknown;
};

export type NormalizedEvidenceCreate = {
  evidenceType: EvidenceType;
  category: EvidenceCategory;
  title: string | null;
  caption: string | null;
  inspectionId: number | null;
  lat: number | null;
  lng: number | null;
  capturedAt: Date | null;
  fileName: string | null;
  contentType: string | null;
  dataBase64: string | null;
  requiresFile: boolean;
};

export type EvidenceValidationOk = {
  ok: true;
  value: NormalizedEvidenceCreate;
};

export type EvidenceValidationErr = {
  ok: false;
  error: string;
  code:
    | "invalid_type"
    | "invalid_category"
    | "file_required"
    | "gps_required"
    | "invalid_coordinates"
    | "invalid_captured_at"
    | "empty_content"
    | "invalid_file_size"
    | "invalid_inspection_id";
};

export type EvidenceValidationResult =
  | EvidenceValidationOk
  | EvidenceValidationErr;

export function isEvidenceType(value: unknown): value is EvidenceType {
  return (
    typeof value === "string" &&
    (EVIDENCE_TYPES as readonly string[]).includes(value)
  );
}

export function isEvidenceCategory(value: unknown): value is EvidenceCategory {
  return (
    typeof value === "string" &&
    (EVIDENCE_CATEGORIES as readonly string[]).includes(value)
  );
}

export function evidenceRequiresFile(type: EvidenceType): boolean {
  return (EVIDENCE_TYPES_REQUIRING_FILE as readonly string[]).includes(type);
}

function parseOptionalNumber(value: unknown): number | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

function trimOrNull(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

/**
 * Validate and normalize a create-evidence payload.
 * File bytes can be pre-checked via `fileSizeBytes` when buffer length is known.
 */
export function validateCreateEvidence(
  input: CreateEvidenceInput,
): EvidenceValidationResult {
  if (!isEvidenceType(input.evidenceType)) {
    return {
      ok: false,
      error: "Valid evidenceType is required",
      code: "invalid_type",
    };
  }

  const categoryRaw = input.category ?? "general";
  if (!isEvidenceCategory(categoryRaw)) {
    return {
      ok: false,
      error: "Invalid evidence category",
      code: "invalid_category",
    };
  }

  let inspectionId: number | null = null;
  if (input.inspectionId !== undefined && input.inspectionId !== null && input.inspectionId !== "") {
    const id = Number(input.inspectionId);
    if (!Number.isInteger(id) || id <= 0) {
      return {
        ok: false,
        error: "Invalid inspectionId",
        code: "invalid_inspection_id",
      };
    }
    inspectionId = id;
  }

  const lat = parseOptionalNumber(input.lat);
  const lng = parseOptionalNumber(input.lng);
  if (lat === undefined || lng === undefined) {
    return {
      ok: false,
      error: "lat and lng must be valid numbers when provided",
      code: "invalid_coordinates",
    };
  }
  if (lat != null && (lat < -90 || lat > 90)) {
    return {
      ok: false,
      error: "lat must be between -90 and 90",
      code: "invalid_coordinates",
    };
  }
  if (lng != null && (lng < -180 || lng > 180)) {
    return {
      ok: false,
      error: "lng must be between -180 and 180",
      code: "invalid_coordinates",
    };
  }
  if ((lat == null) !== (lng == null)) {
    return {
      ok: false,
      error: "lat and lng must both be set or both omitted",
      code: "invalid_coordinates",
    };
  }

  if (input.evidenceType === "gps_point" && (lat == null || lng == null)) {
    return {
      ok: false,
      error: "gps_point evidence requires lat and lng",
      code: "gps_required",
    };
  }

  let capturedAt: Date | null = null;
  if (input.capturedAt != null && String(input.capturedAt).trim() !== "") {
    const d = new Date(String(input.capturedAt));
    if (Number.isNaN(d.getTime())) {
      return {
        ok: false,
        error: "Invalid capturedAt",
        code: "invalid_captured_at",
      };
    }
    capturedAt = d;
  }

  const title = trimOrNull(input.title);
  const caption = trimOrNull(input.caption);
  const fileName = trimOrNull(input.fileName);
  const contentType = trimOrNull(input.contentType);
  const dataBase64 = trimOrNull(input.data);
  const requiresFile = evidenceRequiresFile(input.evidenceType);

  if (requiresFile && (!fileName || !dataBase64)) {
    return {
      ok: false,
      error: "fileName and data are required for this evidence type",
      code: "file_required",
    };
  }

  if (input.fileSizeBytes != null) {
    const size = Number(input.fileSizeBytes);
    if (!Number.isFinite(size) || size <= 0 || size > EVIDENCE_MAX_FILE_BYTES) {
      return {
        ok: false,
        error: "Invalid file size",
        code: "invalid_file_size",
      };
    }
  }

  const hasFile = Boolean(fileName && dataBase64);
  const hasText = Boolean(title || caption);
  const hasGps = lat != null && lng != null;
  if (!hasFile && !hasText && !hasGps) {
    return {
      ok: false,
      error: "Evidence needs a file, title/caption, or GPS coordinates",
      code: "empty_content",
    };
  }

  return {
    ok: true,
    value: {
      evidenceType: input.evidenceType,
      category: categoryRaw,
      title,
      caption,
      inspectionId,
      lat,
      lng,
      capturedAt,
      fileName,
      contentType,
      dataBase64,
      requiresFile,
    },
  };
}

export type EvidenceChecklistItem = {
  category: EvidenceCategory;
};

export type EvidenceChecklistStatus = {
  covered: EvidenceCategory[];
  missing: EvidenceCategory[];
  coveredCount: number;
  totalCount: number;
  complete: boolean;
};

/** Which Phase 8 checklist categories are covered by at least one evidence item. */
export function getEvidenceChecklistStatus(
  items: readonly EvidenceChecklistItem[],
): EvidenceChecklistStatus {
  const present = new Set(
    items
      .map((i) => i.category)
      .filter((c) =>
        (EVIDENCE_CHECKLIST_CATEGORIES as readonly string[]).includes(c),
      ),
  );
  const covered = EVIDENCE_CHECKLIST_CATEGORIES.filter((c) => present.has(c));
  const missing = EVIDENCE_CHECKLIST_CATEGORIES.filter((c) => !present.has(c));
  return {
    covered: [...covered],
    missing: [...missing],
    coveredCount: covered.length,
    totalCount: EVIDENCE_CHECKLIST_CATEGORIES.length,
    complete: missing.length === 0,
  };
}

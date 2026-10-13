/**
 * Soft-parallel prep allowed without advancing case.status.
 * Hard gates still block PATCH .../status forward advance.
 * SoT: docs/Proceso_Peritaje_Electrico_10_Puntos.md
 */

import type { CaseStatus } from "./api";
import { CASE_STATUS_FLOW, normalizeCaseStatus } from "./caseWorkflow";

export type SoftParallelAction =
  | "draft_logistics_trip"
  | "draft_gps_street_view"
  | "field_prep_notes"
  | "mark_inspection_complete"
  | "upload_field_evidence";

export type SoftParallelOpts = {
  /**
   * When status is on_hold, evaluate prep against the resume target
   * (e.g. field_ops hold still allows field evidence rework).
   */
  holdResumeStatus?: CaseStatus | string | null;
};

function flowIndex(status: CaseStatus): number {
  return CASE_STATUS_FLOW.indexOf(status);
}

function effectiveStatusForSoftParallel(
  status: CaseStatus | string,
  opts?: SoftParallelOpts,
): CaseStatus | null {
  const normalized = normalizeCaseStatus(String(status));
  if (!normalized || normalized === "completed" || normalized === "cancelled") {
    return null;
  }
  if (normalized === "on_hold") {
    const resume = opts?.holdResumeStatus
      ? normalizeCaseStatus(String(opts.holdResumeStatus))
      : null;
    return resume && resume !== "completed" && resume !== "cancelled"
      ? resume
      : null;
  }
  return normalized;
}

/**
 * Whether a prep action is allowed while the case sits at `status`.
 * Returns false for terminal / unknown statuses.
 */
export function softParallelAllowed(
  status: CaseStatus | string,
  action: SoftParallelAction,
  opts?: SoftParallelOpts,
): boolean {
  const effective = effectiveStatusForSoftParallel(status, opts);
  if (!effective) return false;

  const idx = flowIndex(effective);
  const questionnaireIdx = flowIndex("questionnaire");
  const assignmentIdx = flowIndex("assignment");
  const fieldOpsIdx = flowIndex("field_ops");

  switch (action) {
    case "draft_gps_street_view":
      // Questionnaire is prepared before assignment.
      return idx >= questionnaireIdx && idx <= fieldOpsIdx;
    case "draft_logistics_trip":
      return idx >= assignmentIdx && idx <= fieldOpsIdx;
    case "field_prep_notes":
      return idx >= assignmentIdx && idx < fieldOpsIdx;
    case "mark_inspection_complete":
    case "upload_field_evidence":
      // Only while effective stage is field_ops (incl. on_hold resumed from P7).
      return idx === fieldOpsIdx;
    default:
      return false;
  }
}

/** Stable error code for API + client toasts. */
export const SOFT_PARALLEL_BLOCKED = "soft_parallel_blocked" as const;

export function softParallelBlockMessage(action: SoftParallelAction): string {
  switch (action) {
    case "draft_logistics_trip":
      return "Logistics trips can be drafted from assignment through field_ops only";
    case "draft_gps_street_view":
      return "GPS / Street View drafts are allowed from assignment through field_ops only";
    case "field_prep_notes":
      return "Field prep notes are allowed after assignment until field_ops begins";
    case "mark_inspection_complete":
      return "Inspection can only be marked complete while the case is in field_ops (or on hold from field_ops)";
    case "upload_field_evidence":
      return "Field evidence uploads are only allowed during field_ops (or on hold from field_ops)";
    default:
      return "This action is not allowed at the current process stage";
  }
}

/** Protesta modality does not start the 10-BD clock by itself. */
export function protestaClockStartsOnArtifact(opts: {
  protestaFiled: boolean;
  protestaModality: "presencial" | "virtual" | null | undefined;
}): boolean {
  return opts.protestaFiled === true;
}

export function requiresProtestaScanUpload(
  modality: "presencial" | "virtual" | null | undefined,
): boolean {
  return modality === "presencial";
}

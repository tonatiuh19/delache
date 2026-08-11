/**
 * Inspection status transition graph.
 */

export const INSPECTION_STATUSES = [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type InspectionStatusValue = (typeof INSPECTION_STATUSES)[number];

const ALLOWED: Record<InspectionStatusValue, readonly InspectionStatusValue[]> =
  {
    scheduled: ["in_progress", "completed", "cancelled"],
    in_progress: ["completed", "cancelled"],
    completed: [],
    cancelled: [],
  };

export function isInspectionStatus(v: unknown): v is InspectionStatusValue {
  return (
    typeof v === "string" &&
    (INSPECTION_STATUSES as readonly string[]).includes(v)
  );
}

export type InspectionTransitionResult =
  | { ok: true }
  | { ok: false; error: string };

export function canTransitionInspection(
  from: string,
  to: unknown,
): InspectionTransitionResult {
  if (!isInspectionStatus(from)) {
    return { ok: false, error: "Invalid current inspection status" };
  }
  if (!isInspectionStatus(to)) {
    return {
      ok: false,
      error: "status must be scheduled, in_progress, completed, or cancelled",
    };
  }
  if (from === to) return { ok: true };
  if (!ALLOWED[from].includes(to)) {
    return {
      ok: false,
      error: `Cannot move inspection from ${from} to ${to}`,
    };
  }
  return { ok: true };
}

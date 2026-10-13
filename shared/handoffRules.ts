/**
 * P2: coordinator confirms intake documents reached the primary expert intact.
 */

import type { AssignmentRole } from "./api";
import { RECOMMENDED_ASSIGNMENT_ROLES_AFTER_P2 } from "./processGates";

export function canConfirmDocumentsHandoff(
  role: string | null | undefined,
): boolean {
  return role === "admin";
}

/** Who should see handoff-pending copy (admin/Coordinador action vs expert waiting). */
export type HandoffPendingAudience = "coordinator" | "expert" | "observer";

export function handoffPendingAudience(
  role: string | null | undefined,
): HandoffPendingAudience {
  if (canConfirmDocumentsHandoff(role)) return "coordinator";
  if (role === "expert") return "expert";
  return "observer";
}

export function documentsHandoffConfirmed(
  confirmedAt: string | null | undefined,
): boolean {
  return Boolean(confirmedAt && confirmedAt.trim().length > 0);
}

export type AssignmentRolePresence = {
  assignmentRole: AssignmentRole | string;
};

/** Recommended P2 roles missing from active assignments. */
export function missingRecommendedAssignmentRoles(
  assignments: readonly AssignmentRolePresence[],
): AssignmentRole[] {
  const present = new Set(
    assignments.map((a) => String(a.assignmentRole)),
  );
  return RECOMMENDED_ASSIGNMENT_ROLES_AFTER_P2.filter(
    (r) => !present.has(r),
  );
}

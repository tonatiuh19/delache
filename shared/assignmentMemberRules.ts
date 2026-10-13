/**
 * Assign form: which staff login roles may fill a case_assignments.assignment_role.
 * Inverse of staffRoleToAssignmentRoles for the 1:1 ops roles; coordinator = admin;
 * qa / technical_director align with review capabilities (admin + expert).
 */

import type { AssignmentRole, UserRole, UserStatus } from "./api";
import {
  RECOMMENDED_ASSIGNMENT_ROLES_AFTER_P2,
  REQUIRED_ASSIGNMENT_ROLES_AFTER_P2,
} from "./processGates";

const STAFF_LOGIN_ROLES: readonly UserRole[] = [
  "admin",
  "expert",
  "legal",
  "logistics",
  "accountant",
] as const;

/** Optional assign roles beyond Miro P2 required/recommended. */
export const OPTIONAL_ASSIGNMENT_ROLES: readonly AssignmentRole[] = [
  "technical_director",
  "observer",
] as const;

export type AssignmentRoleTier = "required" | "recommended" | "optional";

export function assignmentRoleTier(
  role: AssignmentRole | string | null | undefined,
): AssignmentRoleTier {
  if (
    (REQUIRED_ASSIGNMENT_ROLES_AFTER_P2 as readonly string[]).includes(
      String(role),
    )
  ) {
    return "required";
  }
  if (
    (RECOMMENDED_ASSIGNMENT_ROLES_AFTER_P2 as readonly string[]).includes(
      String(role),
    )
  ) {
    return "recommended";
  }
  return "optional";
}

/** Role select groups for P2 (Miro: primary expert required; others recommended). */
export function assignmentRoleSelectGroups(): {
  tier: AssignmentRoleTier;
  roles: readonly AssignmentRole[];
}[] {
  return [
    { tier: "required", roles: REQUIRED_ASSIGNMENT_ROLES_AFTER_P2 },
    { tier: "recommended", roles: RECOMMENDED_ASSIGNMENT_ROLES_AFTER_P2 },
    { tier: "optional", roles: OPTIONAL_ASSIGNMENT_ROLES },
  ];
}

/** Primary checkbox is forced on when assigning the Miro-required expert. */
export function shouldForcePrimaryAssignment(
  assignmentRole: AssignmentRole | string | null | undefined,
): boolean {
  return assignmentRole === "expert";
}

/** Staff UserRoles eligible for a given assignment_role. */
export function staffRolesForAssignmentRole(
  assignmentRole: AssignmentRole | string | null | undefined,
): readonly UserRole[] {
  switch (assignmentRole) {
    case "expert":
      return ["expert"];
    case "legal_reviewer":
      return ["legal"];
    case "logistics":
      return ["logistics"];
    case "accountant":
      return ["accountant"];
    case "coordinator":
      return ["admin"];
    case "qa":
    case "technical_director":
      return ["admin", "expert"];
    case "observer":
      return STAFF_LOGIN_ROLES;
    default:
      return [];
  }
}

export type AssignableMemberLike = {
  id: number;
  role: string;
  status: UserStatus | string;
};

const ASSIGNABLE_STATUSES: ReadonlySet<string> = new Set(["active", "invited"]);

/**
 * Members shown in the Assign “Seleccionar miembro” picker for the chosen role.
 * Active/invited staff only; role must match staffRolesForAssignmentRole.
 */
export function filterMembersForAssignmentRole<T extends AssignableMemberLike>(
  members: readonly T[],
  assignmentRole: AssignmentRole | string | null | undefined,
): T[] {
  const allowed = new Set(
    staffRolesForAssignmentRole(assignmentRole) as readonly string[],
  );
  if (allowed.size === 0) return [];
  return members.filter(
    (m) =>
      ASSIGNABLE_STATUSES.has(String(m.status)) && allowed.has(String(m.role)),
  );
}

/** True when the selected userId is still valid for the current assignment role. */
export function isMemberEligibleForAssignment(opts: {
  members: readonly AssignableMemberLike[];
  userId: number | string | null | undefined;
  assignmentRole: AssignmentRole | string | null | undefined;
}): boolean {
  const id = Number(opts.userId);
  if (!Number.isFinite(id) || id <= 0) return false;
  return filterMembersForAssignmentRole(
    opts.members,
    opts.assignmentRole,
  ).some((m) => m.id === id);
}

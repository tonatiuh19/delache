/**
 * Staff case visibility: which expedientes a role may list / open / create.
 * Keep inlined copies in api/index.ts in sync (no runtime import from shared/).
 */

import type { UserRole } from "./api";

/** Org-wide Listado — admin + coordinator (day-to-day ops). */
export function canListAllStaffCases(
  role: string | null | undefined,
): boolean {
  return role === "admin" || role === "case_coordinator";
}

/** Staff-side case creation (despacho intake is separate). */
export function canCreateStaffCase(
  role: string | null | undefined,
): boolean {
  return role === "admin" || role === "case_coordinator";
}

/**
 * Maps staff login role → case_assignments.assignment_role values that grant access.
 * Admin/coordinator use canListAllStaffCases instead.
 */
export function staffRoleToAssignmentRoles(
  role: string | null | undefined,
): readonly string[] {
  switch (role as UserRole | string) {
    case "expert":
      return ["expert"];
    case "case_coordinator":
      return ["coordinator"];
    case "legal":
      return ["legal_reviewer"];
    case "logistics":
      return ["logistics"];
    case "accountant":
      return ["accountant"];
    default:
      return [];
  }
}

export type StaffCaseVisibilityFilter = {
  /** Extra AND clause (without leading AND). Empty string = no restriction. */
  sql: string;
  params: unknown[];
};

/**
 * SQL fragment to restrict `cases` rows to those the staff user may see.
 * When `sql` is empty, the caller should not add a visibility predicate.
 */
export function buildStaffCaseVisibilityFilter(opts: {
  role: string | null | undefined;
  userId: number;
  /** Table/alias for the cases row (default `cases`). */
  casesAlias?: string;
}): StaffCaseVisibilityFilter {
  if (canListAllStaffCases(opts.role)) {
    return { sql: "", params: [] };
  }

  const alias = opts.casesAlias || "cases";
  const roles = staffRoleToAssignmentRoles(opts.role);
  if (roles.length === 0 || !Number.isFinite(opts.userId) || opts.userId <= 0) {
    return { sql: "1 = 0", params: [] };
  }

  const rolePlaceholders = roles.map(() => "?").join(", ");
  const parts: string[] = [
    `EXISTS (
      SELECT 1 FROM case_assignments a
      WHERE a.case_id = ${alias}.id
        AND a.user_id = ?
        AND a.unassigned_at IS NULL
        AND a.assignment_role IN (${rolePlaceholders})
    )`,
  ];
  const params: unknown[] = [opts.userId, ...roles];

  if (roles.includes("expert")) {
    parts.push(`${alias}.assigned_expert_id = ?`);
    params.push(opts.userId);
  }
  if (roles.includes("coordinator")) {
    parts.push(`${alias}.assigned_coordinator_id = ?`);
    params.push(opts.userId);
  }

  return { sql: `(${parts.join(" OR ")})`, params };
}

/** Pure membership check after loading a case + active assignment roles. */
export function canAccessStaffCase(opts: {
  role: string | null | undefined;
  userId: number;
  assignedExpertId?: number | null;
  assignedCoordinatorId?: number | null;
  /** Active assignment_role values for this user on the case. */
  activeAssignmentRoles: readonly string[];
}): boolean {
  if (canListAllStaffCases(opts.role)) return true;
  const needed = staffRoleToAssignmentRoles(opts.role);
  if (needed.length === 0) return false;
  if (needed.some((r) => opts.activeAssignmentRoles.includes(r))) return true;
  if (
    needed.includes("expert") &&
    opts.assignedExpertId != null &&
    Number(opts.assignedExpertId) === opts.userId
  ) {
    return true;
  }
  if (
    needed.includes("coordinator") &&
    opts.assignedCoordinatorId != null &&
    Number(opts.assignedCoordinatorId) === opts.userId
  ) {
    return true;
  }
  return false;
}

/**
 * Team member invite/update/remove business rules.
 * Keep API handlers thin — all validation and edge cases live here and are unit-tested.
 */

import type { UserRole, UserStatus } from "./api";

export const STAFF_EDIT_ROLES: readonly UserRole[] = [
  "admin",
  "case_coordinator",
  "expert",
  "legal",
  "logistics",
  "accountant",
] as const;

export const INVITE_ROLES: readonly (UserRole | "law_firm_user")[] = [
  ...STAFF_EDIT_ROLES,
  "law_firm_user",
] as const;

/** Statuses admins may set via PATCH (suspend removed from product UI). */
export const MUTABLE_MEMBER_STATUSES: readonly UserStatus[] = [
  "active",
  "inactive",
  "invited",
] as const;

export type TeamMemberSnapshot = {
  id: number;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  phone?: string | null;
};

export type TeamMemberUpdatePatch = {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  status?: UserStatus;
  phone?: string | null;
};

export type TeamMemberUpdateOk = {
  ok: true;
  next: {
    firstName: string;
    lastName: string;
    role: UserRole;
    status: UserStatus;
    phone?: string | null;
    phoneChanged: boolean;
  };
  revokeSessions: boolean;
  statusChanged: boolean;
};

export type TeamMemberUpdateErr = {
  ok: false;
  error: string;
  code:
    | "self_status_change"
    | "invalid_name"
    | "invalid_role"
    | "invalid_status";
};

export type TeamMemberUpdateResult = TeamMemberUpdateOk | TeamMemberUpdateErr;

export function isStaffEditRole(role: string): role is UserRole {
  return (STAFF_EDIT_ROLES as readonly string[]).includes(role);
}

export function isInviteRole(role: string): role is UserRole | "law_firm_user" {
  return (INVITE_ROLES as readonly string[]).includes(role);
}

export function isMutableMemberStatus(status: string): status is UserStatus {
  return (MUTABLE_MEMBER_STATUSES as readonly string[]).includes(status);
}

/** Login OTP is allowed only for active or invited accounts. */
export function canRequestLoginOtp(status: UserStatus): boolean {
  return status === "active" || status === "invited";
}

/** Deactivate / inactive (and legacy suspended) must kill open sessions. */
export function shouldRevokeSessionsOnStatus(status: UserStatus): boolean {
  return status === "inactive" || status === "suspended";
}

export function canChangeOwnAccountStatus(
  actorId: number,
  memberId: number,
  currentStatus: UserStatus,
  nextStatus: UserStatus,
): boolean {
  if (actorId !== memberId) return true;
  return currentStatus === nextStatus;
}

export function canRemoveMember(actorId: number, memberId: number): boolean {
  return actorId !== memberId;
}

/**
 * Resolve a PATCH payload against the current member.
 * Enforces self-status lock, name/role/status validity, and session revoke flag.
 */
export function resolveTeamMemberUpdate(
  actorId: number,
  current: TeamMemberSnapshot,
  patch: TeamMemberUpdatePatch,
): TeamMemberUpdateResult {
  const nextFirst =
    patch.firstName !== undefined
      ? String(patch.firstName).trim()
      : current.firstName;
  const nextLast =
    patch.lastName !== undefined
      ? String(patch.lastName).trim()
      : current.lastName;
  const nextRole = patch.role !== undefined ? patch.role : current.role;
  const nextStatus = patch.status !== undefined ? patch.status : current.status;

  if (
    !canChangeOwnAccountStatus(
      actorId,
      current.id,
      current.status,
      nextStatus,
    )
  ) {
    return {
      ok: false,
      error: "Cannot change your own account status",
      code: "self_status_change",
    };
  }

  if (!nextFirst || !nextLast) {
    return {
      ok: false,
      error: "firstName and lastName required",
      code: "invalid_name",
    };
  }

  if (!isStaffEditRole(nextRole)) {
    return { ok: false, error: "Invalid role", code: "invalid_role" };
  }

  if (!isMutableMemberStatus(nextStatus)) {
    return { ok: false, error: "Invalid status", code: "invalid_status" };
  }

  const phoneChanged = patch.phone !== undefined;
  const nextPhone = phoneChanged
    ? patch.phone?.trim() || null
    : current.phone ?? null;

  return {
    ok: true,
    next: {
      firstName: nextFirst,
      lastName: nextLast,
      role: nextRole,
      status: nextStatus,
      phone: nextPhone,
      phoneChanged,
    },
    revokeSessions: shouldRevokeSessionsOnStatus(nextStatus),
    statusChanged: nextStatus !== current.status,
  };
}

export type InviteValidationOk = {
  ok: true;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole | "law_firm_user";
  lawFirmId: number | null;
};

export type InviteValidationErr = {
  ok: false;
  error: string;
  code: "invalid_payload" | "law_firm_required";
};

export function validateTeamInvite(input: {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  lawFirmId?: number | null;
}): InviteValidationOk | InviteValidationErr {
  const email = String(input.email || "").trim().toLowerCase();
  const firstName = String(input.firstName || "").trim();
  const lastName = String(input.lastName || "").trim();
  const role = String(input.role || "").trim();

  if (!email || !firstName || !lastName || !isInviteRole(role)) {
    return {
      ok: false,
      error: "email, firstName, lastName and role required",
      code: "invalid_payload",
    };
  }

  if (role === "law_firm_user") {
    const lawFirmId = Number(input.lawFirmId);
    if (!Number.isFinite(lawFirmId) || lawFirmId <= 0) {
      return {
        ok: false,
        error: "lawFirmId required for law firm users",
        code: "law_firm_required",
      };
    }
    return {
      ok: true,
      email,
      firstName,
      lastName,
      role: "law_firm_user",
      lawFirmId,
    };
  }

  return {
    ok: true,
    email,
    firstName,
    lastName,
    role: role as UserRole,
    lawFirmId: null,
  };
}

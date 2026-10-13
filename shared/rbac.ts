import type { UserRole } from "./api";

export const STAFF_ROLES: readonly UserRole[] = [
  "admin",
  "expert",
  "legal",
  "logistics",
  "accountant",
] as const;

export const ALL_LOGIN_ROLES: readonly UserRole[] = [...STAFF_ROLES] as const;

export function isStaffRole(role: string | null | undefined): boolean {
  return STAFF_ROLES.includes(role as UserRole);
}

export function isLawFirmRole(role: string | null | undefined): boolean {
  // Legacy helper — law firm users no longer share staff role enum
  return role === "law_firm_user";
}

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "admin";
}

/** Roles that can manage invoices/payments. */
export function canManageFinance(role: string | null | undefined): boolean {
  return role === "admin" || role === "accountant";
}

/** Roles that can manage team + platform settings. */
export function canManageAdmin(role: string | null | undefined): boolean {
  return role === "admin";
}

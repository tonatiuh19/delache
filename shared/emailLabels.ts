/**
 * Localized labels for transactional emails (staff / assignment roles).
 * Keep in sync with client locales team.role + cases.assignmentRole.
 */

import type { AppLocale } from "./i18n";

const STAFF_ROLE_LABELS: Record<AppLocale, Record<string, string>> = {
  es: {
    admin: "Admin",
    case_coordinator: "Coordinador",
    expert: "Perito",
    legal: "Legal",
    logistics: "Logística",
    accountant: "Contador",
    law_firm_user: "Despacho",
  },
  en: {
    admin: "Admin",
    case_coordinator: "Coordinator",
    expert: "Expert",
    legal: "Legal",
    logistics: "Logistics",
    accountant: "Accountant",
    law_firm_user: "Law firm",
  },
};

const ASSIGNMENT_ROLE_LABELS: Record<AppLocale, Record<string, string>> = {
  es: {
    expert: "Perito",
    coordinator: "Coordinador",
    legal_reviewer: "Revisor legal",
    logistics: "Logística",
    accountant: "Contador",
    qa: "QA",
    technical_director: "Director técnico",
    observer: "Observador",
  },
  en: {
    expert: "Expert",
    coordinator: "Coordinator",
    legal_reviewer: "Legal reviewer",
    logistics: "Logistics",
    accountant: "Accountant",
    qa: "QA",
    technical_director: "Technical director",
    observer: "Observer",
  },
};

function lookupLabel(
  maps: Record<AppLocale, Record<string, string>>,
  key: string,
  locale: AppLocale,
): string {
  const normalized = key.trim().toLowerCase();
  const loc = locale === "en" ? "en" : "es";
  return maps[loc][normalized] ?? maps.es[normalized] ?? key.trim();
}

/** Human-readable staff role for invite / welcome emails. */
export function emailStaffRoleLabel(
  role: string,
  locale: AppLocale = "es",
): string {
  if (!role?.trim()) return role;
  return lookupLabel(STAFF_ROLE_LABELS, role, locale);
}

/** Human-readable case assignment role for assignment emails. */
export function emailAssignmentRoleLabel(
  role: string,
  locale: AppLocale = "es",
): string {
  if (!role?.trim()) return role;
  return lookupLabel(ASSIGNMENT_ROLE_LABELS, role, locale);
}

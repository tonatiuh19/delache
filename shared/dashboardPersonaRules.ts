/**
 * Role-aware dashboard cards and quick CTAs.
 * Keep inlined copies in api/index.ts only if the API starts returning persona payloads.
 */

import type { UserRole } from "./api";
import { canListAllStaffCases, canCreateStaffCase } from "./caseVisibilityRules";
import { canManageFinance } from "./rbac";

export type DashboardMetricKey =
  | "totalCases"
  | "urgentOpen"
  | "completed"
  | "onHold"
  | "pendingReviews"
  | "pendingInvoices"
  | "delayedDeadlines"
  | "missingDocsCases";

export type DashboardCtaId =
  | "cases"
  | "createCase"
  | "calendar"
  | "documents"
  | "finance"
  | "team"
  | "notifications";

export type DashboardCtaDef = {
  id: DashboardCtaId;
  href: string;
};

const OPS_METRICS: readonly DashboardMetricKey[] = [
  "totalCases",
  "urgentOpen",
  "completed",
  "onHold",
  "pendingReviews",
  "delayedDeadlines",
  "missingDocsCases",
  "pendingInvoices",
] as const;

const EXPERT_METRICS: readonly DashboardMetricKey[] = [
  "totalCases",
  "urgentOpen",
  "delayedDeadlines",
  "missingDocsCases",
  "pendingReviews",
  "completed",
] as const;

const LEGAL_METRICS: readonly DashboardMetricKey[] = [
  "totalCases",
  "pendingReviews",
  "delayedDeadlines",
  "urgentOpen",
  "completed",
] as const;

const LOGISTICS_METRICS: readonly DashboardMetricKey[] = [
  "totalCases",
  "urgentOpen",
  "delayedDeadlines",
  "onHold",
  "completed",
] as const;

const ACCOUNTANT_METRICS: readonly DashboardMetricKey[] = [
  "pendingInvoices",
  "totalCases",
  "completed",
  "onHold",
  "urgentOpen",
] as const;

/** Metric cards visible for a staff role (order = display order). */
export function dashboardMetricsForRole(
  role: string | null | undefined,
): readonly DashboardMetricKey[] {
  switch (role as UserRole | string) {
    case "admin":
    case "case_coordinator":
      return OPS_METRICS;
    case "expert":
      return EXPERT_METRICS;
    case "legal":
      return LEGAL_METRICS;
    case "logistics":
      return LOGISTICS_METRICS;
    case "accountant":
      return ACCOUNTANT_METRICS;
    default:
      return ["totalCases", "urgentOpen", "completed"] as const;
  }
}

/** Org-wide KPI strip (avg completion, cases-by-expert) — ops only. */
export function canSeeOrgKpiStrip(role: string | null | undefined): boolean {
  return canListAllStaffCases(role);
}

/** Quick-link CTAs for the dashboard persona. */
export function dashboardCtasForRole(
  role: string | null | undefined,
): DashboardCtaDef[] {
  const ctas: DashboardCtaDef[] = [
    { id: "cases", href: "/portal/cases" },
    { id: "calendar", href: "/portal/calendar" },
    { id: "documents", href: "/portal/documents" },
    { id: "notifications", href: "/portal/notifications" },
  ];
  if (canCreateStaffCase(role)) {
    ctas.unshift({ id: "createCase", href: "/portal/cases?create=1" });
  }
  if (canManageFinance(role)) {
    ctas.push({ id: "finance", href: "/portal/finance" });
  }
  if (role === "admin") {
    ctas.push({ id: "team", href: "/portal/team" });
  }
  return ctas;
}

/** When set, dashboard metric tiles navigate as CTAs. */
export function dashboardMetricCtaHref(
  key: DashboardMetricKey,
): string | null {
  switch (key) {
    case "pendingReviews":
      return "/portal/reviews";
    case "pendingInvoices":
      return "/portal/finance";
    case "delayedDeadlines":
      return "/portal/calendar";
    case "missingDocsCases":
    case "totalCases":
    case "urgentOpen":
      return "/portal/cases";
    case "completed":
    case "onHold":
      return "/portal/cases";
    default:
      return null;
  }
}

/** i18n subtitle key suffix for the dashboard persona. */
export function dashboardPersonaKey(
  role: string | null | undefined,
): "ops" | "expert" | "legal" | "logistics" | "accountant" | "default" {
  switch (role as UserRole | string) {
    case "admin":
    case "case_coordinator":
      return "ops";
    case "expert":
      return "expert";
    case "legal":
      return "legal";
    case "logistics":
      return "logistics";
    case "accountant":
      return "accountant";
    default:
      return "default";
  }
}

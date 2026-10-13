/**
 * Role-aware dashboard cards and quick CTAs.
 * Keep inlined copies in api/index.ts only if the API starts returning persona payloads.
 */

import type { UserRole } from "./api";
import { canListAllStaffCases } from "./caseVisibilityRules";
import { canManageFinance } from "./rbac";
import { canAccessReviewsQueue } from "./reviewQueueRules";

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
  | "notifications"
  | "reviews"
  | "pipeline"
  | "fieldOps";

export type DashboardCtaDef = {
  id: DashboardCtaId;
  href: string;
  /** First-class shortcut for this persona (visual emphasis). */
  primary?: boolean;
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

/**
 * Quick-link CTAs for the dashboard persona.
 * Each role gets a short, mission-first set (not the full nav).
 */
export function dashboardCtasForRole(
  role: string | null | undefined,
): DashboardCtaDef[] {
  switch (role as UserRole | string) {
    case "admin":
      return [
        { id: "createCase", href: "/portal/cases?create=1", primary: true },
        { id: "pipeline", href: "/portal/cases?view=pipeline" },
        { id: "reviews", href: "/portal/reviews" },
        { id: "finance", href: "/portal/finance" },
        { id: "team", href: "/portal/team" },
        { id: "notifications", href: "/portal/notifications" },
      ];
    case "expert":
      return [
        { id: "cases", href: "/portal/cases", primary: true },
        { id: "calendar", href: "/portal/calendar" },
        { id: "documents", href: "/portal/documents" },
        { id: "notifications", href: "/portal/notifications" },
      ];
    case "legal":
      return [
        ...(canAccessReviewsQueue(role)
          ? [
              {
                id: "reviews" as const,
                href: "/portal/reviews",
                primary: true,
              },
            ]
          : [{ id: "cases" as const, href: "/portal/cases", primary: true }]),
        { id: "cases", href: "/portal/cases" },
        { id: "documents", href: "/portal/documents" },
        { id: "notifications", href: "/portal/notifications" },
      ];
    case "logistics":
      return [
        {
          id: "fieldOps",
          href: "/portal/cases?status=field_ops",
          primary: true,
        },
        { id: "calendar", href: "/portal/calendar" },
        { id: "cases", href: "/portal/cases" },
        { id: "notifications", href: "/portal/notifications" },
      ];
    case "accountant":
      return [
        ...(canManageFinance(role)
          ? [
              {
                id: "finance" as const,
                href: "/portal/finance",
                primary: true,
              },
            ]
          : [{ id: "cases" as const, href: "/portal/cases", primary: true }]),
        { id: "cases", href: "/portal/cases?status=accounting" },
        { id: "notifications", href: "/portal/notifications" },
      ];
    default:
      return [
        { id: "cases", href: "/portal/cases", primary: true },
        { id: "notifications", href: "/portal/notifications" },
      ];
  }
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

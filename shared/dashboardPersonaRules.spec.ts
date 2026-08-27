import { describe, expect, it } from "vitest";
import {
  canSeeOrgKpiStrip,
  dashboardCtasForRole,
  dashboardMetricCtaHref,
  dashboardMetricsForRole,
  dashboardPersonaKey,
} from "./dashboardPersonaRules";

describe("dashboardPersonaRules", () => {
  it("gives ops the full metric set including finance", () => {
    const keys = dashboardMetricsForRole("admin");
    expect(keys).toContain("pendingInvoices");
    expect(keys).toContain("missingDocsCases");
    expect(canSeeOrgKpiStrip("admin")).toBe(true);
    expect(canSeeOrgKpiStrip("case_coordinator")).toBe(true);
  });

  it("scopes expert metrics away from invoices", () => {
    const keys = dashboardMetricsForRole("expert");
    expect(keys).not.toContain("pendingInvoices");
    expect(keys).toContain("missingDocsCases");
    expect(canSeeOrgKpiStrip("expert")).toBe(false);
    expect(dashboardPersonaKey("expert")).toBe("expert");
  });

  it("surfaces finance CTA for accountant and create for coordinator", () => {
    const acct = dashboardCtasForRole("accountant").map((c) => c.id);
    expect(acct).toContain("finance");
    expect(acct).not.toContain("createCase");

    const coord = dashboardCtasForRole("case_coordinator").map((c) => c.id);
    expect(coord).toContain("createCase");
    expect(coord).not.toContain("finance");
    const createHref = dashboardCtasForRole("case_coordinator").find(
      (c) => c.id === "createCase",
    )?.href;
    expect(createHref).toBe("/portal/cases?create=1");
  });

  it("links pending reviews metric to the reviews queue", () => {
    expect(dashboardMetricCtaHref("pendingReviews")).toBe("/portal/reviews");
    expect(dashboardMetricCtaHref("pendingInvoices")).toBe("/portal/finance");
    expect(dashboardMetricCtaHref("totalCases")).toBe("/portal/cases");
  });
});

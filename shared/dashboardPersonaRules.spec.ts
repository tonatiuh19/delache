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
    expect(canSeeOrgKpiStrip("admin")).toBe(true);
  });

  it("scopes expert metrics away from invoices", () => {
    const keys = dashboardMetricsForRole("expert");
    expect(keys).not.toContain("pendingInvoices");
    expect(keys).toContain("missingDocsCases");
    expect(canSeeOrgKpiStrip("expert")).toBe(false);
    expect(dashboardPersonaKey("expert")).toBe("expert");
  });

  it("surfaces finance CTA for accountant and create for admin", () => {
    const acct = dashboardCtasForRole("accountant").map((c) => c.id);
    expect(acct).toContain("finance");
    expect(acct[0]).toBe("finance");
    expect(acct).not.toContain("createCase");
    expect(acct).not.toContain("team");

    const admin = dashboardCtasForRole("admin").map((c) => c.id);
    expect(admin).toContain("createCase");
    expect(admin).toContain("pipeline");
    expect(admin).toContain("finance");
    expect(admin).toContain("team");
    const createHref = dashboardCtasForRole("admin").find(
      (c) => c.id === "createCase",
    )?.href;
    expect(createHref).toBe("/portal/cases?create=1");
  });

  it("gives legal reviews-first and logistics field-ops-first shortcuts", () => {
    const legal = dashboardCtasForRole("legal");
    expect(legal[0]?.id).toBe("reviews");
    expect(legal[0]?.primary).toBe(true);
    expect(legal.map((c) => c.id)).not.toContain("finance");

    const logistics = dashboardCtasForRole("logistics");
    expect(logistics[0]?.id).toBe("fieldOps");
    expect(logistics[0]?.href).toBe("/portal/cases?status=field_ops");
    expect(logistics.map((c) => c.id)).not.toContain("finance");
  });

  it("links pending reviews metric to the reviews queue", () => {
    expect(dashboardMetricCtaHref("pendingReviews")).toBe("/portal/reviews");
    expect(dashboardMetricCtaHref("pendingInvoices")).toBe("/portal/finance");
    expect(dashboardMetricCtaHref("totalCases")).toBe("/portal/cases");
  });
});

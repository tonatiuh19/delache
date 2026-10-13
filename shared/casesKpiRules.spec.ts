import { describe, expect, it } from "vitest";
import {
  casesKpiCtaHref,
  casesKpiInPageAction,
  casesKpiIsSelected,
  parseCasesKpiParam,
} from "./casesKpiRules";

describe("casesKpiRules", () => {
  it("maps external CTAs to calendar and reviews", () => {
    expect(casesKpiCtaHref("dueSoon")).toBe("/portal/calendar");
    expect(casesKpiCtaHref("inReview")).toBe("/portal/reviews");
    expect(casesKpiCtaHref("active")).toBeNull();
  });

  it("maps in-page actions for active and completed", () => {
    expect(casesKpiInPageAction("active")).toEqual({
      statusFilter: "",
      view: "pipeline",
    });
    expect(casesKpiInPageAction("completed")).toEqual({
      statusFilter: "completed",
      view: "list",
    });
    expect(casesKpiInPageAction("inReview")).toBeNull();
  });

  it("parses kpi query param", () => {
    expect(parseCasesKpiParam("active")).toBe("active");
    expect(parseCasesKpiParam("bogus")).toBeNull();
  });

  it("detects selected tile from param and filters", () => {
    expect(
      casesKpiIsSelected("completed", {
        kpiParam: null,
        statusFilter: "completed",
        view: "list",
      }),
    ).toBe(true);
    expect(
      casesKpiIsSelected("inReview", {
        kpiParam: "inReview",
        statusFilter: "",
        view: "list",
      }),
    ).toBe(true);
  });
});

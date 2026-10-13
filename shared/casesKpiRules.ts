/**
 * Cases list KPI strip — metric keys and CTA destinations.
 */

export type CasesKpiKey = "active" | "dueSoon" | "inReview" | "completed";

/** External route when the CTA leaves the cases page. */
export function casesKpiCtaHref(key: CasesKpiKey): string | null {
  switch (key) {
    case "dueSoon":
      return "/portal/calendar";
    case "inReview":
      return "/portal/reviews";
    default:
      return null;
  }
}

/** In-page filter/view change when the CTA stays on `/portal/cases`. */
export type CasesKpiInPageAction = {
  statusFilter: string;
  view?: "list" | "pipeline";
};

export function casesKpiInPageAction(
  key: CasesKpiKey,
): CasesKpiInPageAction | null {
  switch (key) {
    case "active":
      return { statusFilter: "", view: "pipeline" };
    case "completed":
      return { statusFilter: "completed", view: "list" };
    default:
      return null;
  }
}

export function parseCasesKpiParam(
  raw: string | null | undefined,
): CasesKpiKey | null {
  if (
    raw === "active" ||
    raw === "dueSoon" ||
    raw === "inReview" ||
    raw === "completed"
  ) {
    return raw;
  }
  return null;
}

/** Highlight tile when URL/filter matches the KPI action. */
export function casesKpiIsSelected(
  key: CasesKpiKey,
  opts: {
    kpiParam: CasesKpiKey | null;
    statusFilter: string;
    view: "list" | "pipeline";
  },
): boolean {
  if (opts.kpiParam === key) return true;
  if (key === "completed" && opts.statusFilter === "completed") return true;
  return false;
}

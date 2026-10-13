import { describe, expect, it } from "vitest";
import {
  lawFirmCaseDetailTarget,
  oppositeAuthActor,
  resolvePortalSessionActor,
} from "./portalSessionRules";

describe("resolvePortalSessionActor", () => {
  it("prefers staff when both tokens exist", () => {
    expect(
      resolvePortalSessionActor({
        staffToken: "staff-tok",
        lawFirmToken: "firm-tok",
      }),
    ).toBe("staff");
  });

  it("returns law_firm when only firm token exists", () => {
    expect(
      resolvePortalSessionActor({
        staffToken: null,
        lawFirmToken: "firm-tok",
      }),
    ).toBe("law_firm");
  });

  it("returns null when neither token exists", () => {
    expect(
      resolvePortalSessionActor({ staffToken: "  ", lawFirmToken: "" }),
    ).toBeNull();
  });
});

describe("oppositeAuthActor", () => {
  it("flips staff ↔ law_firm", () => {
    expect(oppositeAuthActor("staff")).toBe("law_firm");
    expect(oppositeAuthActor("law_firm")).toBe("staff");
  });
});

describe("lawFirmCaseDetailTarget", () => {
  const uuid = "2378a175-5d79-4d18-a526-b69eb7180682";

  it("keeps staff on staff chrome", () => {
    expect(
      lawFirmCaseDetailTarget({
        actor: "staff",
        publicUuid: uuid,
        stepSlug: "intake",
      }),
    ).toEqual({ mode: "staff" });
  });

  it("renders despacho detail without redirect on overview", () => {
    expect(
      lawFirmCaseDetailTarget({
        actor: "law_firm",
        publicUuid: uuid,
      }),
    ).toEqual({ mode: "despacho", redirectTo: null });
  });

  it("redirects law firm away from staff step slugs", () => {
    expect(
      lawFirmCaseDetailTarget({
        actor: "law_firm",
        publicUuid: uuid,
        stepSlug: "field_ops",
      }),
    ).toEqual({
      mode: "despacho",
      redirectTo: `/portal/cases/${uuid}`,
    });
  });
});

import { describe, expect, it } from "vitest";
import {
  actorToClearOn401,
  bearerWasSent,
  sessionActorForApiUrl,
  shouldDropSessionAfterMe,
  shouldRedirectToLoginOn401,
} from "./sessionPersistRules";

describe("persisted login session", () => {
  it("detects a bearer on plain and axios-style headers", () => {
    expect(bearerWasSent(undefined)).toBe(false);
    expect(bearerWasSent({})).toBe(false);
    expect(bearerWasSent({ Authorization: "   " })).toBe(false);
    expect(bearerWasSent({ Authorization: "Bearer abc" })).toBe(true);
    expect(bearerWasSent({ authorization: "Bearer abc" })).toBe(true);
    expect(
      bearerWasSent({
        get: (name: string) =>
          name.toLowerCase() === "authorization" ? "Bearer abc" : undefined,
      }),
    ).toBe(true);
  });

  it("does not clear a saved login when the 401 sent no Authorization", () => {
    expect(
      actorToClearOn401({ sentAuthorization: false, requestActor: "staff" }),
    ).toBeNull();
    expect(
      actorToClearOn401({
        sentAuthorization: false,
        requestActor: "law_firm",
      }),
    ).toBeNull();
  });

  it("clears only the actor whose bearer was rejected", () => {
    expect(
      actorToClearOn401({ sentAuthorization: true, requestActor: "staff" }),
    ).toBe("staff");
    expect(
      actorToClearOn401({
        sentAuthorization: true,
        requestActor: "law_firm",
      }),
    ).toBe("law_firm");
    expect(
      actorToClearOn401({ sentAuthorization: true, requestActor: null }),
    ).toBeNull();
  });

  it("redirects either actor to login on portal 401", () => {
    expect(
      shouldRedirectToLoginOn401({
        sentAuthorization: true,
        requestActor: "law_firm",
        pagePath: "/portal/cases",
      }),
    ).toBe(true);
    expect(
      shouldRedirectToLoginOn401({
        sentAuthorization: true,
        requestActor: "staff",
        pagePath: "/portal/cases",
      }),
    ).toBe(true);
  });

  it("does not reload login when already on /login", () => {
    expect(
      shouldRedirectToLoginOn401({
        sentAuthorization: true,
        requestActor: "staff",
        pagePath: "/login",
      }),
    ).toBe(false);
  });

  it("resolves portal shared APIs as null (token picked by getSessionToken)", () => {
    expect(sessionActorForApiUrl("/api/client/cases", "/portal")).toBe(
      "law_firm",
    );
    expect(sessionActorForApiUrl("/api/cases?page=1", "/portal")).toBe(null);
    expect(sessionActorForApiUrl("/api/cases", "/client/cases")).toBe(
      "law_firm",
    );
    expect(
      sessionActorForApiUrl("/api/auth/client/me", "/login"),
    ).toBe("law_firm");
    expect(sessionActorForApiUrl("/api/auth/staff/me", "/login")).toBe(
      "staff",
    );
  });

  it("keeps the saved token when /me fails for a transient reason", () => {
    expect(shouldDropSessionAfterMe(401)).toBe(true);
    expect(shouldDropSessionAfterMe(403)).toBe(true);
    expect(shouldDropSessionAfterMe(500)).toBe(false);
    expect(shouldDropSessionAfterMe(503)).toBe(false);
    expect(shouldDropSessionAfterMe(undefined)).toBe(false);
  });
});

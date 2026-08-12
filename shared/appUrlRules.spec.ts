import { describe, expect, it } from "vitest";
import {
  isLocalhostAppUrl,
  isProductionRuntime,
  isUnsafePublicAppUrlForEmail,
  resolvePublicAppUrl,
} from "./appUrlRules";

describe("appUrlRules", () => {
  it("prefers APP_URL over Vite and Vercel fallbacks", () => {
    expect(
      resolvePublicAppUrl({
        APP_URL: "https://app.delache.mx/",
        VITE_PUBLIC_APP_URL: "http://localhost:8080",
        VERCEL_URL: "delache.vercel.app",
      }),
    ).toBe("https://app.delache.mx");
  });

  it("uses Vercel production domain when env URLs are missing", () => {
    expect(
      resolvePublicAppUrl({
        VERCEL_ENV: "production",
        VERCEL_PROJECT_PRODUCTION_URL: "app.delache.mx",
      }),
    ).toBe("https://app.delache.mx");
  });

  it("falls back to localhost only outside production", () => {
    expect(resolvePublicAppUrl({ NODE_ENV: "development" })).toBe(
      "http://localhost:8080",
    );
    expect(isLocalhostAppUrl("http://localhost:8080/portal/login")).toBe(true);
    expect(isLocalhostAppUrl("https://app.delache.mx")).toBe(false);
  });

  it("flags localhost email links on Vercel production and preview", () => {
    expect(isProductionRuntime({ VERCEL_ENV: "production" })).toBe(true);
    expect(
      isUnsafePublicAppUrlForEmail("http://localhost:8080", {
        VERCEL_ENV: "production",
      }),
    ).toBe(true);
    expect(
      isUnsafePublicAppUrlForEmail("http://localhost:8080", {
        VERCEL_ENV: "preview",
      }),
    ).toBe(true);
    expect(
      isUnsafePublicAppUrlForEmail("https://app.delache.mx", {
        VERCEL_ENV: "production",
      }),
    ).toBe(false);
    expect(
      isUnsafePublicAppUrlForEmail("http://localhost:8080", {
        NODE_ENV: "development",
      }),
    ).toBe(false);
  });
});

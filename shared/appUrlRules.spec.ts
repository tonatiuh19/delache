import { describe, expect, it } from "vitest";
import {
  isLocalhostAppUrl,
  isProductionRuntime,
  isUnsafePublicAppUrlForEmail,
  resolveEmailAssetBaseUrl,
  resolvePublicAppUrl,
} from "./appUrlRules";

describe("appUrlRules", () => {
  it("prefers APP_URL over Vite and Vercel fallbacks", () => {
    expect(
      resolvePublicAppUrl({
        APP_URL: "https://www.delache.mx/",
        VITE_PUBLIC_APP_URL: "http://localhost:8080",
        VERCEL_URL: "delache.vercel.app",
      }),
    ).toBe("https://www.delache.mx");
  });

  it("skips localhost Vite URL on Vercel production and uses Vercel domain", () => {
    expect(
      resolvePublicAppUrl({
        VITE_PUBLIC_APP_URL: "http://localhost:8080",
        VERCEL_ENV: "production",
        VERCEL_PROJECT_PRODUCTION_URL: "www.delache.mx",
      }),
    ).toBe("https://www.delache.mx");
  });

  it("skips localhost on preview and uses VERCEL_URL", () => {
    expect(
      resolvePublicAppUrl({
        VITE_PUBLIC_APP_URL: "http://localhost:8080",
        VERCEL_ENV: "preview",
        VERCEL_URL: "delache-git-main.vercel.app",
      }),
    ).toBe("https://delache-git-main.vercel.app");
  });

  it("uses Vercel production domain when env URLs are missing", () => {
    expect(
      resolvePublicAppUrl({
        VERCEL_ENV: "production",
        VERCEL_PROJECT_PRODUCTION_URL: "www.delache.mx",
      }),
    ).toBe("https://www.delache.mx");
  });

  it("falls back to localhost only outside production", () => {
    expect(resolvePublicAppUrl({ NODE_ENV: "development" })).toBe(
      "http://localhost:8080",
    );
    expect(isLocalhostAppUrl("http://localhost:8080/portal/login")).toBe(true);
    expect(isLocalhostAppUrl("https://www.delache.mx")).toBe(false);
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
      isUnsafePublicAppUrlForEmail("https://www.delache.mx", {
        VERCEL_ENV: "production",
      }),
    ).toBe(false);
    expect(
      isUnsafePublicAppUrlForEmail("http://localhost:8080", {
        NODE_ENV: "development",
      }),
    ).toBe(false);
  });

  it("uses production origin for email assets when appUrl is localhost", () => {
    expect(resolveEmailAssetBaseUrl("http://localhost:8080")).toBe(
      "https://www.delache.mx",
    );
    expect(
      resolveEmailAssetBaseUrl("http://localhost:8080", {
        publicAssetOrigin: "https://cdn.example.com/",
      }),
    ).toBe("https://cdn.example.com");
    expect(resolveEmailAssetBaseUrl("https://app.delache.mx")).toBe(
      "https://app.delache.mx",
    );
  });
});

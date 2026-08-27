/**
 * Public app origin used in emails, OTP links, and absolute URLs.
 * Production must never fall back to localhost (invite emails would break).
 */

export type AppUrlEnv = {
  APP_URL?: string | null;
  PUBLIC_APP_URL?: string | null;
  VITE_PUBLIC_APP_URL?: string | null;
  VERCEL_PROJECT_PRODUCTION_URL?: string | null;
  VERCEL_URL?: string | null;
  VERCEL_ENV?: string | null;
  NODE_ENV?: string | null;
};

export function normalizeAppOrigin(raw: string): string {
  return raw.trim().replace(/\/$/, "");
}

export function isLocalhostAppUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return /localhost|127\.0\.0\.1/i.test(url);
  }
}

function withHttps(hostOrUrl: string): string {
  const trimmed = hostOrUrl.trim().replace(/\/$/, "");
  if (/^https?:\/\//i.test(trimmed)) return normalizeAppOrigin(trimmed);
  return normalizeAppOrigin(`https://${trimmed}`);
}

export function isProductionRuntime(env: AppUrlEnv): boolean {
  return (
    env.VERCEL_ENV === "production" ||
    (env.NODE_ENV === "production" &&
      env.VERCEL_ENV !== "preview" &&
      env.VERCEL_ENV !== "development")
  );
}

function shouldSkipLocalhostCandidate(env: AppUrlEnv): boolean {
  // On Vercel (prod or preview), never trust a localhost APP_URL / Vite URL —
  // those are almost always leftover local .env values.
  if (env.VERCEL_ENV === "production" || env.VERCEL_ENV === "preview") {
    return true;
  }
  return isProductionRuntime(env);
}

/**
 * Resolve the public origin for email CTAs and absolute links.
 * Preference: APP_URL → PUBLIC_APP_URL → VITE_PUBLIC_APP_URL →
 * Vercel production domain → Vercel deployment URL → localhost (dev only).
 * Localhost candidates are skipped on Vercel production/preview.
 */
export function resolvePublicAppUrl(
  env: AppUrlEnv,
  opts: { fallbackLocalhost?: string } = {},
): string {
  const skipLocal = shouldSkipLocalhostCandidate(env);
  const explicit = [env.APP_URL, env.PUBLIC_APP_URL, env.VITE_PUBLIC_APP_URL];
  for (const candidate of explicit) {
    if (typeof candidate === "string" && candidate.trim()) {
      const origin = withHttps(candidate);
      if (skipLocal && isLocalhostAppUrl(origin)) continue;
      return origin;
    }
  }

  if (
    typeof env.VERCEL_PROJECT_PRODUCTION_URL === "string" &&
    env.VERCEL_PROJECT_PRODUCTION_URL.trim()
  ) {
    return withHttps(env.VERCEL_PROJECT_PRODUCTION_URL);
  }

  if (typeof env.VERCEL_URL === "string" && env.VERCEL_URL.trim()) {
    return withHttps(env.VERCEL_URL);
  }

  const local = opts.fallbackLocalhost ?? "http://localhost:8080";
  return normalizeAppOrigin(local);
}

/** True when email CTAs would point at the recipient's own machine. */
export function isUnsafePublicAppUrlForEmail(
  url: string,
  env: AppUrlEnv,
): boolean {
  if (!isLocalhostAppUrl(url)) return false;
  return isProductionRuntime(env) || env.VERCEL_ENV === "preview";
}

/**
 * Public origin for static assets embedded in emails (logo, etc.).
 * Email clients cannot load localhost images — when `appUrl` is local,
 * fall back to the production site (or an explicit override).
 */
export const DEFAULT_EMAIL_ASSET_ORIGIN = "https://www.delache.mx";

export function resolveEmailAssetBaseUrl(
  appUrl: string,
  opts: { publicAssetOrigin?: string | null } = {},
): string {
  const origin = normalizeAppOrigin(appUrl);
  if (!isLocalhostAppUrl(origin)) return origin;

  const override =
    typeof opts.publicAssetOrigin === "string"
      ? opts.publicAssetOrigin.trim()
      : "";
  if (override) {
    const resolved = withHttps(override);
    if (!isLocalhostAppUrl(resolved)) return resolved;
  }

  return DEFAULT_EMAIL_ASSET_ORIGIN;
}

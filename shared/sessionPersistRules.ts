import type { AuthActor } from "./authActors";

/**
 * Persisted login (localStorage bearer) must survive stray 401s.
 * Optimum-credit only clears a session when that request actually sent
 * Authorization — a missing header (race, wrong actor, public 401) must not
 * wipe the other portal's token.
 */
export function bearerWasSent(headers: unknown): boolean {
  if (!headers || typeof headers !== "object") return false;
  const bag = headers as {
    Authorization?: unknown;
    authorization?: unknown;
    get?: (name: string) => unknown;
  };
  if (headerValuePresent(bag.Authorization ?? bag.authorization)) return true;
  if (typeof bag.get === "function") {
    const viaGet = bag.get("Authorization") ?? bag.get("authorization");
    if (headerValuePresent(viaGet)) return true;
  }
  return false;
}

function headerValuePresent(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/** Which stored token a URL is allowed to use. Mirrors the axios request interceptor. */
export function sessionActorForApiUrl(
  url: string,
  pagePath: string,
): AuthActor | null {
  const path = String(url || "").split("?")[0];
  if (path.includes("/api/auth/client")) {
    return "law_firm";
  }
  if (path.includes("/api/auth/staff")) {
    return "staff";
  }
  // Legacy /api/client/* (removed) — keep mapping so old clients clear the right token.
  if (path.includes("/api/client/")) {
    return "law_firm";
  }
  if (path.startsWith("/api/")) {
    // Portal hosts staff and law_firm; caller resolves token via getSessionToken().
    if (pagePath.startsWith("/portal") || pagePath.startsWith("/login")) {
      return null;
    }
    if (pagePath.startsWith("/client")) return "law_firm";
    return "staff";
  }
  return null;
}

export function actorToClearOn401(opts: {
  sentAuthorization: boolean;
  requestActor: AuthActor | null;
}): AuthActor | null {
  if (!opts.sentAuthorization || !opts.requestActor) return null;
  return opts.requestActor;
}

export function shouldRedirectToLoginOn401(opts: {
  sentAuthorization: boolean;
  requestActor: AuthActor | null;
  pagePath: string;
}): boolean {
  if (!opts.sentAuthorization || !opts.requestActor) return false;
  if (opts.pagePath.startsWith("/login")) return false;
  // Portal is shared; any authenticated actor's 401 should bounce to login.
  if (opts.pagePath.startsWith("/portal")) return true;
  const pageActor: AuthActor = opts.pagePath.startsWith("/client")
    ? "law_firm"
    : "staff";
  return opts.requestActor === pageActor;
}

/**
 * `/auth/.../me` failures: 401/403 mean the saved login cannot be used.
 * Timeouts, 5xx, and network errors (no status) must keep the token.
 */
export function shouldDropSessionAfterMe(
  status: number | undefined,
): boolean {
  return status === 401 || status === 403;
}

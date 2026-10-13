import axios from "axios";
import type { AuthActor } from "@shared/authActors";
import {
  CLIENT_TOKEN_KEY,
  homePathForActor,
  loginPathForActor,
  STAFF_TOKEN_KEY,
  tokenKeyForActor,
} from "@shared/authActors";
import {
  getLocaleStorageKey,
  LOCALE_HTML_LANG,
  normalizeLocale,
} from "@shared/i18n";
import {
  oppositeAuthActor,
  resolvePortalSessionActor,
} from "@shared/portalSessionRules";
import {
  actorToClearOn401,
  bearerWasSent,
  sessionActorForApiUrl,
  shouldRedirectToLoginOn401,
} from "@shared/sessionPersistRules";

export function getSessionToken(actor?: AuthActor): string | null {
  if (actor) return localStorage.getItem(tokenKeyForActor(actor));
  if (typeof window !== "undefined") {
    const path = window.location.pathname;
    if (path.startsWith("/portal") || path.startsWith("/login")) {
      const resolved = resolvePortalSessionActor({
        staffToken: localStorage.getItem(STAFF_TOKEN_KEY),
        lawFirmToken: localStorage.getItem(CLIENT_TOKEN_KEY),
      });
      return resolved ? localStorage.getItem(tokenKeyForActor(resolved)) : null;
    }
    if (path.startsWith("/client")) {
      return localStorage.getItem(CLIENT_TOKEN_KEY);
    }
  }
  const resolved = resolvePortalSessionActor({
    staffToken:
      typeof localStorage !== "undefined"
        ? localStorage.getItem(STAFF_TOKEN_KEY)
        : null,
    lawFirmToken:
      typeof localStorage !== "undefined"
        ? localStorage.getItem(CLIENT_TOKEN_KEY)
        : null,
  });
  return resolved ? localStorage.getItem(tokenKeyForActor(resolved)) : null;
}

export function setSessionToken(
  token: string | null,
  actor: AuthActor = "staff",
) {
  const key = tokenKeyForActor(actor);
  if (token) {
    localStorage.setItem(key, token);
    // Single active actor — drop the opposite portal token.
    localStorage.removeItem(tokenKeyForActor(oppositeAuthActor(actor)));
  } else {
    localStorage.removeItem(key);
  }
}

export function clearAllSessionTokens() {
  localStorage.removeItem(STAFF_TOKEN_KEY);
  localStorage.removeItem(CLIENT_TOKEN_KEY);
}

export function authHeaders(token?: string | null) {
  const t = token ?? getSessionToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

const api = axios.create({
  baseURL: "/",
  headers: { "Content-Type": "application/json" },
  timeout: 25_000,
});

function pagePath(): string {
  return typeof window !== "undefined" ? window.location.pathname : "";
}

api.interceptors.request.use((config) => {
  const url = String(config.url || "");
  const actor = sessionActorForApiUrl(url, pagePath()) ?? undefined;
  const token = getSessionToken(actor);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const locale = normalizeLocale(
    typeof localStorage !== "undefined"
      ? localStorage.getItem(getLocaleStorageKey()) || undefined
      : undefined,
  );
  config.headers["Accept-Language"] = LOCALE_HTML_LANG[locale];
  return config;
});

// On 401: clear the stale token and redirect to login.
// Only logout when that request actually sent a Bearer token — bare 401s
// (race / missing header / the other portal) must not wipe a valid session.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401 && typeof window !== "undefined") {
      const url: string = err?.config?.url || "";
      if (
        url.includes("/api/auth/") &&
        !url.includes("/me") &&
        !url.includes("/logout")
      ) {
        return Promise.reject(err);
      }
      const path = pagePath();
      const sentAuthorization = bearerWasSent(err?.config?.headers);
      let requestActor = sessionActorForApiUrl(url, path);
      // Portal shared APIs resolve actor=null; infer from which token exists.
      if (requestActor == null && sentAuthorization && path.startsWith("/portal")) {
        requestActor = resolvePortalSessionActor({
          staffToken: localStorage.getItem(STAFF_TOKEN_KEY),
          lawFirmToken: localStorage.getItem(CLIENT_TOKEN_KEY),
        });
      }
      const actor = actorToClearOn401({ sentAuthorization, requestActor });
      if (actor) setSessionToken(null, actor);
      if (
        shouldRedirectToLoginOn401({
          sentAuthorization,
          requestActor,
          pagePath: path,
        })
      ) {
        window.location.href = loginPathForActor(requestActor ?? "staff");
      }
    }
    return Promise.reject(err);
  },
);

export { homePathForActor, loginPathForActor };
export default api;

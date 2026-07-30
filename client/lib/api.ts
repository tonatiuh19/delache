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

export function getSessionToken(actor?: AuthActor): string | null {
  if (actor) return localStorage.getItem(tokenKeyForActor(actor));
  // Prefer path-based token when on a portal
  if (typeof window !== "undefined") {
    if (window.location.pathname.startsWith("/client")) {
      return localStorage.getItem(CLIENT_TOKEN_KEY);
    }
    if (
      window.location.pathname.startsWith("/portal") ||
      window.location.pathname.startsWith("/login")
    ) {
      return localStorage.getItem(STAFF_TOKEN_KEY);
    }
  }
  return (
    localStorage.getItem(STAFF_TOKEN_KEY) ||
    localStorage.getItem(CLIENT_TOKEN_KEY)
  );
}

export function setSessionToken(
  token: string | null,
  actor: AuthActor = "staff",
) {
  const key = tokenKeyForActor(actor);
  if (token) localStorage.setItem(key, token);
  else localStorage.removeItem(key);
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

api.interceptors.request.use((config) => {
  const url = String(config.url || "");
  let actor: AuthActor | undefined;
  if (url.includes("/api/auth/client") || url.includes("/api/client/")) {
    actor = "law_firm";
  } else if (
    url.includes("/api/auth/staff") ||
    url.startsWith("/api/") // staff portal APIs
  ) {
    // client APIs already matched above; remaining /api/* use staff token when present
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/client")) {
      actor = "law_firm";
    } else {
      actor = "staff";
    }
  }
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

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      const url: string = err?.config?.url || "";
      if (
        url.includes("/api/auth/") &&
        !url.includes("/me") &&
        !url.includes("/logout")
      ) {
        return Promise.reject(err);
      }
      if (typeof window !== "undefined") {
        const onClient = window.location.pathname.startsWith("/client");
        const actor: AuthActor = onClient ? "law_firm" : "staff";
        setSessionToken(null, actor);
        if (
          window.location.pathname.startsWith("/portal") ||
          window.location.pathname.startsWith("/client")
        ) {
          window.location.href = loginPathForActor(actor);
        }
      }
    }
    return Promise.reject(err);
  },
);

export { homePathForActor, loginPathForActor };
export default api;

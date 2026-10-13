/** Auth actors — separate identity tables (athlete-hub style). */
export type AuthActor = "staff" | "law_firm";

export const STAFF_TOKEN_KEY = "delache_staff_token";
export const CLIENT_TOKEN_KEY = "delache_client_token";

export function tokenKeyForActor(actor: AuthActor): string {
  return actor === "law_firm" ? CLIENT_TOKEN_KEY : STAFF_TOKEN_KEY;
}

/** Both actors share `/login` (legacy /portal/login + /client/login redirect here). */
export function loginPathForActor(_actor?: AuthActor): string {
  return "/login";
}

/** Both actors land in the portal app; nav/APIs gate by actor. */
export function homePathForActor(_actor?: AuthActor): string {
  return "/portal";
}

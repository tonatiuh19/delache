/** Auth actors — separate identity tables (athlete-hub style). */
export type AuthActor = "staff" | "law_firm";

export const STAFF_TOKEN_KEY = "delache_staff_token";
export const CLIENT_TOKEN_KEY = "delache_client_token";

export function tokenKeyForActor(actor: AuthActor): string {
  return actor === "law_firm" ? CLIENT_TOKEN_KEY : STAFF_TOKEN_KEY;
}

export function loginPathForActor(actor: AuthActor): string {
  return actor === "law_firm" ? "/client/login" : "/portal/login";
}

export function homePathForActor(actor: AuthActor): string {
  return actor === "law_firm" ? "/client" : "/portal";
}

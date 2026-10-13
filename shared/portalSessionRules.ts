import type { AuthActor } from "./authActors";

/**
 * Portal hosts staff + law_firm. Prefer an explicit actor when known;
 * otherwise staff wins if both tokens somehow exist (verify clears both first).
 */
export function resolvePortalSessionActor(opts: {
  staffToken: string | null | undefined;
  lawFirmToken: string | null | undefined;
}): AuthActor | null {
  const staff = Boolean(opts.staffToken && String(opts.staffToken).trim());
  const lawFirm = Boolean(
    opts.lawFirmToken && String(opts.lawFirmToken).trim(),
  );
  if (staff) return "staff";
  if (lawFirm) return "law_firm";
  return null;
}

/** Login must be single-actor — never keep the opposite portal token. */
export function oppositeAuthActor(actor: AuthActor): AuthActor {
  return actor === "staff" ? "law_firm" : "staff";
}

/**
 * Law-firm case chrome stays on despacho detail — never staff step tree.
 * When `stepSlug` is present, redirect to the case overview.
 */
export function lawFirmCaseDetailTarget(opts: {
  actor: AuthActor | null | undefined;
  publicUuid: string;
  stepSlug?: string | null;
}): { mode: "despacho"; redirectTo: string | null } | { mode: "staff" } {
  if (opts.actor !== "law_firm") return { mode: "staff" };
  const uuid = String(opts.publicUuid || "").trim();
  if (opts.stepSlug) {
    return {
      mode: "despacho",
      redirectTo: uuid ? `/portal/cases/${uuid}` : "/portal/cases",
    };
  }
  return { mode: "despacho", redirectTo: null };
}

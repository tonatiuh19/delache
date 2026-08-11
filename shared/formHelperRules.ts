/**
 * User preference: show inline form field helpers (ON by default).
 */

export function isShowFormHelpersEnabled(
  value: boolean | number | string | null | undefined,
): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "" || v === "0" || v === "false" || v === "off" || v === "no") {
      return false;
    }
    return true;
  }
  return true;
}

export type UpdatePreferencesResult =
  | { ok: true; showFormHelpers: boolean }
  | { ok: false; error: string };

/**
 * Validate PATCH body for self-serve preferences.
 * Currently only `showFormHelpers` (required boolean).
 */
export function parseUpdatePreferences(body: unknown): UpdatePreferencesResult {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Invalid body" };
  }
  if (!("showFormHelpers" in body)) {
    return { ok: false, error: "showFormHelpers is required" };
  }
  const raw = (body as { showFormHelpers: unknown }).showFormHelpers;
  if (typeof raw !== "boolean") {
    return { ok: false, error: "showFormHelpers must be a boolean" };
  }
  return { ok: true, showFormHelpers: raw };
}

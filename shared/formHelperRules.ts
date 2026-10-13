/**
 * User preference flags for optional coaching UI.
 * Defaults OFF — platform stays clean; users opt in from Profile.
 */

export function isPreferenceFlagEnabled(
  value: boolean | number | string | null | undefined,
): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "" || v === "0" || v === "false" || v === "off" || v === "no") {
      return false;
    }
    if (v === "1" || v === "true" || v === "on" || v === "yes") return true;
    return false;
  }
  return false;
}

/** @deprecated Prefer isPreferenceFlagEnabled — form-field tip helpers default OFF. */
export function isShowFormHelpersEnabled(
  value: boolean | number | string | null | undefined,
): boolean {
  return isPreferenceFlagEnabled(value);
}

export function isShowProcessGuidanceEnabled(
  value: boolean | number | string | null | undefined,
): boolean {
  return isPreferenceFlagEnabled(value);
}

export type UpdatePreferencesResult =
  | {
      ok: true;
      showFormHelpers?: boolean;
      showProcessGuidance?: boolean;
    }
  | { ok: false; error: string };

/**
 * Validate PATCH body for self-serve preferences.
 * At least one of `showFormHelpers` / `showProcessGuidance` must be a boolean.
 * Omitted fields are left unchanged by the API handler.
 */
export function parseUpdatePreferences(body: unknown): UpdatePreferencesResult {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Invalid body" };
  }
  const record = body as Record<string, unknown>;
  const hasHelpers = Object.prototype.hasOwnProperty.call(
    record,
    "showFormHelpers",
  );
  const hasGuidance = Object.prototype.hasOwnProperty.call(
    record,
    "showProcessGuidance",
  );
  if (!hasHelpers && !hasGuidance) {
    return {
      ok: false,
      error: "showProcessGuidance or showFormHelpers is required",
    };
  }

  const out: {
    ok: true;
    showFormHelpers?: boolean;
    showProcessGuidance?: boolean;
  } = { ok: true };

  if (hasHelpers) {
    if (typeof record.showFormHelpers !== "boolean") {
      return { ok: false, error: "showFormHelpers must be a boolean" };
    }
    out.showFormHelpers = record.showFormHelpers;
  }
  if (hasGuidance) {
    if (typeof record.showProcessGuidance !== "boolean") {
      return { ok: false, error: "showProcessGuidance must be a boolean" };
    }
    out.showProcessGuidance = record.showProcessGuidance;
  }
  return out;
}

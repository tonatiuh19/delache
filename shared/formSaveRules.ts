/**
 * Shared rules for reliable form persistence: never wipe inputs on failure,
 * and never treat a rejected thunk as success.
 */

export type ThunkSettleResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Redux Toolkit async thunk results use `meta.requestStatus`.
 * Prefer `thunk.fulfilled.match(result)` at call sites when the action type
 * is in scope; this helper is for shared / tested logic.
 */
export function settleAsyncThunkResult(
  result: unknown,
  fallbackError = "save_failed",
): ThunkSettleResult {
  if (result == null || typeof result !== "object") {
    return { ok: false, error: fallbackError };
  }
  const meta = (result as { meta?: { requestStatus?: unknown } }).meta;
  const status = meta?.requestStatus;
  if (status === "fulfilled") return { ok: true };
  if (status === "rejected") {
    const payload = (result as { payload?: unknown }).payload;
    if (typeof payload === "string" && payload.trim()) {
      return { ok: false, error: payload.trim() };
    }
    if (
      payload &&
      typeof payload === "object" &&
      "message" in payload &&
      typeof (payload as { message: unknown }).message === "string" &&
      String((payload as { message: string }).message).trim()
    ) {
      return {
        ok: false,
        error: String((payload as { message: string }).message).trim(),
      };
    }
    return { ok: false, error: fallbackError };
  }
  return { ok: false, error: fallbackError };
}

/**
 * Location saves should persist address fields even when GPS text is invalid.
 * GPS is applied only when both sides parse; otherwise keep previous GPS.
 */
export type LocationGpsApply =
  | { action: "set"; lat: number; lng: number }
  | { action: "clear" }
  | { action: "keep"; warning: "invalid" | "need_both" | null };

export function resolveLocationGpsForSave(opts: {
  latRaw: unknown;
  lngRaw: unknown;
  resolveOptionalLatLng: (
    latRaw: unknown,
    lngRaw: unknown,
  ) =>
    | { ok: true; value: { lat: number; lng: number } | null }
    | { ok: false; error: string };
}): LocationGpsApply {
  const latEmpty =
    opts.latRaw == null || String(opts.latRaw).trim() === "";
  const lngEmpty =
    opts.lngRaw == null || String(opts.lngRaw).trim() === "";
  if (latEmpty && lngEmpty) return { action: "clear" };
  if (latEmpty !== lngEmpty) {
    return { action: "keep", warning: "need_both" };
  }
  const resolved = opts.resolveOptionalLatLng(opts.latRaw, opts.lngRaw);
  if (resolved.ok === false) {
    return { action: "keep", warning: "invalid" };
  }
  if (resolved.value == null) return { action: "clear" };
  return {
    action: "set",
    lat: resolved.value.lat,
    lng: resolved.value.lng,
  };
}

/** While editing a reinitialize-enabled form, skip server rehydrate if dirty. */
export function shouldReinitializeForm(opts: {
  enableReinitialize: boolean;
  dirty: boolean;
}): boolean {
  if (!opts.enableReinitialize) return false;
  return !opts.dirty;
}

/**
 * When to prompt / auto-capture browser geolocation for case GPS.
 */

export type BrowserLocationPermission =
  | "granted"
  | "denied"
  | "prompt"
  | "unknown";

export type LocationCaptureStrategy =
  | "idle"
  | "auto_capture"
  | "show_modal"
  | "blocked";

export function locationCaptureStrategy(opts: {
  permission: BrowserLocationPermission;
  hasCoords: boolean;
  canEdit: boolean;
  dismissedPrompt: boolean;
}): LocationCaptureStrategy {
  if (!opts.canEdit) return "idle";
  if (opts.hasCoords) return "idle";
  if (opts.permission === "denied") return "blocked";
  if (opts.permission === "granted") return "auto_capture";
  if (opts.dismissedPrompt) return "idle";
  return "show_modal";
}

/** Clicking “Use my location” while already granted skips the explainer modal. */
export function shouldSkipModalAndCapture(
  permission: BrowserLocationPermission,
): boolean {
  return permission === "granted";
}

export const LOCATION_PROMPT_DISMISS_KEY = "delache.locationPrompt.dismissed";

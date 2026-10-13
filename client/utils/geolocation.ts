/**
 * Browser geolocation helper for evidence / property GPS capture.
 */

import type { BrowserLocationPermission } from "@shared/locationPermissionRules";

export type GeolocationResult =
  | {
      ok: true;
      lat: number;
      lng: number;
      accuracyMeters: number | null;
    }
  | {
      ok: false;
      code:
        | "unsupported"
        | "permission_denied"
        | "unavailable"
        | "timeout"
        | "unknown";
      error: string;
    };

export async function queryLocationPermission(): Promise<BrowserLocationPermission> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return "denied";
  }
  const perms = navigator.permissions;
  if (!perms?.query) return "unknown";
  try {
    const status = await perms.query({
      name: "geolocation" as PermissionName,
    });
    if (status.state === "granted") return "granted";
    if (status.state === "denied") return "denied";
    if (status.state === "prompt") return "prompt";
    return "unknown";
  } catch {
    return "unknown";
  }
}

export async function requestDevicePosition(opts?: {
  timeoutMs?: number;
  maximumAgeMs?: number;
  enableHighAccuracy?: boolean;
}): Promise<GeolocationResult> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return {
      ok: false,
      code: "unsupported",
      error: "Geolocation is not supported in this browser",
    };
  }

  const timeoutMs = opts?.timeoutMs ?? 15_000;
  const maximumAgeMs = opts?.maximumAgeMs ?? 0;
  const enableHighAccuracy = opts?.enableHighAccuracy ?? true;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          ok: true,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyMeters:
            typeof pos.coords.accuracy === "number"
              ? pos.coords.accuracy
              : null,
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          resolve({
            ok: false,
            code: "permission_denied",
            error: "Location permission denied",
          });
          return;
        }
        if (err.code === err.POSITION_UNAVAILABLE) {
          resolve({
            ok: false,
            code: "unavailable",
            error: "Location unavailable",
          });
          return;
        }
        if (err.code === err.TIMEOUT) {
          resolve({
            ok: false,
            code: "timeout",
            error: "Location request timed out",
          });
          return;
        }
        resolve({
          ok: false,
          code: "unknown",
          error: err.message || "Location request failed",
        });
      },
      {
        enableHighAccuracy,
        timeout: timeoutMs,
        maximumAge: maximumAgeMs,
      },
    );
  });
}

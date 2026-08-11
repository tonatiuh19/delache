/**
 * Browser geolocation helper for evidence / property GPS capture.
 */

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

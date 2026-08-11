/**
 * GPS / maps helpers (property location, evidence pins, Street View links).
 */

export type LatLng = { lat: number; lng: number };

export type ParseCoordsResult =
  | { ok: true; lat: number; lng: number }
  | { ok: false; error: string; code: "invalid" | "out_of_range" | "empty" };

export function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export function isValidLatitude(lat: number): boolean {
  return isFiniteNumber(lat) && lat >= -90 && lat <= 90;
}

export function isValidLongitude(lng: number): boolean {
  return isFiniteNumber(lng) && lng >= -180 && lng <= 180;
}

export function isValidLatLng(lat: number, lng: number): boolean {
  return isValidLatitude(lat) && isValidLongitude(lng);
}

/** Parse numeric or string lat/lng independently. */
export function parseCoordinatePair(
  latRaw: unknown,
  lngRaw: unknown,
): ParseCoordsResult {
  if (
    (latRaw == null || latRaw === "") &&
    (lngRaw == null || lngRaw === "")
  ) {
    return { ok: false, error: "Coordinates are required", code: "empty" };
  }
  const lat =
    typeof latRaw === "number" ? latRaw : Number(String(latRaw ?? "").trim());
  const lng =
    typeof lngRaw === "number" ? lngRaw : Number(String(lngRaw ?? "").trim());
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return {
      ok: false,
      error: "lat and lng must be valid numbers",
      code: "invalid",
    };
  }
  if (!isValidLatLng(lat, lng)) {
    return {
      ok: false,
      error: "lat must be [-90,90] and lng must be [-180,180]",
      code: "out_of_range",
    };
  }
  return { ok: true, lat, lng };
}

/**
 * Parse free-text GPS like "19.4326, -99.1332" or "19.4326 -99.1332".
 */
export function parseGpsText(raw: unknown): ParseCoordsResult {
  const text = String(raw ?? "").trim();
  if (!text) {
    return { ok: false, error: "GPS text is empty", code: "empty" };
  }
  const cleaned = text.replace(/°/g, " ").replace(/\s+/g, " ").trim();
  const parts = cleaned.split(/[,;\s]+/).filter(Boolean);
  if (parts.length < 2) {
    return {
      ok: false,
      error: "Expected lat,lng pair",
      code: "invalid",
    };
  }
  return parseCoordinatePair(parts[0], parts[1]);
}

/** Optional coords: empty clears; otherwise must validate. */
export function resolveOptionalLatLng(
  latRaw: unknown,
  lngRaw: unknown,
):
  | { ok: true; value: LatLng | null }
  | { ok: false; error: string } {
  const latEmpty =
    latRaw == null || String(latRaw).trim() === "";
  const lngEmpty =
    lngRaw == null || String(lngRaw).trim() === "";
  if (latEmpty && lngEmpty) return { ok: true, value: null };
  if (latEmpty !== lngEmpty) {
    return { ok: false, error: "Provide both lat and lng, or neither" };
  }
  const parsed = parseCoordinatePair(latRaw, lngRaw);
  if (parsed.ok === false) return { ok: false, error: parsed.error };
  return { ok: true, value: { lat: parsed.lat, lng: parsed.lng } };
}

/** Read P3 questionnaire GPS text onto case coordinates. */
export function gpsFromQuestionnaireContent(
  contentJson: Record<string, unknown> | null | undefined,
): { lat: number; lng: number } | null {
  if (!contentJson) return null;
  const parsed = parseGpsText(contentJson.propertyGps);
  if (parsed.ok === false) return null;
  return { lat: parsed.lat, lng: parsed.lng };
}

export type QuestionnaireGpsWrite =
  | { action: "set"; lat: number; lng: number }
  | { action: "clear" }
  | { action: "keep" };

/** Empty propertyGps clears case coords; missing key leaves them alone. */
export function questionnaireGpsWrite(
  contentJson: Record<string, unknown> | null | undefined,
): QuestionnaireGpsWrite {
  if (!contentJson || !("propertyGps" in contentJson)) return { action: "keep" };
  const raw = contentJson.propertyGps;
  if (raw == null || String(raw).trim() === "") return { action: "clear" };
  const parsed = parseGpsText(raw);
  if (parsed.ok === false) return { action: "keep" };
  return { action: "set", lat: parsed.lat, lng: parsed.lng };
}

export function questionnaireStreetViewWrite(
  contentJson: Record<string, unknown> | null | undefined,
): "set" | "clear" | "keep" {
  if (!contentJson) return "keep";
  const hasKey =
    "streetViewValidated" in contentJson || "streetView" in contentJson;
  if (!hasKey) return "keep";
  const rec = contentJson;
  const raw = rec.streetViewValidated ?? rec.streetView;
  if (typeof raw === "string" && raw.trim().length > 0) return "set";
  return "clear";
}

export function googleMapsSearchUrl(opts: {
  lat?: number | null;
  lng?: number | null;
  query?: string | null;
}): string | null {
  if (opts.lat != null && opts.lng != null && isValidLatLng(opts.lat, opts.lng)) {
    return `https://www.google.com/maps/search/?api=1&query=${opts.lat},${opts.lng}`;
  }
  if (opts.query?.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(opts.query.trim())}`;
  }
  return null;
}

export function googleMapsDirectionsUrl(opts: {
  lat?: number | null;
  lng?: number | null;
  query?: string | null;
}): string | null {
  if (opts.lat != null && opts.lng != null && isValidLatLng(opts.lat, opts.lng)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${opts.lat},${opts.lng}`;
  }
  if (opts.query?.trim()) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(opts.query.trim())}`;
  }
  return null;
}

/** Street View deep link (no API key). */
export function googleStreetViewUrl(opts: {
  lat: number;
  lng: number;
}): string | null {
  if (!isValidLatLng(opts.lat, opts.lng)) return null;
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${opts.lat},${opts.lng}`;
}

export function osmEmbedUrl(opts: {
  lat?: number | null;
  lng?: number | null;
}): string | null {
  if (
    opts.lat == null ||
    opts.lng == null ||
    !isValidLatLng(opts.lat, opts.lng)
  ) {
    return null;
  }
  const delta = 0.02;
  const left = opts.lng - delta;
  const right = opts.lng + delta;
  const top = opts.lat + delta;
  const bottom = opts.lat - delta;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${opts.lat}%2C${opts.lng}`;
}

export const GEOCODE_QUERY_MIN_LEN = 3;
export const GEOCODE_QUERY_MAX_LEN = 500;

export function normalizeGeocodeQuery(
  raw: unknown,
):
  | { ok: true; query: string }
  | { ok: false; error: string } {
  const query = String(raw ?? "").trim();
  if (query.length < GEOCODE_QUERY_MIN_LEN) {
    return {
      ok: false,
      error: `query must be at least ${GEOCODE_QUERY_MIN_LEN} characters`,
    };
  }
  if (query.length > GEOCODE_QUERY_MAX_LEN) {
    return {
      ok: false,
      error: `query must be at most ${GEOCODE_QUERY_MAX_LEN} characters`,
    };
  }
  return { ok: true, query };
}

/** Build address query from case property fields. */
export function buildPropertyQuery(parts: {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
}): string | null {
  const q = [
    parts.address,
    parts.city,
    parts.state,
    parts.postalCode,
    parts.country,
  ]
    .map((p) => String(p || "").trim())
    .filter(Boolean)
    .join(", ");
  return q || null;
}

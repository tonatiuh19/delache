/**
 * GPS / maps helpers (property location, evidence pins, Street View links).
 */

export type LatLng = { lat: number; lng: number };

export type ParseCoordsResult =
  | { ok: true; lat: number; lng: number }
  | { ok: false; error: string; code: "invalid" | "out_of_range" | "empty" };

export type ParseSingleCoordResult =
  | { ok: true; value: number }
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

function hemisphereFromToken(token: string | undefined): string | null {
  if (!token) return null;
  const h = token.trim().toUpperCase();
  if (h === "N" || h === "S" || h === "E" || h === "W") return h;
  // Spanish “Oeste”
  if (h === "O") return "W";
  return null;
}

/**
 * Parse one coordinate: decimal (`19.4326`, `-99.13`) or DMS
 * (`16°26'47.1"N`, `92°43'40.7"W`).
 */
export function parseCoordinateValue(
  raw: unknown,
  axis: "lat" | "lng",
): ParseSingleCoordResult {
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) {
      return { ok: false, error: "Coordinate must be a valid number", code: "invalid" };
    }
    if (axis === "lat" && !isValidLatitude(raw)) {
      return {
        ok: false,
        error: "lat must be [-90,90]",
        code: "out_of_range",
      };
    }
    if (axis === "lng" && !isValidLongitude(raw)) {
      return {
        ok: false,
        error: "lng must be [-180,180]",
        code: "out_of_range",
      };
    }
    return { ok: true, value: raw };
  }

  const text = String(raw ?? "")
    .trim()
    .replace(/[′’]/g, "'")
    .replace(/[″“”]/g, '"');
  if (!text) {
    return { ok: false, error: "Coordinate is empty", code: "empty" };
  }

  let hemi: string | null = null;
  let body = text;
  const hemiMatch = body.match(/([NnSsEeWwOo])\s*$/);
  if (hemiMatch) {
    hemi = hemisphereFromToken(hemiMatch[1]);
    body = body.slice(0, hemiMatch.index).trim();
  }

  if (hemi) {
    if (axis === "lat" && (hemi === "E" || hemi === "W")) {
      return {
        ok: false,
        error: "Latitude hemisphere must be N or S",
        code: "invalid",
      };
    }
    if (axis === "lng" && (hemi === "N" || hemi === "S")) {
      return {
        ok: false,
        error: "Longitude hemisphere must be E or W",
        code: "invalid",
      };
    }
  }

  const nums = body.match(/[+-]?\d+(?:\.\d+)?/g);
  if (!nums || nums.length === 0) {
    return {
      ok: false,
      error: "Coordinate must be a valid number",
      code: "invalid",
    };
  }

  const hasDmsMarks = /[°'"″]/.test(body) || nums.length > 1 || hemi != null;
  let decimal: number;
  if (!hasDmsMarks) {
    decimal = Number(nums[0]);
  } else {
    const deg = Number(nums[0]);
    const minutes = nums[1] != null ? Number(nums[1]) : 0;
    const seconds = nums[2] != null ? Number(nums[2]) : 0;
    if (
      !Number.isFinite(deg) ||
      !Number.isFinite(minutes) ||
      !Number.isFinite(seconds) ||
      minutes < 0 ||
      minutes >= 60 ||
      seconds < 0 ||
      seconds >= 60
    ) {
      return {
        ok: false,
        error: "Invalid degrees/minutes/seconds",
        code: "invalid",
      };
    }
    decimal = Math.abs(deg) + minutes / 60 + seconds / 3600;
    if (deg < 0) decimal = -decimal;
  }

  if (!Number.isFinite(decimal)) {
    return {
      ok: false,
      error: "Coordinate must be a valid number",
      code: "invalid",
    };
  }

  if (hemi === "S" || hemi === "W") decimal = -Math.abs(decimal);
  if (hemi === "N" || hemi === "E") decimal = Math.abs(decimal);

  if (axis === "lat" && !isValidLatitude(decimal)) {
    return {
      ok: false,
      error: "lat must be [-90,90]",
      code: "out_of_range",
    };
  }
  if (axis === "lng" && !isValidLongitude(decimal)) {
    return {
      ok: false,
      error: "lng must be [-180,180]",
      code: "out_of_range",
    };
  }
  return { ok: true, value: decimal };
}

/** Parse numeric, decimal-string, or DMS lat/lng independently. */
export function parseCoordinatePair(
  latRaw: unknown,
  lngRaw: unknown,
): ParseCoordsResult {
  if (
    (latRaw == null || String(latRaw).trim() === "") &&
    (lngRaw == null || String(lngRaw).trim() === "")
  ) {
    return { ok: false, error: "Coordinates are required", code: "empty" };
  }
  const lat = parseCoordinateValue(latRaw, "lat");
  if (lat.ok === false) {
    return { ok: false, error: lat.error, code: lat.code };
  }
  const lng = parseCoordinateValue(lngRaw, "lng");
  if (lng.ok === false) {
    return { ok: false, error: lng.error, code: lng.code };
  }
  return { ok: true, lat: lat.value, lng: lng.value };
}

/**
 * Parse free-text GPS like "19.4326, -99.1332", DMS pairs
 * (`16°26'47.1"N, 92°43'40.7"W`), or whitespace-separated decimals.
 */
export function parseGpsText(raw: unknown): ParseCoordsResult {
  const text = String(raw ?? "").trim();
  if (!text) {
    return { ok: false, error: "GPS text is empty", code: "empty" };
  }

  if (/[,;]/.test(text)) {
    const parts = text
      .split(/[,;]/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      return parseCoordinatePair(parts[0], parts[1]);
    }
  }

  const latHemi = text.match(/([+-]?\d[\d\s°'"″.]*[NnSs])/);
  const lngHemi = text.match(/([+-]?\d[\d\s°'"″.]*[EeWwOo])/);
  if (latHemi && lngHemi) {
    return parseCoordinatePair(latHemi[1].trim(), lngHemi[1].trim());
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

/** Optional coords: empty clears; otherwise must validate (decimal or DMS). */
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

/**
 * In-app Google Maps preview iframe (Maps Embed API).
 * Requires `apiKey` (`VITE_GOOGLE_MAPS_API_KEY`). Without a key, returns null
 * so the UI can hide the preview while keeping Navigate / Street View / Open map links.
 */
export function googleMapsEmbedUrl(opts: {
  lat?: number | null;
  lng?: number | null;
  query?: string | null;
  apiKey?: string | null;
  zoom?: number;
}): string | null {
  const key = String(opts.apiKey || "").trim();
  if (!key) return null;

  const zoom =
    Number.isFinite(opts.zoom) && (opts.zoom as number) > 0
      ? Math.min(21, Math.max(1, Math.floor(opts.zoom as number)))
      : 16;

  if (opts.lat != null && opts.lng != null && isValidLatLng(opts.lat, opts.lng)) {
    return `https://www.google.com/maps/embed/v1/view?key=${encodeURIComponent(key)}&center=${opts.lat}%2C${opts.lng}&zoom=${zoom}&maptype=roadmap`;
  }
  const query = opts.query?.trim();
  if (query) {
    return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${encodeURIComponent(query)}`;
  }
  return null;
}

/** @deprecated Prefer googleMapsEmbedUrl — kept for legacy / fallback. */
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

export type PropertyLocationFields = {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  lat?: number | null;
  lng?: number | null;
};

/** True when there is enough to show map CTAs / address preview. */
export function hasPropertyMapPreview(loc: PropertyLocationFields): boolean {
  if (loc.lat != null && loc.lng != null && isValidLatLng(loc.lat, loc.lng)) {
    return true;
  }
  return Boolean(buildPropertyQuery(loc));
}

/** Open the editor when nothing is saved yet; otherwise start collapsed. */
export function shouldStartPropertyLocationEditing(
  loc: PropertyLocationFields,
): boolean {
  return !hasPropertyMapPreview(loc);
}

/** Normalize stored/display decimals after DMS conversion. */
export function formatDecimalCoordinate(value: number, digits = 6): string {
  if (!Number.isFinite(value)) return "";
  const fixed = Number(value.toFixed(digits));
  return String(fixed);
}

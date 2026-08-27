import { describe, expect, it } from "vitest";
import {
  buildPropertyQuery,
  formatDecimalCoordinate,
  googleMapsDirectionsUrl,
  googleMapsEmbedUrl,
  googleMapsSearchUrl,
  googleStreetViewUrl,
  hasPropertyMapPreview,
  normalizeGeocodeQuery,
  osmEmbedUrl,
  parseCoordinatePair,
  parseCoordinateValue,
  gpsFromQuestionnaireContent,
  questionnaireGpsWrite,
  questionnaireStreetViewWrite,
  parseGpsText,
  resolveOptionalLatLng,
  shouldStartPropertyLocationEditing,
} from "./locationRules";

describe("locationRules", () => {
  it("parses valid coordinate pairs and rejects ranges", () => {
    expect(parseCoordinatePair("19.43", "-99.13").ok).toBe(true);
    expect(parseCoordinatePair(91, 0).ok).toBe(false);
    expect(parseCoordinatePair(0, 181).ok).toBe(false);
    expect(parseCoordinatePair("", "").ok).toBe(false);
    const empty = parseCoordinatePair("", "");
    if (empty.ok === false) expect(empty.code).toBe("empty");
  });

  it("parses DMS single values with hemispheres", () => {
    const lat = parseCoordinateValue(`16°26'47.1"N`, "lat");
    expect(lat.ok).toBe(true);
    if (lat.ok) expect(lat.value).toBeCloseTo(16.4464167, 5);

    const lng = parseCoordinateValue(`92°43'40.7"W`, "lng");
    expect(lng.ok).toBe(true);
    if (lng.ok) expect(lng.value).toBeCloseTo(-92.7279722, 5);

    const south = parseCoordinateValue("33 52 0 S", "lat");
    expect(south.ok).toBe(true);
    if (south.ok) expect(south.value).toBeCloseTo(-33.8666667, 5);

    expect(parseCoordinateValue(`92°43'40.7"W`, "lat").ok).toBe(false);
    expect(parseCoordinateValue(`16°26'47.1"N`, "lng").ok).toBe(false);
    expect(parseCoordinateValue("16°70'0\"N", "lat").ok).toBe(false);
    expect(parseCoordinateValue("16°26'70\"N", "lat").ok).toBe(false);
    const oeste = parseCoordinateValue(`92°43'40.7"O`, "lng");
    expect(oeste.ok).toBe(true);
    if (oeste.ok) expect(oeste.value).toBeCloseTo(-92.7279722, 5);
  });

  it("parses Chiapas-style DMS pairs from free text", () => {
    const ok = parseGpsText(`16°26'47.1"N, 92°43'40.7"W`);
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.lat).toBeCloseTo(16.4464167, 5);
      expect(ok.lng).toBeCloseTo(-92.7279722, 5);
    }
    const spaced = parseGpsText(`16°26'47.1"N  92°43'40.7"W`);
    expect(spaced.ok).toBe(true);
    if (spaced.ok) {
      expect(spaced.lat).toBeCloseTo(16.4464167, 5);
      expect(spaced.lng).toBeCloseTo(-92.7279722, 5);
    }
  });

  it("resolves optional DMS lat/lng fields", () => {
    const pair = resolveOptionalLatLng(`16°26'47.1"N`, `92°43'40.7"W`);
    expect(pair.ok).toBe(true);
    if (pair.ok && pair.value) {
      expect(pair.value.lat).toBeCloseTo(16.4464167, 5);
      expect(pair.value.lng).toBeCloseTo(-92.7279722, 5);
    }
  });

  it("parses free-text GPS strings", () => {
    const ok = parseGpsText("19.4326, -99.1332");
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.lat).toBeCloseTo(19.4326);
      expect(ok.lng).toBeCloseTo(-99.1332);
    }
    expect(parseGpsText("only-one").ok).toBe(false);
    expect(
      gpsFromQuestionnaireContent({ propertyGps: "19.43, -99.13" }),
    ).toEqual({ lat: 19.43, lng: -99.13 });
    expect(
      gpsFromQuestionnaireContent({
        propertyGps: `16°26'47.1"N, 92°43'40.7"W`,
      })?.lat,
    ).toBeCloseTo(16.4464167, 5);
    expect(gpsFromQuestionnaireContent({ propertyGps: "  " })).toBeNull();
    expect(gpsFromQuestionnaireContent(null)).toBeNull();
    expect(questionnaireGpsWrite({ propertyGps: "19.43, -99.13" })).toEqual({
      action: "set",
      lat: 19.43,
      lng: -99.13,
    });
    expect(questionnaireGpsWrite({ propertyGps: "" })).toEqual({
      action: "clear",
    });
    expect(questionnaireGpsWrite({ streetView: "https://x" })).toEqual({
      action: "keep",
    });
    expect(
      questionnaireStreetViewWrite({ streetViewValidated: "https://sv" }),
    ).toBe("set");
    expect(questionnaireStreetViewWrite({ streetView: "" })).toBe("clear");
    expect(questionnaireStreetViewWrite({ propertyGps: "1,1" })).toBe("keep");
  });

  it("resolves optional lat/lng including clear-both", () => {
    const cleared = resolveOptionalLatLng("", "");
    expect(cleared.ok).toBe(true);
    if (cleared.ok) expect(cleared.value).toBeNull();
    expect(resolveOptionalLatLng("1", "").ok).toBe(false);
    const pair = resolveOptionalLatLng("19", "-99");
    expect(pair.ok).toBe(true);
    if (pair.ok && pair.value) {
      expect(pair.value.lat).toBe(19);
      expect(pair.value.lng).toBe(-99);
    }
  });

  it("builds Street View and property queries", () => {
    expect(googleStreetViewUrl({ lat: 19.4, lng: -99.1 })).toContain(
      "map_action=pano",
    );
    expect(googleStreetViewUrl({ lat: 100, lng: 0 })).toBeNull();
    expect(
      buildPropertyQuery({
        address: "Av Reforma 1",
        city: "CDMX",
        country: "MX",
      }),
    ).toBe("Av Reforma 1, CDMX, MX");
  });

  it("builds maps search / directions / Google embed URLs", () => {
    expect(
      googleMapsSearchUrl({ lat: 19.4, lng: -99.1 }),
    ).toContain("19.4,-99.1");
    expect(
      googleMapsSearchUrl({ query: "CDMX Centro" }),
    ).toContain(encodeURIComponent("CDMX Centro"));
    expect(googleMapsSearchUrl({})).toBeNull();
    expect(
      googleMapsDirectionsUrl({ lat: 19.4, lng: -99.1 }),
    ).toContain("destination=19.4,-99.1");
    expect(googleMapsEmbedUrl({ lat: 19.4, lng: -99.1 })).toBeNull();
    expect(
      googleMapsEmbedUrl({
        lat: 19.4,
        lng: -99.1,
        apiKey: "test-key",
      }),
    ).toContain("maps/embed/v1/view");
    expect(
      googleMapsEmbedUrl({
        query: "Chiapa de Corzo",
        apiKey: "test-key",
      }),
    ).toContain("maps/embed/v1/place");
    expect(googleMapsEmbedUrl({ query: "Chiapa de Corzo" })).toBeNull();
    expect(googleMapsEmbedUrl({})).toBeNull();
    expect(osmEmbedUrl({ lat: 19.4, lng: -99.1 })).toContain(
      "openstreetmap.org/export/embed",
    );
    expect(osmEmbedUrl({ lat: null, lng: null })).toBeNull();
  });

  it("parses degree-marked and whitespace GPS text", () => {
    const ok = parseGpsText("19.43°  -99.13°");
    expect(ok.ok).toBe(true);
    const blank = parseGpsText("   ");
    expect(blank.ok).toBe(false);
    if (blank.ok === false) expect(blank.code).toBe("empty");
  });

  it("normalizes geocode query length bounds", () => {
    expect(normalizeGeocodeQuery("ab").ok).toBe(false);
    expect(normalizeGeocodeQuery("CDMX Centro").ok).toBe(true);
    expect(normalizeGeocodeQuery("x".repeat(501)).ok).toBe(false);
  });

  it("decides property location view vs edit start", () => {
    expect(
      hasPropertyMapPreview({
        city: "Tuxtla",
        country: "MX",
      }),
    ).toBe(true);
    expect(
      hasPropertyMapPreview({
        lat: 16.44,
        lng: -92.72,
      }),
    ).toBe(true);
    expect(hasPropertyMapPreview({})).toBe(false);
    expect(
      shouldStartPropertyLocationEditing({
        address: "Calle 1",
        city: "Tuxtla",
      }),
    ).toBe(false);
    expect(shouldStartPropertyLocationEditing({})).toBe(true);
    expect(formatDecimalCoordinate(16.446416666)).toBe("16.446417");
    expect(formatDecimalCoordinate(Number.NaN)).toBe("");
  });
});

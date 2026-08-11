import { describe, expect, it } from "vitest";
import {
  buildPropertyQuery,
  googleMapsDirectionsUrl,
  googleMapsSearchUrl,
  googleStreetViewUrl,
  normalizeGeocodeQuery,
  osmEmbedUrl,
  parseCoordinatePair,
  gpsFromQuestionnaireContent,
  questionnaireGpsWrite,
  questionnaireStreetViewWrite,
  parseGpsText,
  resolveOptionalLatLng,
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

  it("builds maps search / directions / OSM embed URLs", () => {
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
});

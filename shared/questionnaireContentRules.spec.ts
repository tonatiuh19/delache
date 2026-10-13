import { describe, expect, it } from "vitest";
import {
  questionnaireDefendantBodyComplete,
  questionnaireStreetViewComplete,
  isStreetViewPreexistence,
  normalizeChronologyJson,
  validateQuestionnaireSubmitContent,
} from "./questionnaireContentRules";

describe("questionnaireContentRules", () => {
  it("requires URL and preexistence for street view complete", () => {
    expect(
      questionnaireStreetViewComplete({
        streetViewValidated: "https://maps.example/sv",
        streetViewPreexistence: "preexists",
      }),
    ).toBe(true);
    expect(
      questionnaireStreetViewComplete({
        streetViewValidated: "https://maps.example/sv",
      }),
    ).toBe(false);
    expect(questionnaireStreetViewComplete({})).toBe(false);
  });

  it("validates preexistence enum", () => {
    expect(isStreetViewPreexistence("inconclusive")).toBe(true);
    expect(isStreetViewPreexistence("maybe")).toBe(false);
  });

  it("legacy defendant body length helper still works", () => {
    expect(questionnaireDefendantBodyComplete({ defendantQuestionnaire: "x" })).toBe(
      false,
    );
    expect(
      questionnaireDefendantBodyComplete({
        defendantQuestionnaire: "a".repeat(20),
      }),
    ).toBe(true);
  });

  it("normalizes chronology entries", () => {
    expect(
      normalizeChronologyJson([
        { date: "2024-01-01", event: "Accident" },
        { date: "", event: "" },
      ]),
    ).toEqual([{ date: "2024-01-01", event: "Accident" }]);
  });

  it("validates submit with Street View + PDF (body text optional)", () => {
    const ok = {
      streetViewValidated: "https://sv",
      streetViewPreexistence: "preexists",
    };
    expect(
      validateQuestionnaireSubmitContent(ok, { hasQuestionnairePdf: true }).ok,
    ).toBe(true);
    expect(
      validateQuestionnaireSubmitContent(ok, { hasQuestionnairePdf: false }).ok,
    ).toBe(false);
    expect(validateQuestionnaireSubmitContent(ok).ok).toBe(true);
    expect(
      validateQuestionnaireSubmitContent({
        streetViewValidated: "https://sv",
      }).ok,
    ).toBe(false);
  });
});

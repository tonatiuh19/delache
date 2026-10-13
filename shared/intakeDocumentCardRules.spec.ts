import { describe, expect, it } from "vitest";
import {
  intakeCardStatus,
  intakeDocumentTone,
} from "./intakeDocumentCardRules";
import { clientStepNumber } from "./caseStepTreeRules";

describe("intake document cards", () => {
  it("maps the four intake files to the approved hues", () => {
    expect(intakeDocumentTone("lawsuit")).toBe("demand");
    expect(intakeDocumentTone("medical_record")).toBe("medical");
    expect(intakeDocumentTone("cfe_report")).toBe("cfe");
    expect(intakeDocumentTone("preliminary_photo")).toBe("photos");
    expect(intakeDocumentTone("other")).toBeNull();
  });

  it("derives review status from the file", () => {
    expect(intakeCardStatus({ hasFile: false })).toBe("pending");
    expect(intakeCardStatus({ hasFile: true, status: "approved" })).toBe(
      "complete",
    );
    expect(intakeCardStatus({ hasFile: true, status: "rejected" })).toBe(
      "rejected",
    );
    expect(intakeCardStatus({ hasFile: true, status: "uploaded" })).toBe(
      "review",
    );
  });
});

describe("client step numbers", () => {
  it("numbers the approved order and skips the hidden docs step", () => {
    expect(clientStepNumber(1)).toBe(1);
    expect(clientStepNumber(2)).toBe(2);
    expect(clientStepNumber(3)).toBe(3);
    expect(clientStepNumber(6)).toBe(5);
    expect(clientStepNumber(7)).toBe(6);
    expect(clientStepNumber(8)).toBe(7);
  });
});

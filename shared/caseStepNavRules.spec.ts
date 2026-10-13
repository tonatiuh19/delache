import { describe, expect, it } from "vitest";
import {
  assignmentRolesForProcessActor,
  buildStepOwnershipChips,
  formatStickyOrientation,
  formatStepNavLabel,
  formatSubstepNavLabel,
  numberedSubstepsForStep,
  substepOrdinalForSection,
} from "./caseStepNavRules";

describe("formatStepNavLabel / formatSubstepNavLabel", () => {
  it("formats step as N · Name", () => {
    expect(formatStepNavLabel(1, "Recepción")).toBe("1 · Recepción");
    expect(formatStepNavLabel(10, "Cobranza")).toBe("10 · Cobranza");
  });

  it("formats substep as N.M Name", () => {
    expect(formatSubstepNavLabel(1, 1, "Ubicación")).toBe("1.1 Ubicación");
    expect(formatSubstepNavLabel(7, 3, "Evidencia")).toBe("7.3 Evidencia");
  });

  it("sticky orientation joins step and focused substep", () => {
    expect(
      formatStickyOrientation({
        point: 1,
        stepName: "Recepción",
        substepIndex: 1,
        substepName: "Ubicación",
      }),
    ).toBe("1 · Recepción · 1.1 Ubicación");
    expect(
      formatStickyOrientation({
        point: 2,
        stepName: "Asignación",
      }),
    ).toBe("2 · Asignación");
  });
});

describe("substepOrdinalForSection", () => {
  it("returns 1-based index for intake documents then location", () => {
    expect(
      substepOrdinalForSection({
        stepSlug: "intake",
        sectionId: "documents",
        viewerRole: "admin",
      }),
    ).toBe(1);
    expect(
      substepOrdinalForSection({
        stepSlug: "intake",
        sectionId: "location",
        viewerRole: "admin",
      }),
    ).toBe(2);
  });

  it("returns null for unknown section", () => {
    expect(
      substepOrdinalForSection({
        stepSlug: "intake",
        sectionId: "finance",
        viewerRole: "admin",
      }),
    ).toBeNull();
  });
});

describe("numberedSubstepsForStep", () => {
  it("numbers visible intake substeps for admin", () => {
    const rows = numberedSubstepsForStep({
      stepSlug: "intake",
      viewerRole: "admin",
    });
    expect(rows[0]).toMatchObject({
      sectionId: "documents",
      point: 1,
      index: 1,
    });
    expect(rows.map((r) => r.index)).toEqual(
      rows.map((_, i) => i + 1),
    );
  });
});

describe("buildStepOwnershipChips", () => {
  it("maps process actors to assignment roles", () => {
    expect(assignmentRolesForProcessActor("expert")).toEqual(["expert"]);
    expect(assignmentRolesForProcessActor("legal_internal")).toEqual([
      "legal_reviewer",
    ]);
    expect(assignmentRolesForProcessActor("law_firm")).toEqual([]);
  });

  it("returns R/A chips with person names when assigned", () => {
    const chips = buildStepOwnershipChips({
      point: 6,
      assignments: [
        {
          assignmentRole: "expert",
          userName: "Josué Mendoza",
          isPrimary: true,
        },
      ],
    });
    expect(chips.length).toBeGreaterThan(0);
    expect(chips.some((c) => c.letter === "R" || c.letter === "A")).toBe(
      true,
    );
    const expertChip = chips.find((c) => c.actor === "expert");
    expect(expertChip?.personName).toBe("Josué Mendoza");
  });

  it("keeps role chip without person when unassigned", () => {
    const chips = buildStepOwnershipChips({
      point: 1,
      assignments: [],
    });
    expect(chips.length).toBeGreaterThan(0);
    expect(chips.every((c) => c.personName === null || c.personName)).toBe(
      true,
    );
    expect(chips.some((c) => c.actor === "law_firm")).toBe(true);
  });
});

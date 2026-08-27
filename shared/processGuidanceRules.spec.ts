import { describe, expect, it } from "vitest";
import {
  buildNextStepGuidance,
  canSeeProcessRaciDetail,
  processBlockedHowToKey,
  processGateQuickLink,
  processPointRaciBuckets,
  processQuickLinksForViewer,
  processViewerActionKey,
  shouldHighlightAssignment,
  whoCanAdvanceWorkflow,
} from "./processGuidanceRules";

describe("processGuidanceRules", () => {
  it("lists P1 RACI with law firm responsible and coordinator accountable", () => {
    const buckets = processPointRaciBuckets(1);
    expect(buckets.find((b) => b.letter === "A")?.actors).toEqual([
      "coordinator",
    ]);
    expect(buckets.find((b) => b.letter === "R")?.actors).toEqual(["law_firm"]);
  });

  it("builds next-step guidance for blocked intake docs", () => {
    const g = buildNextStepGuidance({
      point: 1,
      missingGateCodes: ["doc:medical_record", "doc:cfe_report"],
    });
    expect(g.accountable).toBe("coordinator");
    expect(g.responsible).toContain("law_firm");
    expect(g.advanceRoles).toEqual(["admin", "case_coordinator"]);
    expect(g.needsPrimaryExpert).toBe(false);
  });

  it("flags primary expert gate on P2", () => {
    const g = buildNextStepGuidance({
      point: 2,
      missingGateCodes: ["assignment:primary_expert"],
    });
    expect(g.needsPrimaryExpert).toBe(true);
    expect(shouldHighlightAssignment(2)).toBe(true);
    expect(shouldHighlightAssignment(1)).toBe(false);
  });

  it("limits workflow advance to admin/coordinator", () => {
    expect(whoCanAdvanceWorkflow("admin")).toBe(true);
    expect(whoCanAdvanceWorkflow("expert")).toBe(false);
  });

  it("role-gates RACI detail and blocked how-to copy", () => {
    expect(canSeeProcessRaciDetail("admin")).toBe(true);
    expect(canSeeProcessRaciDetail("expert")).toBe(false);
    expect(
      processBlockedHowToKey({
        role: "admin",
        missingGateCodes: ["doc:medical_record"],
      }),
    ).toBe("blockedHowToOps");
    expect(
      processBlockedHowToKey({
        role: "expert",
        missingGateCodes: ["doc:medical_record"],
      }),
    ).toBe("blockedHowToUploader");
    expect(
      processBlockedHowToKey({
        role: "logistics",
        missingGateCodes: ["doc:medical_record"],
      }),
    ).toBe("blockedHowToWait");
    expect(processViewerActionKey("expert")).toBe("uploader");
  });

  it("builds role-aware quick links for intake gaps", () => {
    const expertLinks = processQuickLinksForViewer({
      role: "expert",
      missingGateCodes: ["doc:medical_record", "doc:cfe_report"],
      gatesOk: false,
      point: 1,
    });
    expect(expertLinks.map((l) => l.id)).toContain("documents");
    expect(expertLinks.map((l) => l.id)).not.toContain("workflow");

    const adminLinks = processQuickLinksForViewer({
      role: "admin",
      missingGateCodes: ["doc:medical_record"],
      gatesOk: false,
      point: 1,
    });
    expect(adminLinks.map((l) => l.id)).toEqual(
      expect.arrayContaining(["documents", "workflow"]),
    );

    expect(processGateQuickLink("doc:cfe_report", "expert")?.href).toBe(
      "#case-documents-cat-cfe_report",
    );
    expect(processGateQuickLink("doc:medical_record", "admin")?.href).toBe(
      "#case-documents-cat-medical_record",
    );
    expect(processGateQuickLink("doc:cfe_report", "logistics")).toBeNull();
  });
});

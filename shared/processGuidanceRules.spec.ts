import { describe, expect, it } from "vitest";
import {
  buildNextStepGuidance,
  canSeeProcessRaciDetail,
  partitionMissingGatesForViewer,
  processBlockedHowToKey,
  processGateQuickLink,
  processPointRaciBuckets,
  processQuickLinksForViewer,
  processViewerActionKey,
  shouldHighlightAssignment,
  viewerCanActOnGate,
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
    expect(g.advanceRoles).toEqual(["admin"]);
    expect(g.needsPrimaryExpert).toBe(false);
  });

  it("flags primary expert gate on P2", () => {
    const g = buildNextStepGuidance({
      point: 2,
      missingGateCodes: ["assignment:primary_expert"],
    });
    expect(g.needsPrimaryExpert).toBe(true);
    expect(shouldHighlightAssignment(3)).toBe(true);
    expect(shouldHighlightAssignment(2)).toBe(false);
    expect(shouldHighlightAssignment(1)).toBe(false);
  });

  it("limits workflow advance to admin", () => {
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
    expect(processViewerActionKey("expert")).toBe("assignee");
  });

  it("partitions P2 admin gates away from expert actionable tasks", () => {
    expect(viewerCanActOnGate("handoff:documents_confirmed", "expert")).toBe(
      false,
    );
    expect(viewerCanActOnGate("handoff:documents_confirmed", "admin")).toBe(
      true,
    );
    expect(viewerCanActOnGate("assignment:primary_expert", "expert")).toBe(
      false,
    );
    expect(viewerCanActOnGate("assignment:primary_expert", "admin")).toBe(true);
    expect(viewerCanActOnGate("location:gps", "expert")).toBe(true);

    const partitioned = partitionMissingGatesForViewer(
      ["assignment:primary_expert", "handoff:documents_confirmed"],
      "expert",
    );
    expect(partitioned.actionable).toEqual([]);
    expect(partitioned.waiting).toEqual([
      "assignment:primary_expert",
      "handoff:documents_confirmed",
    ]);

    expect(
      processBlockedHowToKey({
        role: "expert",
        missingGateCodes: [
          "assignment:primary_expert",
          "handoff:documents_confirmed",
        ],
      }),
    ).toBe("blockedHowToWaitAssignment");

    expect(
      processBlockedHowToKey({
        role: "expert",
        missingGateCodes: ["handoff:documents_confirmed"],
      }),
    ).toBe("blockedHowToPrepParallel");
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

  it("builds quick links for P2 handoff and P9 ratification schedule gates", () => {
    const handoffLinks = processQuickLinksForViewer({
      role: "admin",
      missingGateCodes: ["handoff:documents_confirmed"],
      gatesOk: false,
      point: 3,
    });
    expect(handoffLinks.map((l) => l.id)).toContain("assignments");
    expect(
      processGateQuickLink("handoff:documents_confirmed", "admin")?.href,
    ).toBe("#case-assignments");
    expect(
      processGateQuickLink("handoff:documents_confirmed", "expert"),
    ).toBeNull();

    const expertPrep = processQuickLinksForViewer({
      role: "expert",
      missingGateCodes: ["handoff:documents_confirmed"],
      gatesOk: false,
      point: 3,
      publicUuid: "case-uuid",
    });
    expect(expertPrep.map((l) => l.id)).toEqual(
      expect.arrayContaining(["questionnaire", "location"]),
    );
    expect(expertPrep.map((l) => l.id)).not.toContain("assignments");

    const ratificationLinks = processQuickLinksForViewer({
      role: "admin",
      missingGateCodes: ["court:ratification_scheduled"],
      gatesOk: false,
      point: 9,
    });
    expect(ratificationLinks.map((l) => l.id)).toContain("documents");
    expect(
      processGateQuickLink("court:ratification_scheduled", "admin")?.href,
    ).toBe("#case-ratification-schedule");
    expect(
      processGateQuickLink("court:ratification_scheduled", "logistics"),
    ).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { CASE_STATUS_FLOW } from "./caseWorkflow";
import { EVIDENCE_CHECKLIST_CATEGORIES } from "./evidenceRules";
import {
  accountableActor,
  assertProcessAlignsWithCaseFlow,
  evaluateProcessGates,
  LISTADO_COLUMNS,
  pointsInsideParentClock,
  PROCESS_POINT_IDS,
  PROCESS_POINTS,
  processPointForStatus,
  processPointToEnforceOnTransition,
  anyQuestionnaireHasStreetView,
  canUpsertQuestionnaire,
  isActiveLogisticsTripStatus,
  resolveQuestionnaireUpsert,
  buildListadoProgress,
  buildProcessGateSnapshot,
  hasBlockingFinanceForCompletion,
  hasBlockingUnpaidInvoices,
  isPendingFinanceInvoice,
  mergeEvidenceCategories,
  parseUpdateCaseFlags,
  pickBestByStatusRank,
  pickCurrentProcessArtifact,
  QUESTIONNAIRE_STATUS_RANK,
  questionnaireHasStreetView,
  rejectReturnsTo,
  REPORT_STATUS_RANK,
  shouldClearOtherPrimaryAssignments,
} from "./processGates";

const intakeDocs = [
  "lawsuit",
  "medical_record",
  "cfe_report",
  "preliminary_photo",
];

describe("process alignment", () => {
  it("maps 12 points onto CASE_STATUS_FLOW before completed", () => {
    const { statuses } = assertProcessAlignsWithCaseFlow();
    expect(statuses).toHaveLength(12);
    expect(CASE_STATUS_FLOW.slice(0, 12)).toEqual(statuses);
  });

  it("has exactly one Accountable per point", () => {
    for (const id of PROCESS_POINT_IDS) {
      expect(accountableActor(id), `point ${id}`).toBeTruthy();
      const aCount = Object.values(PROCESS_POINTS[id].raci).filter(
        (l) => l === "A",
      ).length;
      expect(aCount).toBe(1);
    }
  });

  it("nests P7–P11 inside the 10-day protesta clock", () => {
    expect(pointsInsideParentClock(6)).toEqual([7, 8, 9, 10, 11]);
    expect(PROCESS_POINTS[10].sla?.nestedInside).toBe(6);
    expect(PROCESS_POINTS[10].sla?.businessDays).toBe(3);
    expect(PROCESS_POINTS[6].sla?.businessDays).toBe(10);
    expect(PROCESS_POINTS[6].sla?.startsOn).toBe("protesta_filed");
    expect(PROCESS_POINTS[3].sla?.businessDays).toBe(3);
    expect(PROCESS_POINTS[4].sla?.businessDays).toBe(2);
  });

  it("resolves status → point and terminal statuses to null", () => {
    expect(processPointForStatus("intake")).toBe(1);
    expect(processPointForStatus("accounting")).toBe(12);
    expect(processPointForStatus("completed")).toBeNull();
    expect(processPointForStatus("on_hold")).toBeNull();
    expect(processPointForStatus("cancelled")).toBeNull();
  });

  it("defines reject loops for QA / legal / report", () => {
    expect(rejectReturnsTo(3)).toBe(3);
    expect(rejectReturnsTo(4)).toBe(3);
    expect(rejectReturnsTo(9)).toBe(9);
    expect(rejectReturnsTo(10)).toBe(9);
    expect(rejectReturnsTo(1)).toBeNull();
  });

  it("keeps a single listado column set without duplicates", () => {
    expect(new Set(LISTADO_COLUMNS).size).toBe(LISTADO_COLUMNS.length);
    const progressKeys = Object.keys(
      buildListadoProgress({
        status: "intake",
        input: { documentCategories: [] },
      }),
    );
    for (const key of progressKeys) {
      if (key === "gatesOk" || key === "holdResumeStatus") continue;
      expect(LISTADO_COLUMNS).toContain(key);
    }
  });

  it("sets gatesOk from the current process point", () => {
    const blocked = buildListadoProgress({
      status: "intake",
      input: { documentCategories: ["lawsuit"] },
    });
    expect(blocked.gatesOk).toBe(false);
    expect(blocked.intakeComplete).toBe(false);

    const ready = buildListadoProgress({
      status: "intake",
      input: { documentCategories: intakeDocs },
    });
    expect(ready.gatesOk).toBe(true);
    expect(ready.intakeComplete).toBe(true);

    const assignmentBlocked = buildListadoProgress({
      status: "assignment",
      input: { documentCategories: intakeDocs, hasPrimaryExpert: false },
    });
    expect(assignmentBlocked.gatesOk).toBe(false);
    expect(assignmentBlocked.primaryExpert).toBe(false);

    const assignmentReady = buildListadoProgress({
      status: "assignment",
      input: { documentCategories: intakeDocs, hasPrimaryExpert: true },
    });
    expect(assignmentReady.gatesOk).toBe(true);

    const questionnaireBlocked = buildListadoProgress({
      status: "questionnaire",
      input: {
        documentCategories: [...intakeDocs, "questionnaire"],
        hasPrimaryExpert: true,
        hasPropertyGps: false,
        hasStreetView: false,
        questionnaireStatus: "draft",
      },
    });
    expect(questionnaireBlocked.gatesOk).toBe(false);

    const accountingBlocked = buildListadoProgress({
      status: "accounting",
      input: {
        documentCategories: intakeDocs,
        hasUnpaidInvoices: true,
      },
    });
    expect(accountingBlocked.gatesOk).toBe(false);

    const onHold = buildListadoProgress({
      status: "on_hold",
      input: { documentCategories: [] },
    });
    expect(onHold.processPoint).toBeNull();
    expect(onHold.gatesOk).toBe(true);
  });
});

describe("evaluateProcessGates", () => {
  it("blocks P1 when intake docs are missing", () => {
    const r = evaluateProcessGates(1, { documentCategories: ["lawsuit"] });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.missing).toContain("doc:medical_record");
      expect(r.missing).toContain("doc:cfe_report");
      expect(r.missing).toContain("doc:preliminary_photo");
    }
  });

  it("allows P1 when intake pack is complete", () => {
    expect(
      evaluateProcessGates(1, { documentCategories: intakeDocs }).ok,
    ).toBe(true);
  });

  it("blocks P2 without a primary expert", () => {
    const r = evaluateProcessGates(2, {
      documentCategories: intakeDocs,
      hasPrimaryExpert: false,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toContain("assignment:primary_expert");
  });

  it("blocks P3 until GPS, Street View, and a submitted questionnaire", () => {
    const base = { documentCategories: ["questionnaire"] };
    expect(evaluateProcessGates(3, base).ok).toBe(false);
    expect(
      evaluateProcessGates(3, {
        ...base,
        hasPropertyGps: true,
        hasStreetView: true,
        questionnaireStatus: "draft",
      }).ok,
    ).toBe(false);
    expect(
      evaluateProcessGates(3, {
        ...base,
        hasPropertyGps: true,
        hasStreetView: true,
        questionnaireStatus: "changes_requested",
      }).ok,
    ).toBe(false);
    expect(
      evaluateProcessGates(3, {
        ...base,
        hasPropertyGps: true,
        hasStreetView: true,
        questionnaireStatus: "submitted",
      }).ok,
    ).toBe(true);
    expect(
      evaluateProcessGates(3, {
        ...base,
        hasPropertyGps: true,
        hasStreetView: true,
        questionnaireStatus: "legal_review",
      }).ok,
    ).toBe(true);
    expect(
      evaluateProcessGates(3, {
        ...base,
        hasPropertyGps: true,
        hasStreetView: true,
        questionnaireStatus: "approved",
      }).ok,
    ).toBe(true);
  });

  it("returns P4 legal reject to questionnaire (P3)", () => {
    expect(rejectReturnsTo(4)).toBe(3);
    const r = evaluateProcessGates(4, {
      documentCategories: ["questionnaire"],
      questionnaireStatus: "changes_requested",
    });
    expect(r.ok).toBe(false);
  });

  it("treats death certificate as conditional on fatality", () => {
    const docs = ["defendant_response", "sketch"];
    expect(
      evaluateProcessGates(5, {
        documentCategories: docs,
        involvesFatality: false,
      }).ok,
    ).toBe(true);
    const fatal = evaluateProcessGates(5, {
      documentCategories: docs,
      involvesFatality: true,
    });
    expect(fatal.ok).toBe(false);
    if (!fatal.ok) expect(fatal.missing).toContain("doc:death_certificate");
  });

  it("does not require plaintiff questionnaire to leave P5 for protesta", () => {
    expect(
      evaluateProcessGates(5, {
        documentCategories: ["defendant_response", "sketch"],
        plaintiffQuestionnairePresent: false,
      }).ok,
    ).toBe(true);
  });

  it("treats an approved questionnaire as satisfying the P3 file artifact", () => {
    expect(
      evaluateProcessGates(3, {
        documentCategories: [],
        hasPropertyGps: true,
        hasStreetView: true,
        questionnaireStatus: "approved",
      }).ok,
    ).toBe(true);
  });

  it("enforces gates only on forward process advances", () => {
    expect(processPointToEnforceOnTransition("intake", "assignment")).toBe(1);
    expect(processPointToEnforceOnTransition("accounting", "completed")).toBe(
      12,
    );
    expect(processPointToEnforceOnTransition("intake", "on_hold")).toBeNull();
    expect(processPointToEnforceOnTransition("intake", "cancelled")).toBeNull();
    expect(
      processPointToEnforceOnTransition("on_hold", "questionnaire"),
    ).toBeNull();
    expect(
      processPointToEnforceOnTransition("intake", "questionnaire"),
    ).toBeNull();
  });

  it("reads Street View from questionnaire JSON aliases", () => {
    expect(questionnaireHasStreetView({ streetView: " https://maps " })).toBe(
      true,
    );
    expect(
      questionnaireHasStreetView({ streetViewValidated: "https://sv" }),
    ).toBe(true);
    expect(questionnaireHasStreetView({ streetView: "  " })).toBe(false);
    expect(questionnaireHasStreetView(null)).toBe(false);
  });

  it("does not block protesta (P6) when plaintiff questionnaire is missing", () => {
    const r = evaluateProcessGates(6, {
      documentCategories: ["protesta"],
      protestaFiled: true,
      plaintiffQuestionnairePresent: false,
    });
    expect(r.ok).toBe(true);
  });

  it("blocks inspection and report when plaintiff questionnaire is missing", () => {
    const p8 = evaluateProcessGates(8, {
      documentCategories: [],
      plaintiffQuestionnairePresent: false,
      evidenceCategories: [...EVIDENCE_CHECKLIST_CATEGORIES],
      inspectionComplete: true,
    });
    expect(p8.ok).toBe(false);
    if (!p8.ok) expect(p8.missing).toContain("doc:plaintiff_questionnaire");

    const p9 = evaluateProcessGates(9, {
      documentCategories: ["technical_report"],
      plaintiffQuestionnairePresent: false,
      reportStatus: "approved_internal",
    });
    expect(p9.ok).toBe(false);
  });

  it("blocks leaving inspection without the mandatory evidence checklist", () => {
    const r = evaluateProcessGates(8, {
      documentCategories: [],
      plaintiffQuestionnairePresent: true,
      evidenceCategories: ["facade"],
      inspectionComplete: true,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.missing.some((m) => m.startsWith("evidence:"))).toBe(true);
    }
  });

  it("requires firm approval to leave P10 and returns rejects to P9", () => {
    expect(rejectReturnsTo(10)).toBe(9);
    expect(
      evaluateProcessGates(10, {
        documentCategories: ["technical_report"],
        reportStatus: "external_review",
      }).ok,
    ).toBe(false);
    expect(
      evaluateProcessGates(10, {
        documentCategories: ["technical_report"],
        reportStatus: "approved",
      }).ok,
    ).toBe(true);
  });

  it("requires court filing + ratification to leave P11", () => {
    const r = evaluateProcessGates(11, {
      documentCategories: ["court_filing"],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toContain("doc:ratification");
    expect(
      evaluateProcessGates(11, {
        documentCategories: ["court_filing", "ratification"],
      }).ok,
    ).toBe(true);
  });

  it("blocks P7 unless a logistics trip is explicitly ready", () => {
    expect(evaluateProcessGates(7, { documentCategories: [] }).ok).toBe(false);
    expect(
      evaluateProcessGates(7, {
        documentCategories: [],
        logisticsReady: true,
      }).ok,
    ).toBe(true);
    const r = evaluateProcessGates(7, {
      documentCategories: [],
      logisticsReady: false,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toContain("logistics:ready");
  });

  it("blocks P12 when issued invoices are unpaid", () => {
    expect(evaluateProcessGates(12, { documentCategories: [] }).ok).toBe(true);
    const r = evaluateProcessGates(12, {
      documentCategories: [],
      hasUnpaidInvoices: true,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toContain("finance:unpaid_invoices");
  });

  it("blocks P8 when inspectionComplete is omitted", () => {
    const r = evaluateProcessGates(8, {
      documentCategories: [],
      plaintiffQuestionnairePresent: true,
      evidenceCategories: [...EVIDENCE_CHECKLIST_CATEGORIES],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toContain("inspection:complete");
  });

  it("lets measurements cover P8 checklist categories", () => {
    const covered = mergeEvidenceCategories(
      ["facade", "sidewalk", "construction", "pole_id", "electrical_structure", "conductor", "property_invasion", "oversized_construction", "safety"],
      ["horizontal_distance", "vertical_distance", "pole_distance"],
    );
    expect(
      evaluateProcessGates(8, {
        documentCategories: [],
        plaintiffQuestionnairePresent: true,
        evidenceCategories: covered,
        inspectionComplete: true,
      }).ok,
    ).toBe(true);
  });

  it("picks the strongest questionnaire / report status, not the newest draft", () => {
    expect(
      pickBestByStatusRank(
        [{ status: "draft" }, { status: "approved" }, { status: "submitted" }],
        QUESTIONNAIRE_STATUS_RANK,
      )?.status,
    ).toBe("approved");
    expect(
      pickBestByStatusRank(
        [{ status: "draft" }, { status: "approved_internal" }],
        REPORT_STATUS_RANK,
      )?.status,
    ).toBe("approved_internal");
  });

  it("counts matching measurement types as P8 evidence", () => {
    expect(
      mergeEvidenceCategories(["facade"], ["horizontal_distance", "other"]),
    ).toEqual(expect.arrayContaining(["facade", "horizontal_distance"]));
  });

  it("treats issued / partial / overdue invoices as blocking", () => {
    expect(hasBlockingUnpaidInvoices(["paid", "void"])).toBe(false);
    expect(hasBlockingUnpaidInvoices(["draft"])).toBe(false);
    expect(hasBlockingUnpaidInvoices(["issued"])).toBe(true);
    expect(hasBlockingUnpaidInvoices(["partially_paid", "paid"])).toBe(true);
  });

  it("parses the fatality flag update", () => {
    expect(parseUpdateCaseFlags({ involvesFatality: true })).toEqual({
      ok: true,
      value: { involvesFatality: true },
    });
    expect(parseUpdateCaseFlags({ involvesFatality: "yes" }).ok).toBe(false);
    expect(parseUpdateCaseFlags(null).ok).toBe(false);
    expect(parseUpdateCaseFlags({}).ok).toBe(false);
  });

  it("prefers a newer revision over an older approved artifact", () => {
    expect(
      pickCurrentProcessArtifact(
        [
          { status: "approved", createdAt: "2026-01-01T00:00:00.000Z" },
          { status: "draft", createdAt: "2026-02-01T00:00:00.000Z" },
        ],
        QUESTIONNAIRE_STATUS_RANK,
      )?.status,
    ).toBe("draft");
    expect(
      pickCurrentProcessArtifact(
        [
          { status: "draft", createdAt: "2026-01-01T00:00:00.000Z" },
          { status: "approved", createdAt: "2026-02-01T00:00:00.000Z" },
        ],
        QUESTIONNAIRE_STATUS_RANK,
      )?.status,
    ).toBe("approved");
    expect(
      pickCurrentProcessArtifact(
        [{ status: "rejected" }, { status: "submitted" }],
        QUESTIONNAIRE_STATUS_RANK,
      )?.status,
    ).toBe("submitted");
  });

  it("reads Street View across questionnaire payloads and upsert eligibility", () => {
    expect(
      anyQuestionnaireHasStreetView([
        { streetView: "  " },
        { streetViewValidated: "https://sv" },
      ]),
    ).toBe(true);
    expect(anyQuestionnaireHasStreetView([{ streetView: "" }])).toBe(false);
    expect(canUpsertQuestionnaire("submitted")).toBe(true);
    expect(canUpsertQuestionnaire("legal_review")).toBe(false);
    expect(canUpsertQuestionnaire("approved")).toBe(false);
    expect(
      resolveQuestionnaireUpsert({
        currentStatus: "legal_review",
        submit: true,
      }).ok,
    ).toBe(false);
    expect(
      resolveQuestionnaireUpsert({ currentStatus: "draft", submit: true }),
    ).toMatchObject({ ok: true, nextStatus: "submitted" });
    expect(
      resolveQuestionnaireUpsert({
        currentStatus: "submitted",
        submit: true,
      }),
    ).toMatchObject({ ok: true, nextStatus: "submitted" });
    expect(isActiveLogisticsTripStatus("planned")).toBe(true);
    expect(isActiveLogisticsTripStatus("cancelled")).toBe(false);
    expect(shouldClearOtherPrimaryAssignments("expert", true)).toBe(true);
    expect(shouldClearOtherPrimaryAssignments("qa", true)).toBe(false);
  });

  it("blocks P12 on draft advance/final as well as unpaid issued invoices", () => {
    expect(
      hasBlockingFinanceForCompletion([{ status: "paid", invoiceType: "advance" }]),
    ).toBe(false);
    expect(
      hasBlockingFinanceForCompletion([
        { status: "draft", invoiceType: "advance" },
      ]),
    ).toBe(true);
    expect(
      hasBlockingFinanceForCompletion([{ status: "draft", invoiceType: "expense" }]),
    ).toBe(false);
    expect(
      isPendingFinanceInvoice({ status: "draft", invoiceType: "advance" }),
    ).toBe(true);
    expect(isPendingFinanceInvoice({ status: "draft", invoiceType: "expense" })).toBe(
      false,
    );
  });

  it("builds a server gate snapshot and listado progress", () => {
    const snap = buildProcessGateSnapshot("intake", {
      documentCategories: ["lawsuit"],
    });
    expect(snap.point).toBe(1);
    expect(snap.ok).toBe(false);
    expect(snap.missing).toContain("doc:medical_record");

    const listado = buildListadoProgress({
      status: "court_acceptance",
      inspectionDeadlineAt: "2026-08-20T00:00:00.000Z",
      input: {
        documentCategories: [
          ...intakeDocs,
          "protesta",
          "ratification",
          "court_filing",
        ],
        hasPrimaryExpert: true,
        hasStreetView: true,
        questionnaireStatus: "approved",
        plaintiffQuestionnairePresent: true,
        protestaFiled: true,
        logisticsReady: true,
        inspectionComplete: false,
        reportStatus: "approved",
        ratificationPresent: true,
        courtFilingPresent: true,
      },
      invoices: [
        { status: "paid", invoiceType: "advance" },
        { status: "draft", invoiceType: "final" },
      ],
    });
    expect(listado.processPoint).toBe(6);
    expect(listado.intakeComplete).toBe(true);
    expect(listado.questionnaireApproved).toBe(true);
    expect(listado.advancePaid).toBe(true);
    expect(listado.finalPaid).toBe(false);
    expect(listado.finalReleased).toBe(true);
    expect(listado.attendedWithReport).toBe(true);
    expect(listado.clock10DueAt).toBe("2026-08-20T00:00:00.000Z");
  });

  it("passes holdResumeStatus through listado for on_hold cases", () => {
    const listado = buildListadoProgress({
      status: "on_hold",
      input: { documentCategories: [] },
      holdResumeStatus: "inspection",
    });
    expect(listado.holdResumeStatus).toBe("inspection");
    expect(listado.gatesOk).toBe(true);
  });
});

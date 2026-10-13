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
  it("maps 10 points onto CASE_STATUS_FLOW before completed", () => {
    const { statuses } = assertProcessAlignsWithCaseFlow();
    expect(statuses).toHaveLength(10);
    expect(CASE_STATUS_FLOW.slice(0, 10)).toEqual(statuses);
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

  it("nests P7–P9 inside the 10-day protesta clock", () => {
    expect(pointsInsideParentClock(6)).toEqual([7, 8, 9]);
    expect(PROCESS_POINTS[9].sla?.nestedInside).toBe(6);
    expect(PROCESS_POINTS[9].sla?.businessDays).toBe(3);
    expect(PROCESS_POINTS[6].sla?.businessDays).toBe(10);
    expect(PROCESS_POINTS[6].sla?.startsOn).toBe("protesta_filed");
    expect(PROCESS_POINTS[2].sla?.businessDays).toBe(3);
    expect(PROCESS_POINTS[4].sla?.businessDays).toBe(2);
  });

  it("resolves status → point and terminal statuses to null", () => {
    expect(processPointForStatus("intake")).toBe(1);
    expect(processPointForStatus("accounting")).toBe(10);
    expect(processPointForStatus("field_ops")).toBe(7);
    expect(processPointForStatus("validation_delivery")).toBe(9);
    expect(processPointForStatus("completed")).toBeNull();
    expect(processPointForStatus("on_hold")).toBeNull();
    expect(processPointForStatus("cancelled")).toBeNull();
  });

  it("defines reject loops for QA / legal / report", () => {
    expect(rejectReturnsTo(2)).toBe(2);
    expect(rejectReturnsTo(3)).toBeNull();
    expect(rejectReturnsTo(4)).toBe(2);
    expect(rejectReturnsTo(8)).toBe(8);
    expect(rejectReturnsTo(9)).toBe(8);
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
      input: {
        documentCategories: intakeDocs,
        approvedDocumentCategories: intakeDocs,
        expedienteApproved: true,
      },
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
      input: {
        documentCategories: intakeDocs,
        hasPrimaryExpert: true,
        documentsHandoffConfirmed: true,
      },
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

  it("blocks P1 when docs present but not approved / expediente missing", () => {
    const r = evaluateProcessGates(1, {
      documentCategories: intakeDocs,
      approvedDocumentCategories: [],
      expedienteApproved: false,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.missing).toContain("doc_approved:lawsuit");
      expect(r.missing).toContain("expediente:approved");
    }
  });

  it("allows P1 when intake pack is approved and expediente stamped", () => {
    expect(
      evaluateProcessGates(1, {
        documentCategories: intakeDocs,
        approvedDocumentCategories: intakeDocs,
        expedienteApproved: true,
      }).ok,
    ).toBe(true);
  });

  it("blocks P1 when expediente not approved even if docs approved", () => {
    const r = evaluateProcessGates(1, {
      documentCategories: intakeDocs,
      approvedDocumentCategories: intakeDocs,
      expedienteApproved: false,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toEqual(["expediente:approved"]);
  });

  it("blocks assignment without a primary expert", () => {
    const r = evaluateProcessGates(3, {
      documentCategories: intakeDocs,
      hasPrimaryExpert: false,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toContain("assignment:primary_expert");
  });

  it("blocks assignment without coordinator handoff confirmation", () => {
    const r = evaluateProcessGates(3, {
      documentCategories: intakeDocs,
      hasPrimaryExpert: true,
      documentsHandoffConfirmed: false,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toContain("handoff:documents_confirmed");
    expect(
      evaluateProcessGates(3, {
        documentCategories: intakeDocs,
        hasPrimaryExpert: true,
        documentsHandoffConfirmed: true,
      }).ok,
    ).toBe(true);
  });

  it("blocks questionnaire until GPS, Street View preexistence, and QA pass", () => {
    const base = { documentCategories: ["questionnaire"] };
    const streetViewContent = {
      streetViewValidated: "https://sv",
      streetViewPreexistence: "preexists",
    };
    expect(evaluateProcessGates(2, base).ok).toBe(false);
    expect(
      evaluateProcessGates(2, {
        ...base,
        hasPropertyGps: true,
        hasStreetView: true,
        questionnaireStatus: "draft",
      }).ok,
    ).toBe(false);
    expect(
      evaluateProcessGates(2, {
        ...base,
        hasPropertyGps: true,
        hasStreetView: true,
        questionnaireStatus: "grammar_qa",
      }).ok,
    ).toBe(false);
    expect(
      evaluateProcessGates(2, {
        ...base,
        hasPropertyGps: true,
        questionnaireContentJson: streetViewContent,
        questionnaireStatus: "legal_review",
      }).ok,
    ).toBe(true);
    expect(
      evaluateProcessGates(2, {
        ...base,
        hasPropertyGps: true,
        hasStreetView: true,
        questionnaireStatus: "approved",
      }).ok,
    ).toBe(true);
  });

  it("returns legal review reject to the questionnaire step", () => {
    expect(rejectReturnsTo(4)).toBe(2);
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

  it("requires the defendant questionnaire PDF file at questionnaire (point 2)", () => {
    expect(
      evaluateProcessGates(2, {
        documentCategories: [],
        hasPropertyGps: true,
        hasStreetView: true,
        questionnaireStatus: "approved",
      }).ok,
    ).toBe(false);
    expect(
      evaluateProcessGates(2, {
        documentCategories: [],
        hasPropertyGps: true,
        hasStreetView: true,
        questionnaireStatus: "approved",
      }).missing,
    ).toContain("doc:questionnaire");
    expect(
      evaluateProcessGates(2, {
        documentCategories: ["questionnaire"],
        hasPropertyGps: true,
        hasStreetView: true,
        questionnaireStatus: "approved",
      }).ok,
    ).toBe(true);
  });

  it("enforces gates only on forward process advances", () => {
    expect(processPointToEnforceOnTransition("intake", "questionnaire")).toBe(1);
    expect(processPointToEnforceOnTransition("intake", "assignment")).toBeNull();
    expect(processPointToEnforceOnTransition("accounting", "completed")).toBe(
      10,
    );
    expect(processPointToEnforceOnTransition("intake", "on_hold")).toBeNull();
    expect(processPointToEnforceOnTransition("intake", "cancelled")).toBeNull();
    expect(
      processPointToEnforceOnTransition("on_hold", "questionnaire"),
    ).toBeNull();
  });

  it("reads Street View from questionnaire JSON aliases with preexistence", () => {
    expect(
      questionnaireHasStreetView({
        streetView: " https://maps ",
        streetViewPreexistence: "preexists",
      }),
    ).toBe(true);
    expect(
      questionnaireHasStreetView({
        streetViewValidated: "https://sv",
        streetViewPreexistence: "not_preexists",
      }),
    ).toBe(true);
    expect(questionnaireHasStreetView({ streetView: "https://maps" })).toBe(
      false,
    );
    expect(questionnaireHasStreetView({ streetView: "  " })).toBe(false);
    expect(questionnaireHasStreetView(null)).toBe(false);
  });

  it("blocks protesta until the plaintiff questionnaire is on file", () => {
    const r = evaluateProcessGates(6, {
      documentCategories: ["protesta"],
      protestaFiled: true,
      plaintiffQuestionnairePresent: false,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toContain("doc:plaintiff_questionnaire");
    expect(
      evaluateProcessGates(6, {
        documentCategories: ["protesta", "plaintiff_questionnaire"],
        protestaFiled: true,
      }).ok,
    ).toBe(true);
  });

  it("blocks field_ops and report when plaintiff questionnaire is missing", () => {
    const p7 = evaluateProcessGates(7, {
      documentCategories: [],
      plaintiffQuestionnairePresent: false,
      evidenceCategories: [...EVIDENCE_CHECKLIST_CATEGORIES],
      inspectionComplete: true,
      logisticsReady: true,
    });
    expect(p7.ok).toBe(false);
    if (!p7.ok) expect(p7.missing).toContain("doc:plaintiff_questionnaire");

    const p8 = evaluateProcessGates(8, {
      documentCategories: ["technical_report"],
      plaintiffQuestionnairePresent: false,
      reportStatus: "approved_internal",
    });
    expect(p8.ok).toBe(false);
  });

  it("blocks leaving field_ops without the mandatory evidence checklist", () => {
    const r = evaluateProcessGates(7, {
      documentCategories: [],
      plaintiffQuestionnairePresent: true,
      evidenceCategories: ["facade"],
      inspectionComplete: true,
      logisticsReady: true,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.missing.some((m) => m.startsWith("evidence:"))).toBe(true);
    }
  });

  it("requires firm approval + delivery artifacts to leave P9; rejects return to P8", () => {
    expect(rejectReturnsTo(9)).toBe(8);
    expect(
      evaluateProcessGates(9, {
        documentCategories: ["technical_report"],
        reportStatus: "external_review",
      }).ok,
    ).toBe(false);
    expect(
      evaluateProcessGates(9, {
        documentCategories: [
          "technical_report",
          "court_filing",
          "ratification",
        ],
        reportStatus: "approved",
        courtFilingPresent: true,
        ratificationPresent: true,
      }).ok,
    ).toBe(true);
  });

  it("requires court filing + ratification PDF to leave P9 (schedule is not enough)", () => {
    const r = evaluateProcessGates(9, {
      documentCategories: ["technical_report", "court_filing"],
      reportStatus: "approved",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toContain("doc:ratification");
    expect(
      evaluateProcessGates(9, {
        documentCategories: [
          "technical_report",
          "court_filing",
          "ratification",
        ],
        reportStatus: "approved",
      }).ok,
    ).toBe(true);
    expect(
      evaluateProcessGates(9, {
        documentCategories: ["technical_report", "court_filing"],
        reportStatus: "approved",
        courtFilingPresent: true,
        ratificationScheduledAt: "2026-06-01T10:00:00.000Z",
      }).ok,
    ).toBe(false);
  });

  it("requires technical_report PDF even when report status is approved", () => {
    expect(
      evaluateProcessGates(8, {
        documentCategories: [],
        plaintiffQuestionnairePresent: true,
        reportStatus: "approved_internal",
      }).missing,
    ).toContain("doc:technical_report");
    expect(
      evaluateProcessGates(8, {
        documentCategories: ["technical_report"],
        plaintiffQuestionnairePresent: true,
        reportStatus: "approved_internal",
      }).ok,
    ).toBe(true);
  });

  it("blocks P7 unless logistics is ready and inspection is complete", () => {
    expect(evaluateProcessGates(7, { documentCategories: [] }).ok).toBe(false);
    expect(
      evaluateProcessGates(7, {
        documentCategories: [],
        logisticsReady: true,
        plaintiffQuestionnairePresent: true,
        evidenceCategories: [...EVIDENCE_CHECKLIST_CATEGORIES],
        inspectionComplete: true,
        dictamenDueAt: "2026-02-01T00:00:00.000Z",
      }).ok,
    ).toBe(true);
    const r = evaluateProcessGates(7, {
      documentCategories: [],
      logisticsReady: false,
      plaintiffQuestionnairePresent: true,
      evidenceCategories: [...EVIDENCE_CHECKLIST_CATEGORIES],
      inspectionComplete: true,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toContain("logistics:ready");
  });

  it("blocks P10 when issued invoices are unpaid", () => {
    expect(evaluateProcessGates(10, { documentCategories: [] }).ok).toBe(true);
    const r = evaluateProcessGates(10, {
      documentCategories: [],
      hasUnpaidInvoices: true,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toContain("finance:unpaid_invoices");
  });

  it("blocks P7 when inspectionComplete is omitted", () => {
    const r = evaluateProcessGates(7, {
      documentCategories: [],
      plaintiffQuestionnairePresent: true,
      evidenceCategories: [...EVIDENCE_CHECKLIST_CATEGORIES],
      logisticsReady: true,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toContain("inspection:complete");
  });

  it("lets measurements cover P7 checklist categories", () => {
    const covered = mergeEvidenceCategories(
      ["facade", "sidewalk", "construction", "pole_id", "electrical_structure", "conductor", "property_invasion", "oversized_construction", "safety"],
      ["horizontal_distance", "vertical_distance", "pole_distance"],
    );
    expect(
      evaluateProcessGates(7, {
        documentCategories: [],
        plaintiffQuestionnairePresent: true,
        evidenceCategories: covered,
        inspectionComplete: true,
        logisticsReady: true,
        dictamenDueAt: "2026-02-01T00:00:00.000Z",
      }).ok,
    ).toBe(true);
  });

  it("picks the strongest questionnaire / report status, not the newest draft", () => {
    expect(
      pickBestByStatusRank(
        [{ status: "draft" }, { status: "approved" }, { status: "grammar_qa" }],
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

  it("parses case flag updates including protesta modality", () => {
    expect(parseUpdateCaseFlags({ involvesFatality: true })).toEqual({
      ok: true,
      value: { involvesFatality: true },
    });
    expect(parseUpdateCaseFlags({ protestaModality: "virtual" })).toEqual({
      ok: true,
      value: { protestaModality: "virtual" },
    });
    expect(
      parseUpdateCaseFlags({
        involvesFatality: false,
        protestaModality: "presencial",
      }),
    ).toEqual({
      ok: true,
      value: { involvesFatality: false, protestaModality: "presencial" },
    });
    expect(parseUpdateCaseFlags({ involvesFatality: "yes" }).ok).toBe(false);
    expect(parseUpdateCaseFlags({ protestaModality: "fax" }).ok).toBe(false);
    expect(parseUpdateCaseFlags(null).ok).toBe(false);
    expect(parseUpdateCaseFlags({}).ok).toBe(false);
    expect(
      parseUpdateCaseFlags({
        externalCourtDeadlineAt: "2026-12-01T12:00:00.000Z",
      }),
    ).toEqual({
      ok: true,
      value: { externalCourtDeadlineAt: "2026-12-01T12:00:00.000Z" },
    });
    expect(parseUpdateCaseFlags({ externalCourtDeadlineAt: null })).toEqual({
      ok: true,
      value: { externalCourtDeadlineAt: null },
    });
    expect(
      parseUpdateCaseFlags({
        title: "  Terreno El Roble  ",
        description: "Nota de ingreso",
      }),
    ).toEqual({
      ok: true,
      value: { title: "Terreno El Roble", description: "Nota de ingreso" },
    });
    expect(parseUpdateCaseFlags({ lawFirmId: 4 })).toEqual({
      ok: true,
      value: { lawFirmId: 4 },
    });
    expect(parseUpdateCaseFlags({ lawFirmId: null })).toEqual({
      ok: true,
      value: { lawFirmId: null },
    });
    expect(parseUpdateCaseFlags({ lawFirmId: 0 }).ok).toBe(false);
    expect(parseUpdateCaseFlags({ title: "   " }).ok).toBe(false);
    expect(parseUpdateCaseFlags({ description: "x".repeat(501) }).ok).toBe(
      false,
    );
    expect(
      parseUpdateCaseFlags({ externalCourtDeadlineAt: "bad" }).ok,
    ).toBe(false);
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
        [{ status: "rejected" }, { status: "grammar_qa" }],
        QUESTIONNAIRE_STATUS_RANK,
      )?.status,
    ).toBe("grammar_qa");
  });

  it("reads Street View across questionnaire payloads and upsert eligibility", () => {
    expect(
      anyQuestionnaireHasStreetView([
        { streetView: "  " },
        {
          streetViewValidated: "https://sv",
          streetViewPreexistence: "inconclusive",
        },
      ]),
    ).toBe(true);
    expect(anyQuestionnaireHasStreetView([{ streetView: "" }])).toBe(false);
    expect(canUpsertQuestionnaire("draft")).toBe(true);
    expect(canUpsertQuestionnaire("grammar_qa")).toBe(false);
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
    ).toMatchObject({ ok: true, nextStatus: "grammar_qa" });
    expect(
      resolveQuestionnaireUpsert({
        currentStatus: "changes_requested",
        submit: true,
      }),
    ).toMatchObject({ ok: true, nextStatus: "grammar_qa" });
    expect(isActiveLogisticsTripStatus("planned")).toBe(true);
    expect(isActiveLogisticsTripStatus("cancelled")).toBe(false);
    expect(shouldClearOtherPrimaryAssignments("expert", true)).toBe(true);
    expect(shouldClearOtherPrimaryAssignments("qa", true)).toBe(false);
  });

  it("blocks P10 on draft advance/final as well as unpaid issued invoices", () => {
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

  it("keeps listado intakeComplete on presence only (not full P1 approve)", () => {
    const listado = buildListadoProgress({
      status: "assignment",
      input: {
        documentCategories: intakeDocs,
        approvedDocumentCategories: [],
        expedienteApproved: false,
        hasPrimaryExpert: true,
        documentsHandoffConfirmed: true,
      },
    });
    expect(listado.intakeComplete).toBe(true);
    expect(listado.gatesOk).toBe(true);
    expect(
      evaluateProcessGates(1, {
        documentCategories: intakeDocs,
        approvedDocumentCategories: [],
        expedienteApproved: false,
      }).ok,
    ).toBe(false);
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
        approvedDocumentCategories: intakeDocs,
        expedienteApproved: true,
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
      holdResumeStatus: "field_ops",
    });
    expect(listado.holdResumeStatus).toBe("field_ops");
    expect(listado.gatesOk).toBe(true);
  });
});

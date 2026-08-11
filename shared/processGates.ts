/**
 * Canonical 12-point electrical expert-witness process.
 * Operational narrative: docs/Proceso_Peritaje_Electrico_12_Puntos.md
 * Case statuses stay aligned with CASE_STATUS_FLOW (Product.md phases 1–12).
 */

import type { AssignmentRole, CaseStatus } from "./api";
import { CASE_STATUS_FLOW } from "./caseWorkflow";
import {
  ADDITIONAL_DOCS_CATEGORIES,
  INTAKE_REQUIRED_CATEGORIES,
} from "./documentCompleteness";
import { EVIDENCE_CHECKLIST_CATEGORIES } from "./evidenceRules";

export const PROCESS_POINT_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export type ProcessPointId = (typeof PROCESS_POINT_IDS)[number];

export type ProcessActor =
  | "law_firm"
  | "coordinator"
  | "expert"
  | "questionnaire_author"
  | "qa"
  | "legal_internal"
  | "technical_director"
  | "logistics"
  | "accountant"
  | "admin";

export type RaciLetter = "R" | "A" | "C" | "I";

export type ProcessSla = {
  businessDays: number;
  deadlineType:
    | "questionnaire"
    | "legal_review"
    | "inspection"
    | "external_legal_validation";
  /** Starts when this event happens, not merely when the status is entered. */
  startsOn: "status_enter" | "protesta_filed" | "report_sent_to_firm";
  /** Nested inside another point's clock (P10 inside the 10-day P6 clock). */
  nestedInside: ProcessPointId | null;
};

export type ProcessPointDef = {
  id: ProcessPointId;
  caseStatus: CaseStatus;
  slug: string;
  sla: ProcessSla | null;
  /** Must finish before this parent clock expires (no own SLA). */
  boundedByPoint: ProcessPointId | null;
  raci: Partial<Record<ProcessActor, RaciLetter>>;
  requiredDocumentCategories: readonly string[];
  conditionalDocumentCategories: readonly string[];
  requiredEvidenceCategories: readonly string[];
  rejectReturnsTo: ProcessPointId | null;
  listadoFlags: readonly string[];
};

/** Example people → system actors (never hard-code in product logic). */
export const PROCESS_ACTOR_EXAMPLES: Record<ProcessActor, string> = {
  law_firm: "Despacho jurídico externo",
  coordinator: "Coordinación operativa (p. ej. Ulises Enrique León López)",
  expert: "Perito asignado (responsable absoluto del expediente)",
  questionnaire_author: "Redacción de cuestionario (p. ej. Josué Noé Mendoza Luengas)",
  qa: "Control de calidad gramatical / datos / fechas",
  legal_internal: "Área legal interna",
  technical_director: "Jefe de la Consultoría",
  logistics: "Logística de diligencias",
  accountant: "Contador (p. ej. Erick Flores Martínez)",
  admin: "Administración de la plataforma",
};

export const LISTADO_COLUMNS = [
  "caseNumber",
  "title",
  "court",
  "city",
  "lawFirm",
  "primaryExpert",
  "processPoint",
  "status",
  "intakeComplete",
  "questionnaireApproved",
  "streetViewDone",
  "advanceReleased",
  "advancePaid",
  "plaintiffQuestionnaire",
  "protestaFiled",
  "clock10DueAt",
  "logisticsReady",
  "inspectionComplete",
  "reportInternalOk",
  "reportFirmOk",
  "ratified",
  "attendedWithReport",
  "finalReleased",
  "finalPaid",
] as const;

export type ListadoColumn = (typeof LISTADO_COLUMNS)[number];

export const PROCESS_POINTS: Record<ProcessPointId, ProcessPointDef> = {
  1: {
    id: 1,
    caseStatus: "intake",
    slug: "intake",
    sla: null,
    boundedByPoint: null,
    raci: { law_firm: "R", coordinator: "A", admin: "I" },
    requiredDocumentCategories: [...INTAKE_REQUIRED_CATEGORIES],
    conditionalDocumentCategories: [],
    requiredEvidenceCategories: [],
    rejectReturnsTo: null,
    listadoFlags: ["intakeComplete"],
  },
  2: {
    id: 2,
    caseStatus: "assignment",
    slug: "assignment",
    sla: null,
    boundedByPoint: null,
    raci: { coordinator: "A", expert: "I", logistics: "I", accountant: "I" },
    requiredDocumentCategories: [],
    conditionalDocumentCategories: [],
    requiredEvidenceCategories: [],
    rejectReturnsTo: null,
    listadoFlags: ["primaryExpert"],
  },
  3: {
    id: 3,
    caseStatus: "questionnaire",
    slug: "questionnaire",
    sla: {
      businessDays: 3,
      deadlineType: "questionnaire",
      startsOn: "status_enter",
      nestedInside: null,
    },
    boundedByPoint: null,
    raci: {
      questionnaire_author: "R",
      expert: "A",
      qa: "C",
      accountant: "I",
    },
    requiredDocumentCategories: ["questionnaire"],
    conditionalDocumentCategories: [],
    requiredEvidenceCategories: [],
    rejectReturnsTo: 3,
    listadoFlags: [
      "questionnaireApproved",
      "streetViewDone",
      "advanceReleased",
    ],
  },
  4: {
    id: 4,
    caseStatus: "legal_review_questionnaire",
    slug: "legal_review_questionnaire",
    sla: {
      businessDays: 2,
      deadlineType: "legal_review",
      startsOn: "status_enter",
      nestedInside: null,
    },
    boundedByPoint: null,
    raci: { legal_internal: "A", expert: "C", qa: "I", law_firm: "I" },
    requiredDocumentCategories: ["questionnaire"],
    conditionalDocumentCategories: [],
    requiredEvidenceCategories: [],
    rejectReturnsTo: 3,
    listadoFlags: ["questionnaireApproved"],
  },
  5: {
    id: 5,
    caseStatus: "additional_docs",
    slug: "additional_docs",
    sla: null,
    boundedByPoint: null,
    raci: { law_firm: "R", coordinator: "A", expert: "I" },
    requiredDocumentCategories: ADDITIONAL_DOCS_CATEGORIES.filter(
      (c) => c !== "death_certificate" && c !== "plaintiff_questionnaire",
    ),
    conditionalDocumentCategories: ["death_certificate"],
    requiredEvidenceCategories: [],
    rejectReturnsTo: null,
    listadoFlags: ["plaintiffQuestionnaire"],
  },
  6: {
    id: 6,
    caseStatus: "court_acceptance",
    slug: "court_acceptance",
    sla: {
      businessDays: 10,
      deadlineType: "inspection",
      startsOn: "protesta_filed",
      nestedInside: null,
    },
    boundedByPoint: null,
    raci: { expert: "A", coordinator: "C", legal_internal: "I" },
    requiredDocumentCategories: ["protesta"],
    conditionalDocumentCategories: [],
    requiredEvidenceCategories: [],
    rejectReturnsTo: null,
    listadoFlags: ["protestaFiled", "clock10DueAt", "plaintiffQuestionnaire"],
  },
  7: {
    id: 7,
    caseStatus: "logistics",
    slug: "logistics",
    sla: null,
    boundedByPoint: 6,
    raci: { logistics: "A", expert: "C", coordinator: "I", accountant: "I" },
    requiredDocumentCategories: [],
    conditionalDocumentCategories: [],
    requiredEvidenceCategories: [],
    rejectReturnsTo: null,
    listadoFlags: ["logisticsReady"],
  },
  8: {
    id: 8,
    caseStatus: "inspection",
    slug: "inspection",
    sla: null,
    boundedByPoint: 6,
    raci: { expert: "A", logistics: "C" },
    requiredDocumentCategories: [],
    conditionalDocumentCategories: [],
    requiredEvidenceCategories: [...EVIDENCE_CHECKLIST_CATEGORIES],
    rejectReturnsTo: 8,
    listadoFlags: ["inspectionComplete"],
  },
  9: {
    id: 9,
    caseStatus: "technical_report",
    slug: "technical_report",
    sla: null,
    boundedByPoint: 6,
    raci: {
      expert: "R",
      qa: "C",
      technical_director: "A",
      coordinator: "I",
    },
    requiredDocumentCategories: ["technical_report"],
    conditionalDocumentCategories: [],
    requiredEvidenceCategories: [],
    rejectReturnsTo: 9,
    listadoFlags: ["reportInternalOk"],
  },
  10: {
    id: 10,
    caseStatus: "legal_validation",
    slug: "legal_validation",
    sla: {
      businessDays: 3,
      deadlineType: "external_legal_validation",
      startsOn: "report_sent_to_firm",
      nestedInside: 6,
    },
    boundedByPoint: 6,
    raci: { law_firm: "A", expert: "C", technical_director: "I" },
    requiredDocumentCategories: ["technical_report"],
    conditionalDocumentCategories: [],
    requiredEvidenceCategories: [],
    rejectReturnsTo: 9,
    listadoFlags: ["reportFirmOk"],
  },
  11: {
    id: 11,
    caseStatus: "court_delivery",
    slug: "court_delivery",
    sla: null,
    boundedByPoint: 6,
    raci: { expert: "A", coordinator: "C", law_firm: "I" },
    requiredDocumentCategories: ["court_filing", "ratification"],
    conditionalDocumentCategories: [],
    requiredEvidenceCategories: [],
    rejectReturnsTo: null,
    listadoFlags: ["ratified", "attendedWithReport", "finalReleased"],
  },
  12: {
    id: 12,
    caseStatus: "accounting",
    slug: "accounting",
    sla: null,
    boundedByPoint: null,
    raci: { accountant: "A", coordinator: "I", admin: "I" },
    requiredDocumentCategories: [],
    conditionalDocumentCategories: [],
    requiredEvidenceCategories: [],
    rejectReturnsTo: null,
    listadoFlags: ["advancePaid", "finalPaid"],
  },
};

const STATUS_TO_POINT = new Map<CaseStatus, ProcessPointId>(
  PROCESS_POINT_IDS.map((id) => [PROCESS_POINTS[id].caseStatus, id]),
);

export function processPointForStatus(
  status: CaseStatus,
): ProcessPointId | null {
  return STATUS_TO_POINT.get(status) ?? null;
}

/**
 * Forward advance along the 12-point flow evaluates gates on the *current* point.
 * Hold, cancel, and resume from hold are not gated.
 */
export function processPointToEnforceOnTransition(
  from: CaseStatus,
  to: CaseStatus,
): ProcessPointId | null {
  if (to === "on_hold" || to === "cancelled") return null;
  if (from === "on_hold" || from === "cancelled" || from === "completed") {
    return null;
  }
  const fromPoint = processPointForStatus(from);
  if (!fromPoint) return null;
  const idx = CASE_STATUS_FLOW.indexOf(from);
  if (idx < 0 || idx >= CASE_STATUS_FLOW.length - 1) return null;
  return to === CASE_STATUS_FLOW[idx + 1] ? fromPoint : null;
}

export function questionnaireHasStreetView(contentJson: unknown): boolean {
  if (!contentJson || typeof contentJson !== "object") return false;
  const rec = contentJson as Record<string, unknown>;
  const raw = rec.streetViewValidated ?? rec.streetView;
  return typeof raw === "string" && raw.trim().length > 0;
}

export function anyQuestionnaireHasStreetView(
  contents: readonly unknown[],
): boolean {
  return contents.some((c) => questionnaireHasStreetView(c));
}

export type RankedArtifact = {
  status: string;
  createdAt?: string | number | Date | null;
};

function createdAtMs(value: RankedArtifact["createdAt"]): number {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

/** Higher rank wins when several questionnaire rows exist. */
export const QUESTIONNAIRE_STATUS_RANK: Record<string, number> = {
  approved: 5,
  legal_review: 4,
  submitted: 3,
  changes_requested: 2,
  draft: 1,
  rejected: 0,
};

/** Leaving P3 requires the questionnaire to be in legal's hands (or already approved). */
export const QUESTIONNAIRE_READY_TO_LEAVE_P3 = new Set([
  "submitted",
  "legal_review",
  "approved",
]);

export const REPORT_STATUS_RANK: Record<string, number> = {
  delivered: 8,
  approved: 7,
  external_review: 6,
  approved_internal: 5,
  technical_director: 4,
  grammar_qa: 3,
  changes_requested: 2,
  draft: 1,
  rejected: 0,
};

export function pickBestByStatusRank<T extends { status: string }>(
  rows: readonly T[],
  rank: Record<string, number>,
): T | null {
  if (rows.length === 0) return null;
  return rows.reduce((best, row) => {
    const nextRank = rank[row.status] ?? -1;
    const bestRank = rank[best.status] ?? -1;
    return nextRank > bestRank ? row : best;
  });
}

/**
 * Strongest status wins, unless a newer row is a weaker revision
 * (draft / changes_requested after an older approved).
 */
export function pickCurrentProcessArtifact<T extends RankedArtifact>(
  rows: readonly T[],
  rank: Record<string, number>,
): T | null {
  if (rows.length === 0) return null;
  const nonRejected = rows.filter((r) => r.status !== "rejected");
  const pool = nonRejected.length > 0 ? nonRejected : [...rows];
  const byRank = pickBestByStatusRank(pool, rank);
  if (!byRank) return null;
  const latest = pool.reduce((a, b) =>
    createdAtMs(b.createdAt) > createdAtMs(a.createdAt) ? b : a,
  );
  if (
    latest !== byRank &&
    createdAtMs(latest.createdAt) > createdAtMs(byRank.createdAt) &&
    (rank[latest.status] ?? -1) < (rank[byRank.status] ?? -1)
  ) {
    return latest;
  }
  return byRank;
}

export const QUESTIONNAIRE_UPSERT_STATUSES = new Set([
  "draft",
  "changes_requested",
  "submitted",
]);

export function canUpsertQuestionnaire(status: string | null | undefined): boolean {
  return Boolean(status && QUESTIONNAIRE_UPSERT_STATUSES.has(status));
}

export function resolveQuestionnaireUpsert(opts: {
  currentStatus: string | null | undefined;
  submit: boolean;
}):
  | { ok: true; reuse: boolean; nextStatus: string }
  | { ok: false; error: string } {
  const current = opts.currentStatus ?? null;
  if (!current) {
    return {
      ok: true,
      reuse: false,
      nextStatus: opts.submit ? "submitted" : "draft",
    };
  }
  if (!canUpsertQuestionnaire(current)) {
    return {
      ok: false,
      error:
        current === "legal_review"
          ? "Questionnaire is in legal review; request changes before editing"
          : "Questionnaire cannot be edited in its current status",
    };
  }
  if (!opts.submit || current === "submitted") {
    return { ok: true, reuse: true, nextStatus: current };
  }
  if (current !== "draft" && current !== "changes_requested") {
    return {
      ok: false,
      error: `Cannot move questionnaire from ${current} to submitted`,
    };
  }
  return { ok: true, reuse: true, nextStatus: "submitted" };
}

export function isActiveLogisticsTripStatus(
  status: string | null | undefined,
): boolean {
  return Boolean(status && status !== "cancelled");
}

export function shouldClearOtherPrimaryAssignments(
  role: string,
  isPrimary: boolean,
): boolean {
  return isPrimary && (role === "expert" || role === "coordinator");
}

/** Measurement types that also satisfy the P8 evidence checklist. */
export function mergeEvidenceCategories(
  evidenceCategories: readonly string[],
  measurementTypes: readonly string[] = [],
): string[] {
  const allowed = new Set<string>(EVIDENCE_CHECKLIST_CATEGORIES);
  const set = new Set(
    evidenceCategories.filter((c) => allowed.has(c)),
  );
  for (const type of measurementTypes) {
    if (allowed.has(type)) set.add(type);
  }
  return [...set];
}

export const UNPAID_INVOICE_STATUSES = [
  "issued",
  "partially_paid",
  "overdue",
] as const;

export function hasBlockingUnpaidInvoices(
  invoiceStatuses: readonly string[],
): boolean {
  return invoiceStatuses.some((s) =>
    (UNPAID_INVOICE_STATUSES as readonly string[]).includes(s),
  );
}

export type FinanceInvoiceInput = {
  status: string;
  invoiceType?: string | null;
};

/** P12: unpaid issued invoices, plus draft advance/final that were never squared. */
export function isPendingFinanceInvoice(inv: FinanceInvoiceInput): boolean {
  if (hasBlockingUnpaidInvoices([inv.status])) return true;
  return (
    (inv.invoiceType === "advance" || inv.invoiceType === "final") &&
    inv.status === "draft"
  );
}

export function hasBlockingFinanceForCompletion(
  invoices: readonly FinanceInvoiceInput[],
): boolean {
  return invoices.some((inv) => isPendingFinanceInvoice(inv));
}

export type ListadoProgress = {
  processPoint: ProcessPointId | null;
  primaryExpert: boolean;
  intakeComplete: boolean;
  questionnaireApproved: boolean;
  streetViewDone: boolean;
  advanceReleased: boolean;
  advancePaid: boolean;
  plaintiffQuestionnaire: boolean;
  protestaFiled: boolean;
  clock10DueAt: string | null;
  logisticsReady: boolean;
  inspectionComplete: boolean;
  reportInternalOk: boolean;
  reportFirmOk: boolean;
  ratified: boolean;
  attendedWithReport: boolean;
  finalReleased: boolean;
  finalPaid: boolean;
};

export type CaseProcessGateSnapshot = {
  point: ProcessPointId | null;
  ok: boolean;
  missing: string[];
};

export function buildProcessGateSnapshot(
  status: CaseStatus,
  input: ProcessGateInput,
): CaseProcessGateSnapshot {
  const point = processPointForStatus(status);
  if (!point) return { point: null, ok: true, missing: [] };
  const gates = evaluateProcessGates(point, input);
  return { point, ok: gates.ok, missing: [...gates.missing] };
}

export function buildListadoProgress(opts: {
  status: CaseStatus;
  inspectionDeadlineAt?: string | null;
  input: ProcessGateInput;
  invoices?: readonly FinanceInvoiceInput[];
}): ListadoProgress {
  const input = opts.input;
  const invoices = opts.invoices ?? [];
  const qApproved = input.questionnaireStatus === "approved";
  const hasAdvance = invoices.some((i) => i.invoiceType === "advance");
  const hasFinal = invoices.some((i) => i.invoiceType === "final");
  const advancePaid = invoices.some(
    (i) => i.invoiceType === "advance" && i.status === "paid",
  );
  const finalPaid = invoices.some(
    (i) => i.invoiceType === "final" && i.status === "paid",
  );
  const intake = evaluateProcessGates(1, input).ok;
  const reportInternal =
    input.reportStatus === "approved_internal" ||
    input.reportStatus === "external_review" ||
    input.reportStatus === "approved" ||
    input.reportStatus === "delivered";
  const reportFirm =
    input.reportStatus === "approved" || input.reportStatus === "delivered";
  const ratified = Boolean(
    input.ratificationPresent ||
      input.documentCategories.includes("ratification"),
  );
  const filed = Boolean(
    input.courtFilingPresent || input.documentCategories.includes("court_filing"),
  );
  return {
    processPoint: processPointForStatus(opts.status),
    primaryExpert: Boolean(input.hasPrimaryExpert),
    intakeComplete: intake,
    questionnaireApproved: qApproved,
    streetViewDone: Boolean(input.hasStreetView),
    advanceReleased: qApproved || hasAdvance,
    advancePaid,
    plaintiffQuestionnaire: Boolean(input.plaintiffQuestionnairePresent),
    protestaFiled: Boolean(
      input.protestaFiled || input.documentCategories.includes("protesta"),
    ),
    clock10DueAt: opts.inspectionDeadlineAt ?? null,
    logisticsReady: input.logisticsReady === true,
    inspectionComplete: input.inspectionComplete === true,
    reportInternalOk: reportInternal,
    reportFirmOk: reportFirm,
    ratified,
    attendedWithReport: ratified && filed,
    finalReleased: ratified || hasFinal,
    finalPaid,
  };
}

export function parseUpdateCaseFlags(
  body: unknown,
):
  | { ok: true; value: { involvesFatality: boolean } }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid body" };
  }
  const rec = body as Record<string, unknown>;
  if (typeof rec.involvesFatality !== "boolean") {
    return { ok: false, error: "involvesFatality must be a boolean" };
  }
  return { ok: true, value: { involvesFatality: rec.involvesFatality } };
}

export function accountableActor(point: ProcessPointId): ProcessActor | null {
  const raci = PROCESS_POINTS[point].raci;
  const found = (Object.entries(raci) as [ProcessActor, RaciLetter][]).find(
    ([, letter]) => letter === "A",
  );
  return found ? found[0] : null;
}

export type ProcessGateInput = {
  documentCategories: readonly string[];
  evidenceCategories?: readonly string[];
  hasPrimaryExpert?: boolean;
  questionnaireStatus?: string | null;
  hasStreetView?: boolean;
  hasPropertyGps?: boolean;
  protestaFiled?: boolean;
  plaintiffQuestionnairePresent?: boolean;
  inspectionComplete?: boolean;
  reportStatus?: string | null;
  ratificationPresent?: boolean;
  courtFilingPresent?: boolean;
  involvesFatality?: boolean;
  logisticsReady?: boolean;
  hasUnpaidInvoices?: boolean;
};

export type ProcessGateResult =
  | { ok: true; missing: [] }
  | { ok: false; missing: string[] };

function hasCategory(
  present: readonly string[],
  category: string,
): boolean {
  return present.includes(category);
}

/**
 * Blocking gates to *leave* a process point (advance to the next status).
 * Missing plaintiff questionnaire does not block protesta (P6) — it blocks
 * inspection (P8) and the technical report (P9).
 */
export function evaluateProcessGates(
  point: ProcessPointId,
  input: ProcessGateInput,
): ProcessGateResult {
  const def = PROCESS_POINTS[point];
  const docs = input.documentCategories;
  const missing: string[] = [];

  for (const cat of def.requiredDocumentCategories) {
    if (
      cat === "questionnaire" &&
      input.questionnaireStatus &&
      input.questionnaireStatus !== "rejected"
    ) {
      continue;
    }
    if (
      cat === "technical_report" &&
      (input.reportStatus === "approved_internal" ||
        input.reportStatus === "external_review" ||
        input.reportStatus === "approved" ||
        input.reportStatus === "delivered")
    ) {
      continue;
    }
    if (!hasCategory(docs, cat)) missing.push(`doc:${cat}`);
  }
  if (input.involvesFatality) {
    for (const cat of def.conditionalDocumentCategories) {
      if (!hasCategory(docs, cat)) missing.push(`doc:${cat}`);
    }
  }

  if (point === 1) {
    const intakeMissing = INTAKE_REQUIRED_CATEGORIES.filter(
      (c) => !hasCategory(docs, c),
    );
    for (const cat of intakeMissing) {
      const key = `doc:${cat}`;
      if (!missing.includes(key)) missing.push(key);
    }
  }

  if (point === 2 && !input.hasPrimaryExpert) {
    missing.push("assignment:primary_expert");
  }

  if (point === 3) {
    if (!input.hasPropertyGps) missing.push("location:gps");
    if (!input.hasStreetView) missing.push("location:street_view");
    if (
      !QUESTIONNAIRE_READY_TO_LEAVE_P3.has(input.questionnaireStatus ?? "")
    ) {
      missing.push("questionnaire:ready");
    }
  }

  if (point === 4 && input.questionnaireStatus !== "approved") {
    missing.push("questionnaire:legal_approved");
  }

  if (point === 6 && !input.protestaFiled && !hasCategory(docs, "protesta")) {
    missing.push("doc:protesta");
  }

  if ((point === 8 || point === 9) && !input.plaintiffQuestionnairePresent) {
    missing.push("doc:plaintiff_questionnaire");
  }

  if (point === 7 && input.logisticsReady !== true) {
    missing.push("logistics:ready");
  }

  if (point === 8) {
    const evidence = input.evidenceCategories || [];
    for (const cat of def.requiredEvidenceCategories) {
      if (!evidence.includes(cat)) missing.push(`evidence:${cat}`);
    }
    if (input.inspectionComplete !== true) {
      missing.push("inspection:complete");
    }
  }

  if (point === 9) {
    const ok =
      input.reportStatus === "approved_internal" ||
      input.reportStatus === "external_review" ||
      input.reportStatus === "approved" ||
      input.reportStatus === "delivered";
    if (!ok) missing.push("report:internal_approved");
  }

  if (point === 10) {
    const ok =
      input.reportStatus === "approved" || input.reportStatus === "delivered";
    if (!ok) missing.push("report:firm_approved");
  }

  if (point === 11) {
    if (!input.courtFilingPresent && !hasCategory(docs, "court_filing")) {
      missing.push("doc:court_filing");
    }
    if (!input.ratificationPresent && !hasCategory(docs, "ratification")) {
      missing.push("doc:ratification");
    }
  }

  if (point === 12 && input.hasUnpaidInvoices) {
    missing.push("finance:unpaid_invoices");
  }

  return missing.length === 0
    ? { ok: true, missing: [] }
    : { ok: false, missing };
}

export function rejectReturnsTo(point: ProcessPointId): ProcessPointId | null {
  return PROCESS_POINTS[point].rejectReturnsTo;
}

export function pointsInsideParentClock(
  parent: ProcessPointId,
): ProcessPointId[] {
  return PROCESS_POINT_IDS.filter(
    (id) =>
      PROCESS_POINTS[id].boundedByPoint === parent ||
      PROCESS_POINTS[id].sla?.nestedInside === parent,
  );
}

/** Assignment roles that must exist after P2 (primary expert is required). */
export const REQUIRED_ASSIGNMENT_ROLES_AFTER_P2: AssignmentRole[] = ["expert"];

export const RECOMMENDED_ASSIGNMENT_ROLES_AFTER_P2: AssignmentRole[] = [
  "coordinator",
  "qa",
  "legal_reviewer",
  "logistics",
  "accountant",
];

/** Status flow 1–12 matches process points; completed is after P12. */
export function assertProcessAlignsWithCaseFlow(): {
  ok: true;
  statuses: CaseStatus[];
} {
  const statuses = PROCESS_POINT_IDS.map((id) => PROCESS_POINTS[id].caseStatus);
  const expected = CASE_STATUS_FLOW.filter((s) => s !== "completed");
  if (statuses.join("|") !== expected.join("|")) {
    throw new Error(
      `Process points drifted from CASE_STATUS_FLOW: ${statuses.join(",")} vs ${expected.join(",")}`,
    );
  }
  return { ok: true, statuses };
}

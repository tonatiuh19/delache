/**
 * Canonical 10-point electrical expert-witness process (decision Y).
 * Operational narrative: docs/Proceso_Peritaje_Electrico_10_Puntos.md
 * Case statuses stay aligned with CASE_STATUS_FLOW.
 */

import type { AssignmentRole, CaseStatus } from "./api";
import { CASE_STATUS_FLOW } from "./caseWorkflow";
import {
  ADDITIONAL_DOCS_CATEGORIES,
  getIntakeCompleteness,
  INTAKE_REQUIRED_CATEGORIES,
} from "./documentCompleteness";
import { questionnaireStreetViewComplete } from "./questionnaireContentRules";
import { documentsHandoffConfirmed } from "./handoffRules";
import {
  questionnaireQaComplete,
} from "./questionnaireWorkflow";
import { EVIDENCE_CHECKLIST_CATEGORIES } from "./evidenceRules";

export const PROCESS_POINT_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

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
  /** Nested inside another point's clock (P9 validation SLA inside the 10-day P6 clock). */
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
      coordinator: "A",
      qa: "C",
      expert: "I",
    },
    requiredDocumentCategories: ["questionnaire"],
    conditionalDocumentCategories: [],
    requiredEvidenceCategories: [],
    rejectReturnsTo: 2,
    listadoFlags: [
      "questionnaireApproved",
      "streetViewDone",
      "advanceReleased",
    ],
  },
  3: {
    id: 3,
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
    raci: { law_firm: "A", legal_internal: "C", expert: "C", qa: "I" },
    requiredDocumentCategories: ["questionnaire"],
    conditionalDocumentCategories: [],
    requiredEvidenceCategories: [],
    rejectReturnsTo: 2,
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
    requiredDocumentCategories: ["protesta", "plaintiff_questionnaire"],
    conditionalDocumentCategories: ["death_certificate"],
    requiredEvidenceCategories: [],
    rejectReturnsTo: null,
    listadoFlags: ["protestaFiled", "clock10DueAt", "plaintiffQuestionnaire"],
  },
  7: {
    id: 7,
    caseStatus: "field_ops",
    slug: "field_ops",
    sla: null,
    boundedByPoint: 6,
    raci: {
      expert: "A",
      logistics: "C",
      coordinator: "I",
      accountant: "I",
    },
    requiredDocumentCategories: [],
    conditionalDocumentCategories: [],
    requiredEvidenceCategories: [...EVIDENCE_CHECKLIST_CATEGORIES],
    rejectReturnsTo: 7,
    listadoFlags: ["logisticsReady", "inspectionComplete"],
  },
  8: {
    id: 8,
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
    rejectReturnsTo: 8,
    listadoFlags: ["reportInternalOk"],
  },
  9: {
    id: 9,
    caseStatus: "validation_delivery",
    slug: "validation_delivery",
    sla: {
      businessDays: 3,
      deadlineType: "external_legal_validation",
      startsOn: "report_sent_to_firm",
      nestedInside: 6,
    },
    boundedByPoint: 6,
    raci: {
      expert: "A",
      law_firm: "C",
      technical_director: "I",
      coordinator: "C",
    },
    requiredDocumentCategories: ["technical_report", "court_filing", "ratification"],
    conditionalDocumentCategories: [],
    requiredEvidenceCategories: [],
    rejectReturnsTo: 8,
    listadoFlags: [
      "reportFirmOk",
      "ratified",
      "attendedWithReport",
      "finalReleased",
    ],
  },
  10: {
    id: 10,
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
 * Forward advance along the 10-point flow evaluates gates on the *current* point.
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
  return questionnaireStreetViewComplete(contentJson);
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
  approved: 6,
  legal_review: 5,
  grammar_qa: 4,
  changes_requested: 2,
  draft: 1,
  rejected: 0,
};

/** Leaving P3 requires QA passed (legal_review or approved). */
export const QUESTIONNAIRE_READY_TO_LEAVE_P3 = new Set([
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
      nextStatus: opts.submit ? "grammar_qa" : "draft",
    };
  }
  if (!canUpsertQuestionnaire(current)) {
    return {
      ok: false,
      error:
        current === "grammar_qa"
          ? "Questionnaire is in QA review; wait for QA or request changes"
          : current === "legal_review"
            ? "Questionnaire is in legal review; request changes before editing"
            : "Questionnaire cannot be edited in its current status",
    };
  }
  if (!opts.submit) {
    return { ok: true, reuse: true, nextStatus: current };
  }
  return { ok: true, reuse: true, nextStatus: "grammar_qa" };
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

/** P10: unpaid issued invoices, plus draft advance/final that were never squared. */
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
  /** True when the case can advance to the next workflow status (current point gates). */
  gatesOk: boolean;
  /** When status is on_hold, workflow resume target for kanban drag rules. */
  holdResumeStatus?: CaseStatus | null;
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
  holdResumeStatus?: CaseStatus | null;
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
  const intake = getIntakeCompleteness(input.documentCategories).complete;
  const currentPoint = processPointForStatus(opts.status);
  const gatesOk = currentPoint
    ? evaluateProcessGates(currentPoint, input).ok
    : true;
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
    processPoint: currentPoint,
    gatesOk,
    holdResumeStatus: opts.holdResumeStatus ?? null,
    primaryExpert: Boolean(input.hasPrimaryExpert),
    intakeComplete: intake,
    questionnaireApproved: qApproved,
    streetViewDone: Boolean(input.hasStreetView),
    advanceReleased: questionnaireQaComplete(input.questionnaireStatus) || hasAdvance,
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
  | {
      ok: true;
      value: {
        involvesFatality?: boolean;
        protestaModality?: "presencial" | "virtual" | null;
        externalCourtDeadlineAt?: string | null;
        dictamenDueAt?: string | null;
        title?: string;
        description?: string | null;
        lawFirmId?: number | null;
      };
    }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid body" };
  }
  const rec = body as Record<string, unknown>;
  const value: {
    involvesFatality?: boolean;
    protestaModality?: "presencial" | "virtual" | null;
    externalCourtDeadlineAt?: string | null;
    dictamenDueAt?: string | null;
    title?: string;
    description?: string | null;
    lawFirmId?: number | null;
  } = {};
  let touched = false;
  if ("involvesFatality" in rec) {
    if (typeof rec.involvesFatality !== "boolean") {
      return { ok: false, error: "involvesFatality must be a boolean" };
    }
    value.involvesFatality = rec.involvesFatality;
    touched = true;
  }
  if ("protestaModality" in rec) {
    const m = rec.protestaModality;
    if (m !== null && m !== "presencial" && m !== "virtual") {
      return {
        ok: false,
        error: "protestaModality must be presencial, virtual, or null",
      };
    }
    value.protestaModality = m as "presencial" | "virtual" | null;
    touched = true;
  }
  if ("externalCourtDeadlineAt" in rec) {
    const raw = rec.externalCourtDeadlineAt;
    if (raw === null || raw === "") {
      value.externalCourtDeadlineAt = null;
      touched = true;
    } else if (typeof raw === "string" || typeof raw === "number") {
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) {
        return { ok: false, error: "Invalid externalCourtDeadlineAt" };
      }
      value.externalCourtDeadlineAt = d.toISOString();
      touched = true;
    } else {
      return {
        ok: false,
        error: "externalCourtDeadlineAt must be a date string or null",
      };
    }
  }
  if ("dictamenDueAt" in rec) {
    const raw = rec.dictamenDueAt;
    if (raw === null || raw === "") {
      value.dictamenDueAt = null;
      touched = true;
    } else if (typeof raw === "string" || typeof raw === "number") {
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) {
        return { ok: false, error: "Invalid dictamenDueAt" };
      }
      value.dictamenDueAt = d.toISOString();
      touched = true;
    } else {
      return {
        ok: false,
        error: "dictamenDueAt must be a date string or null",
      };
    }
  }
  if ("title" in rec) {
    if (typeof rec.title !== "string" || !rec.title.trim()) {
      return { ok: false, error: "Title is required" };
    }
    if (rec.title.trim().length > 255) {
      return { ok: false, error: "Title is too long" };
    }
    value.title = rec.title.trim();
    touched = true;
  }
  if ("description" in rec) {
    if (rec.description != null && typeof rec.description !== "string") {
      return { ok: false, error: "description must be a string or null" };
    }
    const note = String(rec.description ?? "");
    if (note.length > 500) {
      return { ok: false, error: "description exceeds 500 characters" };
    }
    value.description = note.trim() || null;
    touched = true;
  }
  if ("lawFirmId" in rec) {
    if (rec.lawFirmId === null || rec.lawFirmId === "") {
      value.lawFirmId = null;
      touched = true;
    } else {
      const id = Number(rec.lawFirmId);
      if (!Number.isFinite(id) || id <= 0) {
        return { ok: false, error: "Invalid lawFirmId" };
      }
      value.lawFirmId = id;
      touched = true;
    }
  }
  if (!touched) {
    return {
      ok: false,
      error:
        "Provide involvesFatality, protestaModality, externalCourtDeadlineAt, dictamenDueAt, title, description, and/or lawFirmId",
    };
  }
  return { ok: true, value };
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
  /** Categories with at least one document status=approved (P1 intake harden). */
  approvedDocumentCategories?: readonly string[];
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
  ratificationScheduledAt?: string | null;
  involvesFatality?: boolean;
  logisticsReady?: boolean;
  hasUnpaidInvoices?: boolean;
  documentsHandoffConfirmed?: boolean;
  /** P1: admin Aprobar expediente stamp. */
  expedienteApproved?: boolean;
  questionnaireContentJson?: unknown;
  /** Field ops: date the dictamen must be finished before leaving the step. */
  dictamenDueAt?: string | null;
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
 * field_ops (P7) and the technical report (P8).
 */
export function evaluateProcessGates(
  point: ProcessPointId,
  input: ProcessGateInput,
): ProcessGateResult {
  const def = PROCESS_POINTS[point];
  const docs = input.documentCategories;
  const missing: string[] = [];

  for (const cat of def.requiredDocumentCategories) {
    // Miro / sample-flow PDFs are required file artifacts.
    // Form content / report status / schedule do not substitute for the file.
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
    const approved = input.approvedDocumentCategories ?? [];
    for (const cat of INTAKE_REQUIRED_CATEGORIES) {
      if (!hasCategory(approved, cat)) {
        const key = `doc_approved:${cat}`;
        if (!missing.includes(key)) missing.push(key);
      }
    }
    if (input.expedienteApproved !== true) {
      missing.push("expediente:approved");
    }
  }

  if (point === 3 && !input.hasPrimaryExpert) {
    missing.push("assignment:primary_expert");
  }

  if (point === 3 && input.documentsHandoffConfirmed !== true) {
    missing.push("handoff:documents_confirmed");
  }

  if (point === 2) {
    if (!input.hasPropertyGps) missing.push("location:gps");
    if (
      !input.hasStreetView &&
      !questionnaireStreetViewComplete(input.questionnaireContentJson)
    ) {
      missing.push("location:street_view");
    }
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

  if ((point === 7 || point === 8) && !input.plaintiffQuestionnairePresent) {
    missing.push("doc:plaintiff_questionnaire");
  }

  if (point === 7) {
    if (!input.dictamenDueAt) {
      missing.push("dictamen:due");
    }
    if (input.logisticsReady !== true) {
      missing.push("logistics:ready");
    }
    const evidence = input.evidenceCategories || [];
    for (const cat of def.requiredEvidenceCategories) {
      if (!evidence.includes(cat)) missing.push(`evidence:${cat}`);
    }
    if (input.inspectionComplete !== true) {
      missing.push("inspection:complete");
    }
  }

  if (point === 8) {
    const ok =
      input.reportStatus === "approved_internal" ||
      input.reportStatus === "external_review" ||
      input.reportStatus === "approved" ||
      input.reportStatus === "delivered";
    if (!ok) missing.push("report:internal_approved");
  }

  if (point === 9) {
    const firmOk =
      input.reportStatus === "approved" || input.reportStatus === "delivered";
    if (!firmOk) missing.push("report:firm_approved");
    // court_filing + ratification PDFs come from requiredDocumentCategories.
  }

  if (point === 10 && input.hasUnpaidInvoices) {
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

/** Status flow 1–10 matches process points; completed is after P10. */
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

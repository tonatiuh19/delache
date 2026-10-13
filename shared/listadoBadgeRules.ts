/**
 * Miro Listado status badges derived from case clocks + finance flags.
 * SoT: docs/Proceso_Peritaje_Electrico_10_Puntos.md §Listado badges
 */

import type { CaseStatus } from "./api";
import type { ListadoProgress } from "./processGates";

export type ListadoBadgeId =
  | "activo"
  | "en_revision"
  | "en_espera"
  | "vencido"
  | "cerrado"
  | "pagado";

export type ListadoBadgeTone =
  | "primary"
  | "warning"
  | "destructive"
  | "muted"
  | "success";

export type ListadoBadge = {
  id: ListadoBadgeId;
  tone: ListadoBadgeTone;
};

const REVIEW_STATUSES: ReadonlySet<CaseStatus> = new Set([
  "legal_review_questionnaire",
  "technical_report",
  "validation_delivery",
]);

const WAIT_STATUSES: ReadonlySet<CaseStatus> = new Set([
  "on_hold",
  "court_acceptance",
  "additional_docs",
]);

/**
 * Derive 1–2 primary Miro badges. Detail chips remain available separately.
 */
export function deriveListadoBadges(opts: {
  status: CaseStatus | string;
  listado?: ListadoProgress | null;
  nowMs?: number;
}): ListadoBadge[] {
  const status = opts.status as CaseStatus;
  const listado = opts.listado ?? null;
  const now = opts.nowMs ?? Date.now();
  const badges: ListadoBadge[] = [];

  if (status === "completed" || status === "cancelled") {
    badges.push({ id: "cerrado", tone: "muted" });
    if (listado?.finalPaid) badges.push({ id: "pagado", tone: "success" });
    return badges;
  }

  const overdue =
    Boolean(listado?.clock10DueAt) &&
    !Number.isNaN(Date.parse(String(listado!.clock10DueAt))) &&
    Date.parse(String(listado!.clock10DueAt)) < now;

  if (overdue) {
    badges.push({ id: "vencido", tone: "destructive" });
  } else if (REVIEW_STATUSES.has(status)) {
    badges.push({ id: "en_revision", tone: "warning" });
  } else if (WAIT_STATUSES.has(status) || listado?.gatesOk === false) {
    badges.push({ id: "en_espera", tone: "muted" });
  } else {
    badges.push({ id: "activo", tone: "primary" });
  }

  if (listado?.finalPaid && !badges.some((b) => b.id === "pagado")) {
    badges.push({ id: "pagado", tone: "success" });
  }

  return badges.slice(0, 2);
}

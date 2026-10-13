/**
 * Despacho (law-firm) Panel del despacho — progress rail + list filters.
 * Process points match staff PDF chrome (skip merged P5 slot).
 */

import type { CaseStatus } from "./api";
import {
  clientStepNumber,
  stepVisualStatus,
  type StepVisualStatus,
} from "./caseStepTreeRules";
import {
  processPointForStatus,
  type ListadoProgress,
  type ProcessPointId,
} from "./processGates";
import { deriveListadoBadges, type ListadoBadge } from "./listadoBadgeRules";

/** Nine UI steps (10-point process with P5 slot omitted like PDF shell). */
export const DESPACHO_PROGRESS_POINTS: readonly ProcessPointId[] = [
  1, 2, 3, 4, 6, 7, 8, 9, 10,
];

export type DespachoProgressStep = {
  point: ProcessPointId;
  clientNumber: number;
  visual: StepVisualStatus;
  /** PDF right-rail pill. */
  pill: "done" | "in_progress" | "pending";
};

export function buildDespachoProgressSteps(opts: {
  status: CaseStatus | string;
}): DespachoProgressStep[] {
  const current = processPointForStatus(opts.status as CaseStatus);
  return DESPACHO_PROGRESS_POINTS.map((point) => {
    const visual = stepVisualStatus(point, current, opts.status as CaseStatus);
    const pill: DespachoProgressStep["pill"] =
      visual === "completed"
        ? "done"
        : visual === "current"
          ? "in_progress"
          : "pending";
    return {
      point,
      clientNumber: clientStepNumber(point),
      visual,
      pill,
    };
  });
}

export function despachoListadoBadges(opts: {
  status: CaseStatus | string;
  listado?: ListadoProgress | null;
}): ListadoBadge[] {
  return deriveListadoBadges(opts);
}

export function filterDespachoCases<T extends {
  status: CaseStatus | string;
  caseNumber: string;
  title: string;
  propertyCity?: string | null;
  propertyState?: string | null;
  listado?: ListadoProgress | null;
}>(opts: {
  cases: readonly T[];
  query: string;
  badgeId: string | "all";
}): T[] {
  const q = opts.query.trim().toLowerCase();
  return opts.cases.filter((c) => {
    if (opts.badgeId !== "all") {
      const badges = despachoListadoBadges({
        status: c.status,
        listado: c.listado,
      });
      if (!badges.some((b) => b.id === opts.badgeId)) return false;
    }
    if (!q) return true;
    const hay = [
      c.caseNumber,
      c.title,
      c.propertyCity ?? "",
      c.propertyState ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

/** Firm may author only intake create; panel Seguimiento is always read-only. */
export function despachoSeguimientoReadOnly(): true {
  return true;
}

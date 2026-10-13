/**
 * Role Mission Control — primary focus point + CTA per staff role.
 * Drives dashboard persona tiles, empty-state guidance, and step-tree gating.
 * SoT: docs/Proceso_Peritaje_Electrico_10_Puntos.md (Miro roles).
 */

import type { CaseStatus, UserRole } from "./api";
import {
  PROCESS_POINT_IDS,
  processPointForStatus,
  PROCESS_POINTS,
  type ProcessPointId,
} from "./processGates";

export type MissionFocusKey =
  | "intake_queue"
  | "assign_handoff"
  | "questionnaire_qa"
  | "legal_review"
  | "docs_chase"
  | "protesta"
  | "field_ops"
  | "report_author"
  | "firm_validation"
  | "delivery_ratify"
  | "billing"
  | "admin_overview";

export type RoleMissionDef = {
  focusKey: MissionFocusKey;
  /** i18n key under `missionControl.focus.*` */
  titleKey: string;
  subtitleKey: string;
  /** Preferred process points this role advances / operates. */
  primaryPoints: readonly ProcessPointId[];
  /**
   * Soft-parallel prep points always reachable in the step tree
   * (even when case.status is earlier — hard gates still block advance).
   */
  softParallelPoints: readonly ProcessPointId[];
  listHref: string;
};

const MISSION_BY_ROLE: Partial<Record<UserRole, RoleMissionDef>> = {
  admin: {
    focusKey: "admin_overview",
    titleKey: "missionControl.focus.admin_overview.title",
    subtitleKey: "missionControl.focus.admin_overview.subtitle",
    primaryPoints: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    softParallelPoints: [],
    listHref: "/portal/cases",
  },
  expert: {
    // Miro: Q, protesta, field ops, dictamen, delivery
    focusKey: "questionnaire_qa",
    titleKey: "missionControl.focus.questionnaire_qa.title",
    subtitleKey: "missionControl.focus.questionnaire_qa.subtitle",
    primaryPoints: [2, 6, 7, 8, 9],
    softParallelPoints: [2],
    listHref: "/portal/cases",
  },
  legal: {
    focusKey: "legal_review",
    titleKey: "missionControl.focus.legal_review.title",
    subtitleKey: "missionControl.focus.legal_review.subtitle",
    primaryPoints: [4],
    softParallelPoints: [2],
    listHref: "/portal/reviews",
  },
  logistics: {
    focusKey: "field_ops",
    titleKey: "missionControl.focus.field_ops.title",
    subtitleKey: "missionControl.focus.field_ops.subtitle",
    primaryPoints: [7],
    // Soft parallel: draft trip from assignment onward
    softParallelPoints: [7],
    listHref: "/portal/cases?status=field_ops",
  },
  accountant: {
    focusKey: "billing",
    titleKey: "missionControl.focus.billing.title",
    subtitleKey: "missionControl.focus.billing.subtitle",
    primaryPoints: [10],
    softParallelPoints: [],
    listHref: "/portal/finance",
  },
};

export function roleMission(
  role: UserRole | string | null | undefined,
): RoleMissionDef | null {
  if (!role) return null;
  return MISSION_BY_ROLE[role as UserRole] ?? null;
}

/** Which mission focus a case status maps to for prioritization. */
export function missionFocusForStatus(
  status: CaseStatus,
): MissionFocusKey | null {
  const point = processPointForStatus(status);
  if (point == null) {
    if (status === "on_hold") return "admin_overview";
    return null;
  }
  const map: Record<ProcessPointId, MissionFocusKey> = {
    1: "intake_queue",
    2: "questionnaire_qa",
    3: "assign_handoff",
    4: "legal_review",
    5: "docs_chase",
    6: "protesta",
    7: "field_ops",
    8: "report_author",
    9: "firm_validation",
    10: "billing",
  };
  return map[point];
}

export function missionStepSlugForRole(
  role: UserRole | string | null | undefined,
): string | null {
  const mission = roleMission(role);
  if (!mission?.primaryPoints.length) return null;
  const first = mission.primaryPoints[0];
  return PROCESS_POINTS[first]?.slug ?? null;
}

/**
 * Process points shown in the case step tree for this role.
 * Admin (and unknown) → full 10. Others → mission + soft-parallel + current PASO ACTUAL.
 */
export function visibleProcessPointIdsForRole(opts: {
  role: UserRole | string | null | undefined;
  currentPoint?: ProcessPointId | number | null;
  status?: CaseStatus | string | null;
}): ProcessPointId[] {
  const mission = roleMission(opts.role);
  if (!mission || mission.focusKey === "admin_overview") {
    return [...PROCESS_POINT_IDS];
  }

  const set = new Set<ProcessPointId>([
    ...mission.primaryPoints,
    ...mission.softParallelPoints,
  ]);

  let current = opts.currentPoint as ProcessPointId | null | undefined;
  if (current == null && opts.status) {
    current = processPointForStatus(opts.status as CaseStatus);
  }
  if (
    current != null &&
    PROCESS_POINT_IDS.includes(current as ProcessPointId)
  ) {
    set.add(current as ProcessPointId);
  }

  return PROCESS_POINT_IDS.filter((id) => set.has(id));
}

/**
 * Whether a case at `processPoint` / `status` is in this role's mission set.
 * Admin sees all; unknown roles fall back to true (no filter).
 */
export function caseRelevantToRoleMission(opts: {
  role: UserRole | string | null | undefined;
  processPoint?: ProcessPointId | number | null;
  status?: CaseStatus | string | null;
}): boolean {
  const mission = roleMission(opts.role);
  if (!mission) return true;
  if (mission.focusKey === "admin_overview") return true;

  let point = opts.processPoint as ProcessPointId | null | undefined;
  if (point == null && opts.status) {
    point = processPointForStatus(opts.status as CaseStatus);
  }
  if (point == null) return true;
  if (
    mission.primaryPoints.includes(point) ||
    mission.softParallelPoints.includes(point)
  ) {
    return true;
  }
  // Soft-parallel: still work while case waits on earlier admin-owned points
  if (opts.role === "expert" && point === 2) return true;
  if (
    opts.role === "logistics" &&
    (point === 2 || point === 3 || point === 6)
  ) {
    return true;
  }
  return false;
}

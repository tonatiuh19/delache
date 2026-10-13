/**
 * Compact ownership badges for case list / pipeline cards:
 * who is Responsible / Accountable at the current process point.
 */

import type { AssignmentRole, CaseStatus } from "./api";
import {
  buildStepOwnershipChips,
  type StepOwnershipChip,
} from "./caseStepNavRules";
import {
  processPointForStatus,
  type ProcessPointId,
} from "./processGates";

export type CaseCardAssignmentLike = {
  assignmentRole: string;
  userName: string;
  isPrimary?: boolean;
};

export type CaseCardOwnershipBadge = {
  /** R / A when derived from process RACI; null for fallback primary expert. */
  letter: "R" | "A" | null;
  /** i18n under process.actor.* (preferred) or team.role.* */
  labelKey: string;
  labelNamespace: "actor" | "role";
  personName: string | null;
  /** Working = Responsible; assigned = Accountable / expert fallback. */
  emphasis: "working" | "assigned";
};

function resolveCardPoint(opts: {
  status: CaseStatus | string;
  holdResumeStatus?: CaseStatus | string | null;
}): ProcessPointId | null {
  const status = opts.status as CaseStatus;
  if (status === "on_hold" && opts.holdResumeStatus) {
    return processPointForStatus(opts.holdResumeStatus as CaseStatus);
  }
  return processPointForStatus(status);
}

function chipToBadge(chip: StepOwnershipChip): CaseCardOwnershipBadge {
  return {
    letter: chip.letter === "R" || chip.letter === "A" ? chip.letter : null,
    labelKey: chip.actor,
    labelNamespace: "actor",
    personName: chip.personName,
    emphasis: chip.letter === "R" ? "working" : "assigned",
  };
}

/**
 * Build up to `max` ownership badges for a case card.
 * Prefers current-point R then A (with names when assigned), then primary expert.
 */
export function buildCaseCardOwnershipBadges(opts: {
  status: CaseStatus | string;
  holdResumeStatus?: CaseStatus | string | null;
  assignments?: readonly CaseCardAssignmentLike[] | null;
  max?: number;
}): CaseCardOwnershipBadge[] {
  const max = opts.max ?? 3;
  const assignments = (opts.assignments ?? []).map((a) => ({
    assignmentRole: a.assignmentRole as AssignmentRole,
    userName: a.userName,
    isPrimary: Boolean(a.isPrimary),
  }));
  const point = resolveCardPoint(opts);
  const badges: CaseCardOwnershipBadge[] = [];
  const seenPeople = new Set<string>();
  const seenKeys = new Set<string>();

  const push = (badge: CaseCardOwnershipBadge) => {
    if (badges.length >= max) return;
    const personKey = badge.personName?.trim().toLowerCase() || "";
    const dedupeKey = personKey
      ? `p:${personKey}`
      : `r:${badge.labelNamespace}:${badge.labelKey}`;
    if (seenKeys.has(dedupeKey)) return;
    if (personKey && seenPeople.has(personKey)) return;
    seenKeys.add(dedupeKey);
    if (personKey) seenPeople.add(personKey);
    badges.push(badge);
  };

  if (point != null) {
    const chips = buildStepOwnershipChips({ point, assignments });
    const ranked = [
      ...chips.filter((c) => c.letter === "R" && c.personName),
      ...chips.filter((c) => c.letter === "R" && !c.personName),
      ...chips.filter((c) => c.letter === "A" && c.personName),
      ...chips.filter((c) => c.letter === "A" && !c.personName),
    ];
    for (const chip of ranked) {
      push(chipToBadge(chip));
      if (badges.length >= max) return badges;
    }
  }

  const primary = assignments.find(
    (a) => a.isPrimary && a.assignmentRole === "expert",
  );
  if (primary?.userName.trim()) {
    push({
      letter: null,
      labelKey: "expert",
      labelNamespace: "role",
      personName: primary.userName.trim(),
      emphasis: "assigned",
    });
  }

  return badges;
}

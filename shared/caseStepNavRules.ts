/**
 * Case step navigation chrome: numbered labels (1 · Step / 1.1 Substep)
 * and always-on ownership chips (RACI roles + assigned people).
 */

import type { AssignmentRole, CaseAssignmentItem } from "./api";
import {
  processPointForSlug,
  visibleSubstepsForStep,
  type CaseDetailSectionId,
  type ProcessStepSlug,
} from "./caseStepTreeRules";
import type { ProcessActor, ProcessPointId, RaciLetter } from "./processGates";
import { PROCESS_POINTS } from "./processGates";
import {
  processActorToStaffRole,
  processPointRaciBuckets,
} from "./processGuidanceRules";

/** `1 · Recepción` */
export function formatStepNavLabel(
  point: number,
  name: string,
): string {
  const label = name.trim();
  if (!label) return String(point);
  return `${point} · ${label}`;
}

/** `1.1 Ubicación` */
export function formatSubstepNavLabel(
  point: number,
  index1Based: number,
  name: string,
): string {
  const label = name.trim();
  const code = `${point}.${index1Based}`;
  if (!label) return code;
  return `${code} ${label}`;
}

/** 1-based ordinal of a subsection within visible substeps for the viewer. */
export function substepOrdinalForSection(opts: {
  stepSlug: string | null | undefined;
  sectionId: CaseDetailSectionId | null | undefined;
  viewerRole?: string | null;
}): number | null {
  if (!opts.sectionId) return null;
  const subs = visibleSubstepsForStep(opts.stepSlug, opts.viewerRole);
  const idx = subs.findIndex((s) => s.sectionId === opts.sectionId);
  return idx >= 0 ? idx + 1 : null;
}

export function stepPointFromSlug(
  stepSlug: string | null | undefined,
): ProcessPointId | null {
  return processPointForSlug(stepSlug);
}

/** Sticky orientation line: step only, or step · focused substep. */
export function formatStickyOrientation(opts: {
  point: number;
  stepName: string;
  substepIndex?: number | null;
  substepName?: string | null;
}): string {
  const step = formatStepNavLabel(opts.point, opts.stepName);
  if (
    opts.substepIndex != null &&
    opts.substepIndex > 0 &&
    opts.substepName?.trim()
  ) {
    return `${step} · ${formatSubstepNavLabel(
      opts.point,
      opts.substepIndex,
      opts.substepName,
    )}`;
  }
  return step;
}

const OWNERSHIP_LETTERS: readonly RaciLetter[] = ["R", "A"];

/** Map process actor → case assignment role(s) that can fulfill it. */
export function assignmentRolesForProcessActor(
  actor: ProcessActor,
): readonly AssignmentRole[] {
  switch (actor) {
    case "expert":
    case "questionnaire_author":
      return ["expert"];
    case "qa":
      return ["qa", "expert"];
    case "technical_director":
      return ["technical_director", "expert"];
    case "coordinator":
      return ["coordinator"];
    case "legal_internal":
      return ["legal_reviewer"];
    case "logistics":
      return ["logistics"];
    case "accountant":
      return ["accountant"];
    case "admin":
    case "law_firm":
    default:
      return [];
  }
}

export type StepOwnershipChip = {
  letter: RaciLetter;
  /** i18n key suffix under process.actor.* */
  actor: ProcessActor;
  /** Assigned person display name when present. */
  personName: string | null;
  /** Staff role hint for i18n (team.role.* / law firm). */
  staffRoleKey: string | null;
};

type AssignmentLike = Pick<
  CaseAssignmentItem,
  "assignmentRole" | "userName" | "isPrimary"
>;

function pickAssignee(
  actor: ProcessActor,
  assignments: readonly AssignmentLike[],
): string | null {
  const roles = new Set(assignmentRolesForProcessActor(actor));
  if (roles.size === 0) return null;
  const matches = assignments.filter((a) =>
    roles.has(a.assignmentRole as AssignmentRole),
  );
  if (matches.length === 0) return null;
  const primary = matches.find((a) => a.isPrimary);
  return (primary ?? matches[0])!.userName.trim() || null;
}

/**
 * Compact ownership chips for a process point: R then A,
 * with assigned names when the case has matching people.
 */
export function buildStepOwnershipChips(opts: {
  point: ProcessPointId;
  assignments?: readonly AssignmentLike[] | null;
}): StepOwnershipChip[] {
  const assignments = opts.assignments ?? [];
  const buckets = processPointRaciBuckets(opts.point);
  const chips: StepOwnershipChip[] = [];
  const seen = new Set<string>();

  for (const letter of OWNERSHIP_LETTERS) {
    const bucket = buckets.find((b) => b.letter === letter);
    if (!bucket) continue;
    for (const actor of bucket.actors) {
      const key = `${letter}:${actor}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const staff = processActorToStaffRole(actor);
      chips.push({
        letter,
        actor,
        personName: pickAssignee(actor, assignments),
        staffRoleKey:
          staff === "law_firm"
            ? "law_firm"
            : staff
              ? String(staff)
              : null,
      });
    }
  }

  // Ensure accountable appears even if only in A bucket empty edge cases
  if (chips.length === 0) {
    const raci = PROCESS_POINTS[opts.point].raci;
    for (const [actor, letter] of Object.entries(raci) as [
      ProcessActor,
      RaciLetter,
    ][]) {
      if (letter !== "R" && letter !== "A") continue;
      chips.push({
        letter,
        actor,
        personName: pickAssignee(actor, assignments),
        staffRoleKey: (() => {
          const staff = processActorToStaffRole(actor);
          if (staff === "law_firm") return "law_firm";
          return staff ? String(staff) : null;
        })(),
      });
    }
  }

  return chips;
}

export function numberedSubstepsForStep(opts: {
  stepSlug: ProcessStepSlug | string | null | undefined;
  viewerRole?: string | null;
}): Array<{
  sectionId: CaseDetailSectionId;
  labelKey: string;
  point: ProcessPointId;
  index: number;
}> {
  const point = processPointForSlug(opts.stepSlug);
  if (point == null) return [];
  return visibleSubstepsForStep(opts.stepSlug, opts.viewerRole).map(
    (sub, i) => ({
      sectionId: sub.sectionId,
      labelKey: sub.labelKey,
      point,
      index: i + 1,
    }),
  );
}

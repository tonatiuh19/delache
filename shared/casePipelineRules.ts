/**
 * Staff cases pipeline (kanban): column order, visibility, drag/drop guards.
 */

import type { CaseStatus, UserRole } from "./api";
import {
  CASE_STATUS_FLOW,
  canTransition,
  type WorkflowTransitionOpts,
} from "./caseWorkflow";
import { canChangeCaseStatus } from "./portalCapabilities";
import {
  processPointToEnforceOnTransition,
  type ListadoProgress,
} from "./processGates";

/** All board columns: workflow + parked statuses. */
export const CASE_PIPELINE_STATUSES: CaseStatus[] = [
  ...CASE_STATUS_FLOW,
  "on_hold",
  "cancelled",
];

export type PipelineDropLockReason = "role" | "transition" | "gates";

export function casePipelineVisibleStatuses(
  statusFilter?: string | null,
): CaseStatus[] {
  const raw = String(statusFilter || "").trim();
  if (raw && (CASE_PIPELINE_STATUSES as readonly string[]).includes(raw)) {
    return [raw as CaseStatus];
  }
  return [...CASE_PIPELINE_STATUSES];
}

export function canDragCaseOnPipeline(
  role: string | null | undefined,
): boolean {
  return canChangeCaseStatus(role);
}

/**
 * Forward +1 workflow moves require current-point gates.
 * Hold/cancel/resume/backward moves are not gate-blocked (matches server).
 * Fail closed when gatesOk is unknown/missing.
 */
export function isForwardTransitionBlockedByGates(opts: {
  fromStatus: CaseStatus;
  toStatus: CaseStatus;
  gatesOk?: boolean | null;
}): boolean {
  const enforcePoint = processPointToEnforceOnTransition(
    opts.fromStatus,
    opts.toStatus,
  );
  if (!enforcePoint) return false;
  return opts.gatesOk !== true;
}

export function pipelineDropLockReason(opts: {
  role: string | null | undefined;
  fromStatus: CaseStatus;
  toStatus: CaseStatus;
  workflowOpts?: WorkflowTransitionOpts;
  listado?: ListadoProgress | null;
}): PipelineDropLockReason | null {
  if (!canDragCaseOnPipeline(opts.role)) return "role";
  if (opts.fromStatus === opts.toStatus) return "transition";
  const check = canTransition(opts.fromStatus, opts.toStatus, {
    role: (opts.role as UserRole | null) ?? null,
    ...opts.workflowOpts,
  });
  if (!check.ok) return "transition";
  if (
    isForwardTransitionBlockedByGates({
      fromStatus: opts.fromStatus,
      toStatus: opts.toStatus,
      gatesOk: opts.listado?.gatesOk,
    })
  ) {
    return "gates";
  }
  return null;
}

export function canDropCaseOnPipelineColumn(opts: {
  role: string | null | undefined;
  fromStatus: CaseStatus;
  toStatus: CaseStatus;
  workflowOpts?: WorkflowTransitionOpts;
  listado?: ListadoProgress | null;
}): boolean {
  return pipelineDropLockReason(opts) === null;
}

export const CASE_PIPELINE_DEFAULT_LIMIT = 20;

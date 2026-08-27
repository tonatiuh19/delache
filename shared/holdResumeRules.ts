/**
 * Batch hold-resume resolution for pipeline listado (mirrors case_status_history SQL).
 */

import type { CaseStatus } from "./api";
import { resolveHoldResumeStatus } from "./caseWorkflow";

export type StatusHistoryHoldRow = {
  caseId: number;
  fromStatus: string;
};

export type StatusHistoryFlowRow = {
  caseId: number;
  toStatus: string;
};

/** Rows must be pre-sorted by created_at DESC (newest first). */
export function latestHoldFromStatusByCase(
  rows: readonly StatusHistoryHoldRow[],
): Map<number, CaseStatus> {
  const map = new Map<number, CaseStatus>();
  for (const row of rows) {
    const cid = row.caseId;
    if (!map.has(cid)) {
      map.set(cid, row.fromStatus as CaseStatus);
    }
  }
  return map;
}

/** Rows must be pre-sorted by created_at DESC (newest first). */
export function latestFlowToStatusByCase(
  rows: readonly StatusHistoryFlowRow[],
): Map<number, CaseStatus> {
  const map = new Map<number, CaseStatus>();
  for (const row of rows) {
    const cid = row.caseId;
    if (!map.has(cid)) {
      map.set(cid, row.toStatus as CaseStatus);
    }
  }
  return map;
}

export function buildHoldResumeStatusByCase(
  onHoldCaseIds: readonly number[],
  holdFromByCase: ReadonlyMap<number, CaseStatus>,
  flowToByCase: ReadonlyMap<number, CaseStatus>,
): Map<number, CaseStatus> {
  const result = new Map<number, CaseStatus>();
  for (const cid of onHoldCaseIds) {
    result.set(
      cid,
      resolveHoldResumeStatus(
        holdFromByCase.get(cid) ?? null,
        flowToByCase.get(cid) ?? null,
      ),
    );
  }
  return result;
}

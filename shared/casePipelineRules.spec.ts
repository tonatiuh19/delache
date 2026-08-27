import { describe, expect, it } from "vitest";
import { CASE_STATUS_FLOW } from "./caseWorkflow";
import {
  CASE_PIPELINE_STATUSES,
  canDragCaseOnPipeline,
  canDropCaseOnPipelineColumn,
  casePipelineVisibleStatuses,
  isForwardTransitionBlockedByGates,
  pipelineDropLockReason,
} from "./casePipelineRules";

describe("casePipelineRules", () => {
  it("lists all workflow columns plus parked statuses", () => {
    expect(CASE_PIPELINE_STATUSES[CASE_PIPELINE_STATUSES.length - 2]).toBe(
      "on_hold",
    );
    expect(CASE_PIPELINE_STATUSES[CASE_PIPELINE_STATUSES.length - 1]).toBe(
      "cancelled",
    );
    expect(CASE_PIPELINE_STATUSES[0]).toBe("intake");
  });

  it("narrows visible columns when status filter is set", () => {
    expect(casePipelineVisibleStatuses("intake")).toEqual(["intake"]);
    expect(casePipelineVisibleStatuses("")).toHaveLength(
      CASE_PIPELINE_STATUSES.length,
    );
    expect(casePipelineVisibleStatuses("not_a_status")).toHaveLength(
      CASE_PIPELINE_STATUSES.length,
    );
  });

  it("allows coordinators to drag and move forward one step", () => {
    expect(canDragCaseOnPipeline("case_coordinator")).toBe(true);
    expect(canDragCaseOnPipeline("admin")).toBe(true);
    expect(canDragCaseOnPipeline("expert")).toBe(false);
    expect(
      canDropCaseOnPipelineColumn({
        role: "case_coordinator",
        fromStatus: "intake",
        toStatus: "assignment",
        listado: { gatesOk: true } as never,
      }),
    ).toBe(true);
    expect(
      pipelineDropLockReason({
        role: "expert",
        fromStatus: "intake",
        toStatus: "assignment",
      }),
    ).toBe("role");
    expect(
      pipelineDropLockReason({
        role: "case_coordinator",
        fromStatus: "intake",
        toStatus: "inspection",
      }),
    ).toBe("transition");
  });

  it("blocks forward drag when process gates are not satisfied", () => {
    expect(
      pipelineDropLockReason({
        role: "case_coordinator",
        fromStatus: "intake",
        toStatus: "assignment",
        listado: { gatesOk: false } as never,
      }),
    ).toBe("gates");
    expect(
      canDropCaseOnPipelineColumn({
        role: "case_coordinator",
        fromStatus: "intake",
        toStatus: "assignment",
        listado: { gatesOk: false } as never,
      }),
    ).toBe(false);
  });

  it("blocks forward drag when listado is missing on a gated transition", () => {
    expect(
      pipelineDropLockReason({
        role: "case_coordinator",
        fromStatus: "intake",
        toStatus: "assignment",
      }),
    ).toBe("gates");
  });

  it("allows parking on hold even when gates are not satisfied", () => {
    expect(
      pipelineDropLockReason({
        role: "case_coordinator",
        fromStatus: "intake",
        toStatus: "on_hold",
        listado: { gatesOk: false } as never,
      }),
    ).toBeNull();
    expect(
      pipelineDropLockReason({
        role: "case_coordinator",
        fromStatus: "intake",
        toStatus: "cancelled",
        listado: { gatesOk: false } as never,
      }),
    ).toBeNull();
  });

  it("does not gate resume from on_hold", () => {
    expect(
      pipelineDropLockReason({
        role: "case_coordinator",
        fromStatus: "on_hold",
        toStatus: "intake",
        listado: { gatesOk: false } as never,
      }),
    ).toBeNull();
  });

  it("allows resume from on_hold to last workflow status via workflowOpts", () => {
    expect(
      canDropCaseOnPipelineColumn({
        role: "case_coordinator",
        fromStatus: "on_hold",
        toStatus: "inspection",
        workflowOpts: { lastWorkflowStatus: "inspection" },
        listado: { gatesOk: false, holdResumeStatus: "inspection" } as never,
      }),
    ).toBe(true);
    expect(
      pipelineDropLockReason({
        role: "case_coordinator",
        fromStatus: "on_hold",
        toStatus: "intake",
        workflowOpts: { lastWorkflowStatus: "inspection" },
        listado: { gatesOk: false, holdResumeStatus: "inspection" } as never,
      }),
    ).toBe("transition");
  });

  it("aligns gate locks with every forward +1 workflow step", () => {
    for (let i = 0; i < CASE_STATUS_FLOW.length - 1; i++) {
      const from = CASE_STATUS_FLOW[i];
      const to = CASE_STATUS_FLOW[i + 1];
      expect(
        isForwardTransitionBlockedByGates({
          fromStatus: from,
          toStatus: to,
          gatesOk: false,
        }),
        `${from} → ${to} should block when gates fail`,
      ).toBe(true);
      expect(
        isForwardTransitionBlockedByGates({
          fromStatus: from,
          toStatus: to,
          gatesOk: true,
        }),
        `${from} → ${to} should allow when gates pass`,
      ).toBe(false);
      expect(
        isForwardTransitionBlockedByGates({
          fromStatus: from,
          toStatus: to,
          gatesOk: undefined,
        }),
        `${from} → ${to} should fail closed without gatesOk`,
      ).toBe(true);
    }
  });

  it("does not gate backward review returns", () => {
    expect(
      isForwardTransitionBlockedByGates({
        fromStatus: "legal_review_questionnaire",
        toStatus: "questionnaire",
        gatesOk: false,
      }),
    ).toBe(false);
    expect(
      isForwardTransitionBlockedByGates({
        fromStatus: "legal_validation",
        toStatus: "technical_report",
        gatesOk: false,
      }),
    ).toBe(false);
  });

  it("gates P10 forward to court delivery but not the backward path", () => {
    expect(
      pipelineDropLockReason({
        role: "case_coordinator",
        fromStatus: "legal_validation",
        toStatus: "court_delivery",
        listado: { gatesOk: false } as never,
      }),
    ).toBe("gates");
    expect(
      pipelineDropLockReason({
        role: "case_coordinator",
        fromStatus: "legal_validation",
        toStatus: "technical_report",
        listado: { gatesOk: false } as never,
      }),
    ).toBeNull();
  });
});

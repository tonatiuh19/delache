import { describe, expect, it } from "vitest";
import {
  protestaClockStartsOnArtifact,
  requiresProtestaScanUpload,
  softParallelAllowed,
} from "./softParallelRules";

describe("softParallelRules", () => {
  it("allows draft logistics and GPS after assignment", () => {
    expect(softParallelAllowed("assignment", "draft_logistics_trip")).toBe(
      true,
    );
    expect(softParallelAllowed("questionnaire", "draft_gps_street_view")).toBe(
      true,
    );
    expect(softParallelAllowed("intake", "draft_logistics_trip")).toBe(false);
  });

  it("only allows inspection complete / field evidence in field_ops", () => {
    expect(
      softParallelAllowed("court_acceptance", "mark_inspection_complete"),
    ).toBe(false);
    expect(softParallelAllowed("field_ops", "mark_inspection_complete")).toBe(
      true,
    );
    expect(softParallelAllowed("field_ops", "upload_field_evidence")).toBe(
      true,
    );
  });

  it("allows field rework while on_hold when resume target is field_ops", () => {
    expect(
      softParallelAllowed("on_hold", "upload_field_evidence", {
        holdResumeStatus: "field_ops",
      }),
    ).toBe(true);
    expect(
      softParallelAllowed("on_hold", "draft_logistics_trip", {
        holdResumeStatus: "assignment",
      }),
    ).toBe(true);
    expect(
      softParallelAllowed("on_hold", "upload_field_evidence", {
        holdResumeStatus: "questionnaire",
      }),
    ).toBe(false);
    expect(softParallelAllowed("on_hold", "upload_field_evidence")).toBe(
      false,
    );
  });

  it("maps legacy statuses through soft parallel", () => {
    expect(softParallelAllowed("logistics", "draft_logistics_trip")).toBe(true);
    expect(softParallelAllowed("inspection", "upload_field_evidence")).toBe(
      true,
    );
  });

  it("starts protesta clock only on artifact, not modality alone", () => {
    expect(
      protestaClockStartsOnArtifact({
        protestaFiled: false,
        protestaModality: "virtual",
      }),
    ).toBe(false);
    expect(
      protestaClockStartsOnArtifact({
        protestaFiled: true,
        protestaModality: "presencial",
      }),
    ).toBe(true);
    expect(requiresProtestaScanUpload("presencial")).toBe(true);
    expect(requiresProtestaScanUpload("virtual")).toBe(false);
  });
});

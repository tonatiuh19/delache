import { describe, expect, it } from "vitest";
import {
  buildDespachoProgressSteps,
  despachoListadoBadges,
  despachoSeguimientoReadOnly,
  filterDespachoCases,
  DESPACHO_PROGRESS_POINTS,
} from "./despachoPanelRules";
import type { ListadoProgress } from "./processGates";

const listadoStub = (patch: Partial<ListadoProgress> = {}): ListadoProgress => ({
  processPoint: 1,
  gatesOk: true,
  primaryExpert: false,
  intakeComplete: false,
  questionnaireApproved: false,
  streetViewDone: false,
  advanceReleased: false,
  advancePaid: false,
  plaintiffQuestionnaire: false,
  protestaFiled: false,
  clock10DueAt: null,
  logisticsReady: false,
  inspectionComplete: false,
  reportInternalOk: false,
  reportFirmOk: false,
  ratified: false,
  attendedWithReport: false,
  finalReleased: false,
  finalPaid: false,
  ...patch,
});

describe("despachoPanelRules", () => {
  it("builds nine progress steps with PDF pills", () => {
    expect(DESPACHO_PROGRESS_POINTS).toHaveLength(9);
    const steps = buildDespachoProgressSteps({
      status: "legal_review_questionnaire",
    });
    expect(steps).toHaveLength(9);
    const current = steps.find((s) => s.pill === "in_progress");
    expect(current?.point).toBe(4);
    expect(steps.filter((s) => s.pill === "done").length).toBeGreaterThan(0);
    expect(steps.some((s) => s.pill === "pending")).toBe(true);
  });

  it("reuses listado badges for Estado de revisión", () => {
    const badges = despachoListadoBadges({
      status: "legal_review_questionnaire",
      listado: listadoStub({ processPoint: 4 }),
    });
    expect(badges.some((b) => b.id === "en_revision")).toBe(true);
  });

  it("filters by query and badge", () => {
    const cases = [
      {
        status: "intake" as const,
        caseNumber: "DEL-1",
        title: "Terreno El Roble",
        propertyCity: "Guadalajara",
        listado: listadoStub(),
      },
      {
        status: "legal_review_questionnaire" as const,
        caseNumber: "DEL-2",
        title: "Otro",
        propertyCity: "CDMX",
        listado: listadoStub({ processPoint: 4 }),
      },
    ];
    expect(
      filterDespachoCases({ cases, query: "roble", badgeId: "all" }),
    ).toHaveLength(1);
    expect(
      filterDespachoCases({
        cases,
        query: "",
        badgeId: "en_revision",
      }),
    ).toHaveLength(1);
    expect(despachoSeguimientoReadOnly()).toBe(true);
  });
});

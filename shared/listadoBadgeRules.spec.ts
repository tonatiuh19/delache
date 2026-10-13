import { describe, expect, it } from "vitest";
import { deriveListadoBadges } from "./listadoBadgeRules";
import type { ListadoProgress } from "./processGates";

const baseListado = {
  gatesOk: true,
  processPoint: 3,
} as ListadoProgress;

describe("listadoBadgeRules", () => {
  it("marks completed + paid", () => {
    const badges = deriveListadoBadges({
      status: "completed",
      listado: { ...baseListado, finalPaid: true },
    });
    expect(badges.map((b) => b.id)).toEqual(["cerrado", "pagado"]);
  });

  it("flags overdue clock as vencido", () => {
    const badges = deriveListadoBadges({
      status: "field_ops",
      listado: {
        ...baseListado,
        clock10DueAt: "2020-01-01T00:00:00.000Z",
      },
      nowMs: Date.parse("2026-01-01T00:00:00.000Z"),
    });
    expect(badges.some((b) => b.id === "vencido")).toBe(true);
  });

  it("uses en_revision for legal review", () => {
    const badges = deriveListadoBadges({
      status: "legal_review_questionnaire",
      listado: baseListado,
    });
    expect(badges[0]?.id).toBe("en_revision");
  });

  it("uses en_espera when gates blocked outside review statuses", () => {
    const badges = deriveListadoBadges({
      status: "questionnaire",
      listado: { ...baseListado, gatesOk: false },
    });
    expect(badges.some((b) => b.id === "en_espera")).toBe(true);
  });

  it("defaults to activo for open healthy cases", () => {
    const badges = deriveListadoBadges({
      status: "assignment",
      listado: baseListado,
    });
    expect(badges.map((b) => b.id)).toEqual(["activo"]);
  });
});

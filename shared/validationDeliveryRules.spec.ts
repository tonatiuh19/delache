import { describe, expect, it } from "vitest";
import { buildValidationDeliveryChecklist } from "./validationDeliveryRules";

describe("validationDeliveryRules", () => {
  it("starts with firm review active", () => {
    const steps = buildValidationDeliveryChecklist({});
    expect(steps[0]).toMatchObject({ id: "firm_review", done: false, active: true });
    expect(steps.filter((s) => s.active)).toHaveLength(1);
  });

  it("advances through firm → court → ratify → final", () => {
    const afterFirm = buildValidationDeliveryChecklist({
      listado: { reportFirmOk: true } as never,
    });
    expect(afterFirm.find((s) => s.id === "firm_review")?.done).toBe(true);
    expect(afterFirm.find((s) => s.id === "court_filing")?.active).toBe(true);

    const afterCourt = buildValidationDeliveryChecklist({
      listado: { reportFirmOk: true } as never,
      hasCourtFiling: true,
    });
    expect(afterCourt.find((s) => s.id === "ratification")?.active).toBe(true);
    expect(afterCourt.find((s) => s.id === "ratification")?.done).toBe(false);

    const afterRatPdf = buildValidationDeliveryChecklist({
      listado: { reportFirmOk: true } as never,
      hasCourtFiling: true,
      hasRatificationPdf: true,
    });
    expect(afterRatPdf.find((s) => s.id === "ratification")?.done).toBe(true);
    expect(afterRatPdf.find((s) => s.id === "final_released")?.active).toBe(
      true,
    );

    const done = buildValidationDeliveryChecklist({
      listado: {
        reportFirmOk: true,
        ratified: true,
        finalReleased: true,
      } as never,
      hasCourtFiling: true,
      hasRatificationPdf: true,
    });
    expect(done.every((s) => s.done)).toBe(true);
    expect(done.every((s) => !s.active)).toBe(true);
  });

  it("does not mark ratification done from schedule alone", () => {
    const steps = buildValidationDeliveryChecklist({
      listado: { reportFirmOk: true } as never,
      hasCourtFiling: true,
      hasRatificationPdf: false,
    });
    expect(steps.find((s) => s.id === "ratification")?.done).toBe(false);
  });
});

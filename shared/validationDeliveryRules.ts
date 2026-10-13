/**
 * P9 validation & delivery choreography checklist (firm → court → ratify).
 */

import type { ListadoProgress } from "./processGates";

export type ValidationDeliveryStepId =
  | "firm_review"
  | "court_filing"
  | "ratification"
  | "final_released";

export type ValidationDeliveryStep = {
  id: ValidationDeliveryStepId;
  done: boolean;
  active: boolean;
};

export function buildValidationDeliveryChecklist(opts: {
  listado?: ListadoProgress | null;
  hasCourtFiling?: boolean;
  /** Miro PDF on file — schedule alone does not complete this step. */
  hasRatificationPdf?: boolean;
}): ValidationDeliveryStep[] {
  const listado = opts.listado;
  const firmOk = Boolean(listado?.reportFirmOk);
  const courtFiled = Boolean(opts.hasCourtFiling);
  const ratified = Boolean(listado?.ratified || listado?.attendedWithReport);
  const finalReleased = Boolean(listado?.finalReleased);
  const ratificationDone =
    Boolean(opts.hasRatificationPdf) || ratified || finalReleased;

  const steps: Omit<ValidationDeliveryStep, "active">[] = [
    { id: "firm_review", done: firmOk },
    { id: "court_filing", done: courtFiled },
    { id: "ratification", done: ratificationDone },
    { id: "final_released", done: finalReleased },
  ];

  let activeSet = false;
  return steps.map((s) => {
    const active = !s.done && !activeSet;
    if (active) activeSet = true;
    return { ...s, active };
  });
}

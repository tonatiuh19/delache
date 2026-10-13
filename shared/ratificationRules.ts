/**
 * P9 validation_delivery: ratification evidence or scheduled comparecencia.
 */

export type RatificationGateInput = {
  ratificationPresent: boolean;
  courtFilingPresent: boolean;
  ratificationScheduledAt: string | null | undefined;
};

export function ratificationScheduled(
  scheduledAt: string | null | undefined,
): boolean {
  if (!scheduledAt || !scheduledAt.trim()) return false;
  const t = new Date(scheduledAt).getTime();
  return Number.isFinite(t);
}

/** Satisfies P9 ratification requirement — Miro PDF on file (schedule is planning only). */
export function ratificationGateSatisfied(
  input: RatificationGateInput,
): boolean {
  return input.ratificationPresent === true;
}

export function ratificationGateMissingCode(
  input: RatificationGateInput,
): "doc:ratification" | "court:ratification_scheduled" | null {
  if (ratificationGateSatisfied(input)) return null;
  return "doc:ratification";
}

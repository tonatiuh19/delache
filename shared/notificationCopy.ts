/**
 * Localized in-app notification title/body for transactional events.
 * Keep inlined copy in api/index.ts in sync.
 */

import type { AppLocale } from "./i18n";
import { emailAssignmentRoleLabel } from "./emailLabels";
import { formatExpertDeliveryDueForLocale } from "./expertDeliveryRules";

export function assignmentNotificationCopy(opts: {
  locale: AppLocale;
  caseNumber: string;
  role: string;
  deliveryDueAt?: Date | null;
}): { title: string; body: string } {
  const roleLabel = emailAssignmentRoleLabel(opts.role, opts.locale);
  const dueLine =
    opts.deliveryDueAt && opts.role === "expert"
      ? formatExpertDeliveryDueForLocale(opts.deliveryDueAt, opts.locale)
      : null;

  if (opts.locale === "en") {
    return {
      title: `Assigned to ${opts.caseNumber}`,
      body: dueLine
        ? `You were assigned as ${roleLabel} on case ${opts.caseNumber}. Deliver by ${dueLine}.`
        : `You were assigned as ${roleLabel} on case ${opts.caseNumber}.`,
    };
  }
  return {
    title: `Asignado a ${opts.caseNumber}`,
    body: dueLine
      ? `Te asignaron como ${roleLabel} en el expediente ${opts.caseNumber}. Entrega antes del ${dueLine}.`
      : `Te asignaron como ${roleLabel} en el expediente ${opts.caseNumber}.`,
  };
}

export function expertDeliverySetNotificationCopy(opts: {
  locale: AppLocale;
  caseNumber: string;
  dueAt: Date;
}): { title: string; body: string } {
  const due = formatExpertDeliveryDueForLocale(opts.dueAt, opts.locale);
  if (opts.locale === "en") {
    return {
      title: `Delivery date · ${opts.caseNumber}`,
      body: `Your delivery deadline for case ${opts.caseNumber} is ${due}.`,
    };
  }
  return {
    title: `Fecha de entrega · ${opts.caseNumber}`,
    body: `Tu fecha de entrega para el expediente ${opts.caseNumber} es el ${due}.`,
  };
}

export function expertDeliveryClearNotificationCopy(opts: {
  locale: AppLocale;
  caseNumber: string;
}): { title: string; body: string } {
  if (opts.locale === "en") {
    return {
      title: `Delivery date cleared · ${opts.caseNumber}`,
      body: `The delivery deadline for case ${opts.caseNumber} was removed.`,
    };
  }
  return {
    title: `Fecha de entrega eliminada · ${opts.caseNumber}`,
    body: `Se eliminó la fecha de entrega del expediente ${opts.caseNumber}.`,
  };
}

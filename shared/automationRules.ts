/**
 * Product.md automation decision helpers.
 * API executes the returned actions; this module stays pure.
 */

export type AutomationAction =
  | {
      type: "create_invoice";
      invoiceType: "advance" | "final";
      reason: string;
    }
  | {
      type: "notify";
      notificationType:
        | "qa_requested"
        | "invoice_pending"
        | "deadline_approaching"
        | "report_approved"
        | "missing_documents"
        | "inspection_scheduled"
        | "travel_confirmed"
        | "payment_received"
        | "court_filing";
      reason: string;
    }
  | {
      type: "open_review";
      stage: "grammar_qa" | "technical_director" | "internal_legal" | "external_law_firm";
      reason: string;
    };

export function automationOnQuestionnaireQaApproved(): AutomationAction[] {
  return [
    {
      type: "create_invoice",
      invoiceType: "advance",
      reason: "Questionnaire passed QA — trigger advance payment (P3)",
    },
    {
      type: "notify",
      notificationType: "invoice_pending",
      reason: "Advance invoice pending after questionnaire QA approval",
    },
  ];
}

/** @deprecated Advance now fires on QA approval (P3), not legal approval. */
export function automationOnQuestionnaireApproved(): AutomationAction[] {
  return automationOnQuestionnaireQaApproved();
}

export function automationOnInspectionCompleted(): AutomationAction[] {
  return [
    {
      type: "notify",
      notificationType: "qa_requested",
      reason: "Inspection completed — notify QA",
    },
  ];
}

export function automationOnDeadlineApproaching(
  severity: string,
): AutomationAction[] {
  if (severity !== "critical" && severity !== "overdue") return [];
  return [
    {
      type: "notify",
      notificationType: "deadline_approaching",
      reason: "Deadline within 2 days or overdue — escalate",
    },
  ];
}

export function automationOnReportApproved(): AutomationAction[] {
  return [
    {
      type: "notify",
      notificationType: "report_approved",
      reason: "Report approved — notify legal",
    },
  ];
}

export function automationOnCaseCompletedOrRatified(
  caseStatus: string,
): AutomationAction[] {
  if (caseStatus !== "completed" && caseStatus !== "accounting") return [];
  return [
    {
      type: "create_invoice",
      invoiceType: "final",
      reason: "Case accounting/completed — enable final invoice",
    },
    {
      type: "notify",
      notificationType: "invoice_pending",
      reason: "Final invoice pending",
    },
  ];
}

export function automationOnReportEnterExternalReview(): AutomationAction[] {
  return [
    {
      type: "open_review",
      stage: "external_law_firm",
      reason: "Report entered external law firm review",
    },
  ];
}

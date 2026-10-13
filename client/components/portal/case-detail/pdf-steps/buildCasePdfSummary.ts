import type { TFunction } from "i18next";
import type { CaseDetail, CaseAssignmentItem } from "@shared/api";
import type { CasePdfSummaryItem } from "@/components/portal/case-detail/CasePdfStepShell";

function formatShortDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDay(iso: string | null | undefined, locale: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function buildCasePdfSummary(opts: {
  t: TFunction;
  locale: string;
  selected: CaseDetail;
  assignments: readonly CaseAssignmentItem[];
  statusLabel?: string;
}): CasePdfSummaryItem[] {
  const expert = opts.assignments.find(
    (a) => a.isPrimary && a.assignmentRole === "expert",
  );
  return [
    {
      icon: "folio",
      label: opts.t("cases.pdfStep.summary.folio"),
      value: opts.selected.caseNumber,
      sub: opts.selected.title,
    },
    {
      icon: "firm",
      label: opts.t("cases.pdfStep.summary.lawFirm"),
      value: opts.selected.lawFirmName?.trim() || "—",
    },
    {
      icon: "calendar",
      label: opts.t("cases.pdfStep.summary.sentAt"),
      value: formatShortDate(opts.selected.createdAt, opts.locale),
    },
    {
      icon: "calendar",
      label: opts.t("cases.pdfStep.summary.deadline"),
      value: formatShortDay(
        opts.selected.externalCourtDeadlineAt,
        opts.locale,
      ),
    },
    {
      icon: "person",
      label: opts.t("cases.pdfStep.summary.expert"),
      value: expert?.userName?.trim() || opts.t("cases.pdfStep.summary.unassigned"),
      sub: expert ? opts.t("cases.pdfStep.summary.expertRole") : null,
    },
  ];
}

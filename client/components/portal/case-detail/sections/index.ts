import { lazy, type LazyExoticComponent, type ComponentType } from "react";
import type { CaseDetailSectionProps } from "./caseDetailSectionShared";

export { CaseDetailSectionFallback } from "./CaseDetailSectionFallback";
export {
  ASSIGNMENT_ROLES,
  MEASUREMENT_TYPES,
  severityClass,
  type CaseDetailSectionProps,
} from "./caseDetailSectionShared";

type LazySection = LazyExoticComponent<ComponentType<CaseDetailSectionProps>>;

export const LazyCaseLocationSection = lazy(
  () => import("./CaseLocationSection"),
) as LazySection;
export const LazyCaseCompletenessSection = lazy(
  () => import("./CaseCompletenessSection"),
) as LazySection;
export const LazyCaseDeadlinesSection = lazy(
  () => import("./CaseDeadlinesSection"),
) as LazySection;
export const LazyCaseWorkflowSection = lazy(
  () => import("./CaseWorkflowSection"),
) as LazySection;
export const LazyCaseNotesSection = lazy(
  () => import("./CaseNotesSection"),
) as LazySection;
export const LazyCaseDocumentsSection = lazy(
  () => import("./CaseDocumentsSection"),
) as LazySection;
export const LazyCaseAssignmentsSection = lazy(
  () => import("./CaseAssignmentsSection"),
) as LazySection;
export const LazyCaseQuestionnaireSection = lazy(
  () => import("./CaseQuestionnaireSection"),
) as LazySection;
export const LazyCaseReviewsSection = lazy(
  () => import("./CaseReviewsSection"),
) as LazySection;
export const LazyCaseInspectionsSection = lazy(
  () => import("./CaseInspectionsSection"),
) as LazySection;
export const LazyCaseEvidenceSection = lazy(
  () => import("./CaseEvidenceSection"),
) as LazySection;
export const LazyCaseLogisticsSection = lazy(
  () => import("./CaseLogisticsSection"),
) as LazySection;
export const LazyCaseReportsSection = lazy(
  () => import("./CaseReportsSection"),
) as LazySection;
export const LazyCaseFinanceSection = lazy(
  () => import("./CaseFinanceSection"),
) as LazySection;
export const LazyCaseAuditSection = lazy(
  () => import("./CaseAuditSection"),
) as LazySection;

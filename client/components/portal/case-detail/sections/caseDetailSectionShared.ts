import type { AssignmentRole, MeasurementType } from "@shared/api";
import type { CaseDetailSectionId } from "@shared/caseStepTreeRules";

export type CaseDetailSectionProps = {
  publicUuid: string;
  focusedSection?: CaseDetailSectionId | null;
};

export const ASSIGNMENT_ROLES: AssignmentRole[] = [
  "expert",
  "coordinator",
  "legal_reviewer",
  "logistics",
  "accountant",
  "qa",
  "technical_director",
  "observer",
];

export const MEASUREMENT_TYPES: MeasurementType[] = [
  "horizontal_distance",
  "vertical_distance",
  "pole_distance",
  "other",
];

export function severityClass(level: string) {
  if (level === "overdue" || level === "critical") return "text-destructive";
  if (level === "warning") return "text-primary";
  return "text-muted-foreground";
}

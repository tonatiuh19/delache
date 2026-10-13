import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import {
  clientStepNumber,
  type CaseDetailSectionId,
} from "@shared/caseStepTreeRules";
import type { ProcessPointId } from "@shared/processGates";
import {
  formatStepNavLabel,
  formatSubstepNavLabel,
  substepOrdinalForSection,
} from "@shared/caseStepNavRules";

type CaseStepNavContextValue = {
  point: ProcessPointId;
  stepSlug: string;
  viewerRole?: string | null;
  activeSection?: CaseDetailSectionId | null;
};

const CaseStepNavContext = createContext<CaseStepNavContextValue | null>(
  null,
);

export function CaseStepNavProvider({
  point,
  stepSlug,
  viewerRole,
  activeSection,
  children,
}: CaseStepNavContextValue & { children: ReactNode }) {
  return (
    <CaseStepNavContext.Provider
      value={{ point, stepSlug, viewerRole, activeSection }}
    >
      {children}
    </CaseStepNavContext.Provider>
  );
}

export function useCaseStepNav(): CaseStepNavContextValue | null {
  return useContext(CaseStepNavContext);
}

/** Prefix section titles with `1.2 …` when inside a numbered step view. */
export function useNumberedSectionTitle(
  sectionId: CaseDetailSectionId,
  baseTitle: string,
): string {
  const nav = useCaseStepNav();
  if (!nav) return baseTitle;
  const ord = substepOrdinalForSection({
    stepSlug: nav.stepSlug,
    sectionId,
    viewerRole: nav.viewerRole,
  });
  const displayPoint = clientStepNumber(nav.point);
  if (ord == null) return formatStepNavLabel(displayPoint, baseTitle);
  return formatSubstepNavLabel(displayPoint, ord, baseTitle);
}

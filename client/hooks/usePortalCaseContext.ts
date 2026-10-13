import { useMemo } from "react";
import { useLocation } from "react-router-dom";

const CASE_DETAIL_PATH =
  /^\/portal\/cases\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

const CASE_STEP_PATH =
  /^\/portal\/cases\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/p\//i;

const NEW_CASE_PATH = /^\/portal\/cases\/new\/?$/;

export function parseCaseDetailPath(pathname: string): string | null {
  const match = pathname.match(CASE_DETAIL_PATH);
  return match?.[1] ?? null;
}

export function isCaseStepPath(pathname: string): boolean {
  return CASE_STEP_PATH.test(pathname);
}

/** Unsaved staff create page. Same chrome as an open expediente. */
export function isNewCasePath(pathname: string): boolean {
  return NEW_CASE_PATH.test(pathname);
}

/** True when staff portal is on a case detail route (overview or step). */
export function usePortalCaseContext() {
  const { pathname } = useLocation();

  return useMemo(() => {
    if (isNewCasePath(pathname)) {
      return {
        inCaseContext: true as const,
        inCaseStepView: false as const,
        isNewCase: true as const,
        publicUuid: null,
      };
    }
    const publicUuid = parseCaseDetailPath(pathname);
    if (!publicUuid) {
      return {
        inCaseContext: false as const,
        inCaseStepView: false as const,
        isNewCase: false as const,
        publicUuid: null,
      };
    }
    return {
      inCaseContext: true as const,
      inCaseStepView: isCaseStepPath(pathname),
      isNewCase: false as const,
      publicUuid,
    };
  }, [pathname]);
}

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "delache_cases_view";

export type CasesViewMode = "list" | "pipeline";

export function readStoredCasesViewMode(): CasesViewMode | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === "list" || raw === "pipeline") return raw;
  return null;
}

export function defaultCasesViewModeForWidth(): CasesViewMode {
  if (typeof window === "undefined") return "pipeline";
  return window.matchMedia("(min-width: 1024px)").matches ? "pipeline" : "list";
}

/** Sync preference used for first paint / skeleton selection. */
export function resolveCasesViewMode(): CasesViewMode {
  return readStoredCasesViewMode() ?? defaultCasesViewModeForWidth();
}

/** Desktop defaults to pipeline; mobile defaults to list; persisted in localStorage. */
export function useCasesViewMode() {
  const [view, setView] = useState<CasesViewMode>(() => resolveCasesViewMode());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, view);
  }, [view]);

  const setViewMode = useCallback((mode: CasesViewMode) => {
    setView(mode);
  }, []);

  return { view, setViewMode };
}

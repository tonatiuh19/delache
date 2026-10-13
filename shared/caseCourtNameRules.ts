/**
 * Resolve court (juzgado) name for case create.
 * Prefer explicit payload; else firm default (despacho preferred court).
 */

export function resolveCaseCourtName(opts: {
  provided?: string | null;
  firmDefaultCourtName?: string | null;
}): string | null {
  const provided = (opts.provided ?? "").trim();
  if (provided) return provided;
  const fallback = (opts.firmDefaultCourtName ?? "").trim();
  return fallback || null;
}

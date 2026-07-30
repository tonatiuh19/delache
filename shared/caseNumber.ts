/**
 * Case number format helpers.
 * Template tokens: {YYYY}, {YY}, {MM}, {SEQ:n} where n is zero-pad width.
 * Example: DEL-{YYYY}-{SEQ:4} → DEL-2026-0001
 */

const TOKEN_RE = /\{(YYYY|YY|MM|SEQ(?::(\d+))?)\}/g;

export function isValidCaseNumberFormat(format: string): boolean {
  const trimmed = format.trim();
  if (!trimmed || trimmed.length > 64) return false;
  if (!trimmed.includes("{SEQ")) return false;
  // Allow letters, numbers, dash, underscore, and tokens only
  const stripped = trimmed.replace(TOKEN_RE, "");
  return /^[A-Za-z0-9\-_]*$/.test(stripped);
}

export function renderCaseNumber(
  format: string,
  seq: number,
  now = new Date(),
): string {
  const year = now.getUTCFullYear();
  return format.replace(TOKEN_RE, (_match, token: string, width?: string) => {
    if (token === "YYYY") return String(year);
    if (token === "YY") return String(year).slice(-2);
    if (token === "MM") return String(now.getUTCMonth() + 1).padStart(2, "0");
    if (token.startsWith("SEQ")) {
      const pad = Math.min(Math.max(Number(width || 4), 1), 12);
      return String(seq).padStart(pad, "0");
    }
    return _match;
  });
}

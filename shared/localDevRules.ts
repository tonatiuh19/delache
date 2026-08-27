/**
 * Detect local / loopback hosts so UI can warn that email CTAs will point
 * at localhost (unreachable for real recipients).
 */

export function isLocalAppHostname(hostname: string | null | undefined): boolean {
  const host = String(hostname || "")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");
  if (!host) return false;
  if (host === "localhost" || host === "0.0.0.0") return true;
  if (host === "::1" || host === "[::1]") return true;
  if (host.endsWith(".localhost")) return true;
  if (/^127(?:\.\d{1,3}){3}$/.test(host)) return true;
  return false;
}

export function isLocalAppUrl(raw: string | null | undefined): boolean {
  const text = String(raw || "").trim();
  if (!text) return false;
  try {
    const url = new URL(text.includes("://") ? text : `http://${text}`);
    return isLocalAppHostname(url.hostname);
  } catch {
    return isLocalAppHostname(text.split(":")[0]);
  }
}

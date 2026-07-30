/**
 * Deploy version guards: require semver MAJOR.MINOR.PATCH and must be the next
 * consecutive bump from production (patch +1, minor +1 → .0, or major +1 → .0.0).
 */

const SEMVER_PART = "(?:0|[1-9]\\d*)";
const SEMVER_RE = new RegExp(
  `^(${SEMVER_PART})\\.(${SEMVER_PART})\\.(${SEMVER_PART})$`,
);

export type SemverParts = [number, number, number];

export function parseSemver(version: string): SemverParts | null {
  const m = version.trim().match(SEMVER_RE);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

export function formatSemver([major, minor, patch]: SemverParts): string {
  return `${major}.${minor}.${patch}`;
}

export function compareSemver(a: SemverParts, b: SemverParts): -1 | 0 | 1 {
  for (let i = 0; i < 3; i++) {
    if (a[i] < b[i]) return -1;
    if (a[i] > b[i]) return 1;
  }
  return 0;
}

export function allowedNextVersions(current: SemverParts): SemverParts[] {
  const [major, minor, patch] = current;
  return [
    [major, minor, patch + 1],
    [major, minor + 1, 0],
    [major + 1, 0, 0],
  ];
}

export function isConsecutiveBump(
  current: SemverParts,
  next: SemverParts,
): boolean {
  return allowedNextVersions(current).some(
    (allowed) => compareSemver(allowed, next) === 0,
  );
}

export type DeployVersionCheck =
  | { ok: true; version: string }
  | { ok: false; reason: string };

export function checkDeployVersion(
  candidate: string,
  current: string | null | undefined,
): DeployVersionCheck {
  const version = candidate.trim();
  if (!version) {
    return { ok: false, reason: "Version cannot be empty." };
  }

  const next = parseSemver(version);
  if (!next) {
    return {
      ok: false,
      reason: `Invalid version "${version}". Use MAJOR.MINOR.PATCH (e.g. 1.4.8).`,
    };
  }

  const currentTrimmed = current?.trim() || "";
  if (!currentTrimmed) return { ok: true, version };

  const prev = parseSemver(currentTrimmed);
  if (!prev) return { ok: true, version };

  const cmp = compareSemver(next, prev);
  if (cmp === 0) {
    return {
      ok: false,
      reason: `Version ${version} is already in production.`,
    };
  }
  if (cmp < 0) {
    return {
      ok: false,
      reason: `Version ${version} is older than production ${currentTrimmed}.`,
    };
  }
  if (!isConsecutiveBump(prev, next)) {
    const allowed = allowedNextVersions(prev).map(formatSemver).join(", ");
    return {
      ok: false,
      reason: `Version ${version} skips ahead. Allowed: ${allowed}.`,
    };
  }
  return { ok: true, version };
}

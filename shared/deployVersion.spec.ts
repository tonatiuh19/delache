import { describe, expect, it } from "vitest";
import {
  allowedNextVersions,
  checkDeployVersion,
  compareSemver,
  isConsecutiveBump,
  parseSemver,
  type DeployVersionCheck,
} from "@shared/deployVersion";

function expectRejected(r: DeployVersionCheck, pattern: RegExp | string) {
  expect(r).toEqual(
    expect.objectContaining({
      ok: false,
      reason: expect.any(String),
    }),
  );
  if (r.ok === false) {
    if (typeof pattern === "string") {
      expect(r.reason).toContain(pattern);
    } else {
      expect(r.reason).toMatch(pattern);
    }
  }
}

describe("parseSemver", () => {
  it("parses MAJOR.MINOR.PATCH", () => {
    expect(parseSemver("1.4.8")).toEqual([1, 4, 8]);
    expect(parseSemver("0.0.1")).toEqual([0, 0, 1]);
  });

  it("rejects incomplete and malformed versions", () => {
    for (const bad of ["1.", "1.0.", "1.0", "v1.4.8", "01.2.3", ""]) {
      expect(parseSemver(bad), bad).toBeNull();
    }
  });
});

describe("compareSemver", () => {
  it("orders patch / minor / major", () => {
    expect(compareSemver([1, 4, 7], [1, 4, 8])).toBe(-1);
    expect(compareSemver([1, 4, 8], [1, 4, 7])).toBe(1);
    expect(compareSemver([1, 4, 7], [1, 4, 7])).toBe(0);
  });
});

describe("consecutive bumps", () => {
  it("lists only next patch / minor / major from current", () => {
    expect(allowedNextVersions([0, 1, 0]).map((v) => v.join("."))).toEqual([
      "0.1.1",
      "0.2.0",
      "1.0.0",
    ]);
  });

  it("accepts consecutive bumps and rejects skips", () => {
    expect(isConsecutiveBump([0, 1, 0], [0, 1, 1])).toBe(true);
    expect(isConsecutiveBump([0, 1, 0], [0, 2, 0])).toBe(true);
    expect(isConsecutiveBump([0, 1, 0], [1, 0, 0])).toBe(true);
    expect(isConsecutiveBump([0, 1, 0], [0, 1, 2])).toBe(false);
  });
});

describe("checkDeployVersion", () => {
  it("allows first version when unset", () => {
    expect(checkDeployVersion("0.1.0", null)).toEqual({
      ok: true,
      version: "0.1.0",
    });
  });

  it("allows consecutive bumps only", () => {
    expect(checkDeployVersion("0.1.1", "0.1.0").ok).toBe(true);
    expect(checkDeployVersion("0.2.0", "0.1.0").ok).toBe(true);
    expect(checkDeployVersion("1.0.0", "0.1.0").ok).toBe(true);
    expect(checkDeployVersion("0.1.2", "0.1.0").ok).toBe(false);
  });

  it("blocks equal and older versions", () => {
    expectRejected(checkDeployVersion("0.1.0", "0.1.0"), /already in production/);
    expectRejected(checkDeployVersion("0.0.9", "0.1.0"), /older than production/);
  });

  it("rejects invalid formats", () => {
    expectRejected(checkDeployVersion("1.", "0.1.0"), /Invalid version/);
  });
});

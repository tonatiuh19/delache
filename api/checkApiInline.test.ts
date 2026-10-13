import { describe, expect, it } from "vitest";
import {
  findApiInlineViolations,
  formatApiInlineReport,
  stripTsComments,
} from "../scripts/check-api-inline";

describe("check-api-inline (Vercel serverless gate)", () => {
  it("allows import type from shared and package imports", () => {
    const src = `
import type { CaseStatus } from "../shared/api";
import express from "express";
import { z } from "zod";
`;
    expect(findApiInlineViolations(src)).toEqual([]);
  });

  it("flags relative value imports (sibling + shared runtime)", () => {
    const src = `
import { cleanupIntegrationTestFixtures } from "./testDbCleanup";
import { something } from "../shared/api";
`;
    const v = findApiInlineViolations(src);
    expect(v.map((x) => x.specifier).sort()).toEqual([
      "../shared/api",
      "./testDbCleanup",
    ]);
  });

  it("allows export type from relative paths but flags value re-exports", () => {
    const src = `
export type { CleanupRunOpts } from "./testDbCleanup";
export { createIntegrationTestPool } from "./testDbCleanup";
`;
    const v = findApiInlineViolations(src);
    expect(v).toHaveLength(1);
    expect(v[0].kind).toBe("export");
    expect(v[0].specifier).toBe("./testDbCleanup");
  });

  it("flags dynamic import() and require() of relative paths", () => {
    const src = `
async function load() {
  await import("./testHelpers");
  require("../shared/helpers");
}
`;
    const v = findApiInlineViolations(src);
    expect(v.map((x) => x.kind).sort()).toEqual([
      "dynamic_import",
      "require",
    ]);
  });

  it("ignores relative paths mentioned only inside comments", () => {
    const src = `
// Unit tests import from ./testDbCleanup directly.
/* keep ../shared/api in sync */
import type { CaseStatus } from "../shared/api";
`;
    expect(findApiInlineViolations(src)).toEqual([]);
  });

  it("formats a failure report with guidance", () => {
    const report = formatApiInlineReport("api/index.ts", [
      {
        line: 10,
        kind: "import",
        specifier: "./testDbCleanup",
        snippet: 'import { x } from "./testDbCleanup";',
      },
    ]);
    expect(report).toContain("ERR_MODULE_NOT_FOUND");
    expect(report).toContain("./testDbCleanup");
    expect(report).toContain("L10");
  });

  it("api/index.ts monolith passes the inline gate", async () => {
    const { checkApiIndexInline } = await import("../scripts/check-api-inline");
    const result = checkApiIndexInline();
    expect(result.ok).toBe(true);
  });
});

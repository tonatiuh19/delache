import { describe, expect, it } from "vitest";
import {
  buildPagination,
  parsePageLimit,
  parseSortDir,
  pickSortColumn,
} from "./listQuery";

describe("listQuery", () => {
  it("parses page/limit with caps", () => {
    expect(parsePageLimit({ page: "2", limit: "50" })).toEqual({
      page: 2,
      limit: 50,
      offset: 50,
    });
    expect(parsePageLimit({ limit: "999" }, { maxLimit: 100 }).limit).toBe(100);
  });

  it("parses sort direction", () => {
    expect(parseSortDir("asc")).toBe("ASC");
    expect(parseSortDir("DESC")).toBe("DESC");
    expect(parseSortDir("nope")).toBe("DESC");
  });

  it("picks whitelisted sort columns", () => {
    expect(
      pickSortColumn("title", { title: "title", created_at: "created_at" }, "created_at"),
    ).toBe("title");
    expect(
      pickSortColumn("hack", { title: "title", created_at: "created_at" }, "created_at"),
    ).toBe("created_at");
  });

  it("builds pagination meta", () => {
    expect(buildPagination(1, 20, 45)).toEqual({
      page: 1,
      limit: 20,
      total: 45,
      totalPages: 3,
    });
  });
});

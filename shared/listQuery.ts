import type { PaginationInfo } from "./api";

export function parsePageLimit(
  query: Record<string, unknown>,
  defaults: { page?: number; limit?: number; maxLimit?: number } = {},
): { page: number; limit: number; offset: number } {
  const maxLimit = defaults.maxLimit ?? 100;
  const page = Math.max(1, Number(query.page) || defaults.page || 1);
  const limit = Math.min(
    maxLimit,
    Math.max(1, Number(query.limit) || defaults.limit || 20),
  );
  return { page, limit, offset: (page - 1) * limit };
}

export function parseSortDir(value: unknown): "ASC" | "DESC" {
  return String(value || "").toUpperCase() === "ASC" ? "ASC" : "DESC";
}

export function pickSortColumn(
  value: unknown,
  allowed: Record<string, string>,
  fallback: string,
): string {
  const key = String(value || "");
  return allowed[key] || allowed[fallback] || fallback;
}

export function buildPagination(
  page: number,
  limit: number,
  total: number,
): PaginationInfo {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / Math.max(1, limit))),
  };
}

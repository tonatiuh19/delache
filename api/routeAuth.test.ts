/**
 * Smoke: every protected route returns 401 without a session token.
 * Keeps route registration + auth middleware wired; no DB required.
 */
import { describe, expect, it } from "vitest";
import request from "supertest";
import { createServer } from "./index";

const UUID = "00000000-0000-4000-8000-000000000001";

type RouteSpec = { method: "get" | "post" | "patch" | "put" | "delete"; path: string };

const STAFF_PROTECTED: RouteSpec[] = [
  { method: "get", path: "/api/auth/staff/me" },
  { method: "patch", path: "/api/auth/staff/preferences" },
  { method: "get", path: "/api/auth/me" },
  { method: "get", path: "/api/settings/case-number" },
  { method: "put", path: "/api/settings/case-number" },
  { method: "get", path: "/api/cases" },
  { method: "get", path: "/api/cases/pipeline" },
  { method: "post", path: "/api/cases" },
  { method: "get", path: `/api/cases/${UUID}` },
  { method: "patch", path: `/api/cases/${UUID}` },
  { method: "patch", path: `/api/cases/${UUID}/location` },
  { method: "patch", path: `/api/cases/${UUID}/status` },
  { method: "post", path: `/api/cases/${UUID}/notes` },
  { method: "post", path: `/api/cases/${UUID}/documents` },
  { method: "post", path: `/api/cases/${UUID}/documents/from-blob` },
  { method: "patch", path: `/api/cases/${UUID}/documents/${UUID}` },
  { method: "post", path: `/api/cases/${UUID}/documents/bulk` },
  { method: "post", path: `/api/cases/${UUID}/documents/${UUID}/ocr` },
  { method: "post", path: `/api/cases/${UUID}/documents/${UUID}/approve` },
  { method: "post", path: `/api/cases/${UUID}/documents/${UUID}/reject` },
  { method: "post", path: `/api/cases/${UUID}/expediente/approve` },
  { method: "post", path: "/api/geo/geocode" },
  { method: "get", path: "/api/dashboard/stats" },
  { method: "get", path: "/api/reviews/pending" },
  { method: "get", path: "/api/documents" },
  { method: "get", path: "/api/search" },
  { method: "get", path: "/api/reports/kpis" },
  { method: "get", path: "/api/calendar/events" },
  { method: "post", path: "/api/calendar/events" },
  { method: "get", path: "/api/finance/invoices" },
  { method: "post", path: "/api/finance/invoices" },
  { method: "post", path: `/api/finance/invoices/${UUID}/payments` },
  { method: "get", path: "/api/team/members" },
  { method: "post", path: "/api/team/members" },
  { method: "get", path: `/api/team/members/${UUID}` },
  { method: "patch", path: `/api/team/members/${UUID}` },
  { method: "delete", path: `/api/team/members/${UUID}` },
  { method: "post", path: `/api/team/members/${UUID}/resend-invite` },
  { method: "post", path: `/api/cases/${UUID}/assignments` },
  { method: "patch", path: `/api/cases/${UUID}/expert-delivery-deadline` },
  { method: "delete", path: `/api/cases/${UUID}/assignments/1` },
  { method: "post", path: `/api/cases/${UUID}/handoff/confirm` },
  { method: "patch", path: `/api/cases/${UUID}/ratification-scheduled` },
  { method: "post", path: `/api/cases/${UUID}/questionnaires` },
  { method: "patch", path: `/api/cases/${UUID}/questionnaires/${UUID}/status` },
  { method: "post", path: `/api/cases/${UUID}/reviews/1/complete` },
  { method: "post", path: `/api/cases/${UUID}/inspections` },
  { method: "patch", path: `/api/cases/${UUID}/inspections/${UUID}/status` },
  { method: "post", path: `/api/cases/${UUID}/measurements` },
  { method: "post", path: `/api/cases/${UUID}/evidence` },
  { method: "delete", path: `/api/cases/${UUID}/evidence/${UUID}` },
  { method: "post", path: `/api/cases/${UUID}/trips` },
  { method: "post", path: `/api/cases/${UUID}/expenses` },
  { method: "post", path: `/api/cases/${UUID}/technical-reports` },
  { method: "patch", path: `/api/cases/${UUID}/technical-reports/${UUID}/status` },
  { method: "get", path: "/api/notifications" },
  { method: "post", path: `/api/notifications/${UUID}/read` },
  { method: "post", path: "/api/notifications/read-all" },
  { method: "get", path: "/api/law-firms" },
  { method: "post", path: "/api/law-firms" },
  { method: "post", path: "/api/uploads" },
];

const CLIENT_PROTECTED: RouteSpec[] = [
  { method: "get", path: "/api/auth/client/me" },
  { method: "patch", path: "/api/auth/client/preferences" },
  {
    method: "post",
    path: `/api/cases/${UUID}/technical-reports/${UUID}/review`,
  },
  { method: "get", path: "/api/firm/members" },
  { method: "post", path: "/api/firm/members" },
  { method: "post", path: "/api/blob/client-upload" },
];

describe("protected route auth (401 without token)", () => {
  const app = createServer();

  it.each(STAFF_PROTECTED)("$method $path", async ({ method, path }) => {
    const res = await request(app)[method](path).send({});
    expect(res.status).toBe(401);
  });

  it.each(CLIENT_PROTECTED)("$method $path", async ({ method, path }) => {
    const res = await request(app)[method](path).send({});
    expect(res.status).toBe(401);
  });
});

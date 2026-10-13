/**
 * Staff portal read endpoints — dashboard, reviews, calendar, finance, team, etc.
 */
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Pool } from "mysql2/promise";
import { createServer } from "./index";
import {
  cleanupIntegrationTestFixtures,
  createIntegrationTestPool,
} from "./testDbCleanup";
import {
  authHeader,
  insertTestStaffUser,
  staffBearerToken,
} from "./testHelpers";

const RUN_ID = `api-staff-${Date.now().toString(36)}`;
const staffUserIds: number[] = [];

describe("staff resource API routes", () => {
  let pool: Pool;
  let app: ReturnType<typeof createServer>;
  let opsToken = "";
  let expertToken = "";
  let adminToken = "";
  let accountantToken = "";

  beforeAll(async () => {
    process.env.VITEST = "true";
    pool = createIntegrationTestPool();
    app = createServer();

    const ops = await insertTestStaffUser(pool, {
      runId: RUN_ID,
      role: "admin",
    });
    staffUserIds.push(ops.id);
    opsToken = await staffBearerToken(pool, ops.id);

    const expert = await insertTestStaffUser(pool, {
      runId: RUN_ID,
      role: "expert",
      tag: "expert",
    });
    staffUserIds.push(expert.id);
    expertToken = await staffBearerToken(pool, expert.id);

    const accountant = await insertTestStaffUser(pool, {
      runId: RUN_ID,
      role: "accountant",
      tag: "accountant",
    });
    staffUserIds.push(accountant.id);
    accountantToken = await staffBearerToken(pool, accountant.id);

    const [admins] = await pool.query<import("mysql2/promise").RowDataPacket[]>(
      `SELECT id FROM staff_users
       WHERE role = 'admin' AND status = 'active' AND deleted_at IS NULL
       ORDER BY id ASC LIMIT 1`,
    );
    if (admins[0]) {
      adminToken = await staffBearerToken(pool, Number(admins[0].id));
    }
  }, 60_000);

  afterAll(async () => {
    await cleanupIntegrationTestFixtures(pool, {
      runId: RUN_ID,
      staffUserIds,
    }).catch(() => undefined);
    await pool?.end();
  }, 90_000);

  it("GET /api/auth/staff/me returns authenticated user", async () => {
    const res = await request(app)
      .get("/api/auth/staff/me")
      .set(authHeader(opsToken));
    expect(res.status).toBe(200);
    expect(res.body.user?.email).toContain(RUN_ID);
    expect(res.body.user?.role).toBe("admin");
  });

  it("GET /api/dashboard/stats returns KPI payload", async () => {
    const res = await request(app)
      .get("/api/dashboard/stats")
      .set(authHeader(opsToken));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      totalCases: expect.any(Number),
      pendingReviews: expect.any(Number),
    });
  });

  it("GET /api/reviews/pending returns queue", async () => {
    const res = await request(app)
      .get("/api/reviews/pending")
      .set(authHeader(opsToken));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.reviews)).toBe(true);
  });

  it("GET /api/calendar/events returns events list", async () => {
    const res = await request(app)
      .get("/api/calendar/events")
      .set(authHeader(opsToken));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.events)).toBe(true);
  });

  it("GET /api/documents returns document index", async () => {
    const res = await request(app)
      .get("/api/documents")
      .set(authHeader(opsToken));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.documents)).toBe(true);
  });

  it("GET /api/search returns grouped hits", async () => {
    const res = await request(app)
      .get("/api/search")
      .query({ q: "vitest" })
      .set(authHeader(opsToken));
    expect(res.status).toBe(200);
    expect(res.body.results).toBeTruthy();
  });

  it("GET /api/finance/invoices returns invoice list for finance role", async () => {
    const forbidden = await request(app)
      .get("/api/finance/invoices")
      .set(authHeader(expertToken));
    expect(forbidden.status).toBe(403);

    const res = await request(app)
      .get("/api/finance/invoices")
      .set(authHeader(accountantToken));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.invoices)).toBe(true);
  });

  it("GET /api/team/members requires admin", async () => {
    const forbidden = await request(app)
      .get("/api/team/members")
      .set(authHeader(expertToken));
    expect(forbidden.status).toBe(403);

    if (adminToken) {
      const res = await request(app)
        .get("/api/team/members")
        .set(authHeader(adminToken));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.members)).toBe(true);
    }
  });

  it("GET /api/notifications returns notification feed", async () => {
    const res = await request(app)
      .get("/api/notifications")
      .set(authHeader(opsToken));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.notifications)).toBe(true);
  });

  it("GET /api/reports/kpis returns report metrics", async () => {
    const res = await request(app)
      .get("/api/reports/kpis")
      .set(authHeader(opsToken));
    expect(res.status).toBe(200);
    expect(res.body).toBeTruthy();
  });

  it("GET /api/law-firms requires admin", async () => {
    const forbidden = await request(app)
      .get("/api/law-firms")
      .set(authHeader(expertToken));
    expect(forbidden.status).toBe(403);

    if (adminToken) {
      const ok = await request(app)
        .get("/api/law-firms")
        .set(authHeader(adminToken));
      expect(ok.status).toBe(200);
      expect(Array.isArray(ok.body.lawFirms)).toBe(true);
    }
  });

  it("GET /api/config/app-version returns version string or null", async () => {
    const res = await request(app).get("/api/config/app-version");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("version");
  });

  it("GET /api/settings/case-number requires admin", async () => {
    const forbidden = await request(app)
      .get("/api/settings/case-number")
      .set(authHeader(expertToken));
    expect(forbidden.status).toBe(403);

    if (adminToken) {
      const ok = await request(app)
        .get("/api/settings/case-number")
        .set(authHeader(adminToken));
      expect(ok.status).toBe(200);
      expect(ok.body.format).toBeTruthy();
    }
  });
});

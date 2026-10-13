/**
 * Unified /api/auth/request-otp — staff first, law_firm fallthrough.
 * Under VITEST: Resend is skipped (sendEmail vitest-skip) and OTP rate limits
 * are not enforced (same testing architecture as optimum-credit).
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
  insertTestLawFirm,
  insertTestLawFirmUser,
  insertTestStaffUser,
} from "./testHelpers";

const RUN_ID = `api-otp-${Date.now().toString(36)}`;
const staffUserIds: number[] = [];
const lawFirmUserIds: number[] = [];
const lawFirmIds: number[] = [];

describe("unified auth OTP", () => {
  let pool: Pool;
  let app: ReturnType<typeof createServer>;
  let staffEmail = "";
  let firmEmail = "";

  beforeAll(async () => {
    process.env.VITEST = "true";
    pool = createIntegrationTestPool();
    app = createServer();

    const staff = await insertTestStaffUser(pool, {
      runId: RUN_ID,
      role: "expert",
      tag: "otp-staff",
    });
    staffUserIds.push(staff.id);
    staffEmail = staff.email;

    const firm = await insertTestLawFirm(pool, RUN_ID);
    lawFirmIds.push(firm.id);
    const firmUser = await insertTestLawFirmUser(pool, {
      runId: RUN_ID,
      lawFirmId: firm.id,
    });
    lawFirmUserIds.push(firmUser.id);
    firmEmail = firmUser.email;
  }, 60_000);

  afterAll(async () => {
    await cleanupIntegrationTestFixtures(pool, {
      runId: RUN_ID,
      staffUserIds,
      lawFirmUserIds,
      lawFirmIds,
    }).catch(() => undefined);
    await pool?.end();
  }, 90_000);

  it("POST /api/auth/request-otp resolves staff and returns actor", async () => {
    const res = await request(app)
      .post("/api/auth/request-otp")
      .send({ email: staffEmail, locale: "es" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      sent: true,
      actor: "staff",
    });
  });

  it("POST /api/auth/request-otp falls through to law_firm", async () => {
    const res = await request(app)
      .post("/api/auth/request-otp")
      .send({ email: firmEmail, locale: "es" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      sent: true,
      actor: "law_firm",
    });
  });

  it("POST /api/auth/request-otp returns account_not_found for unknown email", async () => {
    const res = await request(app)
      .post("/api/auth/request-otp")
      .send({ email: `nobody-${RUN_ID}@example.test`, locale: "es" });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("account_not_found");
  });

  it("POST /api/auth/request-otp rejects invalid email", async () => {
    const res = await request(app)
      .post("/api/auth/request-otp")
      .send({ email: "not-an-email", locale: "es" });
    expect(res.status).toBe(400);
  });
});

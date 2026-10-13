/**
 * Intake document approve/reject, expediente stamp, external deadline, P1 gates.
 */
import "dotenv/config";
import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Pool, RowDataPacket } from "mysql2/promise";
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

const RUN_ID = `api-intake-${Date.now().toString(36)}`;
const caseIds: number[] = [];
const staffUserIds: number[] = [];

const INTAKE_CATS = [
  "lawsuit",
  "medical_record",
  "cfe_report",
  "preliminary_photo",
] as const;

describe("intake approval API", () => {
  let pool: Pool;
  let app: ReturnType<typeof createServer>;
  let adminToken = "";
  let expertToken = "";
  let casePublicUuid = "";
  let caseId = 0;
  const docUuids: Record<string, string> = {};

  beforeAll(async () => {
    process.env.VITEST = "true";
    pool = createIntegrationTestPool();
    app = createServer();

    const admin = await insertTestStaffUser(pool, {
      runId: RUN_ID,
      role: "admin",
    });
    const expert = await insertTestStaffUser(pool, {
      runId: RUN_ID,
      role: "expert",
      tag: "expert",
    });
    staffUserIds.push(admin.id, expert.id);
    adminToken = await staffBearerToken(pool, admin.id);
    expertToken = await staffBearerToken(pool, expert.id);

    const create = await request(app)
      .post("/api/cases")
      .set(authHeader(adminToken))
      .send({
        title: `vitest-${RUN_ID} intake approval`,
        priority: "normal",
      });
    expect(create.status).toBe(201);
    casePublicUuid = String(create.body.case.publicUuid);
    caseId = Number(create.body.case.id);
    caseIds.push(caseId);

    for (const cat of INTAKE_CATS) {
      const uuid = crypto.randomUUID();
      docUuids[cat] = uuid;
      await pool.query(
        `INSERT INTO documents
           (public_uuid, case_id, category, title, status, current_version)
         VALUES (?, ?, ?, ?, 'uploaded', 1)`,
        [uuid, caseId, cat, `Vitest ${cat}`],
      );
    }
  }, 90_000);

  afterAll(async () => {
    await cleanupIntegrationTestFixtures(pool, {
      runId: RUN_ID,
      caseIds,
      staffUserIds,
    }).catch(() => undefined);
    await pool?.end();
  }, 90_000);

  it("rejects invalid externalCourtDeadlineAt on create", async () => {
    const bad = await request(app)
      .post("/api/cases")
      .set(authHeader(adminToken))
      .send({
        title: `vitest-${RUN_ID} bad deadline`,
        externalCourtDeadlineAt: "not-a-date",
      });
    expect(bad.status).toBe(400);
    expect(String(bad.body.error)).toMatch(/externalCourtDeadlineAt/i);
  });

  it("blocks non-admin from approving documents", async () => {
    const res = await request(app)
      .post(
        `/api/cases/${casePublicUuid}/documents/${docUuids.lawsuit}/approve`,
      )
      .set(authHeader(expertToken));
    expect(res.status).toBe(403);
  });

  it("approves intake docs, stamps expediente, and unlocks intake→questionnaire", async () => {
    const blocked = await request(app)
      .patch(`/api/cases/${casePublicUuid}/status`)
      .set(authHeader(adminToken))
      .send({ status: "questionnaire" });
    expect([400, 409]).toContain(blocked.status);

    for (const cat of INTAKE_CATS) {
      const res = await request(app)
        .post(
          `/api/cases/${casePublicUuid}/documents/${docUuids[cat]}/approve`,
        )
        .set(authHeader(adminToken));
      expect(res.status).toBe(200);
      expect(res.body.document.status).toBe("approved");
    }

    const beforeStamp = await request(app)
      .patch(`/api/cases/${casePublicUuid}/status`)
      .set(authHeader(adminToken))
      .send({ status: "questionnaire" });
    expect([400, 409]).toContain(beforeStamp.status);

    const stamp = await request(app)
      .post(`/api/cases/${casePublicUuid}/expediente/approve`)
      .set(authHeader(adminToken));
    expect(stamp.status).toBe(200);
    expect(stamp.body.case.expedienteApprovedAt).toBeTruthy();

    const advance = await request(app)
      .patch(`/api/cases/${casePublicUuid}/status`)
      .set(authHeader(adminToken))
      .send({ status: "questionnaire" });
    expect(advance.status).toBe(200);
    expect(advance.body.case.status).toBe("questionnaire");
  });

  it("requests correction, opens intake_correction deadline, clears expediente", async () => {
    await pool.query(
      `UPDATE cases SET status = 'intake', expediente_approved_at = NOW(),
         expediente_approved_by = ? WHERE id = ?`,
      [staffUserIds[0], caseId],
    );
    await pool.query(
      `UPDATE documents SET status = 'approved', approved_at = NOW()
       WHERE case_id = ? AND category = 'lawsuit'`,
      [caseId],
    );

    const reject = await request(app)
      .post(
        `/api/cases/${casePublicUuid}/documents/${docUuids.lawsuit}/reject`,
      )
      .set(authHeader(adminToken))
      .send({ reason: "blurry scan" });
    expect(reject.status).toBe(200);
    expect(reject.body.document.status).toBe("rejected");
    expect(reject.body.document.rejectionReason).toBe("blurry scan");

    const [cases] = await pool.query<RowDataPacket[]>(
      `SELECT expediente_approved_at FROM cases WHERE id = ?`,
      [caseId],
    );
    expect(cases[0]!.expediente_approved_at).toBeNull();

    const [deadlines] = await pool.query<RowDataPacket[]>(
      `SELECT deadline_type, business_days, completed_at FROM case_deadlines
       WHERE case_id = ? AND deadline_type = 'intake_correction'
       ORDER BY id DESC LIMIT 1`,
      [caseId],
    );
    expect(deadlines.length).toBe(1);
    expect(Number(deadlines[0]!.business_days)).toBe(3);
    expect(deadlines[0]!.completed_at).toBeNull();
  });

  it("sets and clears externalCourtDeadlineAt via PATCH flags", async () => {
    const set = await request(app)
      .patch(`/api/cases/${casePublicUuid}`)
      .set(authHeader(adminToken))
      .send({ externalCourtDeadlineAt: "2026-12-01T18:00:00.000Z" });
    expect(set.status).toBe(200);
    expect(set.body.case.externalCourtDeadlineAt).toBeTruthy();

    const clear = await request(app)
      .patch(`/api/cases/${casePublicUuid}`)
      .set(authHeader(adminToken))
      .send({ externalCourtDeadlineAt: null });
    expect(clear.status).toBe(200);
    expect(clear.body.case.externalCourtDeadlineAt).toBeNull();

    const forbidden = await request(app)
      .patch(`/api/cases/${casePublicUuid}`)
      .set(authHeader(expertToken))
      .send({ externalCourtDeadlineAt: "2026-12-01T18:00:00.000Z" });
    expect(forbidden.status).toBe(403);
  });

  it("rejects approve/reject for non-intake categories", async () => {
    const uuid = crypto.randomUUID();
    await pool.query(
      `INSERT INTO documents
         (public_uuid, case_id, category, title, status, current_version)
       VALUES (?, ?, 'questionnaire', 'Vitest Q', 'uploaded', 1)`,
      [uuid, caseId],
    );
    const approve = await request(app)
      .post(`/api/cases/${casePublicUuid}/documents/${uuid}/approve`)
      .set(authHeader(adminToken));
    expect(approve.status).toBe(400);

    const reject = await request(app)
      .post(`/api/cases/${casePublicUuid}/documents/${uuid}/reject`)
      .set(authHeader(adminToken))
      .send({ reason: "n/a" });
    expect(reject.status).toBe(400);
  });
});

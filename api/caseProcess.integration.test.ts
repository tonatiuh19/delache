/**
 * P2 handoff, P11 ratification schedule, P3 questionnaire guards.
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

const RUN_ID = `api-process-${Date.now().toString(36)}`;
const caseIds: number[] = [];
const staffUserIds: number[] = [];

describe("case process API", () => {
  let pool: Pool;
  let app: ReturnType<typeof createServer>;
  let coordinatorToken = "";
  let expertToken = "";
  let casePublicUuid = "";
  let questionnaireUuid = "";

  beforeAll(async () => {
    process.env.VITEST = "true";
    pool = createIntegrationTestPool();
    app = createServer();

    const coordinator = await insertTestStaffUser(pool, {
      runId: RUN_ID,
      role: "admin",
    });
    const expert = await insertTestStaffUser(pool, {
      runId: RUN_ID,
      role: "expert",
      tag: "expert",
    });
    staffUserIds.push(coordinator.id, expert.id);
    coordinatorToken = await staffBearerToken(pool, coordinator.id);
    expertToken = await staffBearerToken(pool, expert.id);

    const create = await request(app)
      .post("/api/cases")
      .set(authHeader(coordinatorToken))
      .send({ title: `vitest-${RUN_ID} process case` });
    casePublicUuid = String(create.body.case.publicUuid);
    caseIds.push(Number(create.body.case.id));

    await pool.query(
      `UPDATE cases SET status = 'assignment' WHERE public_uuid = ?`,
      [casePublicUuid],
    );

    await request(app)
      .post(`/api/cases/${casePublicUuid}/assignments`)
      .set(authHeader(coordinatorToken))
      .send({
        userId: expert.id,
        assignmentRole: "expert",
        isPrimary: true,
      });
  }, 90_000);

  afterAll(async () => {
    await cleanupIntegrationTestFixtures(pool, {
      runId: RUN_ID,
      caseIds,
      staffUserIds,
    }).catch(() => undefined);
    await pool?.end();
  }, 90_000);

  it("blocks expert from confirming P2 handoff", async () => {
    const res = await request(app)
      .post(`/api/cases/${casePublicUuid}/handoff/confirm`)
      .set(authHeader(expertToken));
    expect(res.status).toBe(403);
  });

  it("allows coordinator to confirm handoff", async () => {
    const res = await request(app)
      .post(`/api/cases/${casePublicUuid}/handoff/confirm`)
      .set(authHeader(coordinatorToken));
    expect(res.status).toBe(200);
    expect(res.body.case.documentsHandoffConfirmedAt).toBeTruthy();

    const detail = await request(app)
      .get(`/api/cases/${casePublicUuid}`)
      .set(authHeader(coordinatorToken));
    expect(detail.body.case.documentsHandoffConfirmedAt).toBeTruthy();
  });

  it("sets ratification schedule on case", async () => {
    const scheduled = "2026-12-15T14:00:00.000Z";
    const res = await request(app)
      .patch(`/api/cases/${casePublicUuid}/ratification-scheduled`)
      .set(authHeader(coordinatorToken))
      .send({ ratificationScheduledAt: scheduled });
    expect(res.status).toBe(200);
    expect(res.body.case.ratificationScheduledAt).toBeTruthy();
  });

  it("creates questionnaire draft and rejects empty submit content", async () => {
    await pool.query(`UPDATE cases SET status = 'questionnaire' WHERE public_uuid = ?`, [
      casePublicUuid,
    ]);

    const noPdf = await request(app)
      .post(`/api/cases/${casePublicUuid}/questionnaires`)
      .set(authHeader(coordinatorToken))
      .send({
        submit: true,
        contentJson: {
          streetViewValidated: "https://maps.example/streetview",
          streetViewPreexistence: "inconclusive",
        },
      });
    expect(noPdf.status).toBe(400);
    expect(String(noPdf.body.error)).toMatch(/PDF/i);

    const badSubmit = await request(app)
      .post(`/api/cases/${casePublicUuid}/questionnaires`)
      .set(authHeader(coordinatorToken))
      .send({ submit: true, contentJson: {} });
    expect(badSubmit.status).toBe(400);

    const [caseRows] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM cases WHERE public_uuid = ? LIMIT 1`,
      [casePublicUuid],
    );
    const caseId = Number(caseRows[0]!.id);
    await pool.query(
      `INSERT INTO documents
         (public_uuid, case_id, category, title, status, current_version)
       VALUES (?, ?, 'questionnaire', 'Vitest defendant Q PDF', 'uploaded', 1)`,
      [crypto.randomUUID(), caseId],
    );

    const okDraft = await request(app)
      .post(`/api/cases/${casePublicUuid}/questionnaires`)
      .set(authHeader(coordinatorToken))
      .send({
        contentJson: {
          streetViewValidated: "https://maps.example/streetview",
          streetViewPreexistence: "inconclusive",
        },
        submit: true,
      });
    expect(okDraft.status).toBe(201);
    questionnaireUuid = String(okDraft.body.questionnaire.publicUuid);
    expect(okDraft.body.questionnaire.status).toBe("grammar_qa");
  });

  it("rejects technical report submit and grammar_qa patch without PDF", async () => {
    await pool.query(
      `UPDATE cases SET status = 'technical_report' WHERE public_uuid = ?`,
      [casePublicUuid],
    );

    const noPdfSubmit = await request(app)
      .post(`/api/cases/${casePublicUuid}/technical-reports`)
      .set(authHeader(expertToken))
      .send({ submit: true, conclusions: "test" });
    expect(noPdfSubmit.status).toBe(400);
    expect(String(noPdfSubmit.body.error)).toMatch(/PDF/i);

    const draft = await request(app)
      .post(`/api/cases/${casePublicUuid}/technical-reports`)
      .set(authHeader(expertToken))
      .send({ submit: false, conclusions: "draft only" });
    expect(draft.status).toBe(201);
    const reportUuid = String(draft.body.report.publicUuid);

    const patchNoPdf = await request(app)
      .patch(`/api/cases/${casePublicUuid}/technical-reports/${reportUuid}/status`)
      .set(authHeader(expertToken))
      .send({ status: "grammar_qa" });
    expect(patchNoPdf.status).toBe(400);
    expect(String(patchNoPdf.body.error)).toMatch(/PDF/i);

    const [caseRows] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM cases WHERE public_uuid = ? LIMIT 1`,
      [casePublicUuid],
    );
    await pool.query(
      `INSERT INTO documents
         (public_uuid, case_id, category, title, status, current_version)
       VALUES (?, ?, 'technical_report', 'Vitest dictamen PDF', 'uploaded', 1)`,
      [crypto.randomUUID(), Number(caseRows[0]!.id)],
    );

    const patchOk = await request(app)
      .patch(`/api/cases/${casePublicUuid}/technical-reports/${reportUuid}/status`)
      .set(authHeader(expertToken))
      .send({ status: "grammar_qa" });
    expect(patchOk.status).toBe(200);
    expect(patchOk.body.report.status).toBe("grammar_qa");
  });

  it("blocks direct PATCH grammar_qa → legal_review (review-only)", async () => {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT public_uuid FROM questionnaires WHERE public_uuid = ? LIMIT 1`,
      [questionnaireUuid],
    );
    expect(rows.length).toBe(1);

    const res = await request(app)
      .patch(
        `/api/cases/${casePublicUuid}/questionnaires/${questionnaireUuid}/status`,
      )
      .set(authHeader(coordinatorToken))
      .send({ status: "legal_review" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/review/i);
  });
});

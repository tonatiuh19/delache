/**
 * Law firm access via shared /api/cases* (portal consolidation).
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
  insertTestLawFirm,
  insertTestLawFirmUser,
  insertTestStaffUser,
  lawFirmBearerToken,
  staffBearerToken,
} from "./testHelpers";

const RUN_ID = `api-client-${Date.now().toString(36)}`;
const caseIds: number[] = [];
const staffUserIds: number[] = [];
const lawFirmIds: number[] = [];
const lawFirmUserIds: number[] = [];

/** Minimal valid-ish PDF bytes (base64) for JSON document upload. */
const TINY_PDF_B64 = Buffer.from(
  "%PDF-1.1\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n",
).toString("base64");

describe("law firm portal API (/api/cases)", () => {
  let pool: Pool;
  let app: ReturnType<typeof createServer>;
  let coordinatorToken = "";
  let clientToken = "";
  let otherFirmToken = "";
  let casePublicUuid = "";
  let caseId = 0;
  let otherCasePublicUuid = "";

  beforeAll(async () => {
    process.env.VITEST = "true";
    pool = createIntegrationTestPool();
    app = createServer();

    const coordinator = await insertTestStaffUser(pool, {
      runId: RUN_ID,
      role: "admin",
    });
    staffUserIds.push(coordinator.id);
    coordinatorToken = await staffBearerToken(pool, coordinator.id);

    const firm = await insertTestLawFirm(pool, RUN_ID);
    lawFirmIds.push(firm.id);
    const clientUser = await insertTestLawFirmUser(pool, {
      runId: RUN_ID,
      lawFirmId: firm.id,
    });
    lawFirmUserIds.push(clientUser.id);
    clientToken = await lawFirmBearerToken(pool, clientUser.id);

    const otherFirm = await insertTestLawFirm(pool, `${RUN_ID}-other`);
    lawFirmIds.push(otherFirm.id);
    const otherUser = await insertTestLawFirmUser(pool, {
      runId: `${RUN_ID}-other`,
      lawFirmId: otherFirm.id,
    });
    lawFirmUserIds.push(otherUser.id);
    otherFirmToken = await lawFirmBearerToken(pool, otherUser.id);

    const create = await request(app)
      .post("/api/cases")
      .set(authHeader(coordinatorToken))
      .send({
        title: `vitest-${RUN_ID} client portal case`,
        lawFirmId: firm.id,
      });
    casePublicUuid = String(create.body.case.publicUuid);
    caseId = Number(create.body.case.id);
    caseIds.push(caseId);

    const otherCase = await request(app)
      .post("/api/cases")
      .set(authHeader(coordinatorToken))
      .send({
        title: `vitest-${RUN_ID} other firm case`,
        lawFirmId: otherFirm.id,
      });
    otherCasePublicUuid = String(otherCase.body.case.publicUuid);
    caseIds.push(Number(otherCase.body.case.id));
  }, 90_000);

  afterAll(async () => {
    await cleanupIntegrationTestFixtures(pool, {
      runId: RUN_ID,
      caseIds,
      staffUserIds,
      lawFirmIds,
      lawFirmUserIds,
    }).catch(() => undefined);
    await pool?.end();
  }, 90_000);

  it("GET /api/auth/client/me returns law firm user", async () => {
    const res = await request(app)
      .get("/api/auth/client/me")
      .set(authHeader(clientToken));
    expect(res.status).toBe(200);
    expect(res.body.user?.actor).toBe("law_firm");
  });

  it("GET /api/cases lists firm-visible cases", async () => {
    const res = await request(app)
      .get("/api/cases")
      .set(authHeader(clientToken));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.cases)).toBe(true);
    expect(
      res.body.cases.some(
        (c: { publicUuid: string }) => c.publicUuid === casePublicUuid,
      ),
    ).toBe(true);
    expect(
      res.body.cases.some(
        (c: { publicUuid: string }) => c.publicUuid === otherCasePublicUuid,
      ),
    ).toBe(false);
  });

  it("GET /api/cases/:uuid returns case detail for linked firm", async () => {
    const res = await request(app)
      .get(`/api/cases/${casePublicUuid}`)
      .set(authHeader(clientToken));
    expect(res.status).toBe(200);
    expect(res.body.case?.publicUuid).toBe(casePublicUuid);
    expect(Array.isArray(res.body.documents)).toBe(true);
    // Despacho payload stays limited — no staff-only work queues.
    expect(res.body.assignments).toEqual([]);
    expect(res.body.evidence).toEqual([]);
  });

  it("returns 404 for firm accessing unrelated case uuid", async () => {
    const missing = await request(app)
      .get("/api/cases/00000000-0000-4000-8000-000000000000")
      .set(authHeader(clientToken));
    expect(missing.status).toBe(404);

    const otherFirm = await request(app)
      .get(`/api/cases/${otherCasePublicUuid}`)
      .set(authHeader(clientToken));
    expect(otherFirm.status).toBe(404);
  });

  it("POST /api/cases as law firm creates under their firm", async () => {
    const res = await request(app)
      .post("/api/cases")
      .set(authHeader(clientToken))
      .send({
        title: `vitest-${RUN_ID} firm-created case`,
        description: "despacho intake note",
      });
    expect(res.status).toBe(201);
    expect(res.body.case?.publicUuid).toBeTruthy();
    expect(res.body.case?.title).toContain("firm-created");
    caseIds.push(Number(res.body.case.id));
  });

  it("PATCH /api/cases/:uuid allows involvesFatality for owning firm", async () => {
    const res = await request(app)
      .patch(`/api/cases/${casePublicUuid}`)
      .set(authHeader(clientToken))
      .send({ involvesFatality: true });
    expect(res.status).toBe(200);
    expect(res.body.case?.involvesFatality).toBe(true);
  });

  it("uploads an intake document for owning firm", async () => {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      const blocked = await request(app)
        .post(`/api/cases/${casePublicUuid}/documents`)
        .set(authHeader(clientToken))
        .send({
          title: "demanda.pdf",
          fileName: "demanda.pdf",
          category: "lawsuit",
          contentType: "application/pdf",
          data: TINY_PDF_B64,
        });
      expect(blocked.status).toBe(503);
      return;
    }

    const res = await request(app)
      .post(`/api/cases/${casePublicUuid}/documents`)
      .set(authHeader(clientToken))
      .send({
        title: "demanda.pdf",
        fileName: "demanda.pdf",
        category: "lawsuit",
        contentType: "application/pdf",
        data: TINY_PDF_B64,
      });
    expect(res.status).toBe(201);
    expect(res.body.document?.category).toBe("lawsuit");
    expect(res.body.document?.status).toBe("uploaded");
    expect(res.body.document?.publicUuid).toBeTruthy();
  });

  it("denies document upload / mutate on another firm's case", async () => {
    const upload = await request(app)
      .post(`/api/cases/${otherCasePublicUuid}/documents`)
      .set(authHeader(clientToken))
      .send({
        title: "sneak.pdf",
        fileName: "sneak.pdf",
        category: "lawsuit",
        contentType: "application/pdf",
        data: TINY_PDF_B64,
      });
    expect([403, 404, 503]).toContain(upload.status);
    if (upload.status !== 503) {
      expect(upload.status).toBe(404);
    }

    const foreignDoc = crypto.randomUUID();
    const [otherRows] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM cases WHERE public_uuid = ? LIMIT 1`,
      [otherCasePublicUuid],
    );
    await pool.query(
      `INSERT INTO documents
         (public_uuid, case_id, category, title, status, current_version)
       VALUES (?, ?, 'lawsuit', 'Foreign doc', 'rejected', 1)`,
      [foreignDoc, Number(otherRows[0]!.id)],
    );

    const patch = await request(app)
      .patch(`/api/cases/${otherCasePublicUuid}/documents/${foreignDoc}`)
      .set(authHeader(clientToken))
      .send({ category: "medical_record" });
    expect(patch.status).toBe(404);
  });

  it("allows recategorize only when document is unlocked (rejected)", async () => {
    const lockedUuid = crypto.randomUUID();
    const openUuid = crypto.randomUUID();
    await pool.query(
      `INSERT INTO documents
         (public_uuid, case_id, category, title, status, current_version)
       VALUES (?, ?, 'medical_record', 'Locked doc', 'uploaded', 1)`,
      [lockedUuid, caseId],
    );
    await pool.query(
      `INSERT INTO documents
         (public_uuid, case_id, category, title, status, current_version)
       VALUES (?, ?, 'cfe_report', 'Open doc', 'rejected', 1)`,
      [openUuid, caseId],
    );

    const locked = await request(app)
      .patch(`/api/cases/${casePublicUuid}/documents/${lockedUuid}`)
      .set(authHeader(clientToken))
      .send({ category: "preliminary_photo" });
    expect(locked.status).toBe(409);

    const open = await request(app)
      .patch(`/api/cases/${casePublicUuid}/documents/${openUuid}`)
      .set(authHeader(clientToken))
      .send({ category: "preliminary_photo" });
    expect(open.status).toBe(200);
    expect(open.body.document?.category).toBe("preliminary_photo");
  });

  it("completes external technical report review for owning firm", async () => {
    const reportUuid = crypto.randomUUID();
    await pool.query(
      `INSERT INTO technical_reports
         (public_uuid, case_id, status, version_number, conclusions)
       VALUES (?, ?, 'external_review', 1, 'Vitest external review')`,
      [reportUuid, caseId],
    );

    const otherFirmReview = await request(app)
      .post(
        `/api/cases/${casePublicUuid}/technical-reports/${reportUuid}/review`,
      )
      .set(authHeader(otherFirmToken))
      .send({ outcome: "approved" });
    expect(otherFirmReview.status).toBe(404);

    const ok = await request(app)
      .post(
        `/api/cases/${casePublicUuid}/technical-reports/${reportUuid}/review`,
      )
      .set(authHeader(clientToken))
      .send({ outcome: "approved" });
    expect(ok.status).toBe(200);
    expect(ok.body.report?.status).toBe("approved");
  });

  it("rejects law firm on staff-only pipeline", async () => {
    const res = await request(app)
      .get("/api/cases/pipeline")
      .set(authHeader(clientToken));
    expect(res.status).toBe(403);
  });

  it("rejects law firm on staff-only status change", async () => {
    const res = await request(app)
      .patch(`/api/cases/${casePublicUuid}/status`)
      .set(authHeader(clientToken))
      .send({ status: "assignment" });
    expect(res.status).toBe(403);
  });

  it("legacy /api/client/cases is gone", async () => {
    const res = await request(app)
      .get("/api/client/cases")
      .set(authHeader(clientToken));
    expect(res.status).toBe(404);
  });
});

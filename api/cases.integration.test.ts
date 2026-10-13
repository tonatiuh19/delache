/**
 * Cases API — create, detail, list, pipeline, finance RBAC.
 * Fixtures: vitest-{RUN_ID}@example.test staff users + case titles containing RUN_ID.
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

const RUN_ID = `api-cases-${Date.now().toString(36)}`;
const caseIds: number[] = [];
const staffUserIds: number[] = [];

describe("cases API", () => {
  let pool: Pool;
  let app: ReturnType<typeof createServer>;
  let coordinatorToken = "";
  let expertToken = "";
  let accountantToken = "";
  let expertUserId = 0;
  let accountantUserId = 0;
  let casePublicUuid = "";

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
    const accountant = await insertTestStaffUser(pool, {
      runId: RUN_ID,
      role: "accountant",
      tag: "accountant",
    });
    staffUserIds.push(coordinator.id, expert.id, accountant.id);
    expertUserId = expert.id;
    accountantUserId = accountant.id;

    coordinatorToken = await staffBearerToken(pool, coordinator.id);
    expertToken = await staffBearerToken(pool, expert.id);
    accountantToken = await staffBearerToken(pool, accountant.id);
  }, 60_000);

  afterAll(async () => {
    await cleanupIntegrationTestFixtures(pool, {
      runId: RUN_ID,
      caseIds,
      staffUserIds,
    }).catch(() => undefined);
    await pool?.end();
  }, 90_000);

  it("creates a case and returns detail with listado", async () => {
    const create = await request(app)
      .post("/api/cases")
      .set(authHeader(coordinatorToken))
      .send({
        title: `vitest-${RUN_ID} intake case`,
        priority: "normal",
        propertyCity: "CDMX",
      });
    expect(create.status).toBe(201);
    expect(create.body.case?.publicUuid).toBeTruthy();
    expect(create.body.case?.status).toBe("intake");
    casePublicUuid = String(create.body.case.publicUuid);
    caseIds.push(Number(create.body.case.id));

    const detail = await request(app)
      .get(`/api/cases/${casePublicUuid}`)
      .set(authHeader(coordinatorToken));
    expect(detail.status).toBe(200);
    expect(detail.body.case?.listado).toBeTruthy();
    expect(Array.isArray(detail.body.invoices)).toBe(true);
    expect(detail.body.processGate).toMatchObject({
      ok: expect.any(Boolean),
      missing: expect.any(Array),
    });
  });

  it("lists cases and pipeline columns for coordinator", async () => {
    const list = await request(app)
      .get("/api/cases")
      .set(authHeader(coordinatorToken));
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body.cases)).toBe(true);
    expect(list.body.cases.some((c: { publicUuid: string }) => c.publicUuid === casePublicUuid)).toBe(
      true,
    );

    const pipeline = await request(app)
      .get("/api/cases/pipeline")
      .set(authHeader(coordinatorToken));
    expect(pipeline.status).toBe(200);
    expect(pipeline.body.columns).toBeTruthy();
  });

  it("strips invoices from case detail for expert but not accountant", async () => {
    await request(app)
      .post(`/api/cases/${casePublicUuid}/assignments`)
      .set(authHeader(coordinatorToken))
      .send({
        userId: expertUserId,
        assignmentRole: "expert",
        isPrimary: true,
      });

    await request(app)
      .post(`/api/cases/${casePublicUuid}/assignments`)
      .set(authHeader(coordinatorToken))
      .send({
        userId: accountantUserId,
        assignmentRole: "accountant",
        isPrimary: true,
      });

    const expertDetail = await request(app)
      .get(`/api/cases/${casePublicUuid}`)
      .set(authHeader(expertToken));
    expect(expertDetail.status).toBe(200);
    expect(expertDetail.body.invoices).toEqual([]);

    const accountantDetail = await request(app)
      .get(`/api/cases/${casePublicUuid}`)
      .set(authHeader(accountantToken));
    expect(accountantDetail.status).toBe(200);
    expect(Array.isArray(accountantDetail.body.invoices)).toBe(true);
  });

  it("patches case flags (involvesFatality)", async () => {
    const patch = await request(app)
      .patch(`/api/cases/${casePublicUuid}`)
      .set(authHeader(coordinatorToken))
      .send({ involvesFatality: true });
    expect(patch.status).toBe(200);
    expect(patch.body.case?.involvesFatality).toBe(true);
  });

  it("patches protestaModality for expert and rejects empty flags body", async () => {
    const empty = await request(app)
      .patch(`/api/cases/${casePublicUuid}`)
      .set(authHeader(coordinatorToken))
      .send({});
    expect(empty.status).toBe(400);

    const modality = await request(app)
      .patch(`/api/cases/${casePublicUuid}`)
      .set(authHeader(expertToken))
      .send({ protestaModality: "virtual" });
    expect(modality.status).toBe(200);
    expect(modality.body.case?.protestaModality).toBe("virtual");

    const accountantDenied = await request(app)
      .patch(`/api/cases/${casePublicUuid}`)
      .set(authHeader(accountantToken))
      .send({ protestaModality: "presencial" });
    expect(accountantDenied.status).toBe(403);
  });

  it("blocks soft-parallel field evidence and trips while still in intake", async () => {
    const evidence = await request(app)
      .post(`/api/cases/${casePublicUuid}/evidence`)
      .set(authHeader(coordinatorToken))
      .send({
        evidenceType: "photo",
        category: "facade",
        title: `vitest-${RUN_ID} early evidence`,
      });
    expect(evidence.status).toBe(400);
    expect(evidence.body.error).toBe("soft_parallel_blocked");

    const trip = await request(app)
      .post(`/api/cases/${casePublicUuid}/trips`)
      .set(authHeader(coordinatorToken))
      .send({
        originCity: "CDMX",
        destinationCity: "Toluca",
        status: "planned",
      });
    expect(trip.status).toBe(400);
    expect(trip.body.error).toBe("soft_parallel_blocked");
  });

  it("rejects empty case title on create", async () => {
    const res = await request(app)
      .post("/api/cases")
      .set(authHeader(coordinatorToken))
      .send({ title: "   " });
    expect(res.status).toBe(400);
  });
});

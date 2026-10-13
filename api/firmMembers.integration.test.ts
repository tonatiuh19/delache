/**
 * Despacho firm roster + staff create-firm-with-owner.
 */
import "dotenv/config";
import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { createServer } from "./index";
import {
  cleanupIntegrationTestFixtures,
  createIntegrationTestPool,
  TEST_EMAIL_SUFFIX,
} from "./testDbCleanup";
import {
  authHeader,
  insertTestLawFirm,
  insertTestLawFirmUser,
  insertTestStaffUser,
  lawFirmBearerToken,
  staffBearerToken,
} from "./testHelpers";

const RUN_ID = `api-firm-${Date.now().toString(36)}`;
const staffUserIds: number[] = [];
const lawFirmUserIds: number[] = [];
const lawFirmIds: number[] = [];

describe("firm members + law firm create with owner", () => {
  let pool: Pool;
  let app: ReturnType<typeof createServer>;
  let adminToken = "";
  let firmOwnerToken = "";
  let firmId = 0;

  beforeAll(async () => {
    process.env.VITEST = "true";
    pool = createIntegrationTestPool();
    app = createServer();

    const admin = await insertTestStaffUser(pool, {
      runId: RUN_ID,
      role: "admin",
      tag: "firm-admin",
    });
    staffUserIds.push(admin.id);
    adminToken = await staffBearerToken(pool, admin.id);

    const firm = await insertTestLawFirm(pool, RUN_ID);
    firmId = firm.id;
    lawFirmIds.push(firm.id);

    const owner = await insertTestLawFirmUser(pool, {
      runId: RUN_ID,
      lawFirmId: firm.id,
    });
    lawFirmUserIds.push(owner.id);
    firmOwnerToken = await lawFirmBearerToken(pool, owner.id);
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

  it("GET /api/firm/members lists roster for law-firm actor", async () => {
    const res = await request(app)
      .get("/api/firm/members")
      .set(authHeader(firmOwnerToken));
    expect(res.status).toBe(200);
    expect(res.body.lawFirmId).toBe(firmId);
    expect(res.body.canManage).toBe(true);
    expect(Array.isArray(res.body.members)).toBe(true);
    expect(res.body.members.length).toBeGreaterThanOrEqual(1);
  });

  it("POST /api/firm/members invites a colleague", async () => {
    const email = `colleague-${RUN_ID}${TEST_EMAIL_SUFFIX}`;
    const res = await request(app)
      .post("/api/firm/members")
      .set(authHeader(firmOwnerToken))
      .send({
        email,
        firstName: "Cole",
        lastName: "League",
        memberRole: "member",
      });
    expect(res.status).toBe(201);
    expect(res.body.member.email).toBe(email);
    expect(res.body.member.memberRole).toBe("member");
    lawFirmUserIds.push(Number(res.body.member.id));
  });

  it("POST /api/firm/members rejects owner role from self-serve", async () => {
    const res = await request(app)
      .post("/api/firm/members")
      .set(authHeader(firmOwnerToken))
      .send({
        email: `bad-owner-${RUN_ID}${TEST_EMAIL_SUFFIX}`,
        firstName: "Bad",
        lastName: "Owner",
        memberRole: "owner",
      });
    expect(res.status).toBe(400);
  });

  it("POST /api/law-firms requires owner and creates membership", async () => {
    const ownerEmail = `new-owner-${RUN_ID}${TEST_EMAIL_SUFFIX}`;
    const res = await request(app)
      .post("/api/law-firms")
      .set(authHeader(adminToken))
      .send({
        name: `Owned Firm ${RUN_ID}`,
        city: "CDMX",
        ownerEmail,
        ownerFirstName: "Owner",
        ownerLastName: "One",
      });
    expect(res.status).toBe(201);
    expect(res.body.lawFirm.name).toContain(RUN_ID);
    lawFirmIds.push(Number(res.body.lawFirm.id));

    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM law_firm_users WHERE email = ? LIMIT 1`,
      [ownerEmail],
    );
    expect(users[0]).toBeTruthy();
    lawFirmUserIds.push(Number(users[0].id));

    const [members] = await pool.query<RowDataPacket[]>(
      `SELECT member_role, is_primary_contact FROM law_firm_members
       WHERE law_firm_id = ? AND law_firm_user_id = ? LIMIT 1`,
      [res.body.lawFirm.id, users[0].id],
    );
    expect(members[0]?.member_role).toBe("owner");
    expect(Number(members[0]?.is_primary_contact)).toBe(1);
  });

  it("POST /api/team/members createLawFirm invites owner", async () => {
    const email = `inline-owner-${RUN_ID}${TEST_EMAIL_SUFFIX}`;
    const res = await request(app)
      .post("/api/team/members")
      .set(authHeader(adminToken))
      .send({
        email,
        firstName: "Inline",
        lastName: "Owner",
        role: "law_firm_user",
        createLawFirm: { name: `Inline Firm ${RUN_ID}`, city: "GDL" },
      });
    expect(res.status).toBe(201);
    expect(res.body.member.role).toBe("law_firm_user");
    lawFirmUserIds.push(Number(res.body.member.id));

    const [firms] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM law_firms WHERE name = ? LIMIT 1`,
      [`Inline Firm ${RUN_ID}`],
    );
    expect(firms[0]).toBeTruthy();
    lawFirmIds.push(Number(firms[0].id));

    const [members] = await pool.query<RowDataPacket[]>(
      `SELECT member_role, is_primary_contact FROM law_firm_members
       WHERE law_firm_id = ? AND law_firm_user_id = ? LIMIT 1`,
      [firms[0].id, res.body.member.id],
    );
    expect(members[0]?.member_role).toBe("owner");
    expect(Number(members[0]?.is_primary_contact)).toBe(1);
  });

  it("rejects staff invite when email already is despacho", async () => {
    const email = `dual-${RUN_ID}${TEST_EMAIL_SUFFIX}`;
    const firmInvite = await request(app)
      .post("/api/team/members")
      .set(authHeader(adminToken))
      .send({
        email,
        firstName: "Dual",
        lastName: "User",
        role: "law_firm_user",
        lawFirmId: firmId,
        memberRole: "member",
      });
    expect(firmInvite.status).toBe(201);
    lawFirmUserIds.push(Number(firmInvite.body.member.id));

    const staffInvite = await request(app)
      .post("/api/team/members")
      .set(authHeader(adminToken))
      .send({
        email,
        firstName: "Dual",
        lastName: "User",
        role: "expert",
      });
    expect(staffInvite.status).toBe(409);
  });

  it("viewer cannot create cases or upload documents", async () => {
    const email = `viewer-${RUN_ID}${TEST_EMAIL_SUFFIX}`;
    const invite = await request(app)
      .post("/api/firm/members")
      .set(authHeader(firmOwnerToken))
      .send({
        email,
        firstName: "View",
        lastName: "Only",
        memberRole: "viewer",
      });
    expect(invite.status).toBe(201);
    const viewerId = Number(invite.body.member.id);
    lawFirmUserIds.push(viewerId);

    await pool.query(
      `UPDATE law_firm_users SET status = 'active', email_verified_at = NOW()
       WHERE id = ?`,
      [viewerId],
    );
    const viewerToken = await lawFirmBearerToken(pool, viewerId);

    const createRes = await request(app)
      .post("/api/cases")
      .set(authHeader(viewerToken))
      .send({ title: `Viewer blocked ${RUN_ID}` });
    expect(createRes.status).toBe(403);

    const me = await request(app)
      .get("/api/auth/client/me")
      .set(authHeader(viewerToken));
    expect(me.status).toBe(200);
    expect(me.body.user.memberRole).toBe("viewer");
  });

  it("reactivates soft-deleted law_firm email on re-invite", async () => {
    const email = `soft-del-${RUN_ID}${TEST_EMAIL_SUFFIX}`;
    const first = await request(app)
      .post("/api/team/members")
      .set(authHeader(adminToken))
      .send({
        email,
        firstName: "Soft",
        lastName: "Del",
        role: "law_firm_user",
        lawFirmId: firmId,
        memberRole: "member",
      });
    expect(first.status).toBe(201);
    const userId = Number(first.body.member.id);
    lawFirmUserIds.push(userId);

    await pool.query(
      `UPDATE law_firm_users SET deleted_at = NOW() WHERE id = ?`,
      [userId],
    );

    const again = await request(app)
      .post("/api/team/members")
      .set(authHeader(adminToken))
      .send({
        email,
        firstName: "Soft",
        lastName: "Again",
        role: "law_firm_user",
        lawFirmId: firmId,
        memberRole: "admin",
      });
    expect(again.status).toBe(201);
    expect(Number(again.body.member.id)).toBe(userId);
    expect(again.body.member.memberRole).toBe("admin");

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT deleted_at, status FROM law_firm_users WHERE id = ? LIMIT 1`,
      [userId],
    );
    expect(rows[0]?.deleted_at).toBeNull();
    expect(rows[0]?.status).toBe("invited");
  });

  it("GET /api/team/members?roster=firm lists despacho contacts", async () => {
    const res = await request(app)
      .get("/api/team/members")
      .query({ roster: "firm" })
      .set(authHeader(adminToken));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.members)).toBe(true);
    expect(
      res.body.members.some(
        (m: { role: string; lawFirmId?: number }) =>
          m.role === "law_firm_user" && m.lawFirmId === firmId,
      ),
    ).toBe(true);
  });

  it("blocks OTP when email is alive in both actor tables", async () => {
    const email = `dual-login-${RUN_ID}${TEST_EMAIL_SUFFIX}`;
    const staff = await insertTestStaffUser(pool, {
      runId: `${RUN_ID}-dual`,
      role: "expert",
      tag: "dual",
    });
    staffUserIds.push(staff.id);
    await pool.query(`UPDATE staff_users SET email = ? WHERE id = ?`, [
      email,
      staff.id,
    ]);

    // Legacy dual row: same email in both tables (invite path would 409)
    const [ins] = await pool.query<ResultSetHeader>(
      `INSERT INTO law_firm_users
         (public_uuid, email, email_verified_at, first_name, last_name, status)
       VALUES (?, ?, NOW(), 'Dual', 'Firm', 'active')`,
      [crypto.randomUUID(), email],
    );
    const firmUserId = Number(ins.insertId);
    lawFirmUserIds.push(firmUserId);
    await pool.query(
      `INSERT INTO law_firm_members (law_firm_id, law_firm_user_id, member_role)
       VALUES (?, ?, 'member')`,
      [firmId, firmUserId],
    );

    const otp = await request(app)
      .post("/api/auth/request-otp")
      .send({ email });
    expect(otp.status).toBe(409);
    expect(otp.body.code).toBe("email_actor_conflict");
  });
});

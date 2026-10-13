/** Helpers for api integration tests (example.test fixtures, JWTs). Email skipped under VITEST. */
import crypto from "node:crypto";
import type {
  Pool,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import type { AuthUser, UserRole } from "../shared/api";
import { createSession } from "./index";
import { TEST_EMAIL_SUFFIX } from "./testDbCleanup";

function mapStaffAuthUser(row: RowDataPacket): AuthUser {
  return {
    id: Number(row.id),
    publicUuid: String(row.public_uuid),
    email: String(row.email),
    firstName: String(row.first_name),
    lastName: String(row.last_name),
    role: row.role as UserRole,
    actor: "staff",
    status: row.status as AuthUser["status"],
    phone: (row.phone as string | null) ?? null,
    avatarUrl: (row.avatar_url as string | null) ?? null,
    preferredLanguage:
      (row.preferred_language as AuthUser["preferredLanguage"]) || "es",
    preferredTheme:
      (row.preferred_theme as AuthUser["preferredTheme"]) || "system",
    showFormHelpers: Boolean(row.show_form_helpers ?? false),
    showProcessGuidance: Boolean(row.show_process_guidance ?? false),
    lastLoginAt: null,
  };
}

function mapLawFirmAuthUser(row: RowDataPacket): AuthUser {
  return {
    id: Number(row.id),
    publicUuid: String(row.public_uuid),
    email: String(row.email),
    firstName: String(row.first_name),
    lastName: String(row.last_name),
    role: null,
    actor: "law_firm",
    status: row.status as AuthUser["status"],
    phone: (row.phone as string | null) ?? null,
    avatarUrl: (row.avatar_url as string | null) ?? null,
    preferredLanguage:
      (row.preferred_language as AuthUser["preferredLanguage"]) || "es",
    preferredTheme:
      (row.preferred_theme as AuthUser["preferredTheme"]) || "system",
    showFormHelpers: Boolean(row.show_form_helpers ?? false),
    showProcessGuidance: Boolean(row.show_process_guidance ?? false),
    lastLoginAt: null,
  };
}

export async function insertTestStaffUser(
  pool: Pool,
  opts: { runId: string; role: UserRole; tag?: string },
): Promise<{ id: number; email: string; role: UserRole }> {
  const tag = opts.tag ?? opts.role;
  const email = `staff-${tag}-${opts.runId}${TEST_EMAIL_SUFFIX}`;
  const [existing] = await pool.query<RowDataPacket[]>(
    `SELECT id, email, role FROM staff_users WHERE email = ? LIMIT 1`,
    [email],
  );
  if (existing[0]) {
    return {
      id: Number(existing[0].id),
      email,
      role: existing[0].role as UserRole,
    };
  }
  const publicUuid = crypto.randomUUID();
  const [ins] = await pool.query<ResultSetHeader>(
    `INSERT INTO staff_users
       (public_uuid, email, email_verified_at, first_name, last_name, role, status)
     VALUES (?, ?, NOW(), 'Test', ?, ?, 'active')`,
    [publicUuid, email, opts.runId.slice(0, 24), opts.role],
  );
  return { id: Number(ins.insertId), email, role: opts.role };
}

export async function staffBearerToken(
  pool: Pool,
  staffUserId: number,
): Promise<string> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM staff_users WHERE id = ? LIMIT 1`,
    [staffUserId],
  );
  if (!rows[0]) throw new Error(`Staff user ${staffUserId} not found`);
  return createSession(
    "staff",
    mapStaffAuthUser(rows[0]),
    "127.0.0.1",
    "vitest-delache",
  );
}

export async function insertTestLawFirm(
  pool: Pool,
  runId: string,
): Promise<{ id: number; name: string }> {
  const name = `Test Firm ${runId}`;
  const [existing] = await pool.query<RowDataPacket[]>(
    `SELECT id, name FROM law_firms WHERE name = ? LIMIT 1`,
    [name],
  );
  if (existing[0]) {
    return { id: Number(existing[0].id), name };
  }
  const publicUuid = crypto.randomUUID();
  const [ins] = await pool.query<ResultSetHeader>(
    `INSERT INTO law_firms (public_uuid, name, status) VALUES (?, ?, 'active')`,
    [publicUuid, name],
  );
  return { id: Number(ins.insertId), name };
}

export async function insertTestLawFirmUser(
  pool: Pool,
  opts: { runId: string; lawFirmId: number },
): Promise<{ id: number; email: string }> {
  const email = `client-${opts.runId}${TEST_EMAIL_SUFFIX}`;
  const [existing] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM law_firm_users WHERE email = ? LIMIT 1`,
    [email],
  );
  if (existing[0]) {
    return { id: Number(existing[0].id), email };
  }
  const publicUuid = crypto.randomUUID();
  const [ins] = await pool.query<ResultSetHeader>(
    `INSERT INTO law_firm_users
       (public_uuid, email, email_verified_at, first_name, last_name, status)
     VALUES (?, ?, NOW(), 'Client', ?, 'active')`,
    [publicUuid, email, opts.runId.slice(0, 24)],
  );
  const userId = Number(ins.insertId);
  await pool.query(
    `INSERT INTO law_firm_members (law_firm_id, law_firm_user_id, member_role)
     VALUES (?, ?, 'admin')`,
    [opts.lawFirmId, userId],
  );
  return { id: userId, email };
}

export async function lawFirmBearerToken(
  pool: Pool,
  lawFirmUserId: number,
): Promise<string> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM law_firm_users WHERE id = ? LIMIT 1`,
    [lawFirmUserId],
  );
  if (!rows[0]) throw new Error(`Law firm user ${lawFirmUserId} not found`);
  return createSession(
    "law_firm",
    mapLawFirmAuthUser(rows[0]),
    "127.0.0.1",
    "vitest-delache-client",
  );
}

export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

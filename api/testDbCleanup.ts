/**
 * Shared cleanup for DELACHE API integration tests (TiDB).
 * Fixtures use @{runId}@example.test emails and case titles containing runId.
 */
import mysql, { type Pool, type ResultSetHeader } from "mysql2/promise";

export const TEST_EMAIL_SUFFIX = "@example.test";

export type CleanupRunOpts = {
  runId: string;
  caseIds?: number[];
  staffUserIds?: number[];
  lawFirmUserIds?: number[];
  lawFirmIds?: number[];
};

export function createIntegrationTestPool(): Pool {
  return mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 4000),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: true },
    waitForConnections: true,
    connectionLimit: 2,
    queueLimit: 0,
    timezone: "+00:00",
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
    connectTimeout: 60_000,
  });
}

export function resolveCleanupRunId(
  opts: string | { runId?: unknown } | null | undefined,
  label: string,
): string {
  if (typeof opts === "string") {
    if (!opts.trim()) {
      throw new Error(`[testDbCleanup] ${label}: empty runId string`);
    }
    return opts.trim();
  }
  const runId = opts?.runId;
  if (typeof runId !== "string" || !runId.trim()) {
    throw new Error(`[testDbCleanup] ${label}: missing runId`);
  }
  return runId.trim();
}

export async function cleanupIntegrationTestCases(
  pool: Pool,
  opts: string | { runId: string; caseIds?: number[] },
): Promise<number> {
  const runId = resolveCleanupRunId(opts, "cleanupIntegrationTestCases");
  const caseIds =
    typeof opts === "object" && opts ? opts.caseIds : undefined;
  let deleted = 0;

  const ids = [...new Set((caseIds ?? []).map(Number).filter((id) => id > 0))];
  if (ids.length > 0) {
    const [r] = await pool.query<ResultSetHeader>(
      `DELETE FROM cases WHERE id IN (${ids.map(() => "?").join(",")})`,
      ids,
    );
    deleted += Number(r.affectedRows ?? 0);
  }

  const [byTitle] = await pool.query<ResultSetHeader>(
    `DELETE FROM cases WHERE title LIKE ? OR case_number LIKE ?`,
    [`%${runId}%`, `%${runId}%`],
  );
  deleted += Number(byTitle.affectedRows ?? 0);
  return deleted;
}

export async function cleanupIntegrationTestStaffUsers(
  pool: Pool,
  opts: string | { runId: string; staffUserIds?: number[] },
): Promise<number> {
  const runId = resolveCleanupRunId(opts, "cleanupIntegrationTestStaffUsers");
  const staffUserIds =
    typeof opts === "object" && opts ? opts.staffUserIds : undefined;
  let deleted = 0;

  const ids = [
    ...new Set((staffUserIds ?? []).map(Number).filter((id) => id > 0)),
  ];
  if (ids.length > 0) {
    await pool.query(
      `DELETE FROM staff_sessions WHERE staff_user_id IN (${ids.map(() => "?").join(",")})`,
      ids,
    );
    const [r] = await pool.query<ResultSetHeader>(
      `DELETE FROM staff_users WHERE id IN (${ids.map(() => "?").join(",")})`,
      ids,
    );
    deleted += Number(r.affectedRows ?? 0);
  }

  const [sessions] = await pool.query<ResultSetHeader>(
    `DELETE ss FROM staff_sessions ss
     INNER JOIN staff_users u ON u.id = ss.staff_user_id
     WHERE u.email LIKE ? AND u.email LIKE ?`,
    [`%${runId}%`, `%${TEST_EMAIL_SUFFIX}`],
  );
  deleted += Number(sessions.affectedRows ?? 0);

  const [users] = await pool.query<ResultSetHeader>(
    `DELETE FROM staff_users WHERE email LIKE ? AND email LIKE ?`,
    [`%${runId}%`, `%${TEST_EMAIL_SUFFIX}`],
  );
  deleted += Number(users.affectedRows ?? 0);
  return deleted;
}

export async function cleanupIntegrationTestLawFirmUsers(
  pool: Pool,
  opts: string | { runId: string; lawFirmUserIds?: number[] },
): Promise<number> {
  const runId = resolveCleanupRunId(opts, "cleanupIntegrationTestLawFirmUsers");
  const lawFirmUserIds =
    typeof opts === "object" && opts ? opts.lawFirmUserIds : undefined;
  let deleted = 0;

  const ids = [
    ...new Set((lawFirmUserIds ?? []).map(Number).filter((id) => id > 0)),
  ];
  if (ids.length > 0) {
    await pool.query(
      `DELETE FROM law_firm_user_sessions WHERE law_firm_user_id IN (${ids.map(() => "?").join(",")})`,
      ids,
    );
    const [r] = await pool.query<ResultSetHeader>(
      `DELETE FROM law_firm_users WHERE id IN (${ids.map(() => "?").join(",")})`,
      ids,
    );
    deleted += Number(r.affectedRows ?? 0);
  }

  const [users] = await pool.query<ResultSetHeader>(
    `DELETE FROM law_firm_users WHERE email LIKE ? AND email LIKE ?`,
    [`%${runId}%`, `%${TEST_EMAIL_SUFFIX}`],
  );
  deleted += Number(users.affectedRows ?? 0);
  return deleted;
}

export async function cleanupIntegrationTestLawFirms(
  pool: Pool,
  opts: string | { runId: string; lawFirmIds?: number[] },
): Promise<number> {
  const runId = resolveCleanupRunId(opts, "cleanupIntegrationTestLawFirms");
  const lawFirmIds =
    typeof opts === "object" && opts ? opts.lawFirmIds : undefined;
  let deleted = 0;

  const ids = [
    ...new Set((lawFirmIds ?? []).map(Number).filter((id) => id > 0)),
  ];
  if (ids.length > 0) {
    const [r] = await pool.query<ResultSetHeader>(
      `DELETE FROM law_firms WHERE id IN (${ids.map(() => "?").join(",")})`,
      ids,
    );
    deleted += Number(r.affectedRows ?? 0);
  }

  const [byName] = await pool.query<ResultSetHeader>(
    `DELETE FROM law_firms WHERE name LIKE ?`,
    [`%${runId}%`],
  );
  deleted += Number(byName.affectedRows ?? 0);
  return deleted;
}

/** Standard afterAll for suites that seed cases and/or test staff users. */
export async function cleanupIntegrationTestFixtures(
  pool: Pool,
  opts: CleanupRunOpts,
): Promise<void> {
  const runId = resolveCleanupRunId(opts, "cleanupIntegrationTestFixtures");
  await cleanupIntegrationTestCases(pool, { runId, caseIds: opts.caseIds });
  await cleanupIntegrationTestLawFirmUsers(pool, {
    runId,
    lawFirmUserIds: opts.lawFirmUserIds,
  });
  await cleanupIntegrationTestLawFirms(pool, {
    runId,
    lawFirmIds: opts.lawFirmIds,
  });
  await cleanupIntegrationTestStaffUsers(pool, {
    runId,
    staffUserIds: opts.staffUserIds,
  });
}

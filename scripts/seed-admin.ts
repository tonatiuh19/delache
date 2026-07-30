/**
 * Seed an initial admin user for OTP login.
 * Usage: SEED_ADMIN_EMAIL=you@company.com npm run seed:admin
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import { generatePublicUuid } from "../shared/authUtils";

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || "").trim().toLowerCase();
  if (!email) {
    throw new Error(
      "Set SEED_ADMIN_EMAIL to the admin email, e.g. SEED_ADMIN_EMAIL=you@delache.mx npm run seed:admin",
    );
  }

  const firstName = process.env.SEED_ADMIN_FIRST_NAME || "Admin";
  const lastName = process.env.SEED_ADMIN_LAST_NAME || "DELACHE";

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === "false" ? undefined : { minVersion: "TLSv1.2" },
  });

  try {
    const [existing] = await conn.query<mysql.RowDataPacket[]>(
      `SELECT id, email FROM staff_users WHERE LOWER(TRIM(email)) = ? LIMIT 1`,
      [email],
    );
    if (existing.length > 0) {
      console.log(`✅ Admin already exists: ${email} (id=${existing[0].id})`);
      return;
    }

    const uuid = generatePublicUuid();
    const [result] = await conn.query<mysql.ResultSetHeader>(
      `INSERT INTO staff_users
        (public_uuid, email, first_name, last_name, role, status, preferred_language, email_verified_at)
       VALUES (?, ?, ?, ?, 'admin', 'active', 'es', NOW())`,
      [uuid, email, firstName, lastName],
    );
    console.log(`🎉 Seeded admin ${email} (id=${result.insertId})`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("❌", err instanceof Error ? err.message : err);
  process.exit(1);
});

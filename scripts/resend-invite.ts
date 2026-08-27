/**
 * One-shot: resend staff invite with a verified public APP_URL.
 * Usage:
 *   RESEND_TO=ulisesenle@gmail.com APP_URL=https://www.delache.mx npx tsx scripts/resend-invite.ts
 */
import "dotenv/config";
import { Resend } from "resend";
import mysql from "mysql2/promise";
import { buildInviteStaffEmail } from "../lib/emails";
import {
  isLocalhostAppUrl,
  resolvePublicAppUrl,
} from "../shared/appUrlRules";

async function main() {
  const email = (
    process.env.RESEND_TO ||
    process.env.INVITE_EMAIL ||
    ""
  )
    .trim()
    .toLowerCase();
  if (!email) {
    throw new Error("Set RESEND_TO=someone@example.com");
  }

  const appUrl = resolvePublicAppUrl({
    APP_URL: process.env.APP_URL || "https://www.delache.mx",
    PUBLIC_APP_URL: process.env.PUBLIC_APP_URL,
    VITE_PUBLIC_APP_URL: process.env.VITE_PUBLIC_APP_URL,
    VERCEL_ENV: "production",
    NODE_ENV: "production",
  });

  if (isLocalhostAppUrl(appUrl)) {
    throw new Error(
      `Refusing to send: APP_URL is still localhost (${appUrl}). Set APP_URL=https://www.delache.mx`,
    );
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("RESEND_API_KEY missing in .env");

  const from =
    process.env.SMTP_FROM?.trim() || "DELACHE <no-reply@disruptinglabs.com>";

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === "false" ? undefined : { minVersion: "TLSv1.2" },
  });

  try {
    const [rows] = await conn.query<mysql.RowDataPacket[]>(
      `SELECT public_uuid, email, first_name, role, status, preferred_language
         FROM staff_users
        WHERE LOWER(TRIM(email)) = ? AND deleted_at IS NULL
        LIMIT 1`,
      [email],
    );
    if (rows.length === 0) {
      throw new Error(`No staff_users row for ${email}`);
    }
    const row = rows[0];
    if (String(row.status) !== "invited") {
      throw new Error(
        `Status is "${row.status}" (need invited). public_uuid=${row.public_uuid}`,
      );
    }

    const locale =
      String(row.preferred_language || "es").toLowerCase() === "en"
        ? "en"
        : "es";
    const payload = buildInviteStaffEmail({
      locale,
      firstName: String(row.first_name),
      role: String(row.role),
      appUrl,
      resend: true,
    });

    const loginUrl = `${appUrl}/portal/login`;
    if (!payload.html.includes(loginUrl) || !payload.html.includes(appUrl)) {
      throw new Error("Email HTML missing production URLs — aborting");
    }
    if (/localhost|127\.0\.0\.1/i.test(payload.html)) {
      throw new Error("Email HTML still contains localhost — aborting");
    }

    console.log("Sending invite resend:");
    console.log(`  to:      ${row.email}`);
    console.log(`  role:    ${row.role}`);
    console.log(`  appUrl:  ${appUrl}`);
    console.log(`  CTA:     ${loginUrl}`);
    console.log(`  subject: ${payload.subject}`);

    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from,
      to: String(row.email),
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });

    if (result.error) {
      throw new Error(JSON.stringify(result.error));
    }

    console.log("✅ Sent", result.data?.id || result);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("❌", err instanceof Error ? err.message : err);
  process.exit(1);
});

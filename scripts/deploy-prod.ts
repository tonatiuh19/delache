/**
 * Production deploy to Vercel with consecutive semver bump in system_settings.app_version.
 *
 * Mirrors optimum-credit/scripts/deploy-prod.ts patterns:
 * - Short-lived TiDB connections (never hold open across vercel --prod)
 * - Pre-deploy typecheck + tests
 * - Prompt or CLI version, then vercel --prod, then write app_version
 *
 * Usage:
 *   npm run deploy:prod
 *   npm run deploy:prod -- 0.1.3
 *   npm run deploy:prod -- --skip-checks
 *   npm run deploy:prod -- 0.1.3 --skip-checks
 *   SKIP_DEPLOY_CHECKS=1 npm run deploy:prod -- 0.1.3
 */
import "dotenv/config";

import { spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";
import mysql from "mysql2/promise";
import { checkDeployVersion } from "../shared/deployVersion";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function normalizeVersion(value: string): string {
  return value.trim();
}

function dbConfig() {
  return {
    host: requireEnv("DB_HOST"),
    port: Number(requireEnv("DB_PORT")),
    user: requireEnv("DB_USER"),
    password: requireEnv("DB_PASSWORD"),
    database: requireEnv("DB_NAME"),
    ssl:
      process.env.DB_SSL === "false"
        ? undefined
        : { minVersion: "TLSv1.2" as const },
    // TiDB Serverless drops idle sockets; never hold a conn across vercel --prod.
    enableKeepAlive: true,
    connectTimeout: 20_000,
  };
}

async function withDb<T>(fn: (conn: mysql.Connection) => Promise<T>): Promise<T> {
  const conn = await mysql.createConnection(dbConfig());
  try {
    return await fn(conn);
  } finally {
    await conn.end().catch(() => undefined);
  }
}

async function runCommand(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false,
      env,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${command} ${args.join(" ")} failed with exit code ${code ?? "unknown"}`,
        ),
      );
    });
  });
}

/** Typecheck + vitest — must pass before production deploy. */
async function runPreDeployChecks() {
  console.log("\n🧪 Pre-deploy checks: typecheck + tests...\n");
  await runCommand("npm", ["run", "typecheck"]);
  console.log("\n✅ Typecheck passed.\n");
  await runCommand("npm", ["test"]);
  console.log("\n✅ Tests passed. Continuing to deploy...\n");
}

async function promptForVersion(
  currentVersion: string | null,
): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const currentLabel = currentVersion?.trim() || "not set";
    console.log(`\n🏷️  Current production version: ${currentLabel}`);
    console.log(
      "   Use MAJOR.MINOR.PATCH. Only the next patch, next minor (.0), or next major (.0.0) is allowed.\n",
    );

    while (true) {
      const input = await rl.question("✏️  Enter deploy version: ");
      const version = normalizeVersion(input);
      const check = checkDeployVersion(version, currentVersion);
      if (check.ok === false) {
        console.log(`❌ ${check.reason}`);
        continue;
      }

      const confirm = await rl.question(
        `❓ Deploy version ${check.version} to production and update app_version after success? (y/N): `,
      );
      if (confirm.trim().toLowerCase() === "y") {
        console.log(
          `✅ Confirmed. Proceeding with version ${check.version}...`,
        );
        return check.version;
      }
      console.log(
        "❌ Deploy cancelled. Please enter a new version or Ctrl+C to abort.",
      );
    }
  } finally {
    rl.close();
  }
}

async function readAppVersion(): Promise<string | null> {
  return withDb(async (conn) => {
    const [rows] = await conn.query<mysql.RowDataPacket[]>(
      `SELECT setting_value
         FROM system_settings
        WHERE setting_key = 'app_version'
        LIMIT 1`,
    );
    return (rows as mysql.RowDataPacket[])[0]?.setting_value ?? null;
  });
}

/**
 * Block production deploys when required migrations were never applied.
 * Apply files under database/migrations/ (see AGENTS.md) before retrying.
 */
async function assertRequiredSchema(): Promise<void> {
  await withDb(async (conn) => {
    const checks: Array<{ label: string; sql: string }> = [
      {
        label: "cases.involves_fatality (20260811_193000_involves_fatality.sql)",
        sql: `SELECT 1 AS ok FROM information_schema.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'cases'
                AND COLUMN_NAME = 'involves_fatality'
              LIMIT 1`,
      },
      {
        label:
          "document_versions.ocr_status (20260810_200000_document_ocr_fields.sql)",
        sql: `SELECT 1 AS ok FROM information_schema.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'document_versions'
                AND COLUMN_NAME = 'ocr_status'
              LIMIT 1`,
      },
      {
        label:
          "otp_request_rate_limits (20260810_220000_otp_request_rate_limits.sql)",
        sql: `SELECT 1 AS ok FROM information_schema.TABLES
              WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'otp_request_rate_limits'
              LIMIT 1`,
      },
      {
        label:
          "staff_users.show_form_helpers (20260810_230000_show_form_helpers.sql)",
        sql: `SELECT 1 AS ok FROM information_schema.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'staff_users'
                AND COLUMN_NAME = 'show_form_helpers'
              LIMIT 1`,
      },
    ];
    const missing: string[] = [];
    for (const check of checks) {
      const [rows] = await conn.query<mysql.RowDataPacket[]>(check.sql);
      if ((rows as mysql.RowDataPacket[]).length === 0) {
        missing.push(check.label);
      }
    }
    if (missing.length > 0) {
      throw new Error(
        `Database is missing required schema. Apply migrations first:\n  - ${missing.join("\n  - ")}`,
      );
    }
  });
}

async function writeAppVersion(deployVersion: string): Promise<void> {
  await withDb(async (conn) => {
    await conn.execute(
      `INSERT INTO system_settings (
         setting_key,
         setting_value,
         description,
         updated_at
       ) VALUES ('app_version', ?, 'Current deployed application version shown in the site footer.', NOW())
       ON DUPLICATE KEY UPDATE
         setting_value = VALUES(setting_value),
         description = VALUES(description),
         updated_at = NOW()`,
      [deployVersion],
    );
  });
}

async function main() {
  // Validate DB env early (before long typecheck/deploy).
  dbConfig();

  const cliArgs = process.argv.slice(2);
  const skipChecks =
    cliArgs.includes("--skip-checks") ||
    cliArgs.includes("--skip-tests") ||
    process.env.SKIP_DEPLOY_CHECKS === "1" ||
    process.env.SKIP_DEPLOY_CHECKS === "true";
  const filteredArgs = cliArgs.filter(
    (arg) => arg !== "--skip-checks" && arg !== "--skip-tests",
  );
  const explicitVersion =
    filteredArgs.find((arg) => !arg.startsWith("-")) ?? "";
  const vercelArgs = explicitVersion
    ? filteredArgs.filter(
        (arg, index) => index !== filteredArgs.indexOf(explicitVersion),
      )
    : filteredArgs;

  if (!skipChecks) {
    await runPreDeployChecks();
  } else {
    console.log(
      "\n⚠️  Skipping pre-deploy checks (--skip-checks / SKIP_DEPLOY_CHECKS).\n",
    );
  }

  console.log("\n🗄️  Verifying required DB migrations are applied...\n");
  await assertRequiredSchema();
  console.log("✅ Required schema present.\n");

  const publicAppUrl =
    process.env.APP_URL?.trim() ||
    process.env.PUBLIC_APP_URL?.trim() ||
    process.env.VITE_PUBLIC_APP_URL?.trim() ||
    "";
  if (!publicAppUrl || /localhost|127\.0\.0\.1/i.test(publicAppUrl)) {
    throw new Error(
      "Set APP_URL or VITE_PUBLIC_APP_URL in .env to your public https domain (e.g. https://app.delache.mx) before production deploy. Welcome/invite emails use this URL.",
    );
  }
  console.log(`✅ Public app URL for emails: ${publicAppUrl.replace(/\/$/, "")}\n`);

  // Short-lived connection — do not hold open across vercel --prod
  // (TiDB Serverless closes idle sockets → "connection is in closed state").
  const currentVersion = await readAppVersion();
  const deployVersionRaw = explicitVersion
    ? normalizeVersion(explicitVersion)
    : await promptForVersion(currentVersion);

  const versionCheck = checkDeployVersion(deployVersionRaw, currentVersion);
  if (versionCheck.ok === false) {
    throw new Error(versionCheck.reason);
  }
  const deployVersion = versionCheck.version;

  console.log(
    `\n🚀 Starting Vercel production deploy for version ${deployVersion}...\n`,
  );
  await runCommand(
    "npx",
    [
      "vercel",
      "--prod",
      "--build-env",
      `VITE_APP_VERSION=${deployVersion}`,
      "--build-env",
      `APP_VERSION=${deployVersion}`,
      "--build-env",
      `VITE_PUBLIC_APP_URL=${publicAppUrl.replace(/\/$/, "")}`,
      "--env",
      `VITE_PUBLIC_APP_URL=${publicAppUrl.replace(/\/$/, "")}`,
      "--env",
      `APP_URL=${publicAppUrl.replace(/\/$/, "")}`,
      ...vercelArgs,
    ],
    {
      ...process.env,
      VITE_APP_VERSION: deployVersion,
      APP_VERSION: deployVersion,
      VITE_PUBLIC_APP_URL: publicAppUrl.replace(/\/$/, ""),
      APP_URL: publicAppUrl.replace(/\/$/, ""),
    },
  );

  await writeAppVersion(deployVersion);

  console.log(
    `\n🎉 Production deploy succeeded! app_version updated to ${deployVersion}.`,
  );
}

main().catch((error) => {
  console.error(
    `\n❌ Deploy aborted: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});

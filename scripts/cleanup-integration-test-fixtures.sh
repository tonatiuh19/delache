#!/usr/bin/env bash
# Purge DELACHE integration-test fixtures (@example.test emails + runId cases).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DRY=""
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY="1"
fi

DB_PASS=$(grep "^DB_PASSWORD" .env | cut -d'=' -f2-)
DB_HOST=$(grep "^DB_HOST" .env | cut -d'=' -f2-)
DB_PORT=$(grep "^DB_PORT" .env | cut -d'=' -f2-)
DB_USER=$(grep "^DB_USER" .env | cut -d'=' -f2-)
DB_NAME=$(grep "^DB_NAME" .env | cut -d'=' -f2-)

MYSQL=(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME"
  --ssl-mode=REQUIRED --protocol=TCP)

run_sql() {
  local label="$1"
  local sql="$2"
  if [[ -n "$DRY" ]]; then
    echo "DRY RUN: $label"
    echo "$sql"
    return
  fi
  echo "▶ $label"
  "${MYSQL[@]}" -e "$sql"
}

run_sql "cases titled like integration tests" \
  "DELETE FROM cases WHERE title LIKE '%vitest-%' OR title LIKE '%api-%';"

run_sql "staff test users" \
  "DELETE u FROM staff_users u WHERE u.email LIKE '%@example.test';"

run_sql "law firm test users" \
  "DELETE u FROM law_firm_users u WHERE u.email LIKE '%@example.test';"

run_sql "law firms named Test Firm" \
  "DELETE FROM law_firms WHERE name LIKE 'Test Firm %';"

run_sql "OTP rate-limit buckets (vitest / localhost spray)" \
  "DELETE FROM otp_request_rate_limits
   WHERE rate_key LIKE '%@example.test%'
      OR rate_key LIKE '%127.0.0.1%'
      OR rate_key LIKE '%::1%'
      OR rate_key LIKE '%unknown%';"

echo "✅ Cleanup complete."

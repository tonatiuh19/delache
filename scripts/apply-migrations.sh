#!/usr/bin/env bash
# Apply database migrations to TiDB Cloud (reads credentials from .env).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "❌ .env not found at $ROOT/.env"
  exit 1
fi

DB_PASS=$(grep "^DB_PASSWORD" .env | cut -d'=' -f2-)
DB_HOST=$(grep "^DB_HOST" .env | cut -d'=' -f2-)
DB_PORT=$(grep "^DB_PORT" .env | cut -d'=' -f2-)
DB_USER=$(grep "^DB_USER" .env | cut -d'=' -f2-)
DB_NAME=$(grep "^DB_NAME" .env | cut -d'=' -f2-)

MYSQL=(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME"
  --ssl-mode=REQUIRED --protocol=TCP)

run_migration() {
  local file="$1"
  echo ""
  echo "▶ Applying $(basename "$file") ..."
  if "${MYSQL[@]}" < "$file" 2>&1; then
    echo "✅ $(basename "$file")"
  else
    echo "❌ $(basename "$file") failed — aborting to avoid schema drift."
    exit 1
  fi
}

echo "🔍 Applying migrations in database/migrations/ (sorted) ..."
shopt -s nullglob
files=(database/migrations/*.sql)
IFS=$'\n' sorted=($(sort <<<"${files[*]}"))
unset IFS

for file in "${sorted[@]}"; do
  run_migration "$file"
done

echo ""
echo "🎉 All migrations applied."

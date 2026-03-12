#!/usr/bin/env bash
set -euo pipefail

# Optional: load local env file if present for convenience.
if [[ -f ./.env.mysql ]]; then
  set -a
  source ./.env.mysql
  set +a
fi

: "${DB_HOST:?DB_HOST is required}"
: "${DB_PORT:?DB_PORT is required}"
: "${DB_NAME:?DB_NAME is required}"
: "${DB_USER:?DB_USER is required}"
: "${DB_PASS:?DB_PASS is required}"

DUMP_DIR="${DUMP_DIR:-./backups}"
STAMP="$(date +%Y%m%d_%H%M%S)"
SQL_FILE="${DUMP_FILE:-${DUMP_DIR}/${DB_NAME}_${STAMP}.sql}"

mkdir -p "${DUMP_DIR}"

mysqldump \
  --host="${DB_HOST}" \
  --port="${DB_PORT}" \
  --user="${DB_USER}" \
  --password="${DB_PASS}" \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --events \
  --set-gtid-purged=OFF \
  --no-tablespaces \
  "${DB_NAME}" > "${SQL_FILE}"

if command -v gzip >/dev/null 2>&1; then
  gzip -f "${SQL_FILE}"
  echo "MySQL dump created: ${SQL_FILE}.gz"
else
  echo "MySQL dump created: ${SQL_FILE}"
fi

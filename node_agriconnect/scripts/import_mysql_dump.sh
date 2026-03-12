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

DUMP_FILE_PATH="${DUMP_FILE:-${1:-}}"
if [[ -z "${DUMP_FILE_PATH}" ]]; then
  echo "Usage: DUMP_FILE=./path/to/dump.sql.gz npm run db:restore:mysql"
  echo "   or: npm run db:restore:mysql -- ./path/to/dump.sql.gz"
  exit 1
fi

if [[ ! -f "${DUMP_FILE_PATH}" ]]; then
  echo "Dump file not found: ${DUMP_FILE_PATH}"
  exit 1
fi

# Create DB if permissions allow; safe for first-time server restore.
mysql \
  --host="${DB_HOST}" \
  --port="${DB_PORT}" \
  --user="${DB_USER}" \
  --password="${DB_PASS}" \
  -e "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

if [[ "${DUMP_FILE_PATH}" == *.gz ]]; then
  gunzip -c "${DUMP_FILE_PATH}" | mysql \
    --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --user="${DB_USER}" \
    --password="${DB_PASS}" \
    "${DB_NAME}"
else
  mysql \
    --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --user="${DB_USER}" \
    --password="${DB_PASS}" \
    "${DB_NAME}" < "${DUMP_FILE_PATH}"
fi

echo "MySQL dump restored into database: ${DB_NAME}"

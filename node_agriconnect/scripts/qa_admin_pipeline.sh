#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORT_DIR="$ROOT_DIR/qa/reports"
TS="$(date +%Y%m%d_%H%M%S)"
REPORT_FILE="$REPORT_DIR/admin_pipeline_${TS}.json"
SERVER_LOG="/tmp/agriconnect_admin_pipeline_server_${TS}.log"

BASE_URL="${BASE_URL:-http://localhost:3000}"
SMOKE_PORT="${SMOKE_PORT:-3101}"
SMOKE_BASE_URL="http://127.0.0.1:${SMOKE_PORT}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@agriconnect.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin@1234}"

mkdir -p "$REPORT_DIR"

BACKEND_STATUS="not-run"
FRONTEND_STATUS="not-run"
SMOKE_STATUS="not-run"
SMOKE_MESSAGE=""

SERVER_PID=""
USING_EXISTING_SERVER="false"

cleanup() {
  if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

wait_for_up() {
  local url="$1"
  local retries=30
  local delay=1
  for ((i=1; i<=retries; i++)); do
    if curl -sf "$url/up" >/dev/null; then
      return 0
    fi
    if [[ -n "$SERVER_PID" ]] && ! kill -0 "$SERVER_PID" 2>/dev/null; then
      return 1
    fi
    sleep "$delay"
  done
  return 1
}

write_report() {
  cat > "$REPORT_FILE" <<JSON
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "pipeline": "admin-qa",
  "baseUrl": "$BASE_URL",
  "smokeBaseUrl": "$SMOKE_BASE_URL",
  "steps": {
    "backendAdminTests": "$BACKEND_STATUS",
    "frontendBuild": "$FRONTEND_STATUS",
    "liveSmoke": "$SMOKE_STATUS"
  },
  "smokeMessage": "$SMOKE_MESSAGE",
  "serverLog": "$SERVER_LOG"
}
JSON
}

cd "$ROOT_DIR"

echo "[1/3] Running backend admin API tests..."
if npm run test:admin; then
  BACKEND_STATUS="passed"
else
  BACKEND_STATUS="failed"
  SMOKE_MESSAGE="backend admin tests failed"
  write_report
  exit 1
fi

echo "[2/3] Building admin frontend..."
if npm --prefix admin-panel run build; then
  FRONTEND_STATUS="passed"
else
  FRONTEND_STATUS="failed"
  SMOKE_MESSAGE="frontend build failed"
  write_report
  exit 1
fi

echo "[3/3] Running live smoke against backend..."
PORT="$SMOKE_PORT" node src/app.js > "$SERVER_LOG" 2>&1 &
SERVER_PID=$!

if ! wait_for_up "$SMOKE_BASE_URL"; then
  SMOKE_STATUS="failed"
  SMOKE_MESSAGE="backend server did not become healthy at $SMOKE_BASE_URL/up (see $SERVER_LOG)"
  write_report
  exit 1
fi

LOGIN_RESPONSE="$(curl -sS -X POST "$SMOKE_BASE_URL/admin/login" -H 'Content-Type: application/json' -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" || true)"
TOKEN="$(echo "$LOGIN_RESPONSE" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"

if [[ -z "$TOKEN" ]]; then
  SMOKE_STATUS="failed"
  SMOKE_MESSAGE="admin login failed; set ADMIN_EMAIL/ADMIN_PASSWORD if needed"
  write_report
  exit 1
fi

for route in \
  "/admin/dashboard" \
  "/admin/courses?page=1" \
  "/admin/users?page=1" \
  "/admin/privacy_policies?page=1"
  do
  code="$(curl -s -o /dev/null -w "%{http_code}" "$SMOKE_BASE_URL$route" -H "Authorization: Bearer $TOKEN")"
  if [[ "$code" != "200" ]]; then
    SMOKE_STATUS="failed"
    SMOKE_MESSAGE="smoke route failed: $route returned $code"
    write_report
    exit 1
  fi
done

SMOKE_STATUS="passed"
SMOKE_MESSAGE="all smoke routes returned 200"
write_report

echo "Admin QA pipeline passed."
echo "Report: $REPORT_FILE"

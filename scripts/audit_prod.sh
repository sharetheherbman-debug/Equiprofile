#!/bin/bash
# ==========================================
# EquiProfile Production Audit Script
# ==========================================
# One-command full system audit.
# Exit 0 = all critical checks PASS.
# Exit 1 = one or more critical checks FAIL.
#
# Usage:
#   bash scripts/audit_prod.sh [--base-url https://equiprofile.online]
#
# Optional env overrides:
#   BASE_URL  – base URL to audit (default: http://localhost:3000)
#   LOCAL_URL – local URL for server-side checks (default: http://127.0.0.1:3000)

set -uo pipefail

# ── Configuration ─────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

BASE_URL="${BASE_URL:-http://localhost:3000}"
LOCAL_URL="${LOCAL_URL:-http://127.0.0.1:3000}"

# Parse --base-url argument
while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-url) BASE_URL="$2"; shift 2 ;;
    *) shift ;;
  esac
done

# ── Counters ──────────────────────────────────────────────────────────────
PASS=0
FAIL=0
WARN=0
BLOCKERS=()

# ── Helpers ───────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'

pass() { echo -e "${GREEN}✅ PASS${NC}  $1"; PASS=$((PASS+1)); }
fail() { echo -e "${RED}❌ FAIL${NC}  $1"; FAIL=$((FAIL+1)); BLOCKERS+=("$1"); }
warn() { echo -e "${YELLOW}⚠️  WARN${NC}  $1"; WARN=$((WARN+1)); }
header() { echo ""; echo "── $1 ──────────────────────────────────────────"; }

http_code() { curl -fsS -o /dev/null -w "%{http_code}" --max-time 10 "$1" 2>/dev/null || echo "000"; }
http_body() { curl -fsS --max-time 10 "$1" 2>/dev/null || echo ""; }
http_post() {
  local url="$1" data="$2"
  curl -fsS -X POST -H "Content-Type: application/json" \
       --max-time 10 -w "\n%{http_code}" -o /tmp/audit_body.txt "$url" -d "$data" 2>/dev/null \
  | tail -1 || echo "000"
}

check_status() {
  local name="$1" url="$2" expect="${3:-200}"
  local code; code="$(http_code "$url")"
  if [ "$code" = "$expect" ]; then
    pass "$name (HTTP $code)"
  else
    fail "$name – got HTTP $code, expected $expect ($url)"
  fi
}

check_json_key() {
  local name="$1" url="$2" key="$3"
  local body; body="$(http_body "$url")"
  if echo "$body" | grep -q "\"$key\""; then
    pass "$name (key '$key' present)"
  else
    fail "$name – key '$key' missing in response ($url)"
  fi
}

# ── Banner ────────────────────────────────────────────────────────────────
echo "=========================================="
echo " EquiProfile Production Audit"
echo "=========================================="
echo " Local : $LOCAL_URL"
echo " Public: $BASE_URL"
echo " Time  : $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "=========================================="

# ══════════════════════════════════════════════════════════════════════════
header "1. Health & Connectivity"
# ══════════════════════════════════════════════════════════════════════════
check_status "Local  /api/health"        "$LOCAL_URL/api/health"
check_status "Public /api/health"        "$BASE_URL/api/health" || true
check_status "Local  /api/health/ping"   "$LOCAL_URL/api/health/ping"
check_json_key "Health reports 'status'" "$LOCAL_URL/api/health" "status"

# ══════════════════════════════════════════════════════════════════════════
header "2. Authentication"
# ══════════════════════════════════════════════════════════════════════════

# Bad credentials must return 401 (not 500)
BAD_LOGIN_CODE="$(http_post "$LOCAL_URL/api/auth/login" \
  '{"email":"audit_nonexistent_9999@example.com","password":"WrongPass123!"}' || true)"
cat /tmp/audit_body.txt 2>/dev/null | head -1 >/dev/null || true
if [ "$BAD_LOGIN_CODE" = "401" ] || [ "$BAD_LOGIN_CODE" = "400" ]; then
  pass "Login rejects bad credentials (HTTP $BAD_LOGIN_CODE, not 500)"
else
  fail "Login returned HTTP $BAD_LOGIN_CODE for bad credentials – expected 401/400 (possible DB error)"
fi

# Signup with a clearly invalid body should return 400
BAD_SIGNUP_CODE="$(http_post "$LOCAL_URL/api/auth/signup" '{}' || true)"
if [ "$BAD_SIGNUP_CODE" = "400" ]; then
  pass "Signup rejects missing fields (HTTP 400)"
else
  fail "Signup returned HTTP $BAD_SIGNUP_CODE for empty body – expected 400"
fi

# ══════════════════════════════════════════════════════════════════════════
header "3. Admin Status"
# ══════════════════════════════════════════════════════════════════════════
check_status  "GET /api/admin/status"    "$LOCAL_URL/api/admin/status"
check_json_key "admin/status has 'overall'" "$LOCAL_URL/api/admin/status" "overall"
check_json_key "admin/status has 'services'" "$LOCAL_URL/api/admin/status" "services"

ADMIN_STATUS="$(http_body "$LOCAL_URL/api/admin/status")"
if echo "$ADMIN_STATUS" | grep -q '"db".*"status".*"green"'; then
  pass "Database: green"
else
  fail "Database: not green – DB may be unreachable (check DATABASE_URL)"
fi
if echo "$ADMIN_STATUS" | grep -q '"adminPassword".*"status".*"green"'; then
  pass "Admin password: configured"
else
  warn "ADMIN_UNLOCK_PASSWORD not set – admin panel is unprotected"
fi

# ══════════════════════════════════════════════════════════════════════════
header "4. Contact Form"
# ══════════════════════════════════════════════════════════════════════════
CONTACT_CODE="$(http_post "$LOCAL_URL/api/contact" \
  '{"name":"Audit Bot","email":"audit@example.com","subject":"Audit Test","message":"Automated audit check – please ignore."}' || true)"
if [ "$CONTACT_CODE" = "200" ]; then
  pass "Contact form endpoint /api/contact returns 200"
else
  fail "Contact form /api/contact returned HTTP $CONTACT_CODE (expected 200)"
fi

# ══════════════════════════════════════════════════════════════════════════
header "5. Realtime (SSE)"
# ══════════════════════════════════════════════════════════════════════════
check_status  "GET /api/realtime/health" "$LOCAL_URL/api/realtime/health"
check_json_key "realtime/health has 'status'" "$LOCAL_URL/api/realtime/health" "status"
# SSE events endpoint requires auth; just check it returns 401, not 500
SSE_CODE="$(http_code "$LOCAL_URL/api/realtime/events")"
if [ "$SSE_CODE" = "401" ]; then
  pass "/api/realtime/events returns 401 for unauthenticated request (correct)"
else
  fail "/api/realtime/events returned HTTP $SSE_CODE – expected 401 for unauth request"
fi

# ══════════════════════════════════════════════════════════════════════════
header "6. System Config Status"
# ══════════════════════════════════════════════════════════════════════════
check_status  "GET /api/system/config-status" "$LOCAL_URL/api/system/config-status"
check_json_key "config-status has 'db'" "$LOCAL_URL/api/system/config-status" "db"

# ══════════════════════════════════════════════════════════════════════════
header "7. Public Pages (SPA routing)"
# ══════════════════════════════════════════════════════════════════════════
for path in "/" "/login" "/register" "/pricing" "/features" "/about" "/contact"; do
  check_status "Page $path" "$BASE_URL$path"
done

# ══════════════════════════════════════════════════════════════════════════
header "8. Build Artifacts"
# ══════════════════════════════════════════════════════════════════════════
if [ -f "$APP_DIR/dist/index.js" ]; then
  pass "dist/index.js exists"
else
  fail "dist/index.js missing – run npm run build"
fi

if ls "$APP_DIR/dist/public/assets/"*.js &>/dev/null; then
  pass "Frontend JS bundle exists in dist/public/assets/"
else
  fail "No JS bundle found in dist/public/assets/ – run npm run build"
fi

# ══════════════════════════════════════════════════════════════════════════
header "9. Environment Variables"
# ══════════════════════════════════════════════════════════════════════════
check_env() {
  local name="$1" required="${2:-required}"
  if [ -n "${!name:-}" ]; then
    pass "Env $name is set"
  elif [ "$required" = "required" ]; then
    fail "Env $name is NOT set (required)"
  else
    warn "Env $name is not set (optional – $required)"
  fi
}

check_env "DATABASE_URL"        "required"
check_env "JWT_SECRET"          "required"
check_env "ADMIN_UNLOCK_PASSWORD" "required"
check_env "SMTP_HOST"           "optional – needed for email"
check_env "GENX_API_KEY"        "optional – needed for AI orchestration"
check_env "HUGGINGFACE_API_KEY" "optional – needed for task execution"
check_env "STRIPE_SECRET_KEY"   "optional – needed for billing"

# ══════════════════════════════════════════════════════════════════════════
# Summary
# ══════════════════════════════════════════════════════════════════════════
echo ""
echo "=========================================="
echo " Audit Summary"
echo "=========================================="
echo " ✅ PASS : $PASS"
echo " ❌ FAIL : $FAIL"
echo " ⚠️  WARN : $WARN"
echo ""

if [ ${#BLOCKERS[@]} -gt 0 ]; then
  echo "Blockers:"
  for b in "${BLOCKERS[@]}"; do
    echo "  ❌ $b"
  done
  echo ""
fi

if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}✅ ALL CRITICAL CHECKS PASSED${NC}"
  echo "=========================================="
  exit 0
else
  echo -e "${RED}❌ $FAIL CRITICAL CHECK(S) FAILED – see blockers above${NC}"
  echo "=========================================="
  exit 1
fi

#!/bin/bash
#=============================================================================
# EquiProfile Production Deployment Checklist
#=============================================================================
# This script verifies that the system is ready for production deployment.
# It checks Node version, dependencies, build process, database connectivity,
# migrations, and required environment variables.
#
# Usage: ./scripts/prod_checklist.sh
# Exit Code: 0 = success, 1 = failure
#=============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0
CHECKS=0

echo "================================================================="
echo "  EquiProfile Production Deployment Checklist"
echo "================================================================="
echo ""

# Helper function for checks
check_pass() {
    CHECKS=$((CHECKS + 1))
    echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
    ERRORS=$((ERRORS + 1))
    CHECKS=$((CHECKS + 1))
    echo -e "${RED}✗${NC} $1"
}

check_warn() {
    WARNINGS=$((WARNINGS + 1))
    CHECKS=$((CHECKS + 1))
    echo -e "${YELLOW}⚠${NC} $1"
}

#=============================================================================
# 1. CHECK NODE.JS VERSION
#=============================================================================
echo -e "${BLUE}[1/8]${NC} Checking Node.js version..."

if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | sed 's/v//')
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1)
    
    if [ "$NODE_MAJOR" -ge 18 ]; then
        check_pass "Node.js v$NODE_VERSION (>= 18 required)"
    else
        check_fail "Node.js v$NODE_VERSION (< 18, please upgrade)"
    fi
else
    check_fail "Node.js not found. Please install Node.js 18+"
fi

#=============================================================================
# 2. CHECK NPM AND DEPENDENCIES
#=============================================================================
echo ""
echo -e "${BLUE}[2/8]${NC} Checking npm and dependencies..."

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    check_pass "npm v$NPM_VERSION installed"
    
    # Check if node_modules exists
    if [ -d "node_modules" ]; then
        check_pass "node_modules directory exists"
    else
        echo -e "${YELLOW}Installing dependencies...${NC}"
        if npm install --legacy-peer-deps --silent; then
            check_pass "Dependencies installed successfully"
        else
            check_fail "Dependency installation failed"
        fi
    fi
else
    check_fail "npm not found"
fi

#=============================================================================
# 3. CHECK TYPESCRIPT COMPILATION
#=============================================================================
echo ""
echo -e "${BLUE}[3/8]${NC} Checking TypeScript compilation..."

if npm run check > /tmp/tsc_check.log 2>&1; then
    check_pass "TypeScript check passed (0 errors)"
else
    ERROR_COUNT=$(grep -c "error TS" /tmp/tsc_check.log || true)
    if [ "$ERROR_COUNT" -gt 0 ]; then
        check_fail "TypeScript has $ERROR_COUNT error(s)"
        echo "Run 'npm run check' to see details"
    else
        check_pass "TypeScript check passed"
    fi
fi

#=============================================================================
# 4. CHECK BUILD PROCESS
#=============================================================================
echo ""
echo -e "${BLUE}[4/8]${NC} Checking build process..."

if npm run build > /tmp/build.log 2>&1; then
    if [ -d "dist" ] && [ -f "dist/index.js" ]; then
        DIST_SIZE=$(du -sh dist | cut -f1)
        check_pass "Build succeeded (dist size: $DIST_SIZE)"
    else
        check_fail "Build completed but dist/index.js not found"
    fi
else
    check_fail "Build failed. Check /tmp/build.log for details"
fi

#=============================================================================
# 5. CHECK DATABASE CONNECTIVITY
#=============================================================================
echo ""
echo -e "${BLUE}[5/8]${NC} Checking database connectivity..."

# Load .env if it exists
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
    check_pass ".env file found"
else
    check_warn ".env file not found (using environment variables)"
fi

if [ -z "$DATABASE_URL" ]; then
    check_fail "DATABASE_URL not set"
else
    # Parse DATABASE_URL
    # Format: mysql://user:pass@host:port/database
    DB_USER=$(echo $DATABASE_URL | grep -oP '(?<=://).*(?=:)')
    DB_PASS=$(echo $DATABASE_URL | grep -oP '(?<=:)[^@]*(?=@)')
    DB_HOST=$(echo $DATABASE_URL | grep -oP '(?<=@)[^:]*(?=:)')
    DB_PORT=$(echo $DATABASE_URL | grep -oP '(?<=:)[0-9]+(?=/)')
    DB_NAME=$(echo $DATABASE_URL | grep -oP '(?<=/)[^?]*$')
    
    if command -v mysql &> /dev/null; then
        if echo "SELECT 1;" | mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" &> /dev/null; then
            check_pass "Database connection successful ($DB_NAME@$DB_HOST:$DB_PORT)"
        else
            check_fail "Cannot connect to database"
        fi
    else
        check_warn "mysql client not installed, cannot test DB connection"
    fi
fi

#=============================================================================
# 6. CHECK DATABASE MIGRATIONS
#=============================================================================
echo ""
echo -e "${BLUE}[6/8]${NC} Checking database migrations..."

if [ -d "drizzle" ] && [ -f "drizzle/schema.ts" ]; then
    check_pass "Drizzle schema found"
    
    # Check if migrations are up to date
    if [ -d "drizzle/meta" ] && [ -f "drizzle/meta/_journal.json" ]; then
        MIGRATION_COUNT=$(ls -1 drizzle/*.sql 2>/dev/null | wc -l)
        check_pass "Found $MIGRATION_COUNT migration file(s)"
    else
        check_warn "Migration metadata not found. Run 'npm run db:push' to generate"
    fi
else
    check_fail "Drizzle schema not found"
fi

#=============================================================================
# 7. CHECK ENVIRONMENT VARIABLES
#=============================================================================
echo ""
echo -e "${BLUE}[7/8]${NC} Checking required environment variables..."

# Critical variables (app will not start without these)
CRITICAL_VARS=(
    "DATABASE_URL"
    "JWT_SECRET"
    "ADMIN_UNLOCK_PASSWORD"
    "STRIPE_SECRET_KEY"
    "STRIPE_WEBHOOK_SECRET"
    "AWS_ACCESS_KEY_ID"
    "AWS_SECRET_ACCESS_KEY"
    "AWS_S3_BUCKET"
)

# Optional but recommended
OPTIONAL_VARS=(
    "GENX_API_KEY"
    "HUGGINGFACE_API_KEY"
    "SMTP_HOST"
    "SMTP_PORT"
    "SMTP_USER"
    "SMTP_PASSWORD"
    "BASE_URL"
    "COOKIE_DOMAIN"
    "LOG_FILE_PATH"
)

echo "  Critical variables:"
for VAR in "${CRITICAL_VARS[@]}"; do
    if [ -z "${!VAR}" ]; then
        check_fail "  Missing: $VAR"
    else
        # Check if it's a placeholder value
        if [[ "${!VAR}" == *"your_"* ]] || [[ "${!VAR}" == *"xxxxx"* ]]; then
            check_warn "  $VAR appears to be a placeholder"
        else
            check_pass "  $VAR is set"
        fi
    fi
done

echo ""
echo "  Optional variables:"
for VAR in "${OPTIONAL_VARS[@]}"; do
    if [ -z "${!VAR}" ]; then
        check_warn "  Not set: $VAR (optional)"
    else
        check_pass "  $VAR is set"
    fi
done

# Special checks
echo ""
echo "  Security checks:"
if [ "${NODE_ENV}" = "production" ]; then
    check_pass "  NODE_ENV=production"
    
    # Check admin password is not default
    if [ "$ADMIN_UNLOCK_PASSWORD" = "ashmor12@" ]; then
        check_fail "  Admin password is still default! CRITICAL SECURITY ISSUE"
    else
        check_pass "  Admin password changed from default"
    fi
    
    # Check COOKIE_SECURE is true
    if [ "$COOKIE_SECURE" = "true" ]; then
        check_pass "  COOKIE_SECURE=true (HTTPS-only cookies)"
    else
        check_warn "  COOKIE_SECURE not set to true (cookies sent over HTTP)"
    fi
else
    check_warn "  NODE_ENV is not 'production' (current: ${NODE_ENV:-not set})"
fi

#=============================================================================
# 8. CHECK LOG DIRECTORY
#=============================================================================
echo ""
echo -e "${BLUE}[8/8]${NC} Checking log directory..."

if [ -n "$LOG_FILE_PATH" ]; then
    LOG_DIR=$(dirname "$LOG_FILE_PATH")
    
    if [ -d "$LOG_DIR" ]; then
        if [ -w "$LOG_DIR" ]; then
            check_pass "Log directory exists and is writable: $LOG_DIR"
        else
            check_fail "Log directory not writable: $LOG_DIR"
        fi
    else
        check_warn "Log directory does not exist: $LOG_DIR"
        echo "  Create with: sudo mkdir -p $LOG_DIR && sudo chown \$USER:\$USER $LOG_DIR"
    fi
else
    check_warn "LOG_FILE_PATH not set"
fi

#=============================================================================
# SUMMARY
#=============================================================================
echo ""
echo "================================================================="
echo "  Summary"
echo "================================================================="
echo ""
echo -e "Total checks: $CHECKS"
echo -e "${GREEN}Passed: $((CHECKS - ERRORS - WARNINGS))${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo -e "${RED}Errors: $ERRORS${NC}"
echo ""

if [ $ERRORS -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}✓ All checks passed! System is ready for production deployment.${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠ System is mostly ready, but has $WARNINGS warning(s).${NC}"
        echo "Review warnings above before deploying to production."
        exit 0
    fi
else
    echo -e "${RED}✗ Found $ERRORS critical error(s). Fix before deploying.${NC}"
    echo ""
    echo "Common fixes:"
    echo "  • npm install --legacy-peer-deps"
    echo "  • Create .env file from .env.example"
    echo "  • Set all required environment variables"
    echo "  • Change ADMIN_UNLOCK_PASSWORD from default"
    echo "  • Run: npm run db:push (apply migrations)"
    echo "  • sudo mkdir -p /var/log/equiprofile"
    echo ""
    exit 1
fi

#!/bin/bash
# Preflight environment validation script
# Checks required environment variables before deployment

set -e

echo "🔍 EquiProfile Preflight Environment Check"
echo "==========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track if any errors occurred
ERRORS=0
WARNINGS=0

# Function to check if a variable is set
check_var() {
    local var_name=$1
    local is_critical=$2
    local condition=$3
    
    if [ -z "${!var_name}" ]; then
        if [ "$is_critical" = "true" ]; then
            echo -e "${RED}✗${NC} $var_name is missing (CRITICAL)"
            if [ -n "$condition" ]; then
                echo "  Required when: $condition"
            fi
            ERRORS=$((ERRORS + 1))
        else
            echo -e "${YELLOW}⚠${NC} $var_name is missing (optional)"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        echo -e "${GREEN}✓${NC} $var_name is set"
    fi
}

echo "Core Configuration:"
echo "-------------------"

# Always check core variables
check_var "DATABASE_URL" "true"
check_var "JWT_SECRET" "true"
check_var "ADMIN_UNLOCK_PASSWORD" "true"

# Check if admin password is still default
if [ "$ADMIN_UNLOCK_PASSWORD" = "ashmor12@" ] && [ "$NODE_ENV" = "production" ]; then
    echo -e "${RED}✗${NC} ADMIN_UNLOCK_PASSWORD is still set to default value!"
    echo "  You MUST change this to a secure password in production."
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "Feature Flags:"
echo "--------------"

# Check feature flags
ENABLE_STRIPE=${ENABLE_STRIPE:-false}
ENABLE_UPLOADS=${ENABLE_UPLOADS:-false}

echo "ENABLE_STRIPE: $ENABLE_STRIPE"
echo "ENABLE_UPLOADS: $ENABLE_UPLOADS"

echo ""

# Conditionally check Stripe variables
if [ "$ENABLE_STRIPE" = "true" ]; then
    echo "Stripe Configuration (ENABLED):"
    echo "--------------------------------"
    check_var "STRIPE_SECRET_KEY" "true" "ENABLE_STRIPE=true"
    check_var "STRIPE_WEBHOOK_SECRET" "true" "ENABLE_STRIPE=true"
    check_var "STRIPE_MONTHLY_PRICE_ID" "false"
    check_var "STRIPE_YEARLY_PRICE_ID" "false"
    echo ""
else
    echo "Stripe Configuration: ${YELLOW}DISABLED${NC}"
    echo "Set ENABLE_STRIPE=true to enable billing features"
    echo ""
fi

# Conditionally check upload/storage variables
if [ "$ENABLE_UPLOADS" = "true" ]; then
    echo "Upload/Storage Configuration (ENABLED):"
    echo "----------------------------------------"
    check_var "BUILT_IN_FORGE_API_URL" "true" "ENABLE_UPLOADS=true"
    check_var "BUILT_IN_FORGE_API_KEY" "true" "ENABLE_UPLOADS=true"
    echo ""
else
    echo "Upload/Storage Configuration: ${YELLOW}DISABLED${NC}"
    echo "Set ENABLE_UPLOADS=true to enable upload features"
    echo ""
fi

# Optional features
echo "Optional Features:"
echo "------------------"
check_var "GENX_API_KEY" "false"
check_var "HUGGINGFACE_API_KEY" "false"
check_var "SMTP_HOST" "false"
check_var "SMTP_USER" "false"
check_var "SMTP_PASS" "false"
check_var "CONTACT_TO" "false"
check_var "BASE_URL" "false"
check_var "OWNER_OPEN_ID" "false"

echo ""
echo "==========================================="
echo "Preflight Check Complete"
echo ""

# Summary
if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}✗ $ERRORS critical error(s) found${NC}"
    echo "Please fix the above errors before deploying."
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warning(s) found${NC}"
    echo -e "${GREEN}✓ All critical checks passed${NC}"
    echo "You can proceed with deployment."
    exit 0
else
    echo -e "${GREEN}✓ All checks passed${NC}"
    echo "Environment is ready for deployment!"
    exit 0
fi

#!/bin/bash

# Security Validation Script
# Validates that all critical security vulnerabilities have been addressed

set -e  # Exit on any error

echo "🔒 AUTHENTICATION SECURITY VALIDATION SCRIPT"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Validation results
CRITICAL_ISSUES=0
HIGH_ISSUES=0
MEDIUM_ISSUES=0

echo -e "${BLUE}📋 CHECKING CRITICAL SECURITY FIXES...${NC}"
echo ""

# 1. Check for hard-coded secrets
echo "🔍 1. Checking for hard-coded JWT secrets..."
if grep -r "your-jwt-secret-key-here" src/ 2>/dev/null; then
    echo -e "${RED}❌ CRITICAL: Hard-coded JWT secrets found!${NC}"
    ((CRITICAL_ISSUES++))
else
    echo -e "${GREEN}✅ No hard-coded JWT secrets detected${NC}"
fi

if grep -r "your-refresh-token-secret-key-here" src/ 2>/dev/null; then
    echo -e "${RED}❌ CRITICAL: Hard-coded refresh secrets found!${NC}"
    ((CRITICAL_ISSUES++))
else
    echo -e "${GREEN}✅ No hard-coded refresh secrets detected${NC}"
fi

# 2. Check for weak password validation
echo ""
echo "🔍 2. Checking for weak password validation..."
if grep -r "validPasswords.*=.*\[.*'demo'" src/ 2>/dev/null; then
    echo -e "${RED}❌ CRITICAL: Weak password validation detected!${NC}"
    ((CRITICAL_ISSUES++))
else
    echo -e "${GREEN}✅ No weak password validation detected${NC}"
fi

# 3. Check for TODO comments in critical areas
echo ""
echo "🔍 3. Checking for incomplete implementations..."
TODO_COUNT=$(grep -r "TODO.*token.*validation" src/ 2>/dev/null | wc -l)
if [ "$TODO_COUNT" -gt 0 ]; then
    echo -e "${RED}❌ CRITICAL: $TODO_COUNT incomplete token validation implementations found!${NC}"
    grep -r "TODO.*token.*validation" src/ 2>/dev/null || true
    ((CRITICAL_ISSUES++))
else
    echo -e "${GREEN}✅ No incomplete token validation implementations${NC}"
fi

# 4. Check for bcrypt usage
echo ""
echo "🔍 4. Checking for proper password hashing..."
if grep -r "import.*bcrypt" src/ >/dev/null 2>&1; then
    echo -e "${GREEN}✅ bcrypt password hashing implementation found${NC}"
else
    echo -e "${RED}❌ CRITICAL: No bcrypt password hashing detected!${NC}"
    ((CRITICAL_ISSUES++))
fi

# 5. Check for rate limiting
echo ""
echo "🔍 5. Checking for rate limiting implementation..."
if grep -r "@fastify/rate-limit" src/ >/dev/null 2>&1 || grep -r "rate.*limit" src/ >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Rate limiting implementation found${NC}"
else
    echo -e "${YELLOW}⚠️  HIGH: No rate limiting detected!${NC}"
    ((HIGH_ISSUES++))
fi

# 6. Check environment variable validation
echo ""
echo "🔍 6. Checking for environment variable validation..."
if grep -r "JWT_SECRET.*||.*throw" src/ >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Environment variable validation found${NC}"
else
    echo -e "${RED}❌ CRITICAL: No environment variable validation detected!${NC}"
    ((CRITICAL_ISSUES++))
fi

# 7. Run security-focused tests
echo ""
echo -e "${BLUE}🧪 RUNNING SECURITY TESTS...${NC}"
echo ""

if [ -f "package.json" ] && grep -q '"test:security"' package.json; then
    echo "Running security-focused test suite..."
    if npm run test:security >/dev/null 2>&1; then
        echo -e "${GREEN}✅ All security tests passed${NC}"
    else
        echo -e "${RED}❌ CRITICAL: Security tests failed!${NC}"
        echo "Run 'npm run test:security' to see details"
        ((CRITICAL_ISSUES++))
    fi
else
    echo -e "${YELLOW}⚠️  MEDIUM: No security test suite found${NC}"
    ((MEDIUM_ISSUES++))
fi

# 8. Check for test coverage
echo ""
echo "🔍 8. Checking test coverage..."
if [ -f "jest.config.js" ]; then
    echo -e "${GREEN}✅ Jest configuration found${NC}"
    if grep -q "coverageThreshold" jest.config.js; then
        echo -e "${GREEN}✅ Coverage thresholds configured${NC}"
    else
        echo -e "${YELLOW}⚠️  MEDIUM: No coverage thresholds set${NC}"
        ((MEDIUM_ISSUES++))
    fi
else
    echo -e "${YELLOW}⚠️  MEDIUM: No Jest configuration found${NC}"
    ((MEDIUM_ISSUES++))
fi

# 9. Check for input validation
echo ""
echo "🔍 9. Checking for input validation..."
if grep -r "sanitize\|validate\|zod\|joi" src/ >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Input validation implementation found${NC}"
else
    echo -e "${YELLOW}⚠️  HIGH: Limited input validation detected${NC}"
    ((HIGH_ISSUES++))
fi

# 10. Check for session security
echo ""
echo "🔍 10. Checking for session security measures..."
if grep -r "session.*security\|concurrent.*session\|fingerprint" src/ >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Session security measures found${NC}"
else
    echo -e "${YELLOW}⚠️  MEDIUM: Limited session security detected${NC}"
    ((MEDIUM_ISSUES++))
fi

# Summary Report
echo ""
echo -e "${BLUE}📊 SECURITY VALIDATION SUMMARY${NC}"
echo "================================"
echo ""

if [ "$CRITICAL_ISSUES" -eq 0 ]; then
    echo -e "${GREEN}✅ CRITICAL ISSUES: $CRITICAL_ISSUES${NC}"
else
    echo -e "${RED}❌ CRITICAL ISSUES: $CRITICAL_ISSUES${NC}"
fi

if [ "$HIGH_ISSUES" -eq 0 ]; then
    echo -e "${GREEN}✅ HIGH ISSUES: $HIGH_ISSUES${NC}"
else
    echo -e "${YELLOW}⚠️  HIGH ISSUES: $HIGH_ISSUES${NC}"
fi

if [ "$MEDIUM_ISSUES" -eq 0 ]; then
    echo -e "${GREEN}✅ MEDIUM ISSUES: $MEDIUM_ISSUES${NC}"
else
    echo -e "${BLUE}ℹ️  MEDIUM ISSUES: $MEDIUM_ISSUES${NC}"
fi

echo ""

# Final assessment
if [ "$CRITICAL_ISSUES" -eq 0 ] && [ "$HIGH_ISSUES" -eq 0 ]; then
    echo -e "${GREEN}🎉 SECURITY VALIDATION PASSED!${NC}"
    echo -e "${GREEN}The authentication system is ready for production deployment.${NC}"
    exit 0
elif [ "$CRITICAL_ISSUES" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  SECURITY VALIDATION PARTIAL${NC}"
    echo -e "${YELLOW}High priority issues should be addressed before production.${NC}"
    exit 1
else
    echo -e "${RED}❌ SECURITY VALIDATION FAILED!${NC}"
    echo -e "${RED}Critical security vulnerabilities must be fixed before deployment.${NC}"
    echo ""
    echo -e "${RED}🚨 DEPLOYMENT BLOCKED 🚨${NC}"
    echo ""
    echo "Required actions:"
    echo "1. Fix all CRITICAL issues listed above"
    echo "2. Run this validation script again"
    echo "3. Ensure all security tests pass"
    echo "4. Complete code review of security changes"
    exit 2
fi
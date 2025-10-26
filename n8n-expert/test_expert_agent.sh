#!/bin/bash

echo "========================================================"
echo "🤖 Testing N8N Expert Agent Workflow"
echo "========================================================"
echo ""

# Configuration
WEBHOOK_URL="http://n8n.tip.localhost:5678/webhook/invoke-n8n-expert"
AUTH_TOKEN="Bearer n8n-expert-secret-token-2025"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test queries
declare -a QUERIES=(
  "I need to transfer data from PostgreSQL to Excel"
  "How can I automate image processing with text overlays?"
  "Show me workflows for database automation"
)

echo "📍 Webhook URL: $WEBHOOK_URL"
echo "🔑 Auth Token: $AUTH_TOKEN"
echo ""

# Test 1: Simple health check
echo "========================================================"
echo "Test 1: Simple Query Test"
echo "========================================================"
QUERY="${QUERIES[0]}"
echo "Query: $QUERY"
echo ""

SESSION_ID="test-session-$(date +%s)"
REQUEST_ID="req-$(date +%s)"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: $AUTH_TOKEN" \
  -d "{
    \"query\": \"$QUERY\",
    \"user_id\": \"test-user\",
    \"session_id\": \"$SESSION_ID\",
    \"request_id\": \"$REQUEST_ID\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ Success! Workflow is working!${NC}"
  echo ""
  echo "Response:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
  echo -e "${RED}❌ Failed with status $HTTP_CODE${NC}"
  echo ""
  echo "Response:"
  echo "$BODY"
fi

echo ""
echo "========================================================"
echo "Test Complete"
echo "========================================================"

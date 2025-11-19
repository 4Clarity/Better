#!/bin/bash
# Quick test of n8n Document Chunking workflow
# This script will trigger the workflow and monitor the execution

set -e

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Testing n8n Document Chunking Workflow                  ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Step 1: Check if credential fix is applied
echo -e "${CYAN}Step 1: Checking workflow configuration...${NC}"

WORKFLOW_ACTIVE=$(curl -s -H "X-N8N-API-KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4ZTUwNmM0NC0xNGY0LTQ0OTEtYWQxYi1kNmI5NDVjNjRhODEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYxMzE2MTgyLCJleHAiOjE3NjkwNTgwMDB9.mJo4CcB9Ie8hTOJJOfNic-U5Z7ss_KvCzuqYOY5P1js" \
  http://localhost:5678/api/v1/workflows/bNtog2g5W0BBx21E | jq -r '.active')

if [ "$WORKFLOW_ACTIVE" = "true" ]; then
    echo -e "  ${GREEN}✓${NC} Workflow is active"
else
    echo -e "  ${RED}✗${NC} Workflow is NOT active"
    echo -e "  ${YELLOW}Please activate the workflow in n8n UI first${NC}"
    exit 1
fi

# Step 2: Check backend health
echo -e "${CYAN}Step 2: Checking backend API health...${NC}"

BACKEND_HEALTH=$(curl -s -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4ZTUwNmM0NC0xNGY0LTQ0OTEtYWQxYi1kNmI5NDVjNjRhODEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYxMzE2MTgyLCJleHAiOjE3NjkwNTgwMDB9.mJo4CcB9Ie8hTOJJOfNic-U5Z7ss_KvCzuqYOY5P1js" \
  http://py.tip.localhost/api/n8n/health 2>&1)

BACKEND_STATUS=$(echo "$BACKEND_HEALTH" | jq -r '.status // "error"')

if [ "$BACKEND_STATUS" = "healthy" ]; then
    echo -e "  ${GREEN}✓${NC} Backend API is healthy"
    echo -e "  ${GREEN}✓${NC} Database: $(echo "$BACKEND_HEALTH" | jq -r '.database')"
    echo -e "  ${GREEN}✓${NC} Embeddings: $(echo "$BACKEND_HEALTH" | jq -r '.embedding_service.service')"
else
    echo -e "  ${RED}✗${NC} Backend API health check failed"
    echo "$BACKEND_HEALTH"
    exit 1
fi

# Step 3: Get current execution count
echo -e "${CYAN}Step 3: Recording baseline...${NC}"

BEFORE_COUNT=$(curl -s -H "X-N8N-API-KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4ZTUwNmM0NC0xNGY0LTQ0OTEtYWQxYi1kNmI5NDVjNjRhODEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYxMzE2MTgyLCJleHAiOjE3NjkwNTgwMDB9.mJo4CcB9Ie8hTOJJOfNic-U5Z7ss_KvCzuqYOY5P1js" \
  "http://localhost:5678/api/v1/executions?workflowId=bNtog2g5W0BBx21E&limit=1" | jq -r '.data[0].id // "0"')

echo -e "  Last execution ID: ${BEFORE_COUNT}"

# Step 4: Trigger webhook
echo ""
echo -e "${CYAN}Step 4: Triggering workflow via webhook...${NC}"
echo ""

# Create a minimal test payload
TEST_PAYLOAD='{
  "document_id": "test-'$(date +%s)'",
  "filename": "monitoring-test.txt",
  "mime_type": "text/plain",
  "storage_path": "/tmp/test.txt",
  "content_hash": "test-hash-'$(date +%s)'",
  "file_content_base64": "VGhpcyBpcyBhIHRlc3QgZG9jdW1lbnQgZm9yIG1vbml0b3JpbmcgcHVycG9zZXMu"
}'

echo -e "${YELLOW}Payload:${NC}"
echo "$TEST_PAYLOAD" | jq '.'
echo ""

WEBHOOK_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$TEST_PAYLOAD" \
  http://localhost:5678/webhook/document-processing 2>&1)

echo -e "${CYAN}Webhook Response:${NC}"
echo "$WEBHOOK_RESPONSE" | jq '.' 2>/dev/null || echo "$WEBHOOK_RESPONSE"
echo ""

# Step 5: Wait for execution to appear
echo -e "${CYAN}Step 5: Waiting for execution to start...${NC}"

for i in {1..10}; do
    sleep 1
    AFTER_COUNT=$(curl -s -H "X-N8N-API-KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4ZTUwNmM0NC0xNGY0LTQ0OTEtYWQxYi1kNmI5NDVjNjRhODEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYxMzE2MTgyLCJleHAiOjE3NjkwNTgwMDB9.mJo4CcB9Ie8hTOJJOfNic-U5Z7ss_KvCzuqYOY5P1js" \
      "http://localhost:5678/api/v1/executions?workflowId=bNtog2g5W0BBx21E&limit=1" | jq -r '.data[0].id // "0"')

    if [ "$AFTER_COUNT" != "$BEFORE_COUNT" ]; then
        echo -e "  ${GREEN}✓${NC} New execution detected: ${AFTER_COUNT}"
        EXEC_ID="$AFTER_COUNT"
        break
    fi

    echo -e "  Waiting... ($i/10)"
done

if [ -z "$EXEC_ID" ] || [ "$EXEC_ID" = "$BEFORE_COUNT" ]; then
    echo -e "  ${RED}✗${NC} No new execution detected"
    echo ""
    echo -e "${YELLOW}This might mean:${NC}"
    echo "  1. The credential fix hasn't been applied yet"
    echo "  2. The workflow was not active when triggered"
    echo "  3. There was an error in the webhook trigger"
    echo ""
    echo -e "${CYAN}Check the logs:${NC}"
    docker-compose logs n8n --tail=20 | grep -v "Rudder"
    exit 1
fi

# Step 6: Monitor execution
echo ""
echo -e "${CYAN}Step 6: Monitoring execution ${EXEC_ID}...${NC}"
echo ""

for i in {1..30}; do
    EXEC_DATA=$(curl -s -H "X-N8N-API-KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4ZTUwNmM0NC0xNGY0LTQ0OTEtYWQxYi1kNmI5NDVjNjRhODEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYxMzE2MTgyLCJleHAiOjE3NjkwNTgwMDB9.mJo4CcB9Ie8hTOJJOfNic-U5Z7ss_KvCzuqYOY5P1js" \
      "http://localhost:5678/api/v1/executions/${EXEC_ID}")

    STATUS=$(echo "$EXEC_DATA" | jq -r '.status')
    FINISHED=$(echo "$EXEC_DATA" | jq -r '.finished')

    if [ "$STATUS" = "running" ] || [ "$STATUS" = "waiting" ]; then
        echo -e "  ${YELLOW}⟳${NC} Status: ${STATUS} (check $i/30)"
        sleep 2
    else
        echo -e "  ${GREEN}✓${NC} Execution finished"
        break
    fi
done

# Step 7: Display results
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                    EXECUTION RESULTS                     ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

EXEC_DATA=$(curl -s -H "X-N8N-API-KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4ZTUwNmM0NC0xNGY0LTQ0OTEtYWQxYi1kNmI5NDVjNjRhODEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYxMzE2MTgyLCJleHAiOjE3NjlwNTgwMDB9.mJo4CcB9Ie8hTOJJOfNic-U5Z7ss_KvCzuqYOY5P1js" \
  "http://localhost:5678/api/v1/executions/${EXEC_ID}")

STATUS=$(echo "$EXEC_DATA" | jq -r '.status')
MODE=$(echo "$EXEC_DATA" | jq -r '.mode')
STARTED=$(echo "$EXEC_DATA" | jq -r '.startedAt')
STOPPED=$(echo "$EXEC_DATA" | jq -r '.stoppedAt')

echo -e "${CYAN}Execution ID:${NC} ${EXEC_ID}"
echo -e "${CYAN}Status:${NC} ${STATUS}"
echo -e "${CYAN}Mode:${NC} ${MODE}"
echo -e "${CYAN}Started:${NC} ${STARTED}"
echo -e "${CYAN}Stopped:${NC} ${STOPPED}"
echo ""

if [ "$STATUS" = "success" ]; then
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    ✓ SUCCESS!                            ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}The workflow executed successfully!${NC}"
    echo -e "The credential fix has been applied correctly."
    echo ""
elif [ "$STATUS" = "error" ]; then
    echo -e "${RED}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                    ✗ ERROR                               ║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${RED}The workflow encountered an error.${NC}"
    echo ""
    echo -e "${CYAN}Recent n8n logs:${NC}"
    docker-compose logs n8n --tail=20 | grep -v "Rudder"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Check if the credential 'backend-api-auth' exists in n8n"
    echo "  2. Verify all HTTP nodes are using the credential"
    echo "  3. Check the error workflow setting is removed"
    echo "  4. Review the full execution: ./monitor-n8n-workflow.sh check ${EXEC_ID}"
else
    echo -e "${YELLOW}Status: ${STATUS}${NC}"
    echo ""
    echo -e "Check details: ./monitor-n8n-workflow.sh check ${EXEC_ID}"
fi

echo ""
echo -e "${CYAN}For detailed monitoring:${NC}"
echo "  ./monitor-n8n-workflow.sh monitor"
echo ""

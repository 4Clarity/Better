#!/bin/bash
# Deactivate and reactivate workflow to register webhook

WORKFLOW_ID="bNtog2g5W0BBx21E"
API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4ZTUwNmM0NC0xNGY0LTQ0OTEtYWQxYi1kNmI5NDVjNjRhODEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYxMzE2MTgyLCJleHAiOjE3NjkwNTgwMDB9.mJo4CcB9Ie8hTOJJOfNic-U5Z7ss_KvCzuqYOY5P1js"

echo "Step 1: Fetching workflow..."
WORKFLOW=$(curl -s -H "X-N8N-API-KEY: $API_KEY" "http://localhost:5678/api/v1/workflows/$WORKFLOW_ID")

echo "Step 2: Deactivating workflow..."
DEACTIVATED=$(echo "$WORKFLOW" | jq '.active = false')
curl -s -X PUT \
  -H "X-N8N-API-KEY: $API_KEY" \
  -H "Content-Type: application/json" \
  --data-raw "$DEACTIVATED" \
  "http://localhost:5678/api/v1/workflows/$WORKFLOW_ID" > /dev/null

sleep 3

echo "Step 3: Reactivating workflow..."
ACTIVATED=$(echo "$DEACTIVATED" | jq '.active = true')
RESULT=$(curl -s -X PUT \
  -H "X-N8N-API-KEY: $API_KEY" \
  -H "Content-Type: application/json" \
  --data-raw "$ACTIVATED" \
  "http://localhost:5678/api/v1/workflows/$WORKFLOW_ID")

echo ""
echo "✓ Workflow status: $(echo "$RESULT" | jq -r '.active')"
echo ""
echo "Webhook should now be registered at: http://localhost:5678/webhook/document-processing"

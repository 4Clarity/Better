#!/bin/bash
# Import updated n8n workflow via API

set -e

WORKFLOW_FILE="n8n/workflows/document-chunking-analysis-pipeline.json"
N8N_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4ZTUwNmM0NC0xNGY0LTQ0OTEtYWQxYi1kNmI5NDVjNjRhODEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYxMzE2MTgyLCJleHAiOjE3NjkwNTgwMDB9.mJo4CcB9Ie8hTOJJOfNic-U5Z7ss_KvCzuqYOY5P1js"
N8N_URL="http://localhost:5678"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  n8n Workflow Import Tool                                ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Check if workflow file exists
if [ ! -f "$WORKFLOW_FILE" ]; then
    echo "❌ Error: Workflow file not found: $WORKFLOW_FILE"
    exit 1
fi

echo "✓ Found workflow file: $WORKFLOW_FILE"
echo ""

# Get existing workflow ID by name
echo "Step 1: Looking for existing workflow..."
EXISTING_WORKFLOW=$(curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "$N8N_URL/api/v1/workflows" | \
  jq -r '.data[] | select(.name == "Document Chunking Analysis Pipeline") | .id')

if [ ! -z "$EXISTING_WORKFLOW" ]; then
    echo "  Found existing workflow ID: $EXISTING_WORKFLOW"
    echo ""
    echo "Step 2: Deleting old workflow..."
    DELETE_RESPONSE=$(curl -s -X DELETE \
      -H "X-N8N-API-KEY: $N8N_API_KEY" \
      "$N8N_URL/api/v1/workflows/$EXISTING_WORKFLOW")
    echo "  ✓ Old workflow deleted"
else
    echo "  No existing workflow found (this is okay)"
fi

echo ""
echo "Step 3: Importing updated workflow..."

# Prepare workflow data (keep only essential fields for import)
WORKFLOW_DATA=$(cat "$WORKFLOW_FILE" | jq '{
  name: .name,
  nodes: .nodes,
  connections: .connections,
  settings: {
    executionTimeout: .settings.executionTimeout,
    saveExecutionProgress: .settings.saveExecutionProgress,
    saveManualExecutions: .settings.saveManualExecutions
  },
  staticData: .staticData
}')

# Import the workflow
IMPORT_RESPONSE=$(curl -s -X POST \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$WORKFLOW_DATA" \
  "$N8N_URL/api/v1/workflows")

NEW_WORKFLOW_ID=$(echo "$IMPORT_RESPONSE" | jq -r '.id // empty')

if [ -z "$NEW_WORKFLOW_ID" ]; then
    echo "  ❌ Error: Failed to import workflow"
    echo "$IMPORT_RESPONSE" | jq '.'
    exit 1
fi

echo "  ✓ Workflow imported successfully"
echo "  New workflow ID: $NEW_WORKFLOW_ID"
echo ""

echo "Step 4: Activating workflow..."

# Activate the workflow
ACTIVATE_RESPONSE=$(curl -s -X PATCH \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"active": true}' \
  "$N8N_URL/api/v1/workflows/$NEW_WORKFLOW_ID")

IS_ACTIVE=$(echo "$ACTIVATE_RESPONSE" | jq -r '.active')

if [ "$IS_ACTIVE" = "true" ]; then
    echo "  ✓ Workflow activated successfully"
else
    echo "  ⚠ Warning: Workflow may not be active"
    echo "$ACTIVATE_RESPONSE" | jq '.'
fi

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✓ Import Complete!                                      ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "Workflow Details:"
echo "  ID: $NEW_WORKFLOW_ID"
echo "  Active: $IS_ACTIVE"
echo "  Webhook: http://localhost:5678/webhook/document-processing"
echo ""
echo "Next step: Run './test-workflow-now.sh' to test the workflow"
echo ""

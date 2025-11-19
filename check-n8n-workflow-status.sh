#!/bin/bash

# Quick n8n Workflow Status Check
# Usage: bash check-n8n-workflow-status.sh

echo "=================================================="
echo "n8n Workflow Status Check"
echo "Date: $(date)"
echo "=================================================="
echo ""

echo "1. Checking if n8n container is running..."
if docker ps | grep -q "better-n8n-1"; then
    echo "   ✅ n8n container is running"
else
    echo "   ❌ n8n container is NOT running"
    echo "   Fix: docker-compose up -d n8n"
    exit 1
fi
echo ""

echo "2. Checking n8n accessibility..."
if curl -s -o /dev/null -w "%{http_code}" http://n8n.tip.localhost 2>/dev/null | grep -q "200\|302"; then
    echo "   ✅ n8n UI is accessible at http://n8n.tip.localhost"
else
    echo "   ❌ n8n UI is NOT accessible"
    echo "   Check: http://n8n.tip.localhost in browser"
fi
echo ""

echo "3. Checking recent n8n logs for workflow execution..."
EXEC_COUNT=$(docker-compose logs n8n --since 2h 2>&1 | grep -c "Execution.*started\|Workflow.*started" || echo "0")
if [ "$EXEC_COUNT" -gt 0 ]; then
    echo "   ✅ Found $EXEC_COUNT workflow executions in past 2 hours"
else
    echo "   ⚠️  No workflow executions found in past 2 hours"
    echo "   This means workflows are NOT running"
fi
echo ""

echo "4. Checking for n8n errors..."
ERROR_COUNT=$(docker-compose logs n8n --since 30m 2>&1 | grep -i "error" | grep -v "PostHog" | wc -l | tr -d ' ')
if [ "$ERROR_COUNT" -eq 0 ]; then
    echo "   ✅ No errors in past 30 minutes"
else
    echo "   ⚠️  Found $ERROR_COUNT errors in past 30 minutes"
    echo ""
    echo "   Recent errors:"
    docker-compose logs n8n --since 30m 2>&1 | grep -i "error" | grep -v "PostHog" | tail -5 | sed 's/^/   /'
fi
echo ""

echo "5. Checking backend-python webhook calls..."
WEBHOOK_COUNT=$(docker-compose logs backend-python --since 1h 2>&1 | grep -c "n8n workflow triggered" || echo "0")
if [ "$WEBHOOK_COUNT" -gt 0 ]; then
    echo "   ✅ Backend-Python triggered n8n webhook $WEBHOOK_COUNT times in past hour"
    echo ""
    echo "   Most recent webhook calls:"
    docker-compose logs backend-python --since 1h 2>&1 | grep "n8n workflow triggered" | tail -3 | sed 's/^/   /'
else
    echo "   ⚠️  No webhook triggers in past hour"
    echo "   Upload a PDF to trigger workflow"
fi
echo ""

echo "6. Checking database state..."
echo "   knowledge_documents table:"
docker exec better-db-1 psql -U user -d tip -c "
    SELECT
        COUNT(*) as total_docs,
        COUNT(CASE WHEN upload_status = 'COMPLETED' THEN 1 END) as completed,
        COUNT(CASE WHEN upload_status = 'FAILED' THEN 1 END) as failed,
        COUNT(CASE WHEN upload_status = 'ANALYZING' THEN 1 END) as analyzing
    FROM knowledge_documents;" | grep -v "^$" | sed 's/^/   /'

echo ""
echo "   n8n_vectors table:"
docker exec better-db-1 psql -U user -d tip -c "
    SELECT
        COUNT(*) as total_chunks,
        COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as with_embeddings,
        COUNT(CASE WHEN text IS NOT NULL THEN 1 END) as with_text
    FROM n8n_vectors;" | grep -v "^$" | sed 's/^/   /'

echo ""
echo "=================================================="
echo "CRITICAL CHECKS:"
echo "=================================================="
echo ""

if [ "$EXEC_COUNT" -eq 0 ] && [ "$WEBHOOK_COUNT" -gt 0 ]; then
    echo "❌ PROBLEM DETECTED:"
    echo "   Backend is triggering webhooks BUT n8n is NOT executing workflow"
    echo ""
    echo "   ACTION REQUIRED:"
    echo "   1. Open http://n8n.tip.localhost"
    echo "   2. Click 'Workflows' in left sidebar"
    echo "   3. Find 'TIP Document Processing v1.0.18'"
    echo "   4. Check if 'Active' toggle is ON (green)"
    echo "   5. If OFF, click the workflow and activate it"
    echo "   6. Click 'Executions' tab to see if any runs appear"
    echo ""
elif [ "$EXEC_COUNT" -gt 0 ]; then
    echo "✅ Workflow is executing"
    echo "   Check n8n UI 'Executions' tab for details"
    echo "   http://n8n.tip.localhost/workflow/[workflow-id]/executions"
    echo ""
else
    echo "ℹ️  No recent activity detected"
    echo "   Upload a PDF to test: http://tip.localhost/knowledge"
    echo ""
fi

echo "=================================================="
echo "Useful Links:"
echo "=================================================="
echo "n8n UI:         http://n8n.tip.localhost"
echo "Frontend:       http://tip.localhost"
echo "Upload Page:    http://tip.localhost/knowledge"
echo "Diagnostic Doc: N8N-WORKFLOW-NOT-EXECUTING.md"
echo "=================================================="

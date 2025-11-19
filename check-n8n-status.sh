#!/bin/bash
echo "======================================"
echo "n8n Workflow Status Check"
echo "======================================"
echo ""

echo "1. Workflows in database:"
echo "   (1=active, 0=inactive)"
docker-compose exec n8n sh -c "sqlite3 /home/node/.n8n/database.sqlite \"SELECT id, name, active FROM workflow_entity WHERE name LIKE '%Document%';\" 2>/dev/null" | while IFS='|' read -r id name active; do
    if [ "$active" = "1" ]; then
        echo "   ✅ $name (ID: $id) - ACTIVE"
    else
        echo "   ❌ $name (ID: $id) - INACTIVE"
    fi
done
echo ""

echo "2. Registered webhooks:"
docker-compose exec n8n sh -c "sqlite3 /home/node/.n8n/database.sqlite \"SELECT workflow_id, method, path FROM webhook_entity;\" 2>/dev/null" | while IFS='|' read -r workflow_id method path; do
    if [ -n "$workflow_id" ]; then
        echo "   ✅ $method /$path (Workflow: $workflow_id)"
    fi
done
WEBHOOK_COUNT=$(docker-compose exec n8n sh -c "sqlite3 /home/node/.n8n/database.sqlite \"SELECT COUNT(*) FROM webhook_entity;\" 2>/dev/null")
if [ "$WEBHOOK_COUNT" = "0" ]; then
    echo "   ❌ NO WEBHOOKS REGISTERED!"
fi
echo ""

echo "3. Recent activation events:"
docker-compose exec n8n sh -c "tail -100 /home/node/.n8n/n8nEventLog.log 2>/dev/null | grep 'workflow.activated' | tail -3" | grep -o '"workflowName":"[^"]*"' || echo "   ❌ No activation events found"
echo ""

echo "4. Testing webhook endpoint:"
docker-compose exec backend-python python -c "
import requests
try:
    r = requests.post('http://n8n:5678/webhook/document-processing', json={'test': 'ping'}, timeout=3)
    if r.status_code == 200:
        print('   ✅ Webhook responding (HTTP 200) - WORKING!')
    elif r.status_code == 404:
        print('   ❌ Webhook not found (HTTP 404) - NOT ACTIVATED!')
    else:
        print(f'   ⚠️  Unexpected status: HTTP {r.status_code}')
except Exception as e:
    print(f'   ❌ Connection failed: {str(e)}')
" 2>&1
echo ""

echo "======================================"
echo "Summary:"
echo "  - Check if workflow shows as ACTIVE above"
echo "  - Check if webhook is REGISTERED above"
echo "  - Check if webhook test returns HTTP 200"
echo ""
echo "If any check fails:"
echo "  1. Go to n8n UI: http://n8n.tip.localhost"
echo "  2. Open 'Document Chunking Analysis Pipeline'"
echo "  3. Toggle OFF → Save → Toggle ON → Save"
echo "  4. Run this script again"
echo "======================================"

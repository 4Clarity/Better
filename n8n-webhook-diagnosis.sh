#!/bin/bash
echo "================================================"
echo "n8n Webhook Registration Diagnostic"
echo "================================================"
echo ""

echo "1. Container Status:"
docker-compose ps n8n | tail -1
echo ""

echo "2. Recent n8n Logs (Last 10 lines):"
docker-compose logs n8n --tail=10
echo ""

echo "3. Workflow Activation Status:"
docker-compose exec n8n sh -c "n8n list:workflow" 2>&1 | grep -A1 "Document Chunking"
echo ""

echo "4. Testing Webhook Endpoints:"
for path in "webhook/document-processing" "webhook/webhook/document-processing" "document-processing"; do
    echo -n "   Testing /$path... "
    status=$(docker-compose exec backend-python python -c "import requests; r = requests.post('http://n8n:5678/$path', json={'test': 'ping'}, timeout=2); print(r.status_code)" 2>&1 | grep -o "[0-9]*")
    if [ "$status" = "200" ]; then
        echo "✅ HTTP $status - FOUND!"
    elif [ "$status" = "404" ]; then
        echo "❌ HTTP $status - Not registered"
    else
        echo "⚠️  HTTP $status"
    fi
done
echo ""

echo "5. n8n Environment Variables:"
docker-compose exec n8n sh -c "env | grep -E 'N8N_|WEBHOOK'" | head -10
echo ""

echo "================================================"
echo "CRITICAL QUESTION:"
echo "================================================"
echo ""
echo "Did you change the Path field in the n8n UI?"
echo ""
echo "Steps to verify in n8n UI (http://n8n.tip.localhost):"
echo "  1. Open 'Document Chunking Analysis Pipeline' workflow"
echo "  2. Click the FIRST node (Webhook Trigger)"
echo "  3. Look at the 'Path' field"
echo ""
echo "What does the Path field show?"
echo "  A) document-processing         ✅ CORRECT"
echo "  B) webhook/document-processing ❌ WRONG"
echo "  C) Something else              ⚠️  TELL ME"
echo ""
echo "If B or C, you MUST change it to A in the n8n UI!"
echo ""
echo "================================================"

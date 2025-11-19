#!/bin/bash
echo "======================================"
echo "n8n Workflow Activation Verification"
echo "======================================"
echo ""

echo "1. Checking recent n8n logs for activation..."
docker-compose logs n8n --tail=5 | grep -i "activated\|webhook" || echo "  No activation message found"
echo ""

echo "2. Testing webhook endpoint..."
docker-compose exec backend-python python -c "
import requests
test_payload = {
    'document_id': 'test-123',
    'filename': 'test.pdf',
    'mime_type': 'application/pdf',
    'file_content_base64': 'dGVzdA==',
    'security_classification': 'UNCLASSIFIED'
}
try:
    r = requests.post('http://n8n:5678/webhook/document-processing', json=test_payload, timeout=5)
    if r.status_code == 200:
        print('✅ SUCCESS! Webhook is responding (HTTP 200)')
    elif r.status_code == 404:
        print('❌ FAILED! Webhook not registered (HTTP 404)')
        print('   → The workflow is NOT properly activated')
    else:
        print(f'⚠️  Unexpected status: HTTP {r.status_code}')
        print(f'   Response: {r.text[:100]}')
except Exception as e:
    print(f'❌ ERROR: {str(e)}')
" 2>&1
echo ""

echo "3. Checking n8n event log for activation events..."
docker-compose exec n8n sh -c "tail -50 /home/node/.n8n/n8nEventLog.log | grep -i 'workflow.activated' | tail -3" || echo "  No activation events found in log"
echo ""

echo "======================================"
echo "Next Steps:"
echo "  - If webhook returns 404, workflow is NOT activated"
echo "  - Open n8n UI and activate the workflow"
echo "  - Look for 'Workflow activated successfully' message"
echo "  - Run this script again to verify"
echo "======================================"

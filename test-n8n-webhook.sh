#!/bin/bash
# Test n8n webhook after activation

echo "Testing n8n webhook connectivity..."
echo ""

docker-compose exec backend-python python -c "
import requests
import base64

# Test payload
payload = {
    'document_id': 'test-webhook-' + str(__import__('uuid').uuid4()),
    'filename': 'test.pdf',
    'mime_type': 'application/pdf',
    'file_content_base64': base64.b64encode(b'Test PDF content').decode('utf-8'),
    'security_classification': 'UNCLASSIFIED'
}

url = 'http://n8n:5678/webhook/document-processing'

print(f'Sending test request to: {url}')
print(f'Payload: {payload[\"document_id\"]}')
print('')

try:
    response = requests.post(url, json=payload, timeout=10)
    print(f'✅ Status Code: {response.status_code}')

    if response.status_code == 200:
        print('✅ SUCCESS! Webhook is working!')
        print(f'Response: {response.text[:200]}')
    elif response.status_code == 404:
        print('❌ FAILED: Webhook not found (404)')
        print('   → Make sure the workflow is ACTIVE in n8n')
        print('   → Check the webhook path in the Webhook Trigger node')
    else:
        print(f'⚠️  Unexpected status: {response.status_code}')
        print(f'Response: {response.text[:200]}')

except requests.exceptions.Timeout:
    print('❌ TIMEOUT: Request took longer than 10 seconds')
    print('   → Check if n8n service is running')

except Exception as e:
    print(f'❌ ERROR: {str(e)}')
"

echo ""
echo "Check n8n logs:"
docker-compose logs n8n --tail=5

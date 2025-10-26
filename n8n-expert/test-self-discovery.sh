#!/bin/bash

echo "Testing Self-Discovery Feature..."
echo "================================"
echo ""
echo "Query: 'How do I build an AI-powered workflow recommendation system?'"
echo ""

curl -X POST "http://n8n.tip.localhost:5678/webhook/invoke-n8n-expert" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer n8n-expert-secret-token-2025" \
  -d '{
    "query": "How do I build an AI-powered workflow recommendation system?",
    "user_id": "test-user",
    "session_id": "test-session",
    "request_id": "test-self-discovery"
  }' | python3 -m json.tool

echo ""
echo "================================"
echo "Expected: Should return the N8N Expert Agent workflow itself!"
echo "  - workflow_id: 9999"
echo "  - workflow_name: 'AI-Powered Workflow Recommendation System (N8N Expert Agent)'"
echo "  - Should include workflow details, node configuration, and suggestions"

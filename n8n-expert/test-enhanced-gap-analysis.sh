#!/bin/bash

echo "Testing Enhanced Gap Analysis..."
echo "================================"
echo ""
echo "Query: 'Create a sentiment analysis workflow for social media monitoring'"
echo ""

curl -X POST "http://n8n.tip.localhost:5678/webhook/invoke-n8n-expert" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer n8n-expert-secret-token-2025" \
  -d '{
    "query": "Create a sentiment analysis workflow for social media monitoring with real-time alerts",
    "user_id": "test-user",
    "session_id": "test-session",
    "request_id": "test-enhanced-gap"
  }' | python3 -m json.tool

echo ""
echo "================================"
echo "Expected: Gap report should include:"
echo "  - Specific n8n node names (e.g., 'Twitter API node', 'Sentiment Analysis node')"
echo "  - Specific integrations (e.g., 'Social media APIs', 'NLP services')"
echo "  - Specific workflow patterns (e.g., 'Real-time data streaming')"
echo "  - Detailed manual build guide with node sequence"
echo "  - Alternative search queries"

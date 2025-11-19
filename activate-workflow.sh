#!/bin/bash
# Simple script to activate the workflow

WORKFLOW_ID="bNtog2g5W0BBx21E"
API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4ZTUwNmM0NC0xNGY0LTQ0OTEtYWQxYi1kNmI5NDVjNjZhODEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYxMzE2MTgyLCJleHAiOjE3NjkwNTgwMDB9.mJo4CcB9Ie8hTOJJOfNic-U5Z7ss_KvCzuqYOY5P1js"

echo "Activating workflow $WORKFLOW_ID..."

# Use docker exec to run curl inside n8n container
docker exec better-n8n-1 wget -qO- --header="X-N8N-API-KEY: $API_KEY" \
  "http://localhost:5678/api/v1/workflows/$WORKFLOW_ID" | jq -r '.active'

echo "Workflow active status: $?"

#!/bin/bash

# Test script for n8n document ingestion workflow
# Usage: ./test-upload.sh [filepath]

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Webhook URL
WEBHOOK_URL="http://n8n.tip.localhost:5678/webhook-test/file-upload"

# Check if file argument provided
if [ -z "$1" ]; then
  echo -e "${YELLOW}Usage: $0 <filepath>${NC}"
  echo ""
  echo "Example:"
  echo "  $0 /path/to/document.pdf"
  echo "  $0 ~/Downloads/test.docx"
  exit 1
fi

FILE_PATH="$1"

# Check if file exists
if [ ! -f "$FILE_PATH" ]; then
  echo -e "${RED}Error: File not found: $FILE_PATH${NC}"
  exit 1
fi

echo -e "${YELLOW}Uploading document...${NC}"
echo "File: $FILE_PATH"
echo "Webhook: $WEBHOOK_URL"
echo ""

# Upload file
RESPONSE=$(curl -s -X POST "$WEBHOOK_URL" \
  -F "file=@$FILE_PATH" \
  -w "\nHTTP_STATUS:%{http_code}")

# Extract HTTP status
HTTP_STATUS=$(echo "$RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')

# Check response
if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "201" ]; then
  echo -e "${GREEN}✓ Upload successful!${NC}"
  echo ""
  echo "Response:"
  echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
else
  echo -e "${RED}✗ Upload failed!${NC}"
  echo "HTTP Status: $HTTP_STATUS"
  echo ""
  echo "Response:"
  echo "$BODY"
  exit 1
fi

echo ""
echo -e "${GREEN}Document uploaded successfully!${NC}"

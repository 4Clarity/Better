#!/bin/bash

# Script to process all unprocessed documents in the knowledge base
# This triggers n8n document processing for documents with chunk_count = 0

set -e

# Configuration
N8N_WEBHOOK_URL="${N8N_DOCUMENT_PROCESSING_WEBHOOK:-http://n8n.tip.localhost/webhook/tip-document-processing}"
DELAY_SECONDS=2

echo "========================================="
echo "Document Reprocessing Script"
echo "========================================="
echo ""
echo "N8N Webhook: $N8N_WEBHOOK_URL"
echo "Delay between documents: ${DELAY_SECONDS}s"
echo ""

# Get unprocessed documents from database
echo "Fetching unprocessed documents..."
DOCUMENTS=$(docker-compose exec -T db psql -U user -d tip -t -A -F'|' << 'EOSQL'
SELECT
  id,
  filename,
  storage_path,
  mime_type,
  file_size::text,
  security_classification
FROM knowledge_documents
WHERE chunk_count = 0
  AND upload_status != 'FAILED'
ORDER BY created_at DESC;
EOSQL
)

# Count documents
TOTAL=$(echo "$DOCUMENTS" | grep -v '^$' | wc -l | tr -d ' ')

if [ "$TOTAL" -eq 0 ]; then
  echo "✓ No unprocessed documents found. All documents are already processed!"
  exit 0
fi

echo "Found $TOTAL unprocessed documents"
echo ""
echo "========================================="
echo ""

# Process each document
COUNTER=0
SUCCESS=0
FAILED=0

while IFS='|' read -r doc_id filename storage_path mime_type file_size security_classification; do
  # Skip empty lines
  [ -z "$doc_id" ] && continue

  COUNTER=$((COUNTER + 1))
  echo "[$COUNTER/$TOTAL] Processing: $filename"
  echo "  Document ID: $doc_id"
  echo "  Mime Type: $mime_type"
  echo "  Size: $file_size bytes"

  # Trigger n8n webhook
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$N8N_WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "{
      \"document_id\": \"$doc_id\",
      \"filename\": \"$filename\",
      \"storage_path\": \"$storage_path\",
      \"mime_type\": \"$mime_type\",
      \"file_size\": $file_size,
      \"security_classification\": \"$security_classification\"
    }" \
    --max-time 10)

  if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
    echo "  ✓ Successfully triggered processing"
    SUCCESS=$((SUCCESS + 1))
  else
    echo "  ✗ Failed to trigger processing (HTTP $HTTP_CODE)"
    FAILED=$((FAILED + 1))
  fi

  echo ""

  # Delay before next document
  if [ $COUNTER -lt $TOTAL ]; then
    echo "  Waiting ${DELAY_SECONDS}s before next document..."
    sleep $DELAY_SECONDS
    echo ""
  fi

done <<< "$DOCUMENTS"

# Summary
echo "========================================="
echo "Processing Summary"
echo "========================================="
echo "Total documents: $TOTAL"
echo "Successfully triggered: $SUCCESS"
echo "Failed: $FAILED"
echo ""

if [ $SUCCESS -gt 0 ]; then
  echo "✓ Processing triggered for $SUCCESS documents"
  echo ""
  echo "Monitor progress:"
  echo "  - n8n UI: http://n8n.tip.localhost → Executions"
  echo "  - Database: docker-compose exec db psql -U user -d tip -c \"SELECT filename, upload_status, chunk_count FROM knowledge_documents WHERE chunk_count > 0;\""
  echo ""
fi

if [ $FAILED -gt 0 ]; then
  echo "⚠ Some documents failed to trigger. Check n8n is running:"
  echo "  docker-compose ps n8n"
  echo "  docker-compose logs n8n"
fi

echo "========================================="

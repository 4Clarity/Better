#!/usr/bin/env python3
"""
Fix Handle Error node to use n8n expressions directly in SQL
instead of parameterized queries which aren't working
"""

import json
from datetime import datetime, timezone

# Load workflow
print("Loading workflow...")
with open('WIP-TIP Document Processing.json', 'r') as f:
    workflow = json.load(f)

# Find Handle Error node
handle_error_node = None
for node in workflow['nodes']:
    if node['name'] == 'Handle Error':
        handle_error_node = node
        break

if not handle_error_node:
    print("ERROR: Handle Error node not found!")
    exit(1)

print("Updating Handle Error node to use n8n expressions...")

# Update SQL to use n8n expressions directly
updated_query = """UPDATE knowledge_documents
SET
  upload_status = 'FAILED',
  processing_error = '{{ $json.error }}',
  n8n_execution_error = '{{ $json.error }}',
  updated_at = NOW()
WHERE id = '{{ $json.document_id }}'
RETURNING id, filename, upload_status, processing_error;"""

# Update the node
handle_error_node['parameters']['query'] = updated_query

# Remove additionalFields since we're not using parameters
if 'additionalFields' in handle_error_node['parameters']:
    del handle_error_node['parameters']['additionalFields']

print("✓ Updated SQL to use n8n expressions directly")
print("✓ Removed additionalFields (not needed)")

# Update notes
handle_error_node['notes'] = """Updates failed document status using n8n expressions:
- upload_status = FAILED
- processing_error = {{ $json.error }}
- n8n_execution_error = {{ $json.error }}

Input required:
- $json.error (error message)
- $json.document_id (document UUID)"""

# Update metadata
workflow['updatedAt'] = datetime.now(timezone.utc).isoformat()
workflow['meta'] = workflow.get('meta', {})
workflow['meta']['updatedBy'] = 'fix-handle-error-expressions.py'

# Save
output_file = 'TIP Document Processing.json'
with open(output_file, 'w') as f:
    json.dump(workflow, f, indent=2)

print(f"\n{'='*60}")
print("✅ Handle Error node fixed!")
print(f"{'='*60}")
print("\nNew SQL Query:")
print(updated_query)
print("\nHow it works:")
print("  1. Filter sends: {error: '...', document_id: 'uuid', ...}")
print("  2. SQL executes with expressions replaced:")
print("     - '{{ $json.error }}' → 'PDF extraction requires...'")
print("     - '{{ $json.document_id }}' → 'e38f5681-ffed-4404...'")
print(f"\nSaved to: {output_file}")

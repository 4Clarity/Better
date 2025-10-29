#!/usr/bin/env python3
"""
Fix the Handle Error node to use existing database columns:
- processing_error instead of error_message
- n8n_execution_error for n8n-specific errors
"""

import json
from datetime import datetime, timezone

# Load workflow
print("Loading workflow...")
with open('WIP-TIP Document Processing.json', 'r') as f:
    workflow = json.load(f)

print(f"Loaded workflow with {len(workflow['nodes'])} nodes\n")

# Find and update the Handle Error node
handle_error_node = None
for node in workflow['nodes']:
    if node['name'] == 'Handle Error':
        handle_error_node = node
        break

if not handle_error_node:
    print("ERROR: Handle Error node not found!")
    exit(1)

print("Updating 'Handle Error' node...")

# Update the SQL query to use existing columns
updated_query = """UPDATE knowledge_documents
SET
  upload_status = 'FAILED',
  processing_error = $1,
  n8n_execution_error = $1,
  updated_at = NOW()
WHERE id = $2
RETURNING id, filename, upload_status, processing_error;"""

# Update the node parameters
handle_error_node['parameters']['query'] = updated_query

# Also need to ensure the query parameters are properly mapped
# The node should pass the error message and document_id
print("✓ Updated Handle Error SQL query to use 'processing_error' column\n")

# Add helpful notes to the node
handle_error_node['notesInFlow'] = True
handle_error_node['notes'] = """Updates failed document status:
- upload_status = FAILED
- processing_error = error message
- n8n_execution_error = error message (for n8n tracking)

Input required:
- $json.error (error message)
- $json.document_id (document UUID)"""

# Update workflow metadata
workflow['updatedAt'] = datetime.now(timezone.utc).isoformat()
workflow['meta'] = workflow.get('meta', {})
workflow['meta']['updatedBy'] = 'fix-handle-error-node.py'

# Save
output_file = 'TIP Document Processing.json'
with open(output_file, 'w') as f:
    json.dump(workflow, f, indent=2)

print(f"{'='*60}")
print("✅ Handle Error node fixed!")
print(f"{'='*60}")
print("\nChanges:")
print("  • Query now uses 'processing_error' (existing column)")
print("  • Also updates 'n8n_execution_error' for tracking")
print("  • Returns updated document data")
print("\nSQL Query:")
print(updated_query)
print(f"\nSaved to: {output_file}")

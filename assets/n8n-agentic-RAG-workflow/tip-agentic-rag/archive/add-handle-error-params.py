#!/usr/bin/env python3
"""
Add parameter values to Handle Error node so it knows where to get $1 and $2
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

print("Adding parameter values to Handle Error node...")

# Add the additionalFields with values
handle_error_node['parameters']['additionalFields'] = {
    "values": [
        {
            "value": "={{ $json.error }}"
        },
        {
            "value": "={{ $json.document_id }}"
        }
    ]
}

print("✓ Added parameter mappings:")
print("  $1 = $json.error (error message)")
print("  $2 = $json.document_id (document UUID)")

# Update metadata
workflow['updatedAt'] = datetime.now(timezone.utc).isoformat()
workflow['meta'] = workflow.get('meta', {})
workflow['meta']['updatedBy'] = 'add-handle-error-params.py'

# Save
output_file = 'TIP Document Processing.json'
with open(output_file, 'w') as f:
    json.dump(workflow, f, indent=2)

print(f"\n{'='*60}")
print("✅ Handle Error parameters configured!")
print(f"{'='*60}")
print("\nNow the node will:")
print("  1. Receive: {error: '...', document_id: 'uuid', ...}")
print("  2. Execute: UPDATE ... SET processing_error = $1 WHERE id = $2")
print("  3. With: $1 = error message, $2 = document UUID")
print(f"\nSaved to: {output_file}")

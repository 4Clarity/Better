#!/usr/bin/env python3
"""
Fix the data flow issue:
- Create Version Record should be a side branch (doesn't pass data forward)
- Route by File Type should receive data from Convert Base64 to Binary
- This preserves the binary data and document metadata
"""

import json
import uuid
from datetime import datetime, timezone

# Load workflow
print("Loading workflow...")
with open('WIP-TIP Document Processing.json', 'r') as f:
    workflow = json.load(f)

print(f"Loaded workflow with {len(workflow['nodes'])} nodes\n")

# The fix: Change connections so data flows correctly
print("CURRENT FLOW (BROKEN):")
print("  Convert Base64 → Create Version → Route by File Type → Extract Text")
print("  Problem: Create Version outputs success=true, losing document data\n")

print("NEW FLOW (FIXED):")
print("  Convert Base64 → Route by File Type → Extract Text")
print("  Convert Base64 → Create Version (side branch)")
print("  Solution: Route gets document data, Version Record is just logging\n")

# Update connections
# Convert Base64 to Binary should connect to BOTH:
# 1. Route by File Type (main data flow)
# 2. Create Version Record (side branch for logging)
workflow['connections']['Convert Base64 to Binary'] = {
    "main": [
        [
            {
                "node": "Route by File Type",
                "type": "main",
                "index": 0
            },
            {
                "node": "Create Version Record",
                "type": "main",
                "index": 0
            }
        ]
    ]
}

# Remove the connection from Create Version Record to Route by File Type
# (it was creating the broken flow)
if 'Create Version Record' in workflow['connections']:
    del workflow['connections']['Create Version Record']
    print("✓ Removed: Create Version Record → (deleted this connection)")

print("✓ Added: Convert Base64 to Binary → Route by File Type (MAIN data flow)")
print("✓ Added: Convert Base64 to Binary → Create Version Record (logging)")

# Update workflow metadata
workflow['updatedAt'] = datetime.now(timezone.utc).isoformat()
workflow['meta'] = workflow.get('meta', {})
workflow['meta']['updatedBy'] = 'fix-data-flow.py'
workflow['meta']['fixDate'] = datetime.now(timezone.utc).isoformat()

# Save
output_file = 'TIP Document Processing.json'
with open(output_file, 'w') as f:
    json.dump(workflow, f, indent=2)

print(f"\n{'='*60}")
print("✅ Data flow fixed!")
print(f"{'='*60}")
print("\nNow the flow is:")
print("  1. Merge → Convert Base64 to Binary")
print("  2. Convert Base64 → Route by File Type (document data)")
print("  3. Convert Base64 → Create Version (logging, parallel)")
print("  4. Route → Extract Text (gets actual document)")
print("  5. Extract Text → Process Document (gets text)")
print("  6. Process Document → Insert Chunks (gets chunks)")
print("\nSaved to:", output_file)

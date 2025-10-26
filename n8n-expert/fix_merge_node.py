#!/usr/bin/env python3.12
"""Fix the Merge Responses node configuration"""

import json

# Read the workflow
with open('N8N_Expert_Agent.json', 'r') as f:
    workflow = json.load(f)

# Find and fix the Merge Responses node
for node in workflow['nodes']:
    if node['name'] == 'Merge Responses':
        # Change to simpler merge mode that doesn't require field matching
        # Use "append" mode to just combine all items from both branches
        node['parameters'] = {
            "mode": "append",
            "options": {}
        }
        print("✅ Fixed Merge Responses node")
        print("   Changed from 'combine/mergeByPosition' to 'append'")
        print("   This will pass through items from whichever branch executes")
        break

# Save the fixed workflow
with open('N8N_Expert_Agent.json', 'w') as f:
    json.dump(workflow, f, indent=2)

print("✅ Saved fixed workflow")
print("\n🎯 The merge node will now:")
print("   - Pass through gap analysis data (when FALSE branch executes)")
print("   - Pass through normal workflow data (when TRUE branch executes)")
print("   - No field matching required!")

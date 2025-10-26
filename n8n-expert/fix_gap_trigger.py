#!/usr/bin/env python3.12
"""Fix the Gap Analysis Trigger node code"""

import json

# Read the workflow
with open('N8N_Expert_Agent.json', 'r') as f:
    workflow = json.load(f)

# Find and fix the Gap Analysis Trigger node
for node in workflow['nodes']:
    if node['name'] == 'Gap Analysis Trigger':
        # Fixed code - workflow_ids is already an array, don't parse it
        node['parameters']['jsCode'] = """// Get all items and extract workflow IDs
const items = $input.all();

// Get the aggregated workflow_ids array (already an array from Aggregate node)
const workflowIds = items[0].json.workflow_ids || [];

// Convert all to numbers and collect
const allWorkflowIds = workflowIds.map(id => parseInt(id));

// Count valid matches (not -1)
const validMatches = allWorkflowIds.filter(id => id !== -1);
const needsGapAnalysis = validMatches.length === 0;

// Get original query from Edit Fields node
const query = $('Edit Fields').first().json.query;

return [{
  json: {
    workflow_ids: workflowIds,
    filtered_workflow_ids: allWorkflowIds,
    valid_workflow_ids: validMatches,
    needsGapAnalysis: needsGapAnalysis,
    hasValidMatches: validMatches.length > 0,
    match_count: validMatches.length,
    original_query: query
  }
}];"""
        print("✅ Fixed Gap Analysis Trigger node")
        break

# Save the fixed workflow
with open('N8N_Expert_Agent.json', 'w') as f:
    json.dump(workflow, f, indent=2)

print("✅ Saved fixed workflow")
print("\n🎯 Next steps:")
print("1. Re-import N8N_Expert_Agent.json into n8n")
print("2. Test the workflow again")

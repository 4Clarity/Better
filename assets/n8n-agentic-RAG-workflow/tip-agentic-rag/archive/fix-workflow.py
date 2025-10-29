#!/usr/bin/env python3
"""
Fix the TIP Document Processing workflow by:
1. Adding "Extract Text from Binary" node
2. Connecting "Route by File Type" to the new node
3. Connecting the new node to "Character Text Splitter"
4. Adding "Update Status - COMPLETED" node
5. Updating all necessary connections
"""

import json
import uuid
from datetime import datetime

# Load the workflow
print("Loading workflow...")
with open('WIP-TIP Document Processing.json', 'r') as f:
    workflow = json.load(f)

print(f"Loaded workflow with {len(workflow.get('nodes', []))} nodes")

# Find key node IDs by name
node_ids = {}
for node in workflow['nodes']:
    node_ids[node['name']] = node['id']

print(f"\nFound nodes:")
for name in ['Route by File Type', 'Character Text Splitter', 'Insert Chunks to PostgreSQL', 'Check Auto-Approve']:
    if name in node_ids:
        print(f"  ✓ {name}: {node_ids[name]}")
    else:
        print(f"  ✗ {name}: NOT FOUND")

# Create "Extract Text from Binary" node
extract_text_node_id = str(uuid.uuid4())
extract_text_node = {
    "parameters": {
        "mode": "runOnceForAllItems",
        "jsCode": """// Extract text from binary data for text-based files
const items = $input.all();
const results = [];

for (let i = 0; i < items.length; i++) {
  try {
    const item = items[i];
    const mimeType = item.json.mime_type || '';
    let textContent = '';

    // Handle different file types
    if (mimeType.includes('text') || mimeType.includes('json') || mimeType.includes('xml')) {
      // Text-based files - extract from binary
      if (item.binary && item.binary.data) {
        const binaryData = item.binary.data;
        textContent = Buffer.from(binaryData.data, 'base64').toString('utf-8');
      } else {
        throw new Error('No binary data found in item');
      }
    } else if (mimeType.includes('pdf')) {
      // PDF handling - for now, throw error suggesting PDF parser
      throw new Error(`PDF extraction requires PDF parser node. MIME type: ${mimeType}`);
    } else if (mimeType.includes('application/')) {
      // Try to extract as text anyway
      if (item.binary && item.binary.data) {
        const binaryData = item.binary.data;
        textContent = Buffer.from(binaryData.data, 'base64').toString('utf-8');
      } else {
        throw new Error('No binary data found in item');
      }
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }

    results.push({
      json: {
        document_id: item.json.document_id,
        filename: item.json.filename,
        text: textContent,
        mime_type: mimeType,
        file_size: item.json.file_size,
        security_classification: item.json.security_classification || 'unclassified',
        extractedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    // Log error and continue with next item
    console.error(`Error extracting text from item ${i}:`, error.message);

    // Add error item
    results.push({
      json: {
        error: error.message,
        document_id: items[i].json?.document_id || 'unknown',
        filename: items[i].json?.filename || 'unknown',
        failed: true
      }
    });
  }
}

return results;"""
    },
    "id": extract_text_node_id,
    "name": "Extract Text from Binary",
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [1120, 460],
    "notesInFlow": True,
    "notes": "Extracts text content from binary data for text-based files (txt, json, xml). PDFs require separate PDF parser node."
}

# Create "Update Status - COMPLETED" node
update_completed_node_id = str(uuid.uuid4())
update_completed_node = {
    "parameters": {
        "operation": "executeQuery",
        "query": """UPDATE knowledge_documents
SET
  upload_status = 'COMPLETED',
  chunk_count = (
    SELECT COUNT(*)
    FROM n8n_vectors
    WHERE metadata->>'document_id' = $1
  ),
  processing_completed_at = NOW()
WHERE id = $1::uuid
RETURNING id, upload_status, chunk_count;""",
        "additionalFields": {
            "mode": "independently",
            "queryBatching": "single"
        },
        "options": {}
    },
    "id": update_completed_node_id,
    "name": "Update Status - COMPLETED",
    "type": "n8n-nodes-base.postgres",
    "typeVersion": 2.4,
    "position": [2140, 460],
    "credentials": {
        "postgres": {
            "id": "1",
            "name": "PostgreSQL account"
        }
    },
    "notesInFlow": True,
    "notes": "Updates document status to COMPLETED and sets chunk count after successful processing"
}

# Add new nodes to workflow
print(f"\nAdding new nodes...")
workflow['nodes'].append(extract_text_node)
print(f"  ✓ Added 'Extract Text from Binary' node: {extract_text_node_id}")
workflow['nodes'].append(update_completed_node)
print(f"  ✓ Added 'Update Status - COMPLETED' node: {update_completed_node_id}")

# Update connections
if 'connections' not in workflow:
    workflow['connections'] = {}

# Connect "Route by File Type" to "Extract Text from Binary"
# Using output index 0 (default route)
workflow['connections']['Route by File Type'] = {
    "main": [
        [
            {
                "node": "Extract Text from Binary",
                "type": "main",
                "index": 0
            }
        ]
    ]
}
print(f"\n  ✓ Connected: Route by File Type → Extract Text from Binary")

# Connect "Extract Text from Binary" to "Character Text Splitter"
workflow['connections']['Extract Text from Binary'] = {
    "main": [
        [
            {
                "node": "Character Text Splitter",
                "type": "main",
                "index": 0
            }
        ]
    ]
}
print(f"  ✓ Connected: Extract Text from Binary → Character Text Splitter")

# Find and update "Check Auto-Approve" connections to also update status
# Both branches should lead to status update
auto_approve_node_id = node_ids.get('Auto-Approve High Quality')
manual_review_node_id = node_ids.get('Mark for Manual Review')

# Add connections from both auto-approve branches to Update Status - COMPLETED
if 'Auto-Approve High Quality' in workflow['connections']:
    # Keep existing connections and add new one
    existing = workflow['connections']['Auto-Approve High Quality']['main'][0]
    existing.append({
        "node": "Update Status - COMPLETED",
        "type": "main",
        "index": 0
    })
else:
    workflow['connections']['Auto-Approve High Quality'] = {
        "main": [
            [
                {
                    "node": "Update Status - COMPLETED",
                    "type": "main",
                    "index": 0
                }
            ]
        ]
    }
print(f"  ✓ Connected: Auto-Approve High Quality → Update Status - COMPLETED")

if 'Mark for Manual Review' in workflow['connections']:
    # Keep existing connections and add new one
    existing = workflow['connections']['Mark for Manual Review']['main'][0]
    existing.append({
        "node": "Update Status - COMPLETED",
        "type": "main",
        "index": 0
    })
else:
    workflow['connections']['Mark for Manual Review'] = {
        "main": [
            [
                {
                    "node": "Update Status - COMPLETED",
                    "type": "main",
                    "index": 0
                }
            ]
        ]
    }
print(f"  ✓ Connected: Mark for Manual Review → Update Status - COMPLETED")

# Update workflow metadata
workflow['updatedAt'] = datetime.utcnow().isoformat() + 'Z'
if 'meta' not in workflow:
    workflow['meta'] = {}
workflow['meta']['updatedBy'] = 'fix-workflow.py'

# Save the updated workflow
output_file = 'TIP Document Processing.json'
print(f"\nSaving updated workflow to: {output_file}")
with open(output_file, 'w') as f:
    json.dump(workflow, f, indent=2)

print(f"\n✅ Workflow updated successfully!")
print(f"\nSummary of changes:")
print(f"  • Added 'Extract Text from Binary' code node")
print(f"  • Added 'Update Status - COMPLETED' postgres node")
print(f"  • Connected Route by File Type → Extract Text from Binary")
print(f"  • Connected Extract Text from Binary → Character Text Splitter")
print(f"  • Connected both approval paths → Update Status - COMPLETED")
print(f"\nNext steps:")
print(f"  1. Import '{output_file}' to n8n")
print(f"  2. Verify all connections in the visual editor")
print(f"  3. Configure PostgreSQL credentials for new node")
print(f"  4. Save and activate the workflow")
print(f"  5. Test with a simple text file")

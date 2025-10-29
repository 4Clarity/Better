#!/usr/bin/env python3
"""
Fix the Process Document node to properly handle error/failed items:
- Pass failed items through to error handling
- Don't let empty results stop the workflow
- Add proper error node connection
"""

import json
import uuid
from datetime import datetime, timezone

# Load workflow
print("Loading workflow...")
with open('WIP-TIP Document Processing.json', 'r') as f:
    workflow = json.load(f)

print(f"Loaded workflow with {len(workflow['nodes'])} nodes\n")

# Find the Process Document node
process_doc_node = None
for node in workflow['nodes']:
    if node['name'] == 'Process Document - Chunk & Embed':
        process_doc_node = node
        break

if not process_doc_node:
    print("ERROR: Process Document node not found!")
    exit(1)

print("Updating 'Process Document - Chunk & Embed' node...")

# Update the JavaScript code to handle errors better
updated_code = """// Process document: chunk text and generate embeddings
const items = $input.all();
const results = [];

// Configuration
const CHUNK_SIZE = 500;  // characters per chunk
const CHUNK_OVERLAP = 50;  // overlap between chunks
const OLLAMA_URL = 'http://host.docker.internal:11434/api/embeddings';
const OLLAMA_MODEL = 'nomic-embed-text:latest';

// Helper: Split text into chunks
function chunkText(text, chunkSize, overlap) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end);

    if (chunk.trim().length > 0) {
      chunks.push(chunk);
    }

    start += chunkSize - overlap;
  }

  return chunks;
}

// Helper: Get embedding from Ollama
async function getEmbedding(text) {
  try {
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: text
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.embedding;
  } catch (error) {
    console.error('Ollama embedding error:', error);
    throw error;
  }
}

// Process each document
for (let i = 0; i < items.length; i++) {
  try {
    const item = items[i];

    // If item is already marked as failed, pass it through to error handling
    if (item.json.failed === true || item.json.error) {
      console.log(`Passing failed item to error handling: ${item.json.filename || 'unknown'} - ${item.json.error}`);

      // Pass to error handling with additional context
      results.push({
        json: {
          error: item.json.error || 'Unknown error',
          document_id: item.json.document_id || 'unknown',
          filename: item.json.filename || 'unknown',
          mime_type: item.json.mime_type || 'unknown',
          failed: true,
          processing_stage: 'text_extraction',
          original_error: item.json
        }
      });
      continue;
    }

    const text = item.json.text;
    const documentId = item.json.document_id;
    const filename = item.json.filename;
    const mimeType = item.json.mime_type;
    const securityClassification = item.json.security_classification || 'unclassified';

    if (!text || text.length === 0) {
      throw new Error(`No text content found for ${filename}`);
    }

    console.log(`Processing ${filename}: ${text.length} characters`);

    // Chunk the text
    const chunks = chunkText(text, CHUNK_SIZE, CHUNK_OVERLAP);
    console.log(`Created ${chunks.length} chunks`);

    // Generate embeddings for each chunk
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunkText = chunks[chunkIndex];

      console.log(`Generating embedding for chunk ${chunkIndex + 1}/${chunks.length}...`);

      // Get embedding from Ollama
      const embedding = await getEmbedding(chunkText);

      // Format for Insert Chunks node
      // The node expects: pageContent and embedding
      results.push({
        json: {
          // Fields expected by Insert Chunks node
          pageContent: chunkText,
          embedding: embedding,

          // Metadata
          document_id: documentId,
          filename: filename,
          chunk_index: chunkIndex,
          mime_type: mimeType,
          security_classification: securityClassification,
          total_chunks: chunks.length,
          chunk_size: chunkText.length
        }
      });

      // Small delay to avoid overwhelming Ollama
      await new Promise(resolve => setTimeout(resolve, 100));
    }

  } catch (error) {
    console.error(`Error processing item ${i}:`, error.message);

    // Add error item that will go to error handling
    results.push({
      json: {
        error: error.message,
        document_id: items[i].json?.document_id || 'unknown',
        filename: items[i].json?.filename || 'unknown',
        mime_type: items[i].json?.mime_type || 'unknown',
        failed: true,
        processing_stage: 'chunking_embedding',
        stack: error.stack
      }
    });
  }
}

console.log(`Processed ${results.length} items (chunks + errors)`);

// IMPORTANT: Always return results array, even if empty
// This prevents workflow from stopping
if (results.length === 0) {
  console.log('WARNING: No items to return - all processing failed');
  return [{
    json: {
      error: 'All documents failed processing',
      failed: true,
      processing_stage: 'batch_processing'
    }
  }];
}

return results;"""

# Update the node
process_doc_node['parameters']['jsCode'] = updated_code
print("✓ Updated Process Document code to handle errors properly\n")

# Now add a Switch/IF node to route successful chunks vs errors
filter_node_id = str(uuid.uuid4())
filter_node = {
    "parameters": {
        "conditions": {
            "boolean": [
                {
                    "value1": "={{ $json.failed }}",
                    "value2": True
                }
            ]
        }
    },
    "id": filter_node_id,
    "name": "Filter Errors vs Chunks",
    "type": "n8n-nodes-base.if",
    "typeVersion": 2,
    "position": [1180, 460],
    "notesInFlow": True,
    "notes": "Routes failed items to error handling, successful chunks to database insertion"
}

# Add the filter node
workflow['nodes'].append(filter_node)
print(f"✓ Added 'Filter Errors vs Chunks' node: {filter_node_id}")

# Update connections
# Process Document → Filter
workflow['connections']['Process Document - Chunk & Embed'] = {
    "main": [
        [
            {
                "node": "Filter Errors vs Chunks",
                "type": "main",
                "index": 0
            }
        ]
    ]
}

# Filter → Insert Chunks (FALSE = successful chunks)
# Filter → Handle Error (TRUE = failed items)
workflow['connections']['Filter Errors vs Chunks'] = {
    "main": [
        [
            {
                "node": "Handle Error",
                "type": "main",
                "index": 0
            }
        ],
        [
            {
                "node": "Insert Chunks to PostgreSQL",
                "type": "main",
                "index": 0
            }
        ]
    ]
}

print("✓ Connected: Process Document → Filter Errors vs Chunks")
print("✓ Connected: Filter (TRUE/errors) → Handle Error")
print("✓ Connected: Filter (FALSE/chunks) → Insert Chunks to PostgreSQL")

# Update workflow metadata
workflow['updatedAt'] = datetime.now(timezone.utc).isoformat()
workflow['meta'] = workflow.get('meta', {})
workflow['meta']['updatedBy'] = 'fix-error-handling.py'

# Save
output_file = 'TIP Document Processing.json'
with open(output_file, 'w') as f:
    json.dump(workflow, f, indent=2)

print(f"\n{'='*60}")
print("✅ Error handling fixed!")
print(f"{'='*60}")
print("\nChanges:")
print("  1. Process Document now passes failed items through")
print("  2. Added Filter node to separate errors from chunks")
print("  3. Errors route to 'Handle Error' node")
print("  4. Successful chunks route to 'Insert Chunks'")
print("\nNow:")
print("  • PDF files will trigger error handling")
print("  • Text files will process normally")
print("  • Workflow won't stop on errors")
print(f"\nSaved to: {output_file}")

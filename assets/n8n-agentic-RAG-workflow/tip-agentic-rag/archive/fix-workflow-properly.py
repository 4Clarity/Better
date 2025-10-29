#!/usr/bin/env python3
"""
Properly fix the workflow by creating a code node that:
1. Takes text input from Extract Text from Binary
2. Manually chunks the text
3. Calls Ollama API for embeddings
4. Outputs properly formatted data for Insert Chunks node
"""

import json
import uuid

# Load the workflow
print("Loading workflow...")
with open('WIP-TIP Document Processing.json', 'r') as f:
    workflow = json.load(f)

print(f"Loaded workflow with {len(workflow.get('nodes', []))} nodes")

# Find the Extract Text from Binary node ID
extract_text_id = None
insert_chunks_id = None

for node in workflow['nodes']:
    if node['name'] == 'Extract Text from Binary':
        extract_text_id = node['id']
        print(f"Found Extract Text from Binary: {extract_text_id}")
    elif node['name'] == 'Insert Chunks to PostgreSQL':
        insert_chunks_id = node['id']
        print(f"Found Insert Chunks: {insert_chunks_id}")

# Remove the LangChain sub-nodes (they're not being used correctly)
workflow['nodes'] = [n for n in workflow['nodes']
                     if n['name'] not in ['Character Text Splitter', 'Embeddings Ollama']]

print(f"\nRemoved unused LangChain sub-nodes")
print(f"Nodes now: {len(workflow['nodes'])}")

# Create a new "Process Document" code node that does chunking and embedding
process_doc_node_id = str(uuid.uuid4())
process_doc_node = {
    "parameters": {
        "mode": "runOnceForAllItems",
        "jsCode": """// Process document: chunk text and generate embeddings
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

    // Skip items that failed text extraction
    if (item.json.failed || item.json.error) {
      console.log(`Skipping failed item: ${item.json.filename}`);
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

console.log(`Processed ${results.length} total chunks`);

return results;"""
    },
    "id": process_doc_node_id,
    "name": "Process Document - Chunk & Embed",
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [960, 460],
    "notesInFlow": True,
    "notes": "Chunks text and generates embeddings via Ollama API. Outputs data formatted for PostgreSQL insertion."
}

# Add the new node
workflow['nodes'].append(process_doc_node)
print(f"\n✓ Added 'Process Document - Chunk & Embed' node: {process_doc_node_id}")

# Update connections
# Extract Text from Binary → Process Document
workflow['connections']['Extract Text from Binary'] = {
    "main": [
        [
            {
                "node": "Process Document - Chunk & Embed",
                "type": "main",
                "index": 0
            }
        ]
    ]
}

# Process Document → Insert Chunks to PostgreSQL
workflow['connections']['Process Document - Chunk & Embed'] = {
    "main": [
        [
            {
                "node": "Insert Chunks to PostgreSQL",
                "type": "main",
                "index": 0
            }
        ]
    ]
}

print(f"\n✓ Connected: Extract Text from Binary → Process Document - Chunk & Embed")
print(f"✓ Connected: Process Document - Chunk & Embed → Insert Chunks to PostgreSQL")

# Update workflow metadata
from datetime import datetime, timezone
workflow['updatedAt'] = datetime.now(timezone.utc).isoformat()
if 'meta' not in workflow:
    workflow['meta'] = {}
workflow['meta']['updatedBy'] = 'fix-workflow-properly.py'

# Save
output_file = 'TIP Document Processing.json'
print(f"\nSaving to: {output_file}")
with open(output_file, 'w') as f:
    json.dump(workflow, f, indent=2)

print(f"\n{'='*60}")
print(f"✅ Workflow fixed successfully!")
print(f"{'='*60}")
print(f"\nChanges:")
print(f"  • Removed non-functional LangChain sub-nodes")
print(f"  • Added 'Process Document - Chunk & Embed' code node")
print(f"  • Properly connected: Extract Text → Process → Insert Chunks")
print(f"\nThis node:")
print(f"  ✓ Chunks text (500 char chunks, 50 char overlap)")
print(f"  ✓ Calls Ollama API directly for embeddings")
print(f"  ✓ Outputs data formatted for PostgreSQL insertion")
print(f"  ✓ Handles errors gracefully")
print(f"\nReady to import and test!")

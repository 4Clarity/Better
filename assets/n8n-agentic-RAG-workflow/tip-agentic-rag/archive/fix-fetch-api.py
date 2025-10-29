#!/usr/bin/env python3
"""
Fix the fetch API issue by using n8n's built-in $http helper instead
"""

import json
from datetime import datetime, timezone

# Load workflow
print("Loading workflow...")
with open('WIP-TIP Document Processing.json', 'r') as f:
    workflow = json.load(f)

# Find Process Document node
process_doc_node = None
for node in workflow['nodes']:
    if node['name'] == 'Process Document - Chunk & Embed':
        process_doc_node = node
        break

if not process_doc_node:
    print("ERROR: Process Document node not found!")
    exit(1)

print("Fixing fetch API to use n8n $http helper...")

# Update code to use $http instead of fetch
updated_code = """// Process document: chunk text and generate embeddings
const items = $input.all();
const results = [];

console.log('=== Process Document Started ===');
console.log(`Received ${items.length} items`);

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

// Helper: Get embedding from Ollama using n8n's $http
async function getEmbedding(text) {
  try {
    console.log(`Calling Ollama API at: ${OLLAMA_URL}`);

    // Use n8n's built-in $http helper instead of fetch
    const response = await $http.request({
      method: 'POST',
      url: OLLAMA_URL,
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        model: OLLAMA_MODEL,
        prompt: text
      },
      json: true
    });

    if (!response || !response.embedding) {
      throw new Error('Ollama API did not return embedding data');
    }

    console.log(`Embedding received: ${response.embedding.length} dimensions`);
    return response.embedding;

  } catch (error) {
    console.error('Ollama embedding error:', error.message);
    throw error;
  }
}

// Process each document
for (let i = 0; i < items.length; i++) {
  try {
    const item = items[i];
    console.log(`\\n--- Processing item ${i + 1}/${items.length} ---`);
    console.log('Item keys:', Object.keys(item.json));

    // If item is already marked as failed, pass it through to error handling
    if (item.json.failed === true || item.json.error) {
      console.log(`Item ${i + 1} is marked as failed: ${item.json.error}`);
      console.log(`Passing to error handling: ${item.json.filename || 'unknown'}`);

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

    console.log(`Document: ${filename}`);
    console.log(`MIME type: ${mimeType}`);
    console.log(`Text length: ${text ? text.length : 0} characters`);

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

      console.log(`Chunk ${chunkIndex + 1}/${chunks.length}: ${chunkText.length} chars`);
      console.log(`Generating embedding...`);

      // Get embedding from Ollama
      const embedding = await getEmbedding(chunkText);

      // Format for Insert Chunks node
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

      console.log(`Chunk ${chunkIndex + 1} processed successfully`);

      // Small delay to avoid overwhelming Ollama
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Document ${filename} processing complete: ${chunks.length} chunks created`);

  } catch (error) {
    console.error(`\\nERROR processing item ${i + 1}:`, error.message);
    console.error('Stack:', error.stack);

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

console.log(`\\n=== Process Document Complete ===`);
console.log(`Processed ${results.length} items total`);
console.log(`Successful chunks: ${results.filter(r => !r.json.failed).length}`);
console.log(`Failed items: ${results.filter(r => r.json.failed).length}`);

// IMPORTANT: Always return results array, even if empty
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

print("✓ Replaced fetch() with $http.request()")
print("✓ $http is n8n's built-in HTTP helper")

# Update metadata
workflow['updatedAt'] = datetime.now(timezone.utc).isoformat()
workflow['meta'] = workflow.get('meta', {})
workflow['meta']['updatedBy'] = 'fix-fetch-api.py'

# Save
output_file = 'TIP Document Processing.json'
with open(output_file, 'w') as f:
    json.dump(workflow, f, indent=2)

print(f"\n{'='*60}")
print("✅ Fetch API issue fixed!")
print(f"{'='*60}")
print("\nChanges:")
print("  • Replaced: fetch(url, options)")
print("  • With: $http.request({method, url, headers, body, json})")
print("\n$http.request() is built into n8n and works in all environments")
print(f"\nSaved to: {output_file}")

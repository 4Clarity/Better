# URGENT: Import Fixed Workflow Now

## Current Status
❌ You're still running the OLD workflow with `$http.request()` (broken)
✅ The FIXED workflow with `this.helpers.httpRequest()` is ready to import

## Import Steps (2 minutes)

### Step 1: Open n8n
Go to: **http://n8n.tip.localhost**

### Step 2: Find Your Workflow
- Click **"Workflows"** in the left sidebar
- Find **"TIP Document Processing"** workflow
- Click on it to open

### Step 3: Replace Workflow Code

**Option A: Import from File (Recommended)**
1. In the workflow editor, click the **"⋮"** menu (top right)
2. Select **"Import from File"**
3. Choose file: `/Users/richardroach/Documents/Builder_Projects/Better/assets/n8n-agentic-RAG-workflow/tip-agentic-rag/TIP Document Processing.json`
4. Click **"Import"**
5. Confirm overwrite when prompted
6. Click **"Save"** in top right

**Option B: Manual Node Update**
1. Find the **"Process Document - Chunk & Embed"** node
2. Click on it
3. Replace the entire code with the fixed version below

### Step 4: Activate Workflow
1. Make sure the **Active** toggle (top right) is ON
2. Should show green "Active"

### Step 5: Test
1. Go to: http://tip.localhost/knowledge/document-upload
2. Find document: `custom-shelf-plans__3_.txt`
3. Click Process (▶️)
4. Wait 10 seconds
5. Check n8n Executions tab - should show success

---

## Fixed Code (If Using Option B)

Replace the entire code in "Process Document - Chunk & Embed" node with:

```javascript
// Process document: chunk text and generate embeddings
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

// Helper: Get embedding from Ollama using n8n's this.helpers
async function getEmbedding(text, nodeContext) {
  try {
    console.log(`Calling Ollama API at: ${OLLAMA_URL}`);

    // Use n8n's this.helpers.httpRequest() method
    const response = await nodeContext.helpers.httpRequest({
      method: 'POST',
      url: OLLAMA_URL,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: text
      })
    });

    // Parse the response
    const data = typeof response === 'string' ? JSON.parse(response) : response;

    if (!data || !data.embedding) {
      throw new Error('Ollama API did not return embedding data');
    }

    console.log(`Embedding received: ${data.embedding.length} dimensions`);
    return data.embedding;

  } catch (error) {
    console.error('Ollama embedding error:', error.message);
    throw error;
  }
}

// Process each document
for (let i = 0; i < items.length; i++) {
  try {
    const item = items[i];
    console.log(`\n--- Processing item ${i + 1}/${items.length} ---`);
    console.log('Item keys:', Object.keys(item.json));

    // If item is already marked as failed, pass it through to error handling
    if (item.json.failed === true || item.json.error) {
      console.log(`Item ${i + 1} is marked as failed: ${item.json.error}`);
      console.log(`Passing to error handling: ${item.json.filename || 'unknown'}`);

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

      // Get embedding from Ollama - pass 'this' context
      const embedding = await getEmbedding(chunkText, this);

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
    console.error(`\nERROR processing item ${i + 1}:`, error.message);
    console.error('Stack:', error.stack);

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

console.log(`\n=== Process Document Complete ===`);
console.log(`Processed ${results.length} items total`);
console.log(`Successful chunks: ${results.filter(r => !r.json.failed).length}`);
console.log(`Failed items: ${results.filter(r => r.json.failed).length}`);

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

return results;
```

---

## Key Change in Code

**Line 39-50** - Changed from:
```javascript
const response = await $http.request({...});  // ❌ BROKEN
```

**To:**
```javascript
const response = await nodeContext.helpers.httpRequest({...});  // ✅ WORKING
```

---

## Verification After Import

1. **Check the code** in Process Document node - should have `nodeContext.helpers.httpRequest`
2. **Save the workflow** (click Save button)
3. **Ensure Active** (toggle should be green)
4. **Test immediately** with your text file

---

## What You Should See After Import

✅ Process Document node code shows `this.helpers.httpRequest`
✅ Workflow saves without errors
✅ Test execution completes successfully
✅ Chunks appear in database
✅ Document status updates to COMPLETED

---

**Import the workflow NOW - the fix is ready, you just need to load it into n8n!** 🚀

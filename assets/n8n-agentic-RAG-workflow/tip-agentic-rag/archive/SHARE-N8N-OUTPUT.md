# Share n8n Execution Output

## Ollama Status
✅ Ollama is running and working
✅ Embeddings API returns 768 dimensions
✅ Model `nomic-embed-text:latest` is available

## Problem
Text documents routing to "failed" path, Insert Chunks not firing

## What I Need You to Share

### 1. Process Document Output

1. Go to: **http://n8n.tip.localhost**
2. Click: **Executions** (left sidebar)
3. Click: Latest execution (with your text file)
4. Click: **"Process Document - Chunk & Embed"** node
5. Click: **"Output"** tab

**Share the complete JSON output** - copy and paste it here

Example of what I expect to see:
```json
[
  {
    "pageContent": "This is a test document...",
    "embedding": [0.664, 0.270, ...],
    "document_id": "7ca9e34a-...",
    "filename": "custom-shelf-plans__3_.txt",
    "chunk_index": 0,
    "mime_type": "text/plain",
    "security_classification": "unclassified",
    "total_chunks": 1,
    "chunk_size": 350
  }
]
```

**Key Questions:**
- Does the output have `failed: true`?
- Does the output have `pageContent` and `embedding`?
- How many items in the output array?

---

### 2. Process Document Console Logs

Still on the **"Process Document - Chunk & Embed"** node:

1. Look for the console output section (or logs)
2. Share what it says

Example of SUCCESS:
```
=== Process Document Started ===
Received 1 items
Document: custom-shelf-plans__3_.txt
Text length: 350 characters
Created 1 chunks
Chunk 1/1: 350 chars
Generating embedding...
Calling Ollama API at: http://host.docker.internal:11434/api/embeddings
Embedding received: 768 dimensions
Chunk 1 processed successfully
Document custom-shelf-plans__3_.txt processing complete: 1 chunks created
=== Process Document Complete ===
Processed 1 items total
Successful chunks: 1
Failed items: 0
```

Example of FAILURE:
```
ERROR processing item 1: [some error message]
Successful chunks: 0
Failed items: 1
```

---

### 3. Filter Node Input

1. Click: **"Filter Errors vs Chunks"** node
2. Click: **"Input"** tab
3. Share what it shows

---

### 4. Filter Node Output

Still on **"Filter Errors vs Chunks"** node:

1. Click: **"Output"** tab
2. Check both outputs:
   - **Output 0 (TRUE)** - Should only have failed items
   - **Output 1 (FALSE)** - Should have successful chunks

**Share:**
- Which output has items?
- How many items in each output?
- What do the items look like?

---

## Quick Diagnosis

Based on what you share, I'll identify:

**Scenario A:** Process Document outputs chunks with `failed: true`
- **Cause:** Error in chunking/embedding process
- **Fix:** Check console logs for error

**Scenario B:** Process Document outputs chunks WITHOUT `failed` field
- **Cause:** Filter routing logic issue
- **Fix:** Update Filter conditions

**Scenario C:** Process Document has no output
- **Cause:** Code error or node not executing
- **Fix:** Check for node execution error

---

## How to Copy n8n Output

### Method 1: Click "Copy as JSON"
Most nodes have a "Copy as JSON" button in the output tab

### Method 2: Select and Copy
1. Click in the JSON output area
2. Cmd+A (select all)
3. Cmd+C (copy)
4. Paste here

---

**Share the output and I'll tell you exactly what's wrong!**

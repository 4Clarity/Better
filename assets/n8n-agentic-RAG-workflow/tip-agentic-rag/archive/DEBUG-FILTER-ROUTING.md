# Debug Filter Routing Issue

## Current Status
✅ Chunking is occurring (Process Document node is working)
❌ All chunks routing to "failed" path (Insert Chunks not firing)
❌ Text documents marked as failed

## What to Check in n8n

### 1. Open Latest Execution
1. Go to: http://n8n.tip.localhost
2. Click: **Executions** (left sidebar)
3. Click: Most recent execution (top of list)

### 2. Check Process Document Output
1. Click on **"Process Document - Chunk & Embed"** node
2. Click **"Output"** tab
3. Look at the JSON data

**Share this information:**
- How many items in output?
- Do the items have a `failed` field?
- Do successful chunks have `pageContent` and `embedding`?
- What does a successful chunk look like?

**Example of what we SHOULD see:**
```json
{
  "pageContent": "This is a test document...",
  "embedding": [0.1, 0.2, ..., 768 values],
  "document_id": "7ca9e34a-...",
  "filename": "custom-shelf-plans__3_.txt",
  "chunk_index": 0,
  "mime_type": "text/plain",
  "security_classification": "unclassified",
  "total_chunks": 1,
  "chunk_size": 350
}
```

**Note: No `failed` field in successful chunks!**

### 3. Check Filter Node Input
1. Click on **"Filter Errors vs Chunks"** node
2. Click **"Input"** tab
3. Check what items it's receiving
4. Do ALL items have `failed: true`?

### 4. Check Filter Node Output
1. Still on **"Filter Errors vs Chunks"** node
2. Click **"Output"** tab
3. Check which output has items:
   - **Output 0 (TRUE)** → Should only have failed items
   - **Output 1 (FALSE)** → Should have successful chunks

**Current issue:** Output 1 (FALSE) is probably empty

### 5. Check Console Logs
1. Click on **"Process Document - Chunk & Embed"** node
2. Look for console.log output:

**What we want to see:**
```
=== Process Document Started ===
Received 1 items
Document: custom-shelf-plans__3_.txt
Text length: XXX characters
Created X chunks
Chunk 1/X: XXX chars
Generating embedding...
Calling Ollama API at: http://host.docker.internal:11434/api/embeddings
Embedding received: 768 dimensions
Chunk 1 processed successfully
```

**What we DON'T want to see:**
```
ERROR processing item 1: ...
```

---

## Possible Issues

### Issue A: Extract Text Marking as Failed
**Check:** "Extract Text from Binary" output
**Problem:** Text files being marked with `failed: true`
**Fix:** Update Extract Text code to NOT set failed for text files

### Issue B: Process Document Error
**Check:** Process Document console logs for errors
**Problem:** Ollama API call failing, marking all chunks as failed
**Fix:** Check Ollama is running, check API URL

### Issue C: Successful Chunks Have failed=true
**Check:** Process Document output JSON
**Problem:** Code is setting `failed: true` on successful chunks
**Fix:** Update Process Document code to NOT include failed field for success

---

## Quick Diagnosis

Run this in terminal to check Ollama:
```bash
# Check Ollama is accessible
curl -s http://localhost:11434/api/tags | python3 -m json.tool

# Test embeddings API directly
curl -X POST http://localhost:11434/api/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "model": "nomic-embed-text:latest",
    "prompt": "test text"
  }' | python3 -m json.tool
```

**Expected:** Should return JSON with `embedding` array (768 numbers)
**If error:** Ollama not running or model not available

---

## Next Steps

1. **Check n8n execution output** (steps above)
2. **Share the JSON** from Process Document output
3. **Share console logs** from Process Document node
4. **We'll identify** exactly why chunks have `failed: true`

---

**The filter logic and connections are correct - we need to see why chunks are marked as failed!**

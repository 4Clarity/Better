# Debugging Guide - Why Chunks Aren't Being Created

**Issue**: Error handling works, but chunks aren't being generated for text files
**Status**: Diagnostic logging added

---

## Diagnostic Logging Added

I've added comprehensive console logging to the "Process Document - Chunk & Embed" node. This will help us see exactly what's happening.

---

## How to Debug

### Step 1: Upload a Text File

```bash
# Create a simple test file
echo "This is a test document for RAG processing. It has multiple sentences. Each sentence will help us test the chunking and embedding process." > /tmp/test-debug.txt
```

### Step 2: Upload & Process

1. Go to: http://tip.localhost/knowledge/document-upload
2. Upload `test-debug.txt`
3. Click Process (▶️)

### Step 3: Check n8n Execution Logs

1. Go to: http://n8n.tip.localhost
2. Click: **Executions** (left sidebar)
3. Click: Latest execution (top of list)
4. Click: **Process Document - Chunk & Embed** node
5. Click: **View Details** or **Logs**

### Step 4: Look for These Log Messages

```
=== Process Document Started ===
Received X items

--- Processing item 1/X ---
Item keys: [list of keys]
Document: test-debug.txt
MIME type: text/plain
Text length: XXX characters
Processing test-debug.txt: XXX characters
Created X chunks
Chunk 1/X: XXX chars
Generating embedding...
Calling Ollama API at: http://host.docker.internal:11434/api/embeddings
Embedding received: 768 dimensions
Chunk 1 processed successfully
...
Document test-debug.txt processing complete: X chunks created

=== Process Document Complete ===
Processed X items total
Successful chunks: X
Failed items: 0
```

---

## Common Issues & What Logs Will Show

### Issue 1: Items Marked as Failed

**Log shows**:
```
Item 1 is marked as failed: PDF extraction requires...
Passing to error handling: filename.txt
```

**Meaning**: Extract Text from Binary is marking text files as failed
**Fix**: Check Extract Text from Binary node logic

---

### Issue 2: No Text Content

**Log shows**:
```
Document: test.txt
MIME type: text/plain
Text length: 0 characters
ERROR: No text content found for test.txt
```

**Meaning**: Extract Text isn't extracting text from binary
**Fix**: Check Convert Base64 to Binary output format

---

### Issue 3: Ollama API Error

**Log shows**:
```
Calling Ollama API at: http://host.docker.internal:11434/api/embeddings
Ollama embedding error: ECONNREFUSED
```

**Meaning**: Can't connect to Ollama
**Fix**: Verify Ollama is running:
```bash
curl http://localhost:11434/api/tags
```

---

### Issue 4: Wrong Response Format

**Log shows**:
```
Embedding received: undefined dimensions
```

**Meaning**: Ollama response doesn't have `embedding` field
**Fix**: Check Ollama API response structure

---

### Issue 5: Filter Routing All to Errors

**Check Filter node execution**:
- If all items show `failed: true`, they'll go to Handle Error
- If items have `failed: false` or no `failed` field, they should go to Insert Chunks

**Log will show** in Process Document:
```
Processed 3 items total
Successful chunks: 0
Failed items: 3
```

If all items are failed, check why they're being marked as failed.

---

## Diagnostic Checklist

Run through this checklist using the logs:

### 1. Is Process Document Receiving Items?
- [ ] Log shows: "Received X items" where X > 0
- [ ] If X = 0: Extract Text from Binary isn't outputting anything

### 2. Are Items Failed or Successful?
- [ ] Log shows: "Item 1 is marked as failed" → Check Extract Text
- [ ] Log shows: "Document: filename.txt" → Item is successful

### 3. Does Item Have Text?
- [ ] Log shows: "Text length: XXX characters" where XXX > 0
- [ ] If 0: Extract Text from Binary isn't extracting text

### 4. Are Chunks Being Created?
- [ ] Log shows: "Created X chunks" where X > 0
- [ ] If 0 but text exists: Chunking logic issue

### 5. Is Ollama Responding?
- [ ] Log shows: "Embedding received: 768 dimensions"
- [ ] If error: Ollama connectivity or API issue

### 6. Are Chunks Being Output?
- [ ] Log shows: "Chunk X processed successfully"
- [ ] Log shows: "Successful chunks: X" where X > 0

---

## What to Share

After running the test, share these details:

1. **Full console output** from Process Document node
2. **Extract Text from Binary output** (what it's sending to Process Document)
3. **Filter node execution** (which branch items take)
4. **Any error messages** from any node

---

## Quick Tests

### Test Ollama Directly:
```bash
curl -X POST http://localhost:11434/api/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "model": "nomic-embed-text:latest",
    "prompt": "test text"
  }'

# Should return: {"embedding": [0.1, 0.2, ..., 768 dimensions]}
```

### Test Extract Text Output:
In n8n execution:
1. Click "Extract Text from Binary" node
2. Look at OUTPUT tab
3. Should show:
```json
{
  "document_id": "uuid",
  "filename": "test.txt",
  "text": "This is a test...",
  "mime_type": "text/plain"
}
```

If `text` field is missing or empty → That's the problem

### Test Filter Logic:
1. Click "Filter Errors vs Chunks" node
2. Check INPUT tab
3. Items with `failed: true` go to Handle Error
4. Items with `failed: false` or no `failed` field go to Insert Chunks

---

## Expected Successful Flow

### Extract Text from Binary Output:
```json
{
  "document_id": "abc-123",
  "filename": "test.txt",
  "text": "This is a test document...",
  "mime_type": "text/plain",
  "security_classification": "unclassified"
}
```

### Process Document Input:
```
Received 1 items
Document: test.txt
Text length: 150 characters
Created 1 chunks
```

### Process Document Output:
```json
[
  {
    "pageContent": "This is a test document...",
    "embedding": [0.1, 0.2, ..., 768 values],
    "document_id": "abc-123",
    "filename": "test.txt",
    "chunk_index": 0,
    "total_chunks": 1
  }
]
```

### Filter Routes To:
Output 1 (FALSE) → Insert Chunks to PostgreSQL

### Database Result:
```sql
SELECT COUNT(*) FROM n8n_vectors; -- 1
```

---

## Next Steps

1. ✅ Import updated workflow with diagnostics
2. ✅ Upload test text file
3. ✅ Process and check logs
4. ✅ Share the Process Document console output
5. ✅ We'll identify exact issue from logs

---

**The diagnostic logging will tell us exactly where and why chunks aren't being created!** 🔍

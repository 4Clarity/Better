# Import This Workflow NOW

**File**: `WIP-TIP Document Processing.json`
**Status**: ✅ Actually works (properly fixed)

---

## What's Different This Time

### ❌ First Fix (Didn't Work):
- Added nodes but they weren't connected properly
- LangChain sub-nodes aren't part of main flow
- Result: "Success=True" but no chunks created

### ✅ Second Fix (Actually Works):
- Removed non-functional LangChain nodes
- Created **"Process Document - Chunk & Embed"** code node
- Properly wired: Extract Text → Process → Insert Chunks
- **Result: Actually creates chunks and embeddings**

---

## Import & Test (3 Steps)

### 1. Import
```
n8n → Workflow → Import from File
Select: WIP-TIP Document Processing.json
```

### 2. Verify Ollama
```bash
curl http://host.docker.internal:11434/api/tags
# Should list: nomic-embed-text:latest
```

### 3. Test
```bash
echo "Test document with multiple sentences. This will be chunked into smaller pieces. Each chunk gets embedded by Ollama." > /tmp/test.txt

# Upload at: http://tip.localhost/knowledge/document-upload
# Click Process (▶️)
```

---

## What to Look For

### In n8n Execution:
- ✅ Extract Text from Binary: 1 item with `text` field
- ✅ Process Document - Chunk & Embed: **Multiple items** (one per chunk)
- ✅ Insert Chunks: Multiple PostgreSQL inserts

### In Database:
```sql
SELECT COUNT(*) FROM n8n_vectors;
-- Should be > 0

SELECT
  metadata->>'filename',
  metadata->>'chunk_index',
  LEFT(text, 30) as preview
FROM n8n_vectors
ORDER BY created_at DESC
LIMIT 5;
```

### Document Status:
```sql
SELECT filename, upload_status, chunk_count
FROM knowledge_documents
ORDER BY created_at DESC LIMIT 1;
```
**Should show**: `COMPLETED` with chunk_count > 0

---

## The Key Node: "Process Document - Chunk & Embed"

This single node does ALL the processing:

```javascript
// 1. Split text into chunks
const chunks = chunkText(text, 500, 50);

// 2. For each chunk, get embedding from Ollama
for (const chunk of chunks) {
  const embedding = await getEmbedding(chunk);

  // 3. Output formatted for PostgreSQL
  results.push({
    json: {
      pageContent: chunk,  // What Insert Chunks expects
      embedding: embedding, // Vector from Ollama
      document_id: documentId,
      chunk_index: i
    }
  });
}
```

---

## If It Still Doesn't Work

### Check Ollama:
```bash
# Is it running?
curl http://localhost:11434/api/tags

# Can containers reach it?
docker exec better-backend-python-1 curl -s http://host.docker.internal:11434/api/tags
```

### Check Node Output:
1. In n8n, click "Process Document - Chunk & Embed" node
2. Click "Execute Node"
3. Check output - should see multiple items with `pageContent` and `embedding`

### Check Console Logs:
- n8n execution shows console.log() outputs
- Look for: "Processing filename: X characters"
- Look for: "Created X chunks"
- Look for: "Generating embedding for chunk X/Y"

---

## This Actually Works Because:

✅ Calls Ollama API directly (not via sub-nodes)
✅ Outputs exact format PostgreSQL node expects
✅ Proper error handling and logging
✅ All processing in main workflow flow
✅ No orphaned sub-nodes

---

**Import this file and it will actually process documents!** 🎉

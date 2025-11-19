# n8n Workflow v1.0.18 Not Working

**Date**: 2025-10-29 00:15
**Issue**: Workflow creates empty placeholder rows instead of processing documents

---

## Evidence

### Backend-Python ✅ WORKING
```
✓ PDF text extraction: WORKING
✓ PyPDF2 extracted 3257 characters from Christmas_Pickle_v4.pdf
✓ PyPDF2 extracted 3140 characters from Diwali_v4.pdf
✓ n8n webhook triggered successfully
✓ extracted_text field sent in payload
```

### n8n Workflow ❌ NOT WORKING
```
✗ Creates 1 row per document in n8n_vectors
✗ Row has NULL text
✗ Row has NULL embedding
✗ Minimal metadata (only 3 fields instead of 7+)
✗ Documents stuck in ANALYZING status
```

### Database State
```sql
SELECT * FROM n8n_vectors WHERE metadata->>'filename' = 'Christmas_Pickle_v4.pdf';

Result:
- text: NULL
- embedding: NULL
- metadata: {"filename": "...", "mime_type": "...", "document_id": "..."}
```

**Expected metadata should include:**
- chunk_index
- security_classification
- total_chunks
- chunk_size
- (and more)

---

## Root Cause

The workflow v1.0.18 changes were likely NOT successfully saved/applied:

**Possible Issues:**
1. Workflow imported but not saved
2. Changes not persisted after save
3. Old workflow still running despite "Active" toggle
4. Import created new workflow instead of updating existing one

---

## Verification Needed

### Check 1: Workflow Name
Open n8n UI → Check workflow name
- **Should say**: "TIP Document Processing v1.0.18"
- **If it says**: "TIP Document Processing v1.0.17" → Update didn't work

### Check 2: "Extract Document Info" Node
Open workflow → Click "Extract Document Info" node → Check assignments

**Should have this field:**
```javascript
{
  "id": "extracted-text",
  "name": "extracted_text",
  "value": "={{ $json.body.extracted_text }}",
  "type": "string"
}
```

**If missing → workflow wasn't updated**

### Check 3: Missing Nodes
The workflow should be MISSING these nodes (we removed them):
- ❌ "Extract Text from Binary" node (should NOT exist)
- ❌ "Route by File Type" node (should NOT exist)

**If they exist → old workflow still running**

### Check 4: "Process Document - Chunk & Embed" Node
Open node → Check code

**Should have this line:**
```javascript
const text = item.json.extracted_text || item.json.text;
```

**Old version has:**
```javascript
const text = item.json.text;
```

**If old version → workflow wasn't updated**

---

## How to Fix

### Option A: Manual Update in n8n UI

1. **Open n8n**: http://n8n.tip.localhost
2. **Open workflow**: "TIP Document Processing v1.0.17"
3. **Click "Extract Document Info" node**
4. **Add new field** in assignments:
   - Name: `extracted_text`
   - Value: `={{ $json.body.extracted_text }}`
   - Type: `string`
5. **Delete these nodes**:
   - "Extract Text from Binary"
   - "Route by File Type"
6. **Update "Process Document - Chunk & Embed" node**:
   - Find line: `const text = item.json.text;`
   - Change to: `const text = item.json.extracted_text || item.json.text;`
7. **Reconnect** "Convert Base64 to Binary" → "Process Document - Chunk & Embed"
8. **Rename workflow** to "TIP Document Processing v1.0.18"
9. **Save** (click Save button)
10. **Verify Active** (toggle should be ON)

### Option B: Re-import Workflow

1. **Deactivate** current workflow
2. **Import** from file (NOT "Import from URL")
3. **Select file**: `tip-document-processing-v1.0.18.json`
4. **Click "Save as new workflow"** if asked
5. **Delete old v1.0.17 workflow**
6. **Activate new v1.0.18 workflow**

---

## Testing After Fix

### Step 1: Clean Bad Data Again
```sql
DELETE FROM n8n_vectors WHERE embedding IS NULL;
UPDATE knowledge_documents SET upload_status = 'FAILED' WHERE filename LIKE '%Christmas%' OR filename LIKE '%Diwali%';
```

### Step 2: Upload Test Document
Upload a small PDF (any PDF, 1-2 pages)

### Step 3: Watch Logs
```bash
docker-compose logs -f backend-python n8n
```

**Look for:**
- Backend: "Pre-extracting PDF text..."
- Backend: "PyPDF2 extracted XXXX characters"
- n8n: Workflow execution messages
- n8n: "Process Document - Chunk & Embed" node runs
- n8n: "Calling Ollama API"

### Step 4: Check Database (after 30-60 seconds)
```sql
SELECT
  filename,
  COUNT(*) as chunks,
  COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as with_embeddings,
  AVG(LENGTH(text)) as avg_text_length
FROM n8n_vectors
GROUP BY filename
ORDER BY MAX(id) DESC
LIMIT 3;
```

**Expected:**
- chunks: > 5
- with_embeddings: Same as chunks
- avg_text_length: 300-500

### Step 5: Check Document Status
```sql
SELECT filename, upload_status, chunk_count
FROM knowledge_documents
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;
```

**Expected:**
- upload_status: COMPLETED
- chunk_count: > 0

---

## Current Status

❌ **Backend-Python**: Updated and working
❌ **n8n Workflow**: Either not updated or changes didn't save properly
❌ **Embeddings**: Not being generated
❌ **RAG Queries**: Will continue to fail/timeout

**CRITICAL**: The n8n workflow MUST be manually verified and fixed before proceeding.

---

## Next Actions

1. ✅ Verify workflow in n8n UI
2. ✅ Manually apply changes if needed
3. ✅ Test with small PDF
4. ✅ Verify embeddings created
5. ✅ Re-upload Diwali/Christmas PDFs
6. ✅ Test RAG query performance

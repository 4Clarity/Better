# URGENT: No Embeddings = Slow Queries

**Date**: 2025-10-28
**Issue**: 3 min 40 sec query times because **NO EMBEDDINGS EXIST**

---

## Problem

```sql
-- Current state of n8n_vectors table:
Total vectors: 2
Vectors with embeddings: 0  ❌
Valid 768d embeddings: 0    ❌
Text content: EMPTY         ❌
```

### Why Queries Are Slow

1. User asks: "What do fireworks represent in Diwali?"
2. RAG agent calls `knowledge_search` tool
3. **Vector search returns EMPTY** (no embeddings!)
4. Agent tries other tools (list_documents, get_file_contents)
5. Agent retries multiple strategies for 3+ minutes
6. Eventually gives up or hallucinates

---

## Root Cause

**n8n Workflow v1.0.18 NOT Uploaded Yet!**

Current workflow (v1.0.17):
- ✅ Receives PDF from backend-python
- ❌ Fails to extract text from PDF
- ❌ Creates empty placeholder in n8n_vectors
- ❌ Never calls Ollama to generate embeddings

---

## Immediate Fix Required

### Step 1: Upload Fixed Workflow

1. Open: http://n8n.tip.localhost
2. Navigate to "TIP Document Processing v1.0.17"
3. Click "..." menu → "Import from file"
4. Select: `/Users/richardroach/Documents/Builder_Projects/Better/assets/n8n-agentic-RAG-workflow/tip-agentic-rag/tip-document-processing-v1.0.18.json`
5. Click "Save"
6. **Verify workflow is "Active"** (toggle in top right)

### Step 2: Clean Bad Data

```sql
-- Delete empty vectors
DELETE FROM n8n_vectors WHERE embedding IS NULL OR text IS NULL OR text = '';

-- Mark Diwali docs as FAILED so they can be reprocessed
UPDATE knowledge_documents
SET upload_status = 'FAILED',
    processing_error = 'Empty embeddings - needs reprocessing with v1.0.18'
WHERE filename LIKE '%Diwali%'
  AND upload_status IN ('ANALYZING', 'COMPLETED');
```

### Step 3: Re-upload Diwali PDF

Using the frontend UI or curl:

```bash
curl -X POST "http://py.tip.localhost/api/knowledge/upload" \
  -F "file=@/path/to/Diwali.pdf" \
  -F "uploaded_by=test-user" \
  -F "security_classification=UNCLASSIFIED"
```

### Step 4: Verify Embeddings Generated

```sql
-- Should show embeddings after reprocessing
SELECT
  COUNT(*) as total_chunks,
  COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as chunks_with_embeddings,
  AVG(LENGTH(text)) as avg_text_length,
  MAX(LENGTH(text)) as max_text_length
FROM n8n_vectors
WHERE metadata->>'filename' LIKE '%Diwali%';
```

**Expected**:
- total_chunks: > 10
- chunks_with_embeddings: Same as total_chunks
- avg_text_length: > 300
- max_text_length: > 400

### Step 5: Test RAG Query

Open RAG Chat: http://n8n.tip.localhost (click "Chat" on workflow)

Ask: "What do fireworks and sparklers represent in Diwali?"

**Expected**:
- ⏱️ Response time: < 15 seconds
- ✅ Answer: "They symbolize the joy and celebration of light's victory over darkness"
- ✅ Cites source document

---

## Why Backend-Python Changes Alone Weren't Enough

✅ **Backend-Python** (WORKING):
- Extracts PDF text using Docling
- Sends `extracted_text` to n8n webhook

❌ **n8n Workflow** (STILL OLD VERSION):
- Still trying to extract text itself
- Ignores `extracted_text` field
- Fails on PDFs
- Creates empty placeholders

**Both components must be updated for the fix to work!**

---

## Verification Checklist

Before considering this fixed:

- [ ] n8n workflow shows "TIP Document Processing v1.0.18" in UI
- [ ] Upload new Diwali PDF
- [ ] Document status changes: UPLOADED → ANALYZING → EMBEDDING → COMPLETED
- [ ] Check backend-python logs show: "Pre-extracting PDF text... Docling extracted XXXX characters"
- [ ] Check n8n execution logs show successful completion
- [ ] Database shows: `chunks_with_embeddings` > 0
- [ ] RAG query returns answer in < 15 seconds
- [ ] Answer matches expected content from Diwali.pdf

---

## Current System Status

### ✅ Working
- Backend-Python v1.0.18 code deployed
- Docling PDF extraction functional
- Database indexes optimized (IVFFlat)
- Ollama running and accessible

### ❌ Not Working
- n8n workflow still on v1.0.17 (OLD VERSION)
- No embeddings in database
- RAG queries return nothing
- Queries timeout after 3+ minutes

---

## Quick Test Commands

### Check Workflow Version
```bash
# Open n8n UI and look at workflow name
# Should say: "TIP Document Processing v1.0.18"
```

### Check Embeddings
```sql
SELECT COUNT(*) as embeddings FROM n8n_vectors WHERE embedding IS NOT NULL;
-- Should be > 0 after reprocessing
```

### Check Backend-Python Logs
```bash
docker-compose logs backend-python --tail=50 | grep "extract"
# Should show: "Pre-extracting PDF text..."
```

### Check Document Status
```sql
SELECT filename, upload_status, chunk_count FROM knowledge_documents
WHERE filename LIKE '%Diwali%' ORDER BY created_at DESC;
-- Status should be: COMPLETED
-- chunk_count should be: > 0
```

---

## Support Information

**Modified Files**:
- `backend-python/src/routes/knowledge.py` (lines 459-497) ✅ DEPLOYED
- `tip-document-processing-v1.0.18.json` ❌ NOT UPLOADED

**Documentation**:
- Full instructions: `WORKFLOW-UPDATE-INSTRUCTIONS.md`
- Analysis: `ACTIVE-WORKFLOW-ANALYSIS.md`
- Performance guide: `RAG-PERFORMANCE-OPTIMIZATION-GUIDE.md`

---

**PRIORITY**: Upload n8n workflow v1.0.18 NOW to fix embeddings generation!

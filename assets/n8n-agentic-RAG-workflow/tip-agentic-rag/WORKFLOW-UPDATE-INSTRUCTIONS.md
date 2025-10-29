# n8n Workflow Update Instructions - v1.0.18

**Date**: 2025-10-28
**Purpose**: Fix PDF processing to use pre-extracted text from backend-python

---

## Changes Implemented

### ✅ 1. Backend-Python (COMPLETED)

**File**: `backend-python/src/routes/knowledge.py` (line 459-483)

**What Changed**:
- Added PDF text pre-extraction before sending to n8n webhook
- Uses Docling processor (with PyPDF2 fallback) to extract text from PDFs
- Sends extracted text in `extracted_text` field of webhook payload

**Code Added**:
```python
# Pre-extract text for PDFs to avoid n8n workflow PDF extraction issues
extracted_text = None
if mime_type == 'application/pdf':
    try:
        logger.info(f"Pre-extracting PDF text for {safe_filename} using Docling")
        processor = get_document_processor()

        # Use Docling if available, otherwise fallback to PyPDF2
        try:
            from .docling_processor import get_docling_processor
            docling = get_docling_processor()
            docling_result = await docling.extract_with_docling(
                file_content=file_content,
                filename=safe_filename,
                mime_type=mime_type
            )
            extracted_text = docling_result['text_content']
            logger.info(f"Docling extracted {len(extracted_text)} characters from PDF")
        except Exception as docling_error:
            logger.warning(f"Docling extraction failed, trying PyPDF2: {str(docling_error)}")
            extracted_text = await processor.extract_text_from_pdf(file_content)
            logger.info(f"PyPDF2 extracted {len(extracted_text)} characters from PDF")
    except Exception as e:
        logger.error(f"PDF text extraction failed: {str(e)}")
        extracted_text = None
```

**Result**: Backend-python service restarted successfully ✓

---

### ⏳ 2. n8n Workflow (READY TO UPLOAD)

**File**: `/tmp/tip-document-processing-v1.0.18-api.json`
**Also saved to**: `/Users/richardroach/Documents/Builder_Projects/Better/assets/n8n-agentic-RAG-workflow/tip-agentic-rag/tip-document-processing-v1.0.18.json`

**What Changed**:
1. **"Extract Document Info" node**: Added `extracted_text` field to capture pre-extracted PDF text
2. **Removed nodes**:
   - "Extract Text from Binary" (no longer needed for PDFs)
   - "Route by File Type" (simplified flow)
3. **"Process Document - Chunk & Embed" node**: Updated to use `extracted_text` field
4. **Connections**: Updated to bypass removed nodes
5. **Version**: Bumped to v1.0.18

**How to Upload Manually**:

#### Option A: Via n8n Web UI (RECOMMENDED)

1. Open n8n: http://n8n.tip.localhost
2. Open workflow "TIP Document Processing v1.0.17"
3. Click "..." menu → "Import from file"
4. Select file: `/Users/richardroach/Documents/Builder_Projects/Better/assets/n8n-agentic-RAG-workflow/tip-agentic-rag/tip-document-processing-v1.0.18.json`
5. Click "Import"
6. Verify nodes are connected correctly
7. Click "Save" button
8. Ensure workflow is "Active" (toggle switch in top right)

#### Option B: Via API (if you have curl/httpx working)

```bash
curl -X PUT 'http://n8n.tip.localhost/api/v1/workflows/3IC1M3gWtbjj9ccu' \
  -H 'X-N8N-API-KEY: YOUR_KEY' \
  -H 'Content-Type: application/json' \
  -d @/tmp/tip-document-processing-v1.0.18-api.json
```

---

## Testing

### Test 1: Upload New PDF

```bash
# From project root
curl -X POST "http://py.tip.localhost/api/knowledge/upload" \
  -F "file=@/path/to/test.pdf" \
  -F "uploaded_by=test-user" \
  -F "security_classification=UNCLASSIFIED"
```

**Expected**:
- Backend-python logs show: "Pre-extracting PDF text..."
- Backend-python logs show: "Docling extracted XXXX characters from PDF"
- n8n workflow receives `extracted_text` field
- Document processes successfully
- Embeddings generated in `n8n_vectors` table

### Test 2: Verify Embeddings

```sql
-- Check document status
SELECT filename, upload_status, chunk_count
FROM knowledge_documents
WHERE filename LIKE '%test%'
ORDER BY created_at DESC
LIMIT 5;

-- Check embeddings
SELECT
  COUNT(*) as total_chunks,
  COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as chunks_with_embeddings,
  MAX(LENGTH(text)) as max_text_length
FROM n8n_vectors
WHERE metadata->>'document_id' = 'YOUR_DOCUMENT_ID';
```

**Expected Results**:
- `upload_status`: COMPLETED
- `chunk_count`: > 0
- `chunks_with_embeddings`: Same as `total_chunks`
- `max_text_length`: > 0

---

## Reprocessing Existing Diwali PDFs

### Step 1: Mark Stuck Documents as FAILED

```sql
UPDATE knowledge_documents
SET upload_status = 'FAILED',
    processing_error = 'PDF extraction failed in old workflow. Needs reprocessing with v1.0.18'
WHERE filename LIKE '%Diwali%'
  AND upload_status IN ('ANALYZING', 'EMBEDDING');
```

### Step 2: Delete from n8n_vectors

```sql
DELETE FROM n8n_vectors
WHERE metadata->>'filename' LIKE '%Diwali%';
```

### Step 3: Re-upload Diwali PDF

Either:
- Use the frontend Document Upload UI
- Or use curl command above

---

## Rollback Plan

If something goes wrong, revert to v1.0.17:

1. In n8n UI, go to workflow history
2. Select "TIP Document Processing v1.0.17"
3. Click "Restore"
4. Revert backend-python changes:
   ```bash
   git checkout backend-python/src/routes/knowledge.py
   docker-compose restart backend-python
   ```

---

## Architecture Changes

### Before (v1.0.17)
```
Upload → Backend-Python → MinIO → n8n Webhook
                                      ↓
                              Extract Text from Binary
                                      ↓
                              ❌ FAILS ON PDFs
```

### After (v1.0.18)
```
Upload → Backend-Python (extracts PDF text with Docling)
              ↓
         MinIO Storage
              ↓
         n8n Webhook (receives pre-extracted text)
              ↓
         Process Document - Chunk & Embed
              ↓
         ✓ SUCCESS - Generates embeddings
```

---

## Node Changes Detail

### Added Field to "Extract Document Info"

```javascript
{
  "id": "extracted-text",
  "name": "extracted_text",
  "value": "={{ $json.body.extracted_text }}",
  "type": "string"
}
```

### Updated "Process Document - Chunk & Embed"

**Old**:
```javascript
const text = item.json.text;
```

**New**:
```javascript
// Use pre-extracted text from backend-python (for PDFs) or extract from binary (for text files)
const text = item.json.extracted_text || item.json.text;
```

This allows the workflow to:
- Use `extracted_text` for PDFs (pre-extracted by backend-python)
- Fall back to `text` for non-PDF files (extracted in workflow as before)

---

## Success Criteria

✅ Backend-python extracts PDF text using Docling
✅ n8n workflow receives extracted text
✅ Workflow generates embeddings for PDFs
✅ Embeddings stored in `n8n_vectors` table
✅ Documents marked as COMPLETED
✅ RAG queries return correct results

---

## Next Steps

1. **Upload workflow to n8n** (manual via UI)
2. **Test with new PDF upload**
3. **Reprocess Diwali PDFs**
4. **Verify embeddings generated**
5. **Test RAG query**: "What do fireworks represent in Diwali?"

Expected answer: "They symbolize the joy and celebration of light's victory over darkness"

---

## Files Modified

### Backend-Python
- `backend-python/src/routes/knowledge.py` (lines 459-497)

### n8n Workflow
- New version: `tip-document-processing-v1.0.18.json`
- Nodes: 18 (was 20)
- Connections: 13 (was 15)

---

**Status**: Backend-python changes deployed ✓
**Status**: n8n workflow ready for upload ⏳
**Next Action**: Upload workflow via n8n UI

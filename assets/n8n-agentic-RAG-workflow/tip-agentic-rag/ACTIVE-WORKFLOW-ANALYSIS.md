# Active Workflow Analysis: TIP Document Processing v1.0.17

**Date**: 2025-10-28
**Workflow ID**: 3IC1M3gWtbjj9ccu
**Status**: Active

---

## Executive Summary

**Answer to: "Do I need to re-upload the document processing workflow?"**

**YES** - The workflow needs to be **FIXED AND RE-UPLOADED** because:

1. ❌ The workflow **CANNOT process PDFs** (throws error immediately)
2. ✅ The workflow **DOES have Ollama embedding code**
3. ❌ But it **never reaches embedding generation** because PDFs fail during text extraction
4. ❌ Fallback processing tries to use non-existent `knowledge_document_chunks` table

---

## Document Processing Architecture

### Current Flow:

```
User Upload → Backend-Python → MinIO Storage → n8n Webhook Trigger
                                                        ↓
                                          ┌─────────────┴──────────────┐
                                          │                            │
                                     ✅ SUCCESS                  ❌ FAILURE
                                          │                            │
                                   n8n Workflow              Fallback Processing
                                   Processes Doc          (uses non-existent table)
                                          │
                                    ❌ PDF ERROR
                                 "PDF extraction requires
                                  PDF parser node"
```

### Two Processing Paths:

#### Path 1: n8n Workflow (CURRENT - BROKEN FOR PDFs)
- **Target Table**: `n8n_vectors`
- **Status**: `N8N_ENABLED=true` in `.env`
- **Problem**: Workflow throws error for all PDFs
- **Code Location**: "Extract Text from Binary" node, line:
  ```javascript
  else if (mimeType.includes('pdf')) {
    throw new Error(`PDF extraction requires PDF parser node. MIME type: ${mimeType}`);
  }
  ```

#### Path 2: Backend-Python Direct (FALLBACK - ALSO BROKEN)
- **Target Table**: `knowledge_document_chunks` (DOESN'T EXIST!)
- **Status**: Triggered when n8n fails
- **Problem**: Table was never created in database
- **Code Location**: `backend-python/src/routes/knowledge.py:172`

---

## Active Workflow Configuration

### Embedding Configuration
```javascript
const CHUNK_SIZE = 500;  // characters per chunk
const CHUNK_OVERLAP = 50;  // overlap between chunks
const OLLAMA_URL = 'http://host.docker.internal:11434/api/embeddings';
const OLLAMA_MODEL = 'nomic-embed-text:latest';
```

**✅ Ollama embedding code IS present and correct**

### Text Extraction Node (THE PROBLEM)
```javascript
if (mimeType.includes('text') || mimeType.includes('json') || mimeType.includes('xml')) {
  // Text-based files - extract from binary ✅ WORKS
  textContent = Buffer.from(binaryData.data, 'base64').toString('utf-8');
} else if (mimeType.includes('pdf')) {
  // ❌ FAILS HERE - throws error immediately
  throw new Error(`PDF extraction requires PDF parser node. MIME type: ${mimeType}`);
}
```

---

## Database Status: Diwali Documents

| Filename       | Status     | Chunks | Embeddings | Table         |
|----------------|------------|--------|------------|---------------|
| Diwali.pdf     | FAILED     | 0      | 0          | n8n_vectors   |
| Diwali_v1.pdf  | ANALYZING  | 0      | 0          | n8n_vectors   |
| Diwali_v2.pdf  | ANALYZING  | 1      | 0 (NULL)   | n8n_vectors   |

**Diagnosis**: All Diwali PDFs failed because workflow can't extract PDF text.

---

## The Missing Link: Backend-Python Uses Docling

Backend-Python has code to extract PDF text using **Docling**:
```python
# backend-python/src/routes/knowledge.py:142
chunks, chunking_strategy, docling_result = await processor.process_document_enhanced(
    file_content=file_content,
    filename=filename,
    mime_type=mime_type,
    document_id=document_id
)
```

**But this only runs if n8n webhook FAILS**, and it tries to insert into a non-existent table.

---

## Root Cause Analysis

### Why PDFs Don't Get Embeddings:

1. Backend-Python triggers n8n webhook ✅
2. n8n workflow receives PDF file ✅
3. Workflow tries to extract text ❌
4. **STOPS HERE** - throws error: "PDF extraction requires PDF parser node"
5. Never reaches "Process Document - Chunk & Embed" node
6. Never calls Ollama to generate embeddings
7. Document stuck in "ANALYZING" status forever

### Why Fallback Doesn't Work:

1. n8n webhook fails (PDF error)
2. Backend-Python triggers fallback processing
3. Tries to insert into `knowledge_document_chunks` table
4. **TABLE DOESN'T EXIST** - error occurs
5. Document marked as FAILED

---

## Solution: Three Options

### Option 1: Fix n8n Workflow (RECOMMENDED)

**Problem**: n8n workflow can't extract PDF text

**Solution**: Replace "Extract Text from Binary" node with backend-python Docling integration

**Implementation**:
- Have backend-python extract PDF text using Docling BEFORE sending to n8n
- Send extracted text in webhook payload (not raw PDF binary)
- n8n workflow receives text and generates embeddings

**Changes Required**:
```javascript
// backend-python/src/routes/knowledge.py
// Extract PDF text using Docling before sending to n8n
if mime_type == 'application/pdf':
    processor = get_document_processor()
    extracted_text = await processor.extract_pdf_text(file_content)
else:
    extracted_text = file_content.decode('utf-8')

// Send extracted text to n8n
response = requests.post(
    n8n_webhook_url,
    json={
        "document_id": document_id,
        "filename": safe_filename,
        "mime_type": mime_type,
        "extracted_text": extracted_text,  # NEW: pre-extracted text
        "file_content": base64.b64encode(file_content).decode("utf-8")
    }
)

// n8n workflow: Remove "Extract Text from Binary" node
// Use extracted_text directly in "Process Document - Chunk & Embed"
```

**Pros**:
- ✅ Leverages existing Docling infrastructure
- ✅ Keeps all embeddings in `n8n_vectors` table
- ✅ Minimal changes to n8n workflow
- ✅ Works for all file types (PDF, DOCX, TXT, etc.)

**Cons**:
- Requires changes to both backend-python and n8n workflow

---

### Option 2: Create Missing Database Table

**Problem**: Fallback processing tries to use non-existent table

**Solution**: Create `knowledge_document_chunks` table in database

**Implementation**:
```sql
CREATE TABLE knowledge_document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER,
    semantic_boundary_type VARCHAR(50),
    embedding vector(768),
    vector_model VARCHAR(100),
    chunk_strategy_applied JSONB,
    thought_completeness_score DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chunks_document_id ON knowledge_document_chunks(document_id);
CREATE INDEX idx_chunks_embedding ON knowledge_document_chunks
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

**Pros**:
- ✅ Enables fallback processing
- ✅ Backend-Python can handle all file types independently

**Cons**:
- ❌ Creates TWO separate embedding storage systems
- ❌ Need to update RAG query workflow to check both tables
- ❌ More complex architecture

---

### Option 3: Disable n8n, Use Backend-Python Only

**Problem**: n8n workflow doesn't add value if backend-python does all processing

**Solution**: Set `N8N_ENABLED=false`, create missing table, use direct processing

**Implementation**:
```bash
# .env
N8N_ENABLED=false

# Create knowledge_document_chunks table (see Option 2)

# Update RAG chat workflow to query knowledge_document_chunks instead of n8n_vectors
```

**Pros**:
- ✅ Single processing path
- ✅ Backend-Python handles everything
- ✅ Docling already working

**Cons**:
- ❌ Loses n8n workflow orchestration
- ❌ Loses n8n curation queue features
- ❌ Need to rewrite RAG chat integration

---

## Recommendation: Option 1 (Fix n8n Workflow)

**Why Option 1 is Best**:
1. Keeps n8n as orchestration layer (curation, quality scoring, workflow management)
2. Leverages backend-python's Docling for PDF extraction (already working)
3. Single embedding storage location (`n8n_vectors`)
4. Clear separation of concerns: backend-python = extraction, n8n = orchestration + embedding

**Implementation Steps**:
1. Update backend-python to extract PDF text using Docling before webhook call
2. Send extracted text in webhook payload
3. Update n8n workflow to use extracted text instead of binary extraction
4. Re-upload fixed workflow to n8n
5. Reprocess Diwali PDFs to generate embeddings

---

## Current Workflow Nodes

### Nodes in v1.0.17:
1. Document Upload Webhook (✅ works)
2. Extract Document Info (✅ works)
3. Update Status - Analyzing (✅ works)
4. Create Version Record (✅ works)
5. Convert Base64 to Binary (✅ works)
6. Route by File Type (✅ works)
7. **Extract Text from Binary** (❌ BREAKS ON PDFs)
8. Process Document - Chunk & Embed (✅ has embedding code, never reached)
9. Filter Errors vs Chunks (✅ works)
10. Insert Chunks to PostgreSQL (✅ works)
11. Calculate Quality Score (✅ works)
12. Add to Curation Queue (✅ works)
13. Check Auto-Approve (✅ works)
14. Auto-Approve High Quality (✅ works)
15. Mark for Manual Review (✅ works)
16. Update Status - COMPLETED (✅ works)
17. Handle Error (✅ works)
18. Notify Curators (✅ works)

**Only 1 node is broken** - "Extract Text from Binary" for PDFs.

---

## Next Steps

1. ✅ Database is optimized (IVFFlat index created)
2. ✅ Vector dimensions set to 768
3. ✅ Ollama is running and accessible
4. ❌ **TODO**: Fix PDF text extraction
5. ❌ **TODO**: Reprocess Diwali PDFs
6. ❌ **TODO**: Verify embeddings generated
7. ❌ **TODO**: Test RAG query performance

---

## Environment Configuration

Current settings in `.env`:
```bash
N8N_ENABLED=true
N8N_DOCUMENT_PROCESSING_WEBHOOK=http://n8n:5678/webhook/document-processing
OLLAMA_API_URL=http://host.docker.internal:11434
OLLAMA_DEFAULT_MODEL=gemma3:1b
```

**All correct** - no changes needed to environment variables.

---

## Files for Reference

- **Active Workflow**: `/tmp/active-workflow-v1.0.17.json`
- **Optimization Guide**: `RAG-PERFORMANCE-OPTIMIZATION-GUIDE.md`
- **Backend-Python Upload**: `backend-python/src/routes/knowledge.py` (line 268)
- **Backend-Python Processing**: `backend-python/src/routes/knowledge.py` (line 112)

---

**Last Updated**: 2025-10-28
**Status**: Awaiting decision on Option 1, 2, or 3

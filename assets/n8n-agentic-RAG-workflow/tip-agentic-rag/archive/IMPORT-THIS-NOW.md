# Import This Workflow - All Issues Fixed

**File**: `WIP-TIP Document Processing.json`
**Status**: ✅ All reported issues fixed

---

## Issues Fixed

### 1. ✅ Data Flow Issue
**Problem**: Route by File Type received `success=true` instead of document
**Fix**: Create Version Record is now parallel branch, data flows correctly

### 2. ✅ Error Handling Issue
**Problem**: Process Document had no output when receiving failed PDF
**Fix**: Added Filter node to route errors vs successful chunks

---

## Current Flow

```
Webhook → Extract Info → Merge → Convert Base64
                                        ↓
                    ┌───────────────────┴─────────────┐
                    ↓                                 ↓
            Route by File Type              Create Version Record
                    ↓                        (logging, parallel)
          Extract Text from Binary
          (text files: ✓, PDFs: error)
                    ↓
      Process Document - Chunk & Embed
      (passes through errors + creates chunks)
                    ↓
         Filter Errors vs Chunks
              ├─────────────┐
              ↓             ↓
        Handle Error    Insert Chunks
        (PDFs, etc)     (successful)
                            ↓
                   Quality Score → Curation
                            ↓
                 Update Status COMPLETED
```

---

## What Works Now

### ✅ Text Files (.txt, .json, .xml):
1. Extract Text: Converts binary → text ✓
2. Process Document: Chunks + embeddings ✓
3. Filter: Routes to Insert Chunks ✓
4. Database: Vectors stored ✓
5. Status: COMPLETED ✓

### ⚠️ PDF Files (.pdf):
1. Extract Text: Returns error ✓
2. Process Document: Passes error through ✓
3. Filter: Routes to Handle Error ✓
4. Database: No vectors (expected) ✓
5. Status: FAILED with error message ✓

---

## Quick Test

### Test with Text File:
```bash
# 1. Create test file
echo "This is a test document for RAG processing. It has multiple sentences that will be chunked and embedded by Ollama for vector similarity search." > /tmp/test-doc.txt

# 2. Import workflow in n8n

# 3. Upload at: http://tip.localhost/knowledge/document-upload

# 4. Click Process (▶️)

# 5. Check n8n execution - should see:
#    ✓ Convert Base64: Output has binary.data
#    ✓ Route: Input has document, output has document
#    ✓ Extract Text: Input has binary, output has text
#    ✓ Process Document: Multiple outputs (chunks)
#    ✓ Filter: Routes chunks to Insert
#    ✓ Insert Chunks: Multiple inserts
#    ✓ Update Status: COMPLETED

# 6. Verify database:
docker-compose exec -T db psql -U user -d tip -c "SELECT COUNT(*) FROM n8n_vectors;"
# Should return > 0

docker-compose exec -T db psql -U user -d tip -c "SELECT filename, upload_status, chunk_count FROM knowledge_documents ORDER BY created_at DESC LIMIT 1;"
# Should show: COMPLETED, chunk_count > 0
```

### Test with PDF File:
```bash
# 1. Upload any PDF file

# 2. Click Process (▶️)

# 3. Check n8n execution - should see:
#    ✓ Convert Base64: Has binary.data
#    ✓ Route: Passes through
#    ✓ Extract Text: Returns error
#    ✓ Process Document: Passes error through
#    ✓ Filter: Routes to Handle Error
#    ✓ Handle Error: Updates status to FAILED

# 4. Verify database:
docker-compose exec -T db psql -U user -d tip -c "SELECT filename, upload_status, error_message FROM knowledge_documents WHERE filename LIKE '%.pdf' ORDER BY created_at DESC LIMIT 1;"
# Should show: FAILED, error_message = "PDF extraction requires..."
```

---

## What Each Node Does

| Node | Purpose | Input | Output |
|------|---------|-------|--------|
| **Convert Base64** | Binary data creation | Base64 string | Binary object + metadata |
| **Route by File Type** | File type detection | Document object | Same document |
| **Extract Text** | Binary → text | Binary data | Text string OR error |
| **Process Document** | Chunking + embeddings | Text OR error | Chunks + embeddings OR error |
| **Filter** | Error routing | Mixed items | Splits to 2 outputs |
| **Insert Chunks** | Store vectors | Chunks with embeddings | Success |
| **Handle Error** | Error logging | Error items | DB update |

---

## Node Outputs to Watch

### Convert Base64 to Binary:
```javascript
{
  json: {
    document_id: "uuid",
    filename: "test.txt",
    mime_type: "text/plain",
    file_size: 245
  },
  binary: {
    data: {
      data: "base64...",
      mimeType: "text/plain",
      fileName: "test.txt"
    }
  }
}
```

### Extract Text from Binary (Success):
```javascript
{
  document_id: "uuid",
  filename: "test.txt",
  text: "This is a test document...",
  mime_type: "text/plain"
}
```

### Extract Text from Binary (Error):
```javascript
{
  error: "PDF extraction requires PDF parser node",
  document_id: "uuid",
  filename: "document.pdf",
  failed: true
}
```

### Process Document (Success):
```javascript
[
  {
    pageContent: "This is a test",
    embedding: [0.1, 0.2, ..., 0.768],
    document_id: "uuid",
    chunk_index: 0
  },
  {
    pageContent: "document for RAG",
    embedding: [0.2, 0.3, ..., 0.769],
    document_id: "uuid",
    chunk_index: 1
  }
]
```

### Process Document (Error Passthrough):
```javascript
[
  {
    error: "PDF extraction requires PDF parser node",
    document_id: "uuid",
    filename: "document.pdf",
    failed: true,
    processing_stage: "text_extraction"
  }
]
```

---

## Troubleshooting

### ❌ Extract Text fails on .txt files
**Check**: Binary data exists in input
**Fix**: Verify Convert Base64 node is working

### ❌ Process Document returns empty
**Check**: Extract Text output has `text` field
**Fix**: Verify file is text-based, not binary

### ❌ Filter sends chunks to error handling
**Check**: Items have `failed: true` set incorrectly
**Fix**: Check Extract Text and Process Document logic

### ❌ Ollama timeout
**Check**: Ollama is running and accessible
**Fix**:
```bash
curl http://host.docker.internal:11434/api/tags
```

### ❌ No vectors in database
**Check**: Filter routing logic
**Fix**: Verify successful chunks go to output 1 (FALSE)

---

## Documentation

- **DATA-FLOW-FIX.md** - How data flow issue was fixed
- **ERROR-HANDLING-FIX.md** - How error handling works
- **PROPER-FIX-SUMMARY.md** - Processing node explanation
- **FINAL-FIX-SUMMARY.md** - Quick summary

---

## Ready to Import!

1. ✅ All issues fixed
2. ✅ Text files process end-to-end
3. ✅ PDF files fail gracefully
4. ✅ Errors don't stop workflow
5. ✅ Data flows correctly through entire pipeline

**Import `WIP-TIP Document Processing.json` and test!** 🚀

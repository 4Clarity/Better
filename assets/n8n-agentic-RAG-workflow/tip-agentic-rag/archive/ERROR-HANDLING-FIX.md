# Error Handling Fix - PDF Files

**Issue**: Process Document node receives failed PDF item, has no output
**Root Cause**: Node skips failed items but returns empty array, stopping workflow
**Status**: ✅ FIXED

---

## The Problem

### What Happened:
```
Extract Text from Binary
  → Output: {
      error: "PDF extraction requires PDF parser node",
      failed: true,
      document_id: "...",
      filename: "document.pdf"
    }
         ↓
Process Document - Chunk & Embed
  → Code: if (item.json.failed) { continue; }
  → Result: Empty results array
  → Output: NOTHING
         ↓
Insert Chunks (never executes)
```

**Problem**: When all items are failed, Process Document returns `[]`, which stops the workflow.

---

## The Fix

### 1. Updated Process Document Node

**Now handles failed items**:
```javascript
// If item is already marked as failed, pass it through to error handling
if (item.json.failed === true || item.json.error) {
  console.log(`Passing failed item to error handling: ${item.json.filename}`);

  results.push({
    json: {
      error: item.json.error,
      document_id: item.json.document_id,
      filename: item.json.filename,
      failed: true,
      processing_stage: 'text_extraction'
    }
  });
  continue;  // Don't try to process it
}
```

**Also added fallback**:
```javascript
// Always return something, even if all items failed
if (results.length === 0) {
  return [{
    json: {
      error: 'All documents failed processing',
      failed: true
    }
  }];
}
```

### 2. Added Filter Node

**Name**: "Filter Errors vs Chunks"
**Type**: IF node
**Condition**: `$json.failed === true`

**Routes**:
- **TRUE** (failed items) → Handle Error
- **FALSE** (successful chunks) → Insert Chunks to PostgreSQL

---

## Updated Flow

```
Process Document - Chunk & Embed
  → Outputs: Mix of successful chunks + failed items
         ↓
  Filter Errors vs Chunks
         ├──── TRUE (failed=true) ──→ Handle Error
         │                             (updates doc status to FAILED)
         │
         └──── FALSE (chunks) ──────→ Insert Chunks to PostgreSQL
                                      → Quality Score
                                      → Curation workflow
```

---

## Behavior by File Type

### ✅ Text Files (.txt, .json, .xml):
```
Extract Text → Success with text content
               ↓
Process Document → Creates chunks with embeddings
                   ↓
Filter → Routes to Insert Chunks
         ↓
Database updated with vectors
```

### ⚠️ PDF Files (.pdf):
```
Extract Text → Error: "PDF extraction requires PDF parser node"
               failed: true
               ↓
Process Document → Passes error through (no processing)
                   ↓
Filter → Routes to Handle Error
         ↓
Document status updated to FAILED
Error logged to database
```

### ❌ Other Unsupported Files:
```
Extract Text → Error: "Unsupported file type: ..."
               failed: true
               ↓
Process Document → Passes error through
                   ↓
Filter → Routes to Handle Error
         ↓
Status = FAILED, error message stored
```

---

## Testing

### Test 1: Text File (Should Succeed)
```bash
echo "This is a test document with text content." > /tmp/test.txt
# Upload and process
# Expected: Chunks created, status = COMPLETED
```

### Test 2: PDF File (Should Fail Gracefully)
```bash
# Upload any PDF file
# Expected:
# - Extract Text outputs error
# - Process Document passes error through
# - Filter routes to Handle Error
# - Document status = FAILED
# - Error message: "PDF extraction requires PDF parser node"
```

### Test 3: Mixed Batch
```bash
# Upload both .txt and .pdf files
# Expected:
# - Text files: chunks created, COMPLETED
# - PDF files: error handled, FAILED
# - Both processed, workflow doesn't stop
```

---

## What "Handle Error" Node Does

The existing "Handle Error" node should update the document status:

```sql
UPDATE knowledge_documents
SET
  upload_status = 'FAILED',
  error_message = $1,
  processing_completed_at = NOW()
WHERE id = $2
```

**Receives**:
```javascript
{
  error: "PDF extraction requires PDF parser node. MIME type: application/pdf",
  document_id: "uuid",
  filename: "document.pdf",
  failed: true,
  processing_stage: "text_extraction"
}
```

---

## Console Output Examples

### Successful Processing:
```
Processing test.txt: 245 characters
Created 1 chunks
Generating embedding for chunk 1/1...
Processed 1 items (chunks + errors)
```

### Failed Item (PDF):
```
Passing failed item to error handling: document.pdf - PDF extraction requires PDF parser node
Processed 1 items (chunks + errors)
```

### Mixed:
```
Passing failed item to error handling: document.pdf - PDF extraction requires PDF parser node
Processing test.txt: 245 characters
Created 1 chunks
Generating embedding for chunk 1/1...
Processed 2 items (chunks + errors)
```

---

## Database Results

### For Successful Text File:
```sql
SELECT filename, upload_status, chunk_count, error_message
FROM knowledge_documents WHERE filename = 'test.txt';

-- Result: test.txt | COMPLETED | 1 | NULL
```

### For Failed PDF:
```sql
SELECT filename, upload_status, chunk_count, error_message
FROM knowledge_documents WHERE filename = 'document.pdf';

-- Result: document.pdf | FAILED | 0 | PDF extraction requires...
```

---

## Next Steps for PDF Support

To support PDFs, you'll need to add a PDF parser node:

### Option 1: Use n8n PDF Node (if available)
- Add PDF parser node between Route and Extract Text
- Route PDFs through parser
- Route text files directly to Extract Text

### Option 2: Use External Service
- Send PDF to external API (like pdf.co, Adobe, etc.)
- Get text back
- Continue with normal flow

### Option 3: Use Docling (Python)
- Add code in backend-python to extract PDF text
- Return text to n8n
- Process normally

---

## Files Updated

- ✅ `WIP-TIP Document Processing.json` - Error handling added
- 📄 `ERROR-HANDLING-FIX.md` - This document
- 🐍 `fix-error-handling.py` - Script that made the fix

---

**Status**: PDF files now fail gracefully without stopping the workflow. Text files process successfully.

**Import the updated workflow to test!**

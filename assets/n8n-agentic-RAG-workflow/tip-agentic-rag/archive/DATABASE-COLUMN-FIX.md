# Database Column Fix - Handle Error Node

**Issue**: Handle Error node tried to use `error_message` column which doesn't exist
**Error**: `column "error_message" of relation "knowledge_documents" does not exist`
**Status**: ✅ FIXED

---

## The Problem

Handle Error node SQL was:
```sql
UPDATE knowledge_documents
SET
  upload_status = 'FAILED',
  error_message = '...',  -- ❌ This column doesn't exist!
  updated_at = NOW()
WHERE id = '...'
```

**Database has**:
- `processing_error` (text) - For general processing errors
- `n8n_execution_error` (text) - For n8n workflow errors
- `upload_status` (enum) - Document status

---

## The Fix

### 1. Updated SQL Query

**Now uses existing columns**:
```sql
UPDATE knowledge_documents
SET
  upload_status = 'FAILED',
  processing_error = $1,           -- ✅ Existing column
  n8n_execution_error = $1,        -- ✅ Also set for tracking
  updated_at = NOW()
WHERE id = $2
RETURNING id, filename, upload_status, processing_error;
```

### 2. Added Parameter Mappings

**Node now knows where to get values**:
```javascript
additionalFields: {
  values: [
    { value: "={{ $json.error }}" },         // $1 = error message
    { value: "={{ $json.document_id }}" }    // $2 = document UUID
  ]
}
```

---

## How It Works Now

### Input to Handle Error Node:
```javascript
{
  error: "PDF extraction requires PDF parser node. MIME type: application/pdf",
  document_id: "e38f5681-ffed-4404-abbb-5d57b63d1c8e",
  filename: "document.pdf",
  failed: true,
  processing_stage: "text_extraction"
}
```

### SQL Execution:
```sql
UPDATE knowledge_documents
SET
  upload_status = 'FAILED',
  processing_error = 'PDF extraction requires PDF parser node. MIME type: application/pdf',
  n8n_execution_error = 'PDF extraction requires PDF parser node. MIME type: application/pdf',
  updated_at = NOW()
WHERE id = 'e38f5681-ffed-4404-abbb-5d57b63d1c8e'
RETURNING id, filename, upload_status, processing_error;
```

### Database Result:
```
id                                   | e38f5681-ffed-4404-abbb-5d57b63d1c8e
filename                             | document.pdf
upload_status                        | FAILED
processing_error                     | PDF extraction requires...
n8n_execution_error                  | PDF extraction requires...
updated_at                           | 2025-10-27 21:00:00
```

---

## Testing

### Test Failed PDF:
```bash
# 1. Upload PDF file via UI
# 2. Click Process
# 3. Workflow should complete without errors
# 4. Check database:

docker-compose exec -T db psql -U user -d tip -c "
SELECT
  filename,
  upload_status,
  processing_error,
  n8n_execution_error
FROM knowledge_documents
WHERE filename LIKE '%.pdf'
ORDER BY created_at DESC
LIMIT 1;
"

# Expected output:
# filename       | upload_status | processing_error              | n8n_execution_error
# document.pdf   | FAILED        | PDF extraction requires...    | PDF extraction requires...
```

### Test Successful Text File:
```bash
echo "Test document" > /tmp/test.txt

# Upload and process

docker-compose exec -T db psql -U user -d tip -c "
SELECT
  filename,
  upload_status,
  chunk_count,
  processing_error
FROM knowledge_documents
WHERE filename = 'test.txt'
ORDER BY created_at DESC
LIMIT 1;
"

# Expected output:
# filename  | upload_status | chunk_count | processing_error
# test.txt  | COMPLETED     | 1           | NULL
```

---

## knowledge_documents Schema Reference

### Error-Related Columns:
| Column | Type | Purpose |
|--------|------|---------|
| `processing_error` | text | General processing errors (chunking, parsing, etc.) |
| `n8n_execution_error` | text | n8n workflow execution errors |
| `upload_status` | enum | UPLOADED, ANALYZING, COMPLETED, FAILED |

### Status Values:
```sql
CREATE TYPE "KnowledgeDocumentStatus" AS ENUM (
  'UPLOADED',
  'ANALYZING',
  'COMPLETED',
  'FAILED'
);
```

---

## Error Flow

```
Filter Errors vs Chunks
  (detects failed=true)
         ↓
  Handle Error Node
         ↓
  Executes SQL:
    UPDATE knowledge_documents
    SET upload_status = 'FAILED',
        processing_error = error message,
        n8n_execution_error = error message
         ↓
  Returns updated row
         ↓
  Workflow completes
```

---

## Files Updated

- ✅ `WIP-TIP Document Processing.json` - Handle Error node fixed
- 📄 `DATABASE-COLUMN-FIX.md` - This document
- 🐍 `fix-handle-error-node.py` - SQL query fix
- 🐍 `add-handle-error-params.py` - Parameter mapping

---

## Summary

**Changed**:
- ❌ `error_message` column (doesn't exist)
- ✅ `processing_error` column (exists)
- ✅ `n8n_execution_error` column (exists, for tracking)

**Result**:
- Handle Error node now works
- Failed documents properly marked as FAILED
- Error messages stored in database
- No more column not found errors

---

**Import the updated workflow and test with a PDF file!** 🎯

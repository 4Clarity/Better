# URGENT: Activate Correct Workflow

**Issue Found**: v1.0.17 is active, but we need v1.0.18

**Evidence**:
```
n8n startup logs show:
Activated workflow "TIP Document Processing v1.0.17" (ID: 3IC1M3gWtbjj9ccu)
```

But we uploaded v1.0.18 with the fixes for extracted_text handling.

---

## How to Fix

### Step 1: Open n8n UI
Go to: http://n8n.tip.localhost

### Step 2: Deactivate v1.0.17

1. Click "Workflows" in left sidebar
2. Find "TIP Document Processing v1.0.17"
3. Click on it to open
4. Click the **"Active" toggle** (top right) to turn it OFF
5. Click "Save"

### Step 3: Activate v1.0.18

1. Go back to "Workflows" list
2. Find "TIP Document Processing v1.0.18"
3. Click on it to open
4. Click the **"Active" toggle** (top right) to turn it ON
5. Click "Save"

### Step 4: Verify the Switch

1. Go back to "Workflows" list
2. v1.0.17 should have NO "Active" badge
3. v1.0.18 should have a green "Active" badge

### Step 5: Check Webhook URL

While in v1.0.18:
1. Click the "Webhook" node (first node)
2. Verify "Webhook URL" shows: `/webhook/document-processing`
3. This should match what backend-python is calling

---

## After Activating v1.0.18

### Clean Bad Data
```sql
-- Delete empty chunks from old workflow
DELETE FROM n8n_vectors WHERE text IS NULL OR embedding IS NULL;

-- Reset failed documents
UPDATE knowledge_documents
SET upload_status = 'PENDING',
    processing_error = NULL,
    chunk_count = 0
WHERE filename IN ('Diwali_v4.pdf', 'Christmas_Pickle_v4.pdf')
  AND upload_status = 'FAILED';
```

### Upload Fresh Test

1. Upload a small PDF (1-2 pages)
2. Watch logs:
   ```bash
   docker-compose logs -f backend-python n8n | grep -i "extract\|chunk\|embedding"
   ```

3. Expected output:
   ```
   backend-python: PyPDF2 extracted XXXX characters
   backend-python: n8n workflow triggered
   n8n: Process Document Started
   n8n: Received 1 items
   n8n: Created X chunks
   n8n: Calling Ollama API
   n8n: Embedding received: 768 dimensions
   ```

4. Check database (after 30-60 seconds):
   ```sql
   SELECT COUNT(*) as chunks,
          COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as with_embeddings
   FROM n8n_vectors;
   ```

   Should show: chunks > 0, with_embeddings = chunks

---

## Why v1.0.17 Failed

v1.0.17 code at line 94:
```javascript
const text = item.json.text;  // ❌ text is undefined for PDFs
```

v1.0.18 code at line 94:
```javascript
const text = item.json.extracted_text || item.json.text;  // ✅ Uses pre-extracted text
```

When v1.0.17 runs:
- `item.json.text` is undefined (PDFs don't have text property)
- `const text = undefined`
- Chunking fails or creates empty chunks
- No data inserted into database
- Execution marked "success" but produces nothing

When v1.0.18 runs:
- `item.json.extracted_text` has 3000+ characters from backend-python
- `const text = "PDF text content..."`
- Chunking creates 5-10 chunks
- Ollama generates embeddings
- Data inserted into n8n_vectors
- Document marked COMPLETED

---

## Quick Verification Command

After switching workflows, run:
```bash
docker-compose restart n8n
sleep 10
docker-compose logs n8n | grep "Activated workflow"
```

Should show:
```
Activated workflow "TIP Document Processing v1.0.18"
```

If it still shows v1.0.17, the activation didn't save properly.

---

## Next Steps After Activation

1. ✅ Deactivate v1.0.17
2. ✅ Activate v1.0.18
3. ✅ Verify correct workflow active
4. ✅ Clean bad data from database
5. ✅ Upload test PDF
6. ✅ Verify chunks created with embeddings
7. ✅ Upload Diwali.pdf
8. ✅ Test RAG query (should be < 15 seconds)

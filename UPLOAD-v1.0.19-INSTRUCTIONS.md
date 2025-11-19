# Upload n8n Workflow v1.0.19 - Step-by-Step

**Date**: 2025-10-29 00:20
**Version**: v1.0.19 (verified correct code)
**Issue**: Previous v1.0.18 upload didn't save changes properly

---

## Why This Is Necessary

The v1.0.18 JSON file has the **correct code**, but when you uploaded it to n8n, the changes **didn't persist**. The workflow in n8n still has the old code:

```javascript
// What n8n currently has (WRONG):
const text = item.json.text;

// What v1.0.19 file has (CORRECT):
const text = item.json.extracted_text || item.json.text;
```

---

## Critical Upload Steps

### Step 1: MANUALLY Edit the Node (RECOMMENDED)

This is the most reliable way to ensure changes save:

1. **Open n8n**: http://n8n.tip.localhost

2. **Open workflow**: "TIP Document Processing v1.0.18"

3. **Click on "Process Document - Chunk & Embed" node**

4. **Find this line** (around line 93):
   ```javascript
   const text = item.json.text;
   ```

5. **Change it to**:
   ```javascript
   const text = item.json.extracted_text || item.json.text;
   ```

6. **Click "Execute Node"** to test (should show no errors)

7. **Click "Save"** at the bottom of the code editor

8. **Click main "Save" button** in workflow toolbar

9. **Rename workflow** (click name at top):
   - Change from: "TIP Document Processing v1.0.18"
   - Change to: "TIP Document Processing v1.0.19"

10. **Click "Save" again**

11. **Verify "Active" toggle is ON** (top right)

---

### Step 2: Verify the Change Saved

1. **Close the workflow** (click X or go to workflows list)

2. **Re-open** "TIP Document Processing v1.0.19"

3. **Click "Process Document - Chunk & Embed" node**

4. **Scroll to line ~93** and verify it says:
   ```javascript
   const text = item.json.extracted_text || item.json.text;
   ```

5. **If it reverted** to `const text = item.json.text;` → n8n has a caching issue

---

## Alternative: Import v1.0.19 File

If manual edit doesn't work, try importing the file:

1. **Deactivate current workflow** (toggle OFF)

2. **Click "..." menu** → "Duplicate"

3. **On the duplicate**:
   - Click "..." menu → "Import from file"
   - Select: `/Users/richardroach/Documents/Builder_Projects/Better/assets/n8n-agentic-RAG-workflow/tip-agentic-rag/tip-document-processing-v1.0.19.json`
   - Click "Import"

4. **Save the imported workflow**

5. **Activate the NEW workflow** (toggle ON)

6. **Deactivate and DELETE the old v1.0.18 workflow**

---

## After Upload: Test Immediately

### Clean Bad Data
```sql
DELETE FROM n8n_vectors WHERE embedding IS NULL;

UPDATE knowledge_documents
SET upload_status = 'FAILED'
WHERE filename LIKE '%Christmas%' OR filename LIKE '%Diwali%'
  AND upload_status != 'FAILED';
```

### Upload Small Test PDF

Upload any 1-2 page PDF through the frontend.

### Watch Logs (30-60 seconds)
```bash
docker-compose logs -f backend-python n8n | grep -i "extract\|embedding\|ollama"
```

**Expected output:**
```
backend-python: Pre-extracting PDF text for test.pdf
backend-python: PyPDF2 extracted XXXX characters from PDF
backend-python: n8n workflow triggered for document [uuid]
n8n: Processing document...
n8n: Calling Ollama API at: http://host.docker.internal:11434/api/embeddings
n8n: Embedding received: 768 dimensions
```

### Check Database
```sql
-- Should show chunks with embeddings
SELECT
  metadata->>'filename' as filename,
  COUNT(*) as total_chunks,
  COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as with_embeddings,
  AVG(LENGTH(text)) as avg_text_length
FROM n8n_vectors
WHERE metadata->>'filename' LIKE '%test%'
GROUP BY metadata->>'filename';
```

**Expected:**
- total_chunks: 5-15 (depending on PDF size)
- with_embeddings: Same as total_chunks
- avg_text_length: 300-500

### Check Document Status
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

## If It Still Doesn't Work

### Possible n8n Caching Issue

Try these steps:

1. **Restart n8n container**:
   ```bash
   docker-compose restart n8n
   ```

2. **Wait 30 seconds** for n8n to start

3. **Re-open workflow** and verify changes

4. **Try manual edit again**

### Check Browser Cache

1. **Open n8n in Incognito/Private window**
2. **Try editing workflow there**
3. **If it works in Incognito** → clear browser cache for tip.localhost domain

---

## Success Criteria

Before proceeding with Diwali upload:

- ✅ Workflow name shows: "TIP Document Processing v1.0.19"
- ✅ "Process Document - Chunk & Embed" node has: `const text = item.json.extracted_text || item.json.text;`
- ✅ Test PDF uploads successfully
- ✅ Database shows chunks with embeddings
- ✅ Document status becomes COMPLETED
- ✅ Processing completes in 30-60 seconds

Only when ALL criteria pass → proceed with Diwali upload.

---

## Files Created

**Location**: `/Users/richardroach/Documents/Builder_Projects/Better/assets/n8n-agentic-RAG-workflow/tip-agentic-rag/`

- `tip-document-processing-v1.0.19.json` (full workflow)
- `tip-document-processing-v1.0.19-api.json` (API-ready version)

**Code Verification**: ✅ CORRECT
- Has: `const text = item.json.extracted_text || item.json.text;`
- Has: `extracted_text` field in "Extract Document Info" node
- Missing: "Extract Text from Binary" and "Route by File Type" nodes (as intended)

---

## Next Steps After Successful Upload

1. Clean bad data (SQL above)
2. Upload Diwali.pdf
3. Verify embeddings created
4. Test RAG query: "What do fireworks represent in Diwali?"
5. Expected answer in < 15 seconds: "They symbolize the joy and celebration of light's victory over darkness"

---

**Remember**: The JSON file is **correct**. The issue is n8n not saving changes. Manual editing is more reliable than importing.

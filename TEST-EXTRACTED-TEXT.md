# Test: Verify extracted_text is Reaching n8n

**Issue**: Code looks correct but embeddings are NULL
**Goal**: Verify extracted_text is being passed from backend-python to n8n

---

## Test Procedure

### Step 1: Add Debug Logging to n8n Workflow

1. **Open n8n**: http://n8n.tip.localhost
2. **Open**: "TIP Document Processing v1.0.19" (or v1.0.18)
3. **Click**: "Process Document - Chunk & Embed" node
4. **Add this debug code** at the very beginning (after line 7):

```javascript
// === DEBUG: Log received data ===
console.log('=== DEBUG START ===');
console.log('Total items:', items.length);
if (items.length > 0) {
  console.log('First item keys:', Object.keys(items[0].json));
  console.log('extracted_text exists:', 'extracted_text' in items[0].json);
  console.log('extracted_text value:', items[0].json.extracted_text ? `${items[0].json.extracted_text.substring(0, 100)}...` : 'NULL/UNDEFINED');
  console.log('text exists:', 'text' in items[0].json);
  console.log('text value:', items[0].json.text ? `${items[0].json.text.substring(0, 100)}...` : 'NULL/UNDEFINED');
}
console.log('=== DEBUG END ===');
```

5. **Save node** and **Save workflow**

### Step 2: Upload Small Test PDF

Upload ANY small PDF (1-2 pages) via frontend

### Step 3: Check n8n Execution Logs

```bash
docker-compose logs n8n --tail=100 | grep -A 20 "DEBUG START"
```

**What to look for:**

#### Scenario A: extracted_text is PRESENT ✓
```
=== DEBUG START ===
Total items: 1
First item keys: ['document_id', 'filename', 'extracted_text', 'mime_type', ...]
extracted_text exists: true
extracted_text value: "This is the PDF text content..."
text exists: false
text value: NULL/UNDEFINED
=== DEBUG END ===
```
**Diagnosis**: Data is reaching n8n correctly. Issue is elsewhere.

#### Scenario B: extracted_text is MISSING ✗
```
=== DEBUG START ===
Total items: 1
First item keys: ['document_id', 'filename', 'mime_type']
extracted_text exists: false
extracted_text value: NULL/UNDEFINED
text exists: false
text value: NULL/UNDEFINED
=== DEBUG END ===
```
**Diagnosis**: extracted_text is NOT being passed from backend-python or NOT captured by "Extract Document Info" node.

#### Scenario C: NO DEBUG OUTPUT ✗
```
(no DEBUG START log appears)
```
**Diagnosis**: Workflow never reached "Process Document - Chunk & Embed" node. Check earlier nodes.

---

## If Scenario B or C: Fix "Extract Document Info" Node

### Check Extract Document Info Node

1. **Open**: "Extract Document Info" node
2. **Check assignments list**

**Should include these fields:**
```
document_id: {{ $json.body.document_id }}
filename: {{ $json.body.filename }}
file_content: {{ $json.body.file_content }}
mime_type: {{ $json.body.mime_type }}
user_id: {{ $json.body.uploaded_by }}
extracted_text: {{ $json.body.extracted_text }}  ← THIS ONE!
```

**If `extracted_text` field is MISSING:**
1. Click "+ Add Field"
2. Name: `extracted_text`
3. Value: `={{ $json.body.extracted_text }}`
4. Type: `string`
5. Save node
6. Save workflow
7. Re-test upload

---

## If Scenario A: Check Why Embeddings Aren't Generated

If extracted_text IS reaching the node but embeddings are still NULL:

### Debug Ollama Connection

Add this after line 94 (after `const text = ...`):

```javascript
// DEBUG: Check if we have text
console.log(`=== TEXT CHECK ===`);
console.log(`text length: ${text ? text.length : 0}`);
console.log(`text preview: ${text ? text.substring(0, 200) : 'NO TEXT'}`);
console.log(`Will create ${text ? Math.ceil(text.length / CHUNK_SIZE) : 0} chunks`);
```

### Check Ollama is Running

```bash
curl http://host.docker.internal:11434/api/tags
```

**Expected**: JSON response with model list including `nomic-embed-text`

**If fails**: Ollama is not accessible from Docker container

---

## Common Issues

### Issue 1: Import Path Error
**Symptom**: Logs show "No module named 'src.routes.docling_processor'"
**Cause**: Import path is wrong (should be `src.services.docling_processor`)
**Fix**: Already fixed - PyPDF2 fallback is working

### Issue 2: extracted_text is null in JSON
**Symptom**: Backend logs show extraction but n8n receives null
**Cause**: Python None becomes JSON null
**Check backend logs for**: "PyPDF2 extracted XXXX characters" - if this appears, extraction worked

### Issue 3: Workflow Caching
**Symptom**: Changes don't take effect
**Fix**:
```bash
docker-compose restart n8n
```

Wait 30 seconds, then re-test

---

## Quick Test Commands

### Check Backend Extraction
```bash
docker-compose logs backend-python --tail=50 | grep -i "extract"
```

Should show: "PyPDF2 extracted XXXX characters from PDF"

### Check n8n Workflow Execution
```bash
docker-compose logs n8n --tail=100 | grep -i "process document\|debug\|error"
```

### Check Database State
```sql
-- After test upload
SELECT
  filename,
  COUNT(*) as chunks,
  COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as with_embeddings,
  AVG(LENGTH(text)) as avg_text_len
FROM n8n_vectors
WHERE metadata->>'filename' LIKE '%test%'
GROUP BY filename;
```

---

## Expected Results After Fix

**Backend logs:**
```
INFO: Pre-extracting PDF text for test.pdf
INFO: PyPDF2 extracted 1234 characters from PDF
INFO: n8n workflow triggered
```

**n8n logs:**
```
=== DEBUG START ===
extracted_text exists: true
extracted_text value: "PDF text content..."
=== DEBUG END ===
=== Process Document Started ===
Received 1 items
Created 5 chunks
Calling Ollama API
Embedding received: 768 dimensions
Chunk 1 processed successfully
...
```

**Database:**
```
filename: test.pdf
chunks: 5
with_embeddings: 5
avg_text_len: 450
```

**Document status:**
```
upload_status: COMPLETED
chunk_count: 5
```

---

## Next Action

Add the debug logging to the workflow and upload a test PDF. Share the debug output and I'll help diagnose the exact issue.

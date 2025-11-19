# n8n Workflow Not Executing - Diagnostic Report

**Date**: 2025-10-29 00:40
**Issue**: Backend-Python successfully extracts PDF text and triggers n8n webhook, but workflow creates NO chunks

---

## Evidence

### ✅ Backend-Python: WORKING
```
INFO:src.routes.knowledge:Pre-extracting PDF text for Diwali_v4.pdf using Docling
WARNING:src.routes.knowledge:Docling extraction failed, trying PyPDF2
INFO:src.routes.knowledge:PyPDF2 extracted 3140 characters from PDF
INFO:src.routes.knowledge:n8n workflow triggered for document 14673d95-16e7-4869-a48f-d5927104d1fc

INFO:src.routes.knowledge:Pre-extracting PDF text for Christmas_Pickle_v4.pdf
INFO:src.routes.knowledge:PyPDF2 extracted 3257 characters from PDF
INFO:src.routes.knowledge:n8n workflow triggered for document 2cd1f274-15eb-445c-816f-d6d6c02d6080
```

**Confirmed Working:**
- ✅ PDF text extraction (PyPDF2 fallback working)
- ✅ extracted_text field populated (3140+ characters)
- ✅ n8n webhook called successfully
- ✅ No errors in backend-python logs

### ❌ n8n Workflow: NOT EXECUTING

**n8n Logs:**
```
(no workflow execution logs found)
(only PostHog analytics errors - unrelated)
```

**Database State:**
```sql
-- knowledge_documents table
filename: Diwali_v4.pdf
upload_status: FAILED
chunk_count: 0
processing_error: Cleaning for fresh test

-- n8n_vectors table
total_rows: 0  (completely empty)
```

**Diagnosis**: n8n is receiving webhook calls but **NOT executing the workflow AT ALL**

---

## Root Cause Analysis

The workflow is **not processing documents** despite:
1. ✅ Backend-Python sending correct payload with extracted_text
2. ✅ Workflow code being correct (line 94: `const text = item.json.extracted_text || item.json.text;`)
3. ✅ Webhook endpoint responding (200 OK)

**Possible Causes:**

### 1. Workflow Not Active ⚠️
The workflow might not be activated in n8n UI despite showing "v1.0.18"

**How to Check:**
- Open http://n8n.tip.localhost
- Open "TIP Document Processing v1.0.18" workflow
- Check if **"Active" toggle is ON** (top right)
- If OFF → Activate it and test again

### 2. Wrong Workflow Activated ⚠️
Multiple workflows might exist with similar names, and the active one is the old version

**How to Check:**
- In n8n UI, click "Workflows" (left sidebar)
- Look for multiple "TIP Document Processing" workflows
- Check which one has "Active" badge
- If wrong one is active → Deactivate old, activate v1.0.18

### 3. Webhook Node Configuration Error ⚠️
The webhook node might be misconfigured or not listening

**How to Check:**
- Open v1.0.18 workflow
- Click the "Webhook" node (first node)
- Verify "Webhook URL" shows: `http://n8n:5678/webhook/document-processing`
- Verify "HTTP Method" is "POST"
- Verify "Response Mode" is "When Last Node Finishes"

### 4. Workflow Execution Failing Silently ⚠️
The workflow might be hitting an error before reaching "Process Document" node

**How to Check:**
- Open n8n UI
- Click "Executions" (left sidebar)
- Look for recent executions (should show Diwali_v4, Christmas_Pickle_v4)
- If NO executions → Webhook not triggering workflow
- If executions exist with red X → Click to see error

### 5. Database Connection Error ⚠️
The "Insert Chunks to PostgreSQL" node might be failing to connect

**How to Check:**
- Open v1.0.18 workflow
- Click "Insert Chunks to PostgreSQL" node
- Verify connection settings:
  - Host: `db`
  - Port: `5432`
  - Database: `tip`
  - User: `user`
  - Password: `password`

---

## Immediate Action Plan

### Step 1: Verify Workflow is Active

1. Open http://n8n.tip.localhost
2. Click "Workflows" in left sidebar
3. Find "TIP Document Processing v1.0.18"
4. Verify it has green "Active" badge
5. If not active:
   - Open the workflow
   - Click "Active" toggle (top right)
   - Click "Save"

### Step 2: Check Execution History

1. In n8n UI, click "Executions" (left sidebar)
2. Look for recent executions from past 2 hours
3. Expected: Multiple executions for Diwali and Christmas Pickle PDFs

**If NO executions appear:**
- Workflow is not being triggered by webhook
- Check webhook URL in workflow matches backend-python config
- Backend-python sends to: `http://n8n:5678/webhook/document-processing`

**If executions exist with errors (red X):**
- Click on failed execution
- Read error message
- Common errors:
  - "Cannot read property 'text' of undefined" → extracted_text not in payload
  - "Connection refused" → Database/Ollama not accessible
  - "Timeout" → Ollama taking too long

### Step 3: Test Webhook Manually

1. Open v1.0.18 workflow in n8n
2. Click on "Webhook" node (first node)
3. Click "Execute Node" button
4. Copy the test webhook URL shown
5. Use this to test from command line:

```bash
curl -X POST "http://n8n.tip.localhost/webhook-test/YOUR-TEST-URL" \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": "manual-test-123",
    "filename": "manual-test.pdf",
    "extracted_text": "This is manually extracted test text to verify the workflow processes correctly",
    "mime_type": "application/pdf",
    "file_content": "dGVzdA==",
    "security_classification": "unclassified",
    "uploaded_by": "test-user"
  }'
```

6. Check "Executions" to see if it ran
7. Check database for new n8n_vectors row

### Step 4: Add Debug Logging

If workflow IS executing but still creating no chunks, add this to "Process Document - Chunk & Embed" node at line 7:

```javascript
// === DEBUG: Check input data ===
console.log('=== WORKFLOW DEBUG START ===');
console.log('Items received:', items.length);
if (items.length > 0) {
  console.log('First item keys:', Object.keys(items[0].json));
  console.log('extracted_text exists:', 'extracted_text' in items[0].json);
  console.log('extracted_text length:', items[0].json.extracted_text?.length || 0);
  console.log('extracted_text preview:', items[0].json.extracted_text?.substring(0, 100) || 'NONE');
}
console.log('=== WORKFLOW DEBUG END ===');
```

Then upload a test PDF and check n8n logs:
```bash
docker-compose logs n8n --tail=50 | grep "WORKFLOW DEBUG"
```

---

## Quick Diagnostic Commands

### Check if n8n is running
```bash
docker ps | grep n8n
```

### Check n8n recent logs
```bash
docker-compose logs n8n --tail=100 | grep -v "PostHog"
```

### Check backend-python sending webhooks
```bash
docker-compose logs backend-python --tail=50 | grep "n8n workflow triggered"
```

### Check database state
```bash
docker exec better-db-1 psql -U user -d tip -c "
SELECT COUNT(*) FROM n8n_vectors;
SELECT filename, upload_status FROM knowledge_documents ORDER BY created_at DESC LIMIT 5;
"
```

---

## Expected vs Actual

### Expected Flow:
1. User uploads PDF → Frontend
2. Frontend → Backend-Python `/api/knowledge/upload`
3. Backend-Python extracts PDF text (3000+ characters)
4. Backend-Python sends webhook to n8n with extracted_text
5. n8n "Webhook" node receives data
6. n8n "Extract Document Info" node captures extracted_text
7. n8n "Process Document - Chunk & Embed" node:
   - Chunks text into 500-char pieces
   - Calls Ollama for embeddings
   - Gets 768-dim vectors back
8. n8n "Insert Chunks to PostgreSQL" node saves to n8n_vectors
9. n8n "Update Document Status" node marks document COMPLETED
10. User can query RAG system in < 15 seconds

### Actual Flow:
1. ✅ User uploads PDF
2. ✅ Frontend → Backend-Python
3. ✅ Backend-Python extracts text (confirmed: 3140 chars)
4. ✅ Backend-Python sends webhook (confirmed: 200 OK)
5. ❌ n8n workflow **does not execute**
6. ❌ No chunks created
7. ❌ No embeddings generated
8. ❌ Document stuck in ANALYZING status (later marked FAILED)
9. ❌ RAG queries timeout (3min 40sec)

**The break is at step 5** - n8n is not executing the workflow at all.

---

## Next Steps

1. **Open n8n UI** and check:
   - Is v1.0.18 active?
   - Are there ANY executions in history?
   - What error appears in executions?

2. **Share findings**:
   - Screenshot of workflow list showing which is active
   - Screenshot of executions list
   - Any error messages from failed executions

3. **Based on findings**, we'll either:
   - Activate the correct workflow
   - Fix webhook configuration
   - Debug the specific error node
   - Add logging to diagnose data flow

---

## Files for Reference

- Backend-Python code: `/Users/richardroach/Documents/Builder_Projects/Better/backend-python/src/routes/knowledge.py` (lines 459-497)
- Workflow JSON: `/tmp/tip-document-processing-v1.0.18.json`
- Updated workflow: `/Users/richardroach/Documents/Builder_Projects/Better/assets/n8n-agentic-RAG-workflow/tip-agentic-rag/tip-document-processing-v1.0.19.json`
- Debug instructions: `/Users/richardroach/Documents/Builder_Projects/Better/TEST-EXTRACTED-TEXT.md`
- Upload guide: `/Users/richardroach/Documents/Builder_Projects/Better/UPLOAD-v1.0.19-INSTRUCTIONS.md`

---

**CRITICAL**: The n8n workflow is NOT executing at all. We must verify it's active and check for errors in the n8n UI Executions tab before proceeding with any code changes.

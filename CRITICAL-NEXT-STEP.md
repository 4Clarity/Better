# CRITICAL: Manual Verification Required in n8n UI

**Date**: 2025-10-29 01:20
**Status**: v1.0.19 imported but still creating empty chunks

---

## Problem Summary

✅ **Backend-Python**: Working perfectly - extracted 3140 characters, sent to n8n
✅ **v1.0.19 JSON File**: Verified to have CORRECT code at line 94
❌ **Workflow Execution**: Still creating empty chunks (NULL text, NULL embedding)
❌ **No console.log output**: Workflow logs are silent

---

## Root Cause

The issue is likely in the **"Extract Document Info" node**, not the "Process Document" node.

Even though the JSON has correct code, n8n might not have imported the "Extract Document Info" node's field mappings correctly.

---

## Required Action: Manual Verification

### Step 1: Open v1.0.19 Workflow

1. Go to: http://n8n.tip.localhost
2. Click "Workflows"
3. Open "TIP Document Processing v1.0.19" (ID: jf95c8jdmb6VMWCD)

### Step 2: Check "Extract Document Info" Node

1. Click the **"Extract Document Info"** node (should be early in the workflow, after Webhook)
2. Look at the **"Fields to Set"** section
3. Verify it has ALL these fields:

```
document_id: {{ $json.body.document_id }}
filename: {{ $json.body.filename }}
file_content: {{ $json.body.file_content }}
mime_type: {{ $json.body.mime_type }}
user_id: {{ $json.body.uploaded_by }}
extracted_text: {{ $json.body.extracted_text }}  ← CHECK THIS ONE!
security_classification: {{ $json.body.security_classification }}
content_hash: {{ $json.body.content_hash }}
```

### Step 3: If `extracted_text` is MISSING

1. Click **"Add Field"**
2. Field Name: `extracted_text`
3. Field Value: `={{ $json.body.extracted_text }}`
4. Click **"Save"** (bottom of node editor)
5. Click **"Save"** (main workflow toolbar)

### Step 4: Test Again

After saving:
1. Upload a new PDF
2. Wait 60 seconds
3. Check database:
   ```bash
   docker exec better-db-1 psql -U user -d tip -c "
   SELECT COUNT(*) as chunks,
          COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as with_embeddings,
          AVG(LENGTH(text)) as avg_text_length
   FROM n8n_vectors
   WHERE metadata->>'filename' NOT LIKE '%v1.pdf'
     AND metadata->>'filename' NOT LIKE '%v2.pdf'
     AND metadata->>'filename' NOT LIKE '%v3.pdf'
     AND metadata->>'filename' NOT LIKE '%v4.pdf'
     AND metadata->>'filename' NOT LIKE '%v5.pdf'
     AND metadata->>'filename' NOT LIKE '%v6.pdf';"
   ```

**Expected:**
- chunks: 5-10
- with_embeddings: Same as chunks
- avg_text_length: 300-500

---

## Why This Happens

When n8n imports a workflow JSON file, sometimes the "Set" node (Extract Document Info) doesn't import field assignments correctly, especially for new fields that weren't in the original workflow.

The "Process Document" code is correct, but if "Extract Document Info" doesn't pass `extracted_text` downstream, the code will have `undefined` for that field.

---

## Alternative: Check Workflow Execution in n8n

1. In n8n UI, click **"Executions"** (left sidebar)
2. Find the most recent execution (Diwali_v6.pdf)
3. Click on it to open
4. Check each node:
   - **Webhook**: Should show `extracted_text` in the body
   - **Extract Document Info**: Should output `extracted_text` field
   - **Process Document - Chunk & Embed**: Should receive `extracted_text`

If any node is missing `extracted_text`, that's where the fix is needed.

---

## Quick Diagnostic

Run this to see what data is actually in the database chunk:

```bash
docker exec better-db-1 psql -U user -d tip -c "
SELECT
  id,
  text IS NULL as text_is_null,
  LENGTH(COALESCE(text, '')) as text_length,
  embedding IS NULL as embedding_is_null,
  jsonb_pretty(metadata) as metadata_json
FROM n8n_vectors
WHERE metadata->>'filename' = 'Diwali_v6.pdf'
LIMIT 1;"
```

This will show exactly what was inserted.

---

## Success Criteria

After fixing "Extract Document Info" node, a new upload should show:
- ✅ Multiple chunks (5-10 for Diwali)
- ✅ Each chunk has text (300-500 chars)
- ✅ Each chunk has embedding (768-dimensional vector)
- ✅ Document status becomes COMPLETED
- ✅ Processing completes in < 60 seconds

---

## If Still Failing

If after adding `extracted_text` field it still fails:

1. Check n8n Execution details for actual error message
2. Verify Ollama is running: `curl http://host.docker.internal:11434/api/tags`
3. Check n8n can reach database: Test "Insert Chunks" node manually
4. Share the execution error details with me

---

**Bottom Line**: The most likely issue is the "Extract Document Info" node doesn't have the `extracted_text` field mapped. Add it manually in n8n UI.

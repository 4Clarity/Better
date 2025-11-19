# Fix Workflow Code Manually - Line 94

**Issue**: Workflow named "v1.0.18" but still has v1.0.17 code
**Symptom**: Backend extracts 3140 characters, but chunks have NULL text and NULL embedding

---

## Evidence

**Backend-Python logs:**
```
INFO:src.routes.knowledge:PyPDF2 extracted 3140 characters from PDF
```
✅ Extraction working

**Database state:**
```
total_chunks: 1
with_embeddings: 0
with_text: 0
```
❌ Workflow creating empty placeholder rows

**Root Cause**: Workflow was renamed, not updated. Code is still old version.

---

## Fix: Edit Line 94 in n8n UI

### Step-by-Step Instructions:

1. **Open n8n**: http://n8n.tip.localhost

2. **Open workflow**: Click "TIP Document Processing v1.0.18"

3. **Open Code node**: Click "Process Document - Chunk & Embed" node

4. **Find line 94**: Scroll down or press Ctrl+F and search for "`const text =`"

5. **Current code (WRONG)**:
   ```javascript
   const text = item.json.text;
   ```

6. **Change to (CORRECT)**:
   ```javascript
   const text = item.json.extracted_text || item.json.text;
   ```

7. **Save**:
   - Click "Save" button at bottom of code editor
   - Click main "Save" button in workflow toolbar

8. **Verify**:
   - "Active" toggle should still be ON
   - Close and re-open workflow to verify change saved

---

## Why This Happened

When you uploaded v1.0.18 JSON file, n8n likely:
- Created a duplicate workflow with the same ID
- Only updated the workflow name
- Kept the old node code

OR you manually renamed v1.0.17 to v1.0.18 without changing the code.

**Evidence**: Both v1.0.17 and v1.0.18 have same workflow ID: `3IC1M3gWtbjj9ccu`

---

## After Making the Change

### Test Immediately:

1. **Upload a small PDF** (1-2 pages)
2. **Wait 30-60 seconds**
3. **Check database**:
   ```bash
   docker exec better-db-1 psql -U user -d tip -c "
   SELECT
     COUNT(*) as chunks,
     COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as with_embeddings,
     AVG(LENGTH(text)) as avg_text_length
   FROM n8n_vectors
   WHERE metadata->>'filename' NOT IN ('Diwali_v1.pdf', 'Diwali_v2.pdf', 'Diwali_v3.pdf', 'Diwali_v4.pdf', 'Diwali_v5.pdf');
   "
   ```

### Expected Results:
- `chunks`: 5-10 (depending on PDF size)
- `with_embeddings`: Same as chunks
- `avg_text_length`: 300-500

### If Still Empty:
1. Check n8n "Executions" tab for errors
2. Look for red X next to recent executions
3. Click failed execution to see error message
4. Share error with me

---

## Alternative: Import as NEW Workflow

If manual editing doesn't work, try importing as completely new workflow:

1. **In n8n UI**: Click "+" → "Import from File"
2. **Select file**: `/Users/richardroach/Documents/Builder_Projects/Better/assets/n8n-agentic-RAG-workflow/tip-agentic-rag/tip-document-processing-v1.0.19.json`
3. **Save as NEW workflow** (don't overwrite existing)
4. **Activate the NEW workflow**
5. **Deactivate and delete old v1.0.18**

This ensures a clean import with correct code.

---

## Verification Command

After changing the code, verify it saved:

```bash
# Restart n8n to apply changes
docker-compose restart n8n

# Wait for startup
sleep 15

# Check workflow is active
docker-compose logs n8n --tail=20 | grep "Activated workflow"
```

Should show:
```
Activated workflow "TIP Document Processing v1.0.18"
```

---

## Critical Check

Before uploading another PDF, **verify in n8n UI** that line 94 now reads:

```javascript
const text = item.json.extracted_text || item.json.text;
```

NOT:

```javascript
const text = item.json.text;
```

---

## Next Steps After Fix

1. ✅ Edit line 94 in n8n UI
2. ✅ Save node and workflow
3. ✅ Verify change persisted (close and re-open)
4. ✅ Clean bad chunks from database
5. ✅ Upload fresh test PDF
6. ✅ Verify chunks created with text and embeddings
7. ✅ Test RAG query performance

---

**Bottom Line**: The workflow name changed to "v1.0.18" but the code didn't. You must manually edit line 94 in the n8n UI.

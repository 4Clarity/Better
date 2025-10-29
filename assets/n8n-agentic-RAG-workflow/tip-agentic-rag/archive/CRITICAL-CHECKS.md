# Critical Checks - Why Insert Chunks Not Firing

## What I See From Your Output

✅ Chunk has `embedding` array (768 dimensions)
✅ Chunk has all metadata: `document_id`, `filename`, `chunk_index`, etc.
✅ `total_chunks: 4` - so 4 chunks were created
✅ No `failed: true` field - this chunk is successful

## ⚠️ CRITICAL QUESTION: Is `pageContent` in the output?

The JSON you shared shows the END of the chunk object. I need to see the BEGINNING to check if `pageContent` is there.

**In n8n, scroll UP in the JSON output and check:**

Does it look like this?
```json
{
  "pageContent": "Custom shelf plans are designed to...",  ← IS THIS THERE?
  "embedding": [0.6646145582199097, 0.27011358737945557, ...],
  "document_id": "b04eda93-eb27-4790-85da-8cf5c0612a70",
  ...
}
```

**If `pageContent` is MISSING**, that's the problem! Insert Chunks needs that field.

---

## Three Things to Check in n8n

### 1. Process Document Output - Total Items

Still on **"Process Document - Chunk & Embed"** node → **Output** tab:

**Look at the top** - how many items total?

Should show something like: `Showing item 1 of 4` (with arrows to navigate)

**Check each item:**
- Item 1: Has `pageContent` and `embedding`? Or has `failed: true`?
- Item 2: Has `pageContent` and `embedding`? Or has `failed: true`?
- Item 3: Has `pageContent` and `embedding`? Or has `failed: true`?
- Item 4: Has `pageContent` and `embedding`? Or has `failed: true`?

**Share:**
- How many items total?
- How many have `failed: true`?
- How many are successful chunks?

---

### 2. Filter Node Output

Click on **"Filter Errors vs Chunks"** node → **Output** tab

You should see TWO outputs:
- **Output 0 (true)**: Items with `failed: true` → Goes to Handle Error
- **Output 1 (false)**: Items WITHOUT `failed` field → Goes to Insert Chunks

**Check:**
- Output 0: How many items? (these go to Handle Error)
- Output 1: How many items? (these SHOULD go to Insert Chunks)

**The problem:** If Output 1 has items but Insert Chunks still doesn't fire, the Insert Chunks node itself has an error.

---

### 3. Insert Chunks Node - Check for Error

Click on **"Insert Chunks to PostgreSQL"** node

**Look for:**
- Red error icon?
- Error message in node?
- What does the error say?

**Common errors:**
- `column "pageContent" does not exist` → pageContent missing from chunk
- `column "text" does not exist` → Wrong column name in SQL
- `null value violates not-null constraint` → Required field missing

**Share the error message** if you see one!

---

## Quick Test

Run this SQL query to see if chunks are actually being inserted:

```bash
docker exec better-db-1 psql -U user -d tip -c "
SELECT
  COUNT(*) as total_chunks,
  COUNT(DISTINCT metadata->>'document_id') as unique_docs
FROM n8n_vectors
WHERE created_at > NOW() - INTERVAL '10 minutes';
"
```

**If count > 0:** Chunks ARE being inserted! (workflow is actually working)
**If count = 0:** Chunks NOT being inserted (Insert Chunks failing or not executing)

---

## Diagnosis Tree

### Scenario A: `pageContent` is MISSING
**Symptom:** Chunk JSON has `embedding` but no `pageContent`
**Cause:** Old workflow code still running
**Fix:** Re-import workflow, ensure using latest version

### Scenario B: Filter Output 1 is EMPTY
**Symptom:** All items going to Output 0 (Handle Error path)
**Cause:** All chunks have `failed: true` - chunking/embedding errors
**Fix:** Check Process Document console logs for errors

### Scenario C: Filter Output 1 HAS items, but Insert Chunks not firing
**Symptom:** Chunks in FALSE output, but node doesn't execute
**Cause:** Insert Chunks node has execution error
**Fix:** Check Insert Chunks node error message, fix SQL/column names

### Scenario D: Insert Chunks executes but has error
**Symptom:** Node shows red X, has error message
**Cause:** SQL error (wrong column names, missing required fields)
**Fix:** Update SQL to match database schema and chunk structure

---

## What to Share Next

Please share:

1. **Process Document total items** (e.g., "4 items")
2. **How many have `pageContent`** vs **how many have `failed: true`**
3. **Filter Output 0** (TRUE): X items
4. **Filter Output 1** (FALSE): X items
5. **Insert Chunks error message** (if any)
6. **Database query result** (chunks count)

This will tell me EXACTLY what's wrong! 🎯

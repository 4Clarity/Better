# Filter Routing Debug - Why Insert Chunks Doesn't Fire

## Current Status
✅ Process Document creates 4 chunks
✅ Each chunk has `pageContent` and `embedding`
❌ Insert Chunks node NOT executing

## Root Cause: Filter Node Routing

The Filter node checks: `$json.failed === true`
- **Output 0 (TRUE)**: Has `failed: true` → Goes to Handle Error
- **Output 1 (FALSE)**: No `failed` field → Should go to Insert Chunks

**Problem:** Chunks are going to Output 0 instead of Output 1

---

## Check in n8n Execution

### Step 1: Process Document Output
Click: **"Process Document - Chunk & Embed"** node → **Output** tab

**For each of the 4 chunks, check:**
```json
{
  "pageContent": "...",
  "embedding": [...],
  "document_id": "...",
  ...
  "failed": ???  ← IS THIS FIELD PRESENT?
}
```

**Questions:**
- Do ANY of the 4 chunks have `"failed": true`?
- Or do they have `"failed": false`?
- Or is the `failed` field completely absent?

**Expected:** Successful chunks should have NO `failed` field at all

---

### Step 2: Filter Node Input
Click: **"Filter Errors vs Chunks"** node → **Input** tab

**Check the input items:**
- Are there 4 items?
- Do they match the Process Document output?
- Do any have `failed` field?

---

### Step 3: Filter Node Output (MOST IMPORTANT)
Still on **"Filter Errors vs Chunks"** node → **Output** tab

**You should see TWO outputs:**

**Output 0 (true):**
- How many items? (Should be 0 if no errors)
- These go to Handle Error

**Output 1 (false):**
- How many items? (Should be 4 if all chunks succeeded)
- These SHOULD go to Insert Chunks

**Share:**
- Output 0: X items
- Output 1: X items

---

## Possible Issues

### Issue A: All 4 chunks in Output 0 (TRUE)
**Meaning:** All chunks have `failed: true`
**Cause:** Something in Process Document is setting failed=true on successful chunks
**Fix:** Need to check why chunks are marked as failed

### Issue B: 0 items in both outputs
**Meaning:** Filter node isn't executing at all
**Cause:** Process Document might be returning 0 items, or connection broken
**Fix:** Check node connections

### Issue C: 4 chunks in Output 1 (FALSE), but Insert Chunks still doesn't fire
**Meaning:** Connection from Filter output 1 to Insert Chunks is broken
**Fix:** Check connections in workflow editor

---

## Quick Verification

In n8n **workflow editor** (not execution):

1. Click on **"Filter Errors vs Chunks"** node
2. Look at the **output connectors** (little dots on right side of node)
3. There should be TWO output dots:
   - Top dot (Output 0 / TRUE) → Connected to "Handle Error"
   - Bottom dot (Output 1 / FALSE) → Connected to "Insert Chunks to PostgreSQL"

**Are BOTH connections present?**

If the bottom connector is NOT connected to Insert Chunks, that's the problem!

---

## What to Share

Please check and share:

1. **Process Document output** - Do the 4 chunks have `failed` field? (yes/no, true/false, or absent)
2. **Filter Input** - How many items? (should be 4)
3. **Filter Output 0** - How many items?
4. **Filter Output 1** - How many items?
5. **In workflow editor** - Is Filter output 1 (bottom dot) connected to Insert Chunks?

This will tell me exactly what's wrong! 🔍

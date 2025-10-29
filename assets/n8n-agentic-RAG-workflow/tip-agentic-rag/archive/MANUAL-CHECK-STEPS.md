# Manual Check Steps - What to Verify in n8n UI

## Step 1: Verify You Re-Imported the Latest Workflow

**CRITICAL:** Have you re-imported `TIP Document Processing.json` after the Insert Chunks fix?

If NO → **Stop here and re-import first:**
1. Go to http://n8n.tip.localhost
2. Workflows → Import from File
3. Select: `TIP Document Processing.json`
4. Import (overwrite)
5. Save
6. Test again with your text file

---

## Step 2: Check Filter Node Output in Execution

1. Open n8n: http://n8n.tip.localhost
2. Click: **Executions** (left sidebar)
3. Click: **Latest execution** (top of list)
4. Click: **"Filter Errors vs Chunks"** node
5. Click: **"Output"** tab

**You should see TWO sections:**

### Output 0 (true) - Goes to Handle Error
- Shows items that have `failed: true`
- How many items? **Write this down: Output 0 = ___ items**

### Output 1 (false) - Goes to Insert Chunks
- Shows items that DON'T have `failed` field
- How many items? **Write this down: Output 1 = ___ items**

**Expected for successful text file:**
- Output 0 = 0 items (no errors)
- Output 1 = 4 items (4 successful chunks)

**If you see:**
- Output 0 = 4 items, Output 1 = 0 items → All chunks marked as failed (problem in Process Document)
- Output 0 = 0 items, Output 1 = 0 items → Filter not executing (connection issue)

---

## Step 3: Check If Insert Chunks Node Exists in Execution

Still in the same execution view:

**Scroll down the list of executed nodes** - do you see:
- ✅ "Insert Chunks to PostgreSQL" - Node executed
- ❌ "Insert Chunks to PostgreSQL" - Node NOT in the list

**If node is NOT in the list:**
- Filter Output 1 has 0 items, OR
- Connection from Filter to Insert Chunks is broken

---

## Step 4: Check Workflow Editor Connections

1. Go back to workflow editor (not execution view)
2. Click on **"Filter Errors vs Chunks"** node
3. Look at the **right side** of the node - you should see TWO dots (output connectors):

```
Filter Errors vs Chunks
┌─────────────────────┐
│                     │ ● ──→ Handle Error (Output 0 / TRUE)
│                     │
│                     │ ● ──→ Insert Chunks to PostgreSQL (Output 1 / FALSE)
└─────────────────────┘
```

**Are BOTH dots connected?**
- Top dot → Handle Error
- Bottom dot → Insert Chunks to PostgreSQL

**If bottom dot is NOT connected:**
- Manually drag a connection from Filter bottom dot to Insert Chunks
- Save workflow
- Test again

---

## Step 5: Check Process Document Output for `failed` Field

1. In execution view
2. Click: **"Process Document - Chunk & Embed"** node
3. Click: **"Output"** tab
4. Look at the first chunk (item 1 of 4)

**Search the entire JSON for the word "failed"**

**Example of GOOD chunk (no failed field):**
```json
{
  "pageContent": "Custom shelf plans...",
  "embedding": [0.664, ...],
  "document_id": "b04eda93-...",
  "filename": "custom-shelf-plans__1__v2.txt",
  "chunk_index": 0,
  "mime_type": "text/plain",
  "security_classification": "unclassified",
  "total_chunks": 4,
  "chunk_size": 350
}
```
← NO `failed` field = goes to Output 1

**Example of BAD chunk (has failed):**
```json
{
  "pageContent": "...",
  "embedding": [...],
  ...
  "failed": true  ← THIS MEANS ERROR
}
```
← Has `failed: true` = goes to Output 0

---

## Step 6: If Insert Chunks IS Executing, Check for Error

If Insert Chunks appears in the execution list:

1. Click on: **"Insert Chunks to PostgreSQL"** node
2. Look for **red X** or error icon
3. Click to see error message

**Common errors:**
- `column "pageContent" does not exist` → Column mapping wrong
- `invalid input syntax for type vector` → Embedding format wrong
- `null value in column "text"` → pageContent missing

---

## What to Report Back

Please check these and tell me:

1. ✅ Did you re-import the latest workflow? (YES/NO)
2. Filter Output 0: ___ items
3. Filter Output 1: ___ items
4. Insert Chunks in execution list? (YES/NO)
5. If yes, any error in Insert Chunks? (error message)
6. Do chunks have `failed` field in Process Document output? (YES/NO)

---

**Once I know these 6 things, I can tell you exactly what's wrong!** 🎯

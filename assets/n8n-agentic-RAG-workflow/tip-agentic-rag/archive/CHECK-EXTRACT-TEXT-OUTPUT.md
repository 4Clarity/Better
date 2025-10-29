# Check Extract Text from Binary Output

## Quick Diagnosis

Since all 4 chunks are going to the error path, let me check if the text extraction is marking them as failed.

## In n8n Execution:

### 1. Check Extract Text from Binary Output

Click: **"Extract Text from Binary"** node → **Output** tab

**How many items?** Should be 1 item (the text file)

**Check the item - does it have:**
```json
{
  "document_id": "...",
  "filename": "custom-shelf-plans__1__v2.txt",
  "text": "Custom shelf plans...",  ← Is this present?
  "mime_type": "text/plain",
  "failed": true or false or not present?  ← CHECK THIS
}
```

**Report:**
- Does it have `text` field? (YES/NO)
- Does it have `failed` field? (YES/NO, if yes what value?)

---

### 2. Check Process Document CONSOLE LOGS

Still on **"Process Document - Chunk & Embed"** node

Look for the console output (might be in a separate logs section):

**Should show:**
```
=== Process Document Started ===
Received X items
--- Processing item 1/X ---
Document: custom-shelf-plans__1__v2.txt
Text length: XXX characters
Created X chunks
Chunk 1 processed successfully
...
=== Process Document Complete ===
Successful chunks: X
Failed items: X
```

**What do the logs say?**
- Received: ___ items
- Successful chunks: ___
- Failed items: ___

**If logs show errors:**
- Share the error message

---

## Hypothesis

I think one of two things is happening:

### Scenario A: Extract Text is marking as failed
- Extract Text output has `failed: true`
- Process Document passes it through
- All items go to error path

### Scenario B: Embedding generation is failing
- Extract Text succeeds
- Process Document tries to generate embeddings
- Ollama API call fails
- All chunks marked as failed

**The console logs will tell us which scenario!**

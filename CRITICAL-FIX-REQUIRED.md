# 🔴 CRITICAL: Credential Configuration Still Not Applied

## What Just Happened

I triggered a test with a unique document and monitored the execution.

**Result:** Execution #322 failed immediately (< 1 second) with **403 Forbidden**

## Root Cause: Credential Not Configured

The logs clearly show:
```
Forbidden
Response error code: ERR_BAD_REQUEST
Calling Error Workflow for "S1reDEFte3H0mHZZ"
```

Backend test confirms:
```bash
curl ... http://py.tip.localhost/api/n8n/check-duplicate
# Response: {"detail":"Invalid API key"}
```

**This means the `backend-api-auth` credential is either:**
1. Not created yet
2. Created but with wrong values
3. Created but nodes aren't using it

## The Fix (Must Be Done in n8n UI)

### Step 1: Open n8n

```
http://n8n.tip.localhost
```

### Step 2: Check if Credential Exists

1. Click **"Credentials"** in left sidebar
2. Search for: `backend-api-auth`

**If it DOESN'T exist:** Go to Step 3
**If it EXISTS:** Go to Step 4

### Step 3: Create the Credential (If Missing)

1. Click **"+ Add Credential"**
2. Search for: `Header Auth`
3. Click it to create
4. Fill in:
   ```
   Name: backend-api-auth
   Header Name: Authorization
   Header Value: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4ZTUwNmM0NC0xNGY0LTQ0OTEtYWQxYi1kNmI5NDVjNjRhODEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYxMzE2MTgyLCJleHAiOjE3NjkwNTgwMDB9.mJo4CcB9Ie8hTOJJOfNic-U5Z7ss_KvCzuqYOY5P1js
   ```
   **IMPORTANT:** Include the word "Bearer " (with space) before the token!

5. Click **"Save"**

### Step 4: Verify Credential Configuration

1. Click on `backend-api-auth` credential
2. Verify Header Name = `Authorization`
3. Verify Header Value starts with `Bearer eyJhbGci...`
4. If incorrect, fix it and Save

### Step 5: Update ALL HTTP Request Nodes

You MUST update **all 9 HTTP Request nodes** to use the credential:

1. Open workflow: **"Document Chunking Analysis Pipeline"**
2. Click each of these nodes one by one:
   - ☐ Check for Duplicates
   - ☐ Update Status (Duplicate Skipped)
   - ☐ Extract Document Text
   - ☐ Analyze Chunking Strategy
   - ☐ Chunk Document
   - ☐ Generate Embeddings
   - ☐ Store Chunks in Database
   - ☐ Update Document Status (Success)
   - ☐ Error Handler

3. For EACH node:
   - Click the node
   - Scroll down to **"Authentication"** section
   - Select: `Predefined Credential Type`
   - Credential Type: `Header Auth`
   - Credential to connect with: Select **`backend-api-auth`**
   - Click **"Execute Node"** (test button) to verify
   - If test succeeds, you'll see a response
   - If test fails, check the credential again

4. **Save the workflow** after updating all nodes

### Step 6: Fix Error Workflow Loop

WHILE YOU'RE IN THE WORKFLOW:

1. Click workflow settings (⚙️ icon or menu → Settings)
2. Find **"Error Workflow"** setting
3. Currently shows: `Document Chunking Analysis Pipeline` ← THIS IS WRONG
4. Change to: **"None"** or leave empty
5. Click **"Save"**

### Step 7: Reactivate Workflow

1. Toggle workflow **OFF**
2. Wait 3 seconds
3. Toggle workflow **ON**
4. **Watch the logs - they should NOT show "Forbidden"**

### Step 8: Test Again

After completing all steps above, test it:

```bash
# Method 1: Use the monitoring script
./monitor-n8n-workflow.sh monitor

# Then in another terminal, trigger test:
source ./n8n-helper.sh
n8n_trigger_webhook "document-processing" '{
  "document_id": "test-final-'$(date +%s)'",
  "filename": "final-test-'$(date +%s)'.txt",
  "mime_type": "text/plain",
  "content_hash": "hash-'$(date +%s)'",
  "storage_path": "/tmp/test.txt",
  "file_content_base64": "VGhpcyBpcyBhIGZpbmFsIHRlc3QgZG9jdW1lbnQu"
}'

# Method 2: Use the automated test
./test-workflow-now.sh
```

## How to Verify It's Fixed

### Before Fix (Current State):
```bash
# Logs show:
Forbidden
Response error code: ERR_BAD_REQUEST

# Backend test fails:
curl -H "Authorization: Bearer ..." /api/n8n/check-duplicate
# {"detail":"Invalid API key"}
```

### After Fix (Expected):
```bash
# Logs show:
Workflow execution started
Processing document...
(no "Forbidden" errors)

# Backend test succeeds:
curl -H "Authorization: Bearer ..." /api/n8n/check-duplicate
# {"is_duplicate": false, "existing_document_id": null, "strategy": "proceed"}
```

## Why This Keeps Failing

The authentication credential in n8n is **NOT automatically created**. You must:

1. **Manually create it** in the n8n UI
2. **Manually assign it** to EVERY HTTP Request node
3. **Manually save** the workflow after assignment

**There is no CLI/API way to do this automatically** - it must be done through the UI.

## Common Mistakes

❌ **Forgetting "Bearer "** in the credential value
✅ Must be: `Bearer eyJhbGci...` (with space after Bearer)

❌ **Only updating some nodes**
✅ Must update ALL 9 HTTP Request nodes

❌ **Not saving after changes**
✅ Must click Save after making any changes

❌ **Not reactivating the workflow**
✅ Must toggle OFF then ON after credential changes

## What I Tested

✅ Created unique test document (1.6KB)
✅ Triggered webhook successfully
✅ Monitored execution in real-time
❌ **Execution failed with 403 Forbidden (credential issue)**
❌ Backend confirms: Invalid API key

## Next Steps

**This MUST be fixed in the n8n UI before any workflow can succeed.**

Once fixed, you can use these monitoring tools:

```bash
# Real-time monitoring
./monitor-n8n-workflow.sh monitor

# Check specific execution
./monitor-n8n-workflow.sh check <execution-id>

# List recent executions
./monitor-n8n-workflow.sh list 10

# Automated test
./test-workflow-now.sh
```

## Support Files Created

- `monitor-n8n-workflow.sh` - Real-time monitoring
- `test-workflow-now.sh` - Automated testing
- `n8n-helper.sh` - API helper functions
- `docs/n8n-workflow-fix-guide.md` - Complete guide
- `n8n-quick-fix.md` - Quick reference
- `workflow-monitoring-summary.md` - Status overview
- **`CRITICAL-FIX-REQUIRED.md`** - This file

## Screenshots Would Help

If possible, take screenshots of:
1. The Credentials page showing `backend-api-auth`
2. One of the HTTP Request nodes showing the Authentication section
3. The workflow settings showing Error Workflow configuration

This will help verify the configuration is correct.

---

**Bottom Line:** The credential configuration is the blocker. Everything else is working (webhook trigger, backend API, database, embeddings service). Once the credential is properly configured in n8n, the workflow will execute successfully.

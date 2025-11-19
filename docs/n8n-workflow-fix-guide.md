# n8n Document Chunking Workflow - Fix Guide

## Investigation Summary

**Date:** October 24, 2025
**Workflow ID:** `S1reDEFte3H0mHZZ` (Document Chunking Analysis Pipeline)
**Status:** ❌ Failing - All recent executions error

## Root Causes Identified

### 1. 🔴 CRITICAL: Missing or Invalid Authentication Credential

**Problem:**
- All HTTP Request nodes are configured to use credential ID `bEsx9GvEEcyn6uH2` named `backend-api-auth`
- This credential either doesn't exist or isn't configured correctly
- Backend expects: `Authorization: Bearer <N8N_API_KEY>`
- Result: All HTTP requests to backend return **403 Forbidden**

**Evidence:**
```bash
# Logs show repeated "Forbidden" errors
Calling Error Workflow for "S1reDEFte3H0mHZZ". Could not find "n8n-nodes-base.errorTrigger"
Forbidden
```

**Backend API Health Check (Works with correct auth):**
```bash
curl -H "Authorization: Bearer eyJh...P1js" \
  http://py.tip.localhost/api/n8n/health
# Returns: {"status": "healthy", "database": "connected"}
```

### 2. 🟡 Error Workflow Configuration Loop

**Problem:**
- Workflow settings: `"errorWorkflow": "S1reDEFte3H0mHZZ"`
- The workflow is set to call **itself** as the error handler
- Creates infinite loop when errors occur
- Logs confirm: "Could not find n8n-nodes-base.errorTrigger in workflow"

### 3. ✅ Webhook Registration (RESOLVED)

**Status:** Working correctly now
- Webhook trigger is properly configured
- Path: `document-processing`
- Test successful: `{"message":"Workflow was started"}`

## Backend Service Status ✅

All backend endpoints are **working correctly**:

| Endpoint | Status | Authentication Required |
|----------|--------|------------------------|
| `/api/n8n/health` | ✅ Working | Yes - Bearer token |
| `/api/n8n/check-duplicate` | ✅ Working | Yes - Bearer token |
| `/api/n8n/extract-text` | ✅ Working | Yes - Bearer token |
| `/api/n8n/analyze-chunking` | ✅ Working | Yes - Bearer token |
| `/api/n8n/chunk-document` | ✅ Working | Yes - Bearer token |
| `/api/n8n/generate-embeddings` | ✅ Working | Yes - Bearer token |
| `/api/n8n/store-chunks` | ✅ Working | Yes - Bearer token |
| `/api/n8n/update-status` | ✅ Working | Yes - Bearer token |

**Backend Python Service:** Running and healthy
**Database:** Connected
**Embedding Service (Ollama):** Healthy and available

## Fix Instructions

### Step 1: Create/Fix the Authentication Credential

1. **Open n8n:** http://n8n.tip.localhost

2. **Navigate to Credentials:**
   - Click "Credentials" in the left sidebar
   - Click "+ Add Credential"

3. **Create HTTP Header Auth Credential:**
   - Type: `Header Auth`
   - Name: `backend-api-auth`
   - Header Name: `Authorization`
   - Header Value: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4ZTUwNmM0NC0xNGY0LTQ0OTEtYWQxYi1kNmI5NDVjNjRhODEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYxMzE2MTgyLCJleHAiOjE3NjkwNTgwMDB9.mJo4CcB9Ie8hTOJJOfNic-U5Z7ss_KvCzuqYOY5P1js`
   - Click "Save"

4. **Get the Credential ID:**
   - The ID should ideally match `bEsx9GvEEcyn6uH2`
   - If different, note the new ID for Step 2

### Step 2: Update Workflow Nodes (if needed)

**If the credential ID is different from `bEsx9GvEEcyn6uH2`:**

1. Open workflow: "Document Chunking Analysis Pipeline"
2. For **each HTTP Request node** (9 nodes total):
   - Click the node
   - Click "Credentials" dropdown
   - Select "backend-api-auth"
   - Save the node
3. Save the workflow

**HTTP Request nodes to check:**
- Check for Duplicates
- Update Status (Duplicate Skipped)
- Extract Document Text
- Analyze Chunking Strategy
- Chunk Document
- Generate Embeddings
- Store Chunks in Database
- Update Document Status (Success)
- Error Handler

### Step 3: Fix Error Workflow Configuration

1. Open workflow: "Document Chunking Analysis Pipeline"
2. Click the workflow settings (⚙️ icon or menu → Settings)
3. Find "Error Workflow" setting
4. **Change from:** `S1reDEFte3H0mHZZ` (itself)
5. **Change to:** `None` or create a dedicated error workflow
6. Save settings
7. Save workflow

### Step 4: Reactivate Workflow

1. Toggle workflow **OFF**
2. Wait 2 seconds
3. Toggle workflow **ON**
4. Watch for success message (no errors in logs)

### Step 5: Test the Workflow

**Option A: Using the n8n helper:**
```bash
source ./n8n-helper.sh
n8n_trigger_webhook "document-processing" '{
  "document_id": "test-123",
  "filename": "test.pdf",
  "mime_type": "application/pdf",
  "storage_path": "/data/uploads/test.pdf",
  "content_hash": "abc123def456",
  "file_content_base64": "JVBERi0xLjQK..."
}'
```

**Option B: Using curl directly:**
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": "test-123",
    "filename": "test.pdf",
    "mime_type": "application/pdf",
    "storage_path": "/data/uploads/test.pdf",
    "content_hash": "abc123"
  }' \
  http://localhost:5678/webhook/document-processing
```

**Expected Result:**
- HTTP 200 response
- Workflow executes without errors
- Check execution: `n8n_list_executions 1`
- Status should be "success" or "running"

## Verification Commands

### Check Workflow Status
```bash
source ./n8n-helper.sh
n8n_get_workflow "S1reDEFte3H0mHZZ" | jq '.active'
# Should return: true
```

### Check Recent Executions
```bash
n8n_list_executions 5
# Look for status: "success" instead of "error"
```

### Check n8n Logs
```bash
docker-compose logs n8n --tail=50 | grep -v "Rudder"
# Should NOT see "Forbidden" errors after fix
```

### Test Backend API Directly
```bash
curl -s \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4ZTUwNmM0NC0xNGY0LTQ0OTEtYWQxYi1kNmI5NDVjNjRhODEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYxMzE2MTgyLCJleHAiOjE3NjkwNTgwMDB9.mJo4CcB9Ie8hTOJJOfNic-U5Z7ss_KvCzuqYOY5P1js" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"content_hash":"test","filename":"test.pdf"}' \
  http://py.tip.localhost/api/n8n/check-duplicate | jq '.'

# Should return duplicate check result, NOT 403 Forbidden
```

## Technical Details

### Authentication Flow

```
n8n HTTP Request Node
  ↓
[Uses credential: backend-api-auth]
  ↓
Adds Header: Authorization: Bearer <token>
  ↓
backend-python receives request
  ↓
verify_n8n_api_key() checks Authorization header
  ↓
✅ Matches N8N_API_KEY → Allow request
❌ Missing/wrong → 403 Forbidden
```

### API Key Configuration

**Environment Variable:**
```bash
# .env file
N8N_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Backend Python:**
```python
# backend-python/src/routes/n8n_integration.py
N8N_API_KEY = os.getenv("N8N_API_KEY", "n8n-integration-secret-key")

async def verify_n8n_api_key(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401)

    token = authorization.replace("Bearer ", "")
    if token != N8N_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")
```

### Workflow Nodes Configuration

All HTTP Request nodes should have:
```json
{
  "authentication": "predefinedCredentialType",
  "nodeCredentialType": "httpHeaderAuth",
  "credentials": {
    "httpHeaderAuth": {
      "id": "bEsx9GvEEcyn6uH2",
      "name": "backend-api-auth"
    }
  }
}
```

## Success Criteria

- [ ] Credential `backend-api-auth` exists and is configured correctly
- [ ] All 9 HTTP Request nodes use the credential
- [ ] Error workflow setting removed or fixed
- [ ] Workflow activates without errors in logs
- [ ] Test webhook execution completes successfully
- [ ] No "Forbidden" errors in n8n logs
- [ ] Execution status shows "success" not "error"

## Troubleshooting

### Still Getting 403 Forbidden

1. **Verify credential configuration:**
   ```bash
   # Check credential exists
   curl -H "X-N8N-API-KEY: $N8N_API_KEY" \
     http://localhost:5678/api/v1/credentials | jq '.data[] | {id, name, type}'
   ```

2. **Check credential is applied to nodes:**
   ```bash
   curl -H "X-N8N-API-KEY: $N8N_API_KEY" \
     http://localhost:5678/api/v1/workflows/S1reDEFte3H0mHZZ | \
     jq '.nodes[] | select(.type == "n8n-nodes-base.httpRequest") | {name, credentials}'
   ```

3. **Verify API key in .env matches credential:**
   ```bash
   grep N8N_API_KEY .env
   # Should match the Bearer token value
   ```

### Webhook Not Triggering

1. **Check workflow is active:**
   ```bash
   n8n_get_workflow "S1reDEFte3H0mHZZ" | jq '.active'
   ```

2. **Test webhook directly:**
   ```bash
   curl -X POST \
     -H "Content-Type: application/json" \
     -d '{"test":"ping"}' \
     http://localhost:5678/webhook/document-processing
   ```

### Error Workflow Loop Persists

1. Open workflow settings
2. Set "Error Workflow" to empty/none
3. Save and reactivate

## Related Files

- Workflow configuration: Check n8n UI
- Backend routes: `/backend-python/src/routes/n8n_integration.py`
- Environment config: `/.env`
- Helper script: `/n8n-helper.sh`
- Previous diagnostic: `/diagnose-webhook-issue.md`

## Next Steps After Fix

1. **Test with real document upload** from frontend
2. **Monitor execution logs** for any remaining issues
3. **Verify document chunks** are stored in database
4. **Check embeddings** are generated correctly
5. **Test RAG query** functionality end-to-end

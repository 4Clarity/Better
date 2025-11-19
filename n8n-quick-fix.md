# Quick Fix: n8n Document Chunking Workflow

## 🔴 Critical Issue: Missing Authentication Credential

Your workflow is failing because the HTTP authentication credential doesn't exist or is misconfigured.

## 🚀 Quick Fix (5 minutes)

### Step 1: Create the Credential

1. Go to: http://n8n.tip.localhost
2. Click **"Credentials"** in left sidebar
3. Click **"+ Add Credential"**
4. Select **"Header Auth"**
5. Fill in:
   - **Name:** `backend-api-auth`
   - **Header Name:** `Authorization`
   - **Header Value:** `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4ZTUwNmM0NC0xNGY0LTQ0OTEtYWQxYi1kNmI5NDVjNjRhODEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYxMzE2MTgyLCJleHAiOjE3NjkwNTgwMDB9.mJo4CcB9Ie8hTOJJOfNic-U5Z7ss_KvCzuqYOY5P1js`
6. Click **"Save"**

### Step 2: Fix Error Workflow Loop

1. Open workflow: **"Document Chunking Analysis Pipeline"**
2. Click workflow settings (⚙️ icon)
3. Find **"Error Workflow"** setting
4. Change to **"None"** (currently set to itself causing a loop)
5. Save

### Step 3: Reactivate

1. Toggle workflow **OFF**
2. Wait 2 seconds
3. Toggle workflow **ON**

### Step 4: Test

```bash
source ./n8n-helper.sh
n8n_trigger_webhook "document-processing" '{"document_id":"test","filename":"test.pdf","mime_type":"application/pdf","content_hash":"abc123"}'
```

## ✅ Success Indicators

- No "Forbidden" errors in logs
- Execution status shows "success" not "error"
- Backend health check works:

```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4ZTUwNmM0NC0xNGY0LTQ0OTEtYWQxYi1kNmI5NDVjNjRhODEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYxMzE2MTgyLCJleHAiOjE3NjkwNTgwMDB9.mJo4CcB9Ie8hTOJJOfNic-U5Z7ss_KvCzuqYOY5P1js" \
  http://py.tip.localhost/api/n8n/health | jq '.'
```

Should return: `{"status": "healthy"}`

## 📖 Full Details

See: `docs/n8n-workflow-fix-guide.md` for complete investigation and troubleshooting.

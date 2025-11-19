# n8n Workflow Import Guide

## Changes Made

Fixed the Document Chunking Analysis Pipeline workflow with the following updates:

### 1. Expression Syntax Fix
**Problem:** Nodes were using `{{ $node['Webhook Trigger'].json.document_id }}` which doesn't work correctly when there are IF nodes or other nodes between the webhook trigger and the target node.

**Solution:** Updated all expressions to use the correct n8n syntax:
```javascript
// Old (incorrect)
{{ $node['Webhook Trigger'].json.document_id }}

// New (correct)
{{ $('Webhook Trigger').item.json.document_id }}
```

### 2. Removed Error Workflow Reference
**Problem:** The workflow was configured to call a non-existent error workflow, causing errors.

**Solution:** Removed the `"errorWorkflow": "error-notification-workflow"` setting.

### 3. Updated Nodes
All the following nodes were updated with the correct expression syntax:
- ✅ Extract Document Text
- ✅ Update Status (Duplicate Skipped)
- ✅ Analyze Chunking Strategy
- ✅ Chunk Document
- ✅ Generate Embeddings
- ✅ Store Chunks in Database
- ✅ Update Document Status (Success)
- ✅ Error Handler

## How to Import the Updated Workflow

### Option 1: Import via n8n UI (Recommended)

1. Open n8n at http://n8n.tip.localhost
2. Click on **Workflows** in the left sidebar
3. Find the existing "Document Chunking Analysis Pipeline" workflow
4. Click the **⋮** menu and select **Delete** (after backing up if needed)
5. Click the **Import** button (top right)
6. Select the file: `/Users/richardroach/Documents/Builder_Projects/Better/n8n/workflows/document-chunking-analysis-pipeline.json`
7. Click **Import**
8. **Activate** the workflow by clicking the toggle switch

### Option 2: Import via n8n CLI

```bash
# Copy the workflow file to n8n container
docker cp n8n/workflows/document-chunking-analysis-pipeline.json better-n8n-1:/tmp/

# Import using n8n CLI (if available)
docker exec better-n8n-1 n8n import:workflow --input=/tmp/document-chunking-analysis-pipeline.json
```

### Option 3: Restart n8n (Auto-import)

If you have n8n configured to auto-import workflows from a directory:

```bash
docker-compose restart n8n
```

## Post-Import Checklist

After importing the workflow:

- [ ] **Activate the workflow** - Toggle the switch in the n8n UI
- [ ] **Verify webhook URL** - Should be `http://localhost:5678/webhook/document-processing`
- [ ] **Check credentials** - Ensure `backend-api-auth` credential exists and is configured on all HTTP Request nodes
- [ ] **Test the workflow** - Run `bash test-workflow-now.sh` to verify it works

## Authentication Setup

The workflow requires a credential named `backend-api-auth` for all HTTP Request nodes. To create it:

1. Go to **Credentials** in n8n
2. Click **Add Credential**
3. Select **Header Auth**
4. Set:
   - Name: `backend-api-auth`
   - Header Name: `Authorization`
   - Header Value: `Bearer YOUR_API_TOKEN`
5. Save

## Testing

After import and setup, test the workflow:

```bash
bash test-workflow-now.sh
```

This will:
1. Check if the workflow is active
2. Verify backend health
3. Trigger the webhook with test data
4. Monitor execution
5. Report results

## Troubleshooting

### "Forbidden" Errors
- Ensure the `backend-api-auth` credential is configured on ALL HTTP Request nodes
- Verify the backend API is running: `docker-compose logs backend-python --tail=20`

### "Could not find errorTrigger" Errors
- This should be fixed by removing the error workflow setting
- If you still see this, check workflow settings and ensure `errorWorkflow` is not set

### Expression Errors
- All expressions now use `$('Node Name').item.json.field_name` syntax
- This is the recommended way to reference specific nodes in n8n

## Next Steps

Once the workflow is imported and working:
1. Test with real document uploads
2. Monitor execution logs in n8n UI
3. Check database for stored chunks: `docker exec better-db-1 psql -U user -d tip -c "SELECT * FROM knowledge_chunks LIMIT 5;"`

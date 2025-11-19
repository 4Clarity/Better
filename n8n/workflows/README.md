# n8n Workflow: Document Chunking Analysis Pipeline

## Overview

This workflow automates the complete document processing pipeline for the TIP Knowledge Management System, including:
- Duplicate detection and handling
- Text extraction from uploaded documents
- AI-powered chunking strategy analysis
- Document chunking with configurable overlap
- Embedding generation using local LLM
- Database storage of chunks with vector embeddings

## Workflow Structure

### Nodes (14 Total)

1. **Webhook Trigger** - Entry point for document processing requests
2. **Check for Duplicates** - Validates if document already exists
3. **IF Duplicate SKIP** - Branch logic for duplicate handling
4. **Update Status (Duplicate Skipped)** - Marks duplicates as skipped
5. **Extract Document Text** - Extracts text content from document
6. **Analyze Chunking Strategy** - AI determines optimal chunk size/overlap
7. **IF Analyze Error** - Handles analysis failures
8. **Use Fallback Strategy** - Applies default 600 token/10% overlap strategy
9. **Chunk Document** - Splits document into semantic chunks
10. **Generate Embeddings** - Creates vector embeddings for chunks
11. **Store Chunks in Database** - Persists chunks to PostgreSQL
12. **Update Document Status (Success)** - Marks processing complete
13. **Error Handler** - Catches and logs all processing failures

### Error Handling Strategy

All HTTP Request nodes include:
- **Retry Logic**: 3 attempts with 5-second delay
- **Exponential Backoff**: Built-in retry mechanism
- **Timeout**: 60 seconds per API call
- **Status Code Retry**: Automatic retry on 500-599 errors
- **Error Branching**: Failed nodes route to Error Handler

### Duplicate Detection Logic

The workflow supports three duplicate handling strategies:
1. **SKIP** - Mark as `DUPLICATE_SKIPPED` and end workflow
2. **CREATE_VERSION** - Continue processing with version metadata
3. **OVERWRITE** - Replace existing document (future enhancement)

## Import Instructions

### Prerequisites

1. **n8n Instance Running**
   ```bash
   docker-compose up -d n8n
   ```
   Access at: http://n8n.tip.localhost

2. **Backend Services Running**
   ```bash
   docker-compose up -d backend-python backend-node db
   ```

3. **Authentication Credentials**
   Create HTTP Header Auth credential in n8n:
   - Name: `backend-api-auth`
   - Header Name: `Authorization`
   - Header Value: `Bearer YOUR_API_TOKEN`

### Import Workflow

#### Method 1: Via n8n UI (Recommended)

1. Open n8n: http://n8n.tip.localhost
2. Click **Workflows** in the left sidebar
3. Click **Import from File** button
4. Select `document-chunking-analysis-pipeline.json`
5. Click **Import**
6. Configure credentials (see below)
7. Click **Activate** toggle to enable workflow

#### Method 2: Via REST API

```bash
curl -X POST http://n8n.tip.localhost/api/v1/workflows \
  -H "Content-Type: application/json" \
  -H "X-N8N-API-KEY: YOUR_API_KEY" \
  -d @document-chunking-analysis-pipeline.json
```

#### Method 3: Via n8n CLI

```bash
n8n import:workflow --input=document-chunking-analysis-pipeline.json
```

## Configuration

### 1. Set Up HTTP Header Auth Credential

1. Go to **Credentials** → **New**
2. Select **HTTP Header Auth**
3. Configure:
   - **Name**: `backend-api-auth`
   - **Header Name**: `Authorization`
   - **Header Value**: `Bearer YOUR_JWT_TOKEN`
4. Click **Save**

### 2. Apply Credential to All HTTP Request Nodes

For each HTTP Request node:
1. Click the node
2. Scroll to **Authentication** section
3. Select **Predefined Credential Type**
4. Choose **HTTP Header Auth**
5. Select credential: `backend-api-auth`

### 3. Verify Webhook URL

1. Click **Webhook Trigger** node
2. Copy the **Test URL** or **Production URL**
3. Expected format: `http://n8n.tip.localhost/webhook/document-processing`

### 4. Configure Error Workflow (Optional)

Create a separate error notification workflow:
1. Create new workflow: **Error Notification Workflow**
2. Add **Error Trigger** node
3. Add notification node (Slack, Email, Discord, etc.)
4. Configure message template:
   ```
   Workflow: {{$json.workflow.name}}
   Error: {{$json.execution.error.message}}
   Node: {{$json.execution.lastNodeExecuted}}
   URL: {{$json.execution.url}}
   ```
5. In main workflow settings, set **Error Workflow** to this workflow

## Testing the Workflow

### Test Webhook with curl

```bash
curl -X POST http://n8n.tip.localhost/webhook/document-processing \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": "test-doc-001",
    "filename": "test-document.pdf",
    "mime_type": "application/pdf",
    "storage_path": "/uploads/test-document.pdf",
    "file_content_base64": "JVBERi0xLjQKJeLjz9MKNSAwIG9i..."
  }'
```

### Expected Response (Immediate)

```json
{
  "status": "accepted",
  "message": "Document processing started",
  "workflow_id": "abc123",
  "execution_id": "xyz789"
}
```

### Monitor Execution

1. Go to **Executions** tab in n8n
2. Find the execution by ID
3. Click to view detailed execution log
4. Check each node's input/output data

### Verify Database Records

```sql
-- Check document status
SELECT document_id, processing_status, chunk_count, n8n_workflow_id
FROM knowledge_documents
WHERE document_id = 'test-doc-001';

-- Check stored chunks
SELECT chunk_id, chunk_index, chunk_text, char_count
FROM knowledge_chunks
WHERE document_id = 'test-doc-001'
ORDER BY chunk_index;

-- Verify embeddings
SELECT chunk_id, embedding <-> '[0,0,0,...]'::vector AS distance
FROM knowledge_chunks
WHERE document_id = 'test-doc-001'
LIMIT 5;
```

## Workflow Settings

### Timeout Configuration
- **Workflow Timeout**: 600 seconds (10 minutes)
- **Node Timeout**: 60 seconds per HTTP request
- **Retry Delay**: 5 seconds between attempts

### Execution Settings
- **Save Execution Progress**: Enabled (for debugging)
- **Save Manual Executions**: Enabled
- **Caller Policy**: `workflowsFromSameOwner` (security)

### Performance Tuning
- **Concurrent Executions**: 5 (recommended for production)
- **Execution Buffer**: 100 MB
- **Max Payload Size**: 50 MB

## API Endpoint Reference

All endpoints use the backend-python service:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/n8n/check-duplicate` | POST | Check if document already exists |
| `/api/n8n/extract-text` | POST | Extract text from document |
| `/api/n8n/analyze-chunking` | POST | AI-powered chunking strategy |
| `/api/n8n/chunk-document` | POST | Split document into chunks |
| `/api/n8n/generate-embeddings` | POST | Create vector embeddings |
| `/api/n8n/store-chunks` | POST | Persist chunks to database |
| `/api/n8n/update-status` | POST | Update document processing status |

## Troubleshooting

### Issue: Webhook not triggering

**Solution:**
1. Check workflow is **Active** (toggle in top-right)
2. Verify webhook path: `/webhook/document-processing`
3. Check n8n logs: `docker-compose logs n8n`

### Issue: Authentication failures

**Solution:**
1. Verify HTTP Header Auth credential is configured
2. Check JWT token is valid: `curl -H "Authorization: Bearer TOKEN" http://api.tip.localhost/api/health`
3. Ensure credential is selected in ALL HTTP Request nodes

### Issue: Timeout errors

**Solution:**
1. Check backend-python service is running: `docker-compose ps backend-python`
2. Increase node timeout in **Options** → **Timeout**: 120000 (2 minutes)
3. Check Ollama service: `curl http://host.docker.internal:11434/api/tags`

### Issue: Duplicate detection not working

**Solution:**
1. Verify `knowledge_documents` table exists
2. Check duplicate detection logic in backend-python
3. Test endpoint directly:
   ```bash
   curl -X POST http://py.tip.localhost/api/n8n/check-duplicate \
     -H "Content-Type: application/json" \
     -d '{"document_id": "test", "filename": "test.pdf"}'
   ```

### Issue: Embeddings generation fails

**Solution:**
1. Verify Ollama is running: `curl http://host.docker.internal:11434/api/tags`
2. Check model is available: `ollama list` (should show `nomic-embed-text`)
3. Test embeddings endpoint:
   ```bash
   curl -X POST http://py.tip.localhost/api/n8n/generate-embeddings \
     -H "Content-Type: application/json" \
     -d '{"document_id": "test", "chunks": [{"text": "test"}]}'
   ```

### Issue: Workflow stuck in "Running" state

**Solution:**
1. Check execution logs in n8n UI
2. Verify last node executed
3. Check backend-python logs: `docker-compose logs backend-python`
4. Manually stop execution: Click **Stop Execution** button

## Maintenance

### View Workflow Executions

```bash
# Last 10 executions
docker-compose exec n8n sh -c "n8n list:executions --limit=10"

# Failed executions only
docker-compose exec n8n sh -c "n8n list:executions --status=error"
```

### Clean Up Old Executions

n8n automatically retains executions for 7 days (configurable in workflow settings).

Manual cleanup:
1. Go to **Executions** tab
2. Select old executions
3. Click **Delete** button

### Backup Workflow

```bash
# Export workflow
docker-compose exec n8n sh -c "n8n export:workflow --id=WORKFLOW_ID --output=/data/backups/"

# Or download from UI
# Workflows → [Workflow Name] → ⋮ Menu → Download
```

## Integration with Backend Services

### Frontend Upload Flow

```typescript
// frontend/src/services/knowledgeApi.ts
export const uploadDocument = async (file: File, metadata: DocumentMetadata) => {
  // 1. Upload file to backend-node
  const uploadResponse = await axios.post('/api/knowledge/upload', formData);

  // 2. Backend-node triggers n8n webhook
  await axios.post('http://n8n:5678/webhook/document-processing', {
    document_id: uploadResponse.data.document_id,
    filename: file.name,
    mime_type: file.type,
    storage_path: uploadResponse.data.storage_path,
    file_content_base64: uploadResponse.data.file_content_base64
  });

  return uploadResponse.data;
};
```

### Backend Webhook Trigger

```typescript
// backend-node/src/routes/knowledge.routes.ts
fastify.post('/api/knowledge/upload', async (request, reply) => {
  // Save file to MinIO
  const storageResult = await minioService.upload(file);

  // Trigger n8n workflow
  const n8nResponse = await axios.post('http://n8n:5678/webhook/document-processing', {
    document_id: documentId,
    filename: file.name,
    mime_type: file.type,
    storage_path: storageResult.path,
    file_content_base64: fileBase64
  });

  return { document_id: documentId, status: 'processing' };
});
```

## Production Deployment

### Environment Variables

```bash
# n8n/.env
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=securepassword
N8N_HOST=n8n.production.com
N8N_PROTOCOL=https
N8N_PORT=443
WEBHOOK_URL=https://n8n.production.com/
EXECUTIONS_DATA_PRUNE=true
EXECUTIONS_DATA_MAX_AGE=168  # 7 days
```

### Security Checklist

- [ ] Enable Basic Auth or OAuth for n8n UI
- [ ] Use HTTPS for webhook endpoint
- [ ] Rotate JWT tokens regularly
- [ ] Restrict n8n network access (Docker network only)
- [ ] Enable execution data pruning
- [ ] Configure error workflow for alerts
- [ ] Set up monitoring/logging (Grafana, CloudWatch, etc.)

## Related Documentation

- [Story 2.2.1 - n8n Workflow Orchestration](../../docs/stories/2.2.1.n8n-workflow-orchestration.story.md)
- [Backend Python n8n Routes](../../backend-python/src/routes/knowledge.py)
- [n8n Official Documentation](https://docs.n8n.io/)
- [RAG Implementation Guide](../../docs/stories/2.2.rag-document-upload-vector-search.story.md)

## Support

For issues or questions:
1. Check workflow execution logs in n8n UI
2. Review backend-python logs: `docker-compose logs backend-python`
3. Test individual API endpoints with curl
4. Consult n8n community forum: https://community.n8n.io/

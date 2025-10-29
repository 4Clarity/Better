# TIP Agentic RAG - OpenAI Configuration Guide

## Overview

This guide covers configuring the TIP Agentic RAG system to use **OpenAI** for embeddings and chat completions instead of local Ollama models.

---

## Architecture Changes

### Original Template (Cole Medin)
- **Vector Database:** Supabase
- **Embeddings:** OpenAI
- **Storage:** Google Drive

### TIP Agentic RAG (Current)
- **Vector Database:** ✅ PostgreSQL + pgvector (local)
- **Embeddings:** ✅ OpenAI `text-embedding-ada-002`
- **Chat Model:** ✅ OpenAI `gpt-4`
- **Storage:** ✅ MinIO (S3-compatible, local)

**Key Benefit:** Uses PostgreSQL for vector storage (no external vector DB required) with OpenAI for AI capabilities.

---

## Prerequisites

### 1. OpenAI API Key

You need an OpenAI API key with access to:
- `text-embedding-ada-002` (embeddings)
- `gpt-4` or `gpt-3.5-turbo` (chat completion)

**Get your API key:**
1. Sign up at https://platform.openai.com/
2. Go to API Keys section
3. Create new secret key
4. Copy and save securely

**Pricing (as of 2024):**
- `text-embedding-ada-002`: $0.0001 per 1K tokens
- `gpt-4`: $0.03 per 1K input tokens, $0.06 per 1K output tokens
- `gpt-3.5-turbo`: $0.001 per 1K tokens (more economical option)

### 2. PostgreSQL with pgvector

Already configured in TIP:
```bash
# Verify pgvector extension
docker-compose exec db psql -U user -d tip -c "\dx vector"
```

### 3. n8n Workflow Automation

Already running at `http://n8n.tip.localhost`

---

## Configuration Steps

### Step 1: Set OpenAI API Key in Backend

Add to `backend-node/.env`:

```bash
# OpenAI Configuration
OPENAI_API_KEY="sk-your-actual-api-key-here"
OPENAI_MODEL="text-embedding-ada-002"
OPENAI_CHAT_MODEL="gpt-4"  # or gpt-3.5-turbo for lower cost
```

**Restart backend:**
```bash
docker-compose restart backend-node
```

### Step 2: Create OpenAI Credential in n8n

1. Open n8n: `http://n8n.tip.localhost`
2. Go to: **Settings** → **Credentials** → **New Credential**
3. Search: "OpenAI"
4. Select: **OpenAI API**
5. Configure:
   ```yaml
   Name: OpenAI API
   API Key: sk-your-actual-api-key-here
   ```
6. **Test Connection** (optional but recommended)
7. Click **Save**
8. **Copy the Credential ID** (you'll need this for workflows)

**Finding Credential ID:**
- After saving, click on the credential again
- Look at URL: `http://n8n.tip.localhost/credentials/[ID]`
- Copy the ID value

---

### Step 3: Import Enhanced Workflows

The workflows have been pre-configured to use OpenAI.

#### Import Document Processing Workflow

1. Go to: **Workflows** → **Add Workflow** → **Import from File**
2. Select: `TIP_Document_Processing_Enhanced_Workflow.json`
3. **Update Credentials:**

   For each node with credential requirements:

   **a) PostgreSQL nodes** (8 nodes):
   - Update Status - Analyzing
   - Create Version Record
   - Insert Chunks to PostgreSQL
   - Add to Curation Queue
   - Auto-Approve High Quality
   - Mark for Manual Review
   - Handle Error

   For each: Click node → Credentials dropdown → Select "TIP PostgreSQL"

   **b) OpenAI Embeddings node** (1 node):
   - Embeddings OpenAI

   Click node → Credentials dropdown → Select "OpenAI API"

4. **Copy Webhook URL:**
   - Click "Document Upload Webhook" node
   - Copy URL (e.g., `http://n8n:5678/webhook/tip-document-processing-enhanced`)

5. **Toggle Active** (top-right switch)

#### Import RAG Agent Workflow

1. **Workflows** → **Add Workflow** → **Import from File**
2. Select: `TIP_Agentic_RAG_Enhanced_Workflow.json`
3. **Update Credentials:**

   **a) OpenAI nodes** (2 nodes):
   - OpenAI Chat Model
   - Embeddings OpenAI

   For each: Click node → Credentials dropdown → Select "OpenAI API"

   **b) PostgreSQL nodes** (4 nodes):
   - Knowledge Vector Store Tool
   - Get Full Document Tool
   - SQL Query Tool
   - PostgreSQL Chat Memory

   For each: Click node → Credentials dropdown → Select "TIP PostgreSQL"

4. **Copy Webhook URL:**
   - Click "When chat message received" node
   - Copy URL (e.g., `http://n8n:5678/webhook/tip-rag-chat-enhanced`)

5. **Toggle Active**

---

### Step 4: Configure Backend Python Webhook

Update `backend-python/.env`:

```bash
# n8n Integration
N8N_ENABLED=true
N8N_DOCUMENT_PROCESSING_WEBHOOK=http://n8n:5678/webhook/tip-document-processing-enhanced
N8N_RAG_CHAT_WEBHOOK=http://n8n:5678/webhook/tip-rag-chat-enhanced
```

**Restart backend-python:**
```bash
docker-compose restart backend-python

# Verify configuration
docker-compose exec backend-python sh -c 'env | grep N8N'
```

---

## Testing the Configuration

### Test 1: Verify OpenAI Connection (2 minutes)

**Test embeddings:**
```bash
# Create test workflow execution in n8n
# Or test via API:
curl -X POST http://n8n.tip.localhost/webhook/tip-document-processing-enhanced \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": "test-doc-001",
    "filename": "test.txt",
    "file_content": "'"$(echo 'This is a test document for OpenAI embeddings.' | base64)"'",
    "mime_type": "text/plain",
    "uploaded_by": "test-user"
  }'
```

**Check n8n execution:**
1. Open n8n
2. Go to **Executions** tab
3. Look for recent execution
4. Verify "Embeddings OpenAI" node succeeded (green checkmark)

**Expected output:**
- Execution status: Success
- Embeddings generated: Array of 1536 dimensions (text-embedding-ada-002)
- No errors from OpenAI API

### Test 2: Verify Database Storage (1 minute)

```bash
# Check chunks were stored with embeddings
docker-compose exec db psql -U user -d tip -c "
  SELECT
    id,
    document_id,
    vector_model,
    array_length(embedding, 1) as embedding_dimensions
  FROM knowledge_document_chunks
  WHERE vector_model = 'text-embedding-ada-002'
  LIMIT 1;
"
```

**Expected output:**
```
 id | document_id | vector_model | embedding_dimensions
----+-------------+--------------+---------------------
... | test-doc... | text-embedding-ada-002 | 1536
```

### Test 3: Test RAG Query with OpenAI (2 minutes)

```bash
curl -X POST http://n8n.tip.localhost/webhook/tip-rag-chat-enhanced \
  -H "Content-Type: application/json" \
  -d '{
    "chatInput": "What is this test document about?",
    "sessionId": "test-session-openai",
    "userId": "test-user"
  }'
```

**Expected response:**
```json
{
  "response": "Based on the knowledge base, this appears to be a test document designed to verify OpenAI embeddings functionality. [Source: test.txt]",
  "sessionId": "test-session-openai",
  "timestamp": "2025-10-26T..."
}
```

**Check n8n execution:**
- Both "OpenAI Chat Model" and "Embeddings OpenAI" nodes should succeed
- Response should be coherent and cite source document

---

## Troubleshooting

### Error: "Invalid API Key"

**Problem:** OpenAI returns 401 Unauthorized

**Solution:**
```bash
# Verify API key format (should start with sk-)
docker-compose exec backend-node sh -c 'echo $OPENAI_API_KEY'

# Check n8n credential
# Go to n8n → Settings → Credentials → OpenAI API
# Re-enter API key, click Test Connection

# If still failing, regenerate API key at https://platform.openai.com/api-keys
```

### Error: "Rate Limit Exceeded"

**Problem:** OpenAI returns 429 Too Many Requests

**Solution:**
1. Check your OpenAI usage: https://platform.openai.com/usage
2. Upgrade OpenAI plan if needed
3. Add rate limiting in n8n:
   - Add "Wait" node between chunking and embeddings
   - Set delay: 1 second per chunk

**Or switch to batch processing:**
```javascript
// In n8n Code node before embeddings:
const items = $input.all();
const batches = [];
for (let i = 0; i < items.length; i += 100) {
  batches.push(items.slice(i, i + 100));
}
return batches[0]; // Process first batch, then continue
```

### Error: "Model Not Found"

**Problem:** OpenAI returns 404 for model

**Solution:**
```bash
# Check available models
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY" | jq '.data[] | select(.id | contains("embedding"))'

# Update workflow to use available model:
# In n8n, click "Embeddings OpenAI" node
# Change model to: text-embedding-ada-002 (or text-embedding-3-small/large)
```

### Error: "Insufficient Quota"

**Problem:** OpenAI returns 429 with quota message

**Solution:**
1. Add payment method: https://platform.openai.com/account/billing
2. Set usage limits to prevent overspending
3. Monitor usage in OpenAI dashboard

### Error: "Embedding Dimension Mismatch"

**Problem:** PostgreSQL rejects embedding vector

**Current vector dimension:** 768 (configured for Ollama nomic-embed-text)
**OpenAI dimension:** 1536 (text-embedding-ada-002)

**Solution - Update Database Schema:**

```bash
# Connect to database
docker-compose exec db psql -U user -d tip

# Update vector dimension
ALTER TABLE knowledge_document_chunks
ALTER COLUMN embedding TYPE vector(1536);

# Rebuild vector index
DROP INDEX IF EXISTS idx_knowledge_document_chunks_embedding;

CREATE INDEX idx_knowledge_document_chunks_embedding
ON knowledge_document_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

# Verify
\d knowledge_document_chunks
```

**Expected output:**
```
 embedding | vector(1536) |
```

### No Results from Vector Search

**Problem:** RAG queries return no relevant chunks

**Possible causes:**
1. Wrong vector dimension (see above)
2. Similarity threshold too high
3. No embeddings stored

**Solution:**

```bash
# Check if embeddings exist
docker-compose exec db psql -U user -d tip -c "
  SELECT COUNT(*) as total_chunks,
         COUNT(embedding) as chunks_with_embeddings,
         vector_model
  FROM knowledge_document_chunks
  GROUP BY vector_model;
"

# Lower similarity threshold in RAG workflow
# In n8n → TIP RAG Agent workflow → Knowledge Vector Store Tool
# Change from 0.7 to 0.5
```

---

## Cost Estimation

### Typical Document Processing

**Document:** 10-page PDF (~5,000 words)

**Embeddings:**
- Chunks: ~15 chunks (500 tokens each)
- Total tokens: 7,500
- Cost: 7.5 * $0.0001 = **$0.00075** per document

**RAG Query:**
- User query: ~50 tokens
- Retrieved context: ~1,500 tokens
- GPT-4 response: ~300 tokens
- Cost: (50 + 1,500) * $0.03 + 300 * $0.06 = **$0.065** per query

### Monthly Estimates

**Scenario: Medium Organization**
- Documents processed: 100/month
- Queries: 1,000/month

**Monthly cost:**
- Document processing: 100 * $0.00075 = $0.075
- RAG queries: 1,000 * $0.065 = $65.00
- **Total: ~$65/month**

**To reduce costs:**
1. Use `gpt-3.5-turbo` instead of `gpt-4` (10x cheaper)
2. Cache common queries
3. Reduce context window size (fewer retrieved chunks)
4. Use OpenAI's cheaper embedding models (text-embedding-3-small)

---

## Alternative Embedding Models

### text-embedding-3-small (Newer, Cheaper)

**Advantages:**
- Lower cost: $0.00002 per 1K tokens (5x cheaper)
- Faster processing
- Good quality for most use cases

**Update workflow:**
```json
{
  "parameters": {
    "model": "text-embedding-3-small"
  }
}
```

**Database update required:**
```sql
-- text-embedding-3-small uses 1536 dimensions (same as ada-002)
-- No schema change needed if already using 1536
```

### text-embedding-3-large (Higher Quality)

**Advantages:**
- Best quality embeddings
- 3072 dimensions

**Update database:**
```sql
ALTER TABLE knowledge_document_chunks
ALTER COLUMN embedding TYPE vector(3072);

-- Rebuild index
DROP INDEX IF EXISTS idx_knowledge_document_chunks_embedding;
CREATE INDEX idx_knowledge_document_chunks_embedding
ON knowledge_document_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

---

## Monitoring OpenAI Usage

### Dashboard Queries

**Check embedding usage:**
```sql
-- Total documents processed with OpenAI
SELECT COUNT(*) as documents,
       SUM(array_length(embedding, 1)) as total_dimensions
FROM knowledge_document_chunks
WHERE vector_model LIKE 'text-embedding%';
```

**Estimate monthly cost:**
```sql
-- Approximate token count (based on content length)
SELECT
  COUNT(*) as chunks,
  SUM(LENGTH(content) / 4) as estimated_tokens,
  ROUND((SUM(LENGTH(content) / 4) * 0.0001)::numeric, 4) as estimated_cost_usd
FROM knowledge_document_chunks
WHERE vector_model = 'text-embedding-ada-002'
AND created_at >= CURRENT_DATE - INTERVAL '30 days';
```

### OpenAI Dashboard

Monitor usage at: https://platform.openai.com/usage

- Set spending limits
- View per-model usage
- Download usage reports

---

## Migration from Ollama to OpenAI

If you previously used Ollama embeddings:

### Step 1: Backup Existing Data

```bash
# Export existing chunks
docker-compose exec db pg_dump -U user -d tip \
  -t knowledge_document_chunks \
  --data-only > /tmp/chunks_backup.sql
```

### Step 2: Update Vector Dimension

```sql
-- Change from 768 (Ollama) to 1536 (OpenAI)
ALTER TABLE knowledge_document_chunks
ALTER COLUMN embedding TYPE vector(1536);
```

### Step 3: Clear Old Embeddings (Optional)

```sql
-- Mark documents for reprocessing
UPDATE knowledge_documents
SET upload_status = 'UPLOADED',
    curation_status = 'pending'
WHERE id IN (
  SELECT DISTINCT document_id
  FROM knowledge_document_chunks
  WHERE vector_model = 'nomic-embed-text'
);

-- Delete old chunks
DELETE FROM knowledge_document_chunks
WHERE vector_model = 'nomic-embed-text';
```

### Step 4: Reprocess Documents

Trigger document upload webhook for each document to regenerate embeddings with OpenAI.

---

## Best Practices

### 1. API Key Security

❌ **DON'T:**
- Commit API keys to git
- Share API keys in public channels
- Use same API key across environments

✅ **DO:**
- Store in .env files (gitignored)
- Use separate keys for dev/staging/prod
- Rotate keys periodically
- Set spending limits

### 2. Cost Optimization

✅ **Strategies:**
- Cache embeddings (don't regenerate for same content)
- Use content hashing to detect duplicates
- Batch process documents during off-peak hours
- Start with `gpt-3.5-turbo` before upgrading to `gpt-4`
- Use smaller context windows (fewer retrieved chunks)

### 3. Error Handling

✅ **Implement:**
- Retry logic with exponential backoff
- Fallback to cached responses when API is down
- Alert on repeated API failures
- Log all OpenAI errors for debugging

### 4. Performance

✅ **Optimize:**
- Process documents asynchronously
- Use n8n's batch processing features
- Monitor embedding generation time
- Scale horizontally (multiple n8n instances)

---

## Summary Checklist

- [ ] OpenAI API key obtained and tested
- [ ] OpenAI credential created in n8n
- [ ] Enhanced workflows imported
- [ ] Workflow credentials configured (OpenAI + PostgreSQL)
- [ ] Backend .env updated with webhooks
- [ ] PostgreSQL vector dimension updated to 1536
- [ ] Vector index rebuilt
- [ ] Test document processed successfully
- [ ] Embeddings stored in database
- [ ] RAG query returns correct response
- [ ] OpenAI usage monitored
- [ ] Cost limits set (optional)
- [ ] Error alerts configured (optional)

---

## Support Resources

**OpenAI Documentation:**
- API Reference: https://platform.openai.com/docs/api-reference
- Embeddings Guide: https://platform.openai.com/docs/guides/embeddings
- Rate Limits: https://platform.openai.com/docs/guides/rate-limits

**TIP Agentic RAG:**
- Main README: `README.md`
- Deployment Guide: `ENHANCED_DEPLOYMENT_GUIDE.md`
- Architecture: `ENHANCED_ARCHITECTURE.md`

**n8n:**
- OpenAI Nodes: https://docs.n8n.io/integrations/builtin/credentials/openai/
- PostgreSQL Nodes: https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.postgres/

---

**Configuration Time:** ~20 minutes
**First Document Processing:** ~5 minutes
**Total Time to Production:** ~25 minutes

🚀 **OpenAI integration complete!**

# TIP Agentic RAG Configuration Guide

This guide walks through configuring the TIP Agentic RAG workflows in n8n.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Credentials Setup](#credentials-setup)
3. [Workflow Import](#workflow-import)
4. [Workflow Configuration](#workflow-configuration)
5. [Backend Integration](#backend-integration)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### 1. Verify TIP Services Running

```bash
# From project root
docker-compose ps
```

Ensure these services are running:
- ✅ `db` (PostgreSQL)
- ✅ `backend-node` (Node.js API)
- ✅ `backend-python` (Python API)
- ✅ `n8n` (n8n workflow automation)
- ✅ `minio` (Object storage)

If not running:
```bash
docker-compose up -d db backend-node backend-python n8n minio
```

### 2. Verify PostgreSQL Extensions

```bash
# Connect to database
docker-compose exec db psql -U postgres -d tip

# Check pgvector extension
\dx

# Should show:
# vector | 0.8.0 | public | vector data type and ivfflat and hnsw access methods
```

If pgvector not installed:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3. Verify Ollama Running

```bash
# Check Ollama health
curl http://localhost:11434/api/tags

# Should return list of installed models
# Ensure nomic-embed-text is available
```

If nomic-embed-text not installed:
```bash
ollama pull nomic-embed-text
```

---

## Credentials Setup

### Step 1: Access n8n

Open browser: `http://n8n.tip.localhost`

Login with n8n credentials (configured in `.env`).

### Step 2: Create PostgreSQL Credential

1. Navigate to **Settings** → **Credentials** → **New**
2. Search for **"Postgres"**
3. Configure:

```yaml
Name: TIP PostgreSQL
Host: db
Port: 5432
Database: tip
User: user
Password: password
SSL: Disable
```

4. Click **Save**
5. Copy the credential ID (needed for workflow configuration)

### Step 3: Create HTTP Header Auth Credential (Optional)

For webhook security:

1. Navigate to **Settings** → **Credentials** → **New**
2. Search for **"Header Auth"**
3. Configure:

```yaml
Name: TIP API Auth
Header Name: x-api-key
Value: {{ YOUR_SECURE_API_KEY }}
```

4. Click **Save**

### Step 4: Create OpenAI Credential (if using OpenAI)

If using OpenAI instead of Ollama for chat:

1. Navigate to **Settings** → **Credentials** → **New**
2. Search for **"OpenAI"**
3. Configure:

```yaml
Name: OpenAI API
API Key: {{ YOUR_OPENAI_API_KEY }}
```

4. Click **Save**

**Alternative: Use Ollama Chat Model**

To use local Ollama instead:
- Replace "OpenAI Chat Model" node with "Ollama Chat Model" node
- Configure base URL: `http://host.docker.internal:11434`
- Model: `llama3.1:8b` or your preferred model

---

## Workflow Import

### Step 1: Import Document Processing Workflow

1. In n8n, click **Workflows** → **Add Workflow** → **Import from File**
2. Select: `TIP_Document_Processing_Workflow.json`
3. Click **Import**

### Step 2: Import RAG AI Agent Workflow

1. In n8n, click **Workflows** → **Add Workflow** → **Import from File**
2. Select: `TIP_Agentic_RAG_Workflow.json`
3. Click **Import**

---

## Workflow Configuration

### Configure Document Processing Workflow

#### 1. Update Credential Placeholders

The workflow JSON contains placeholders like `{{ POSTGRES_CREDENTIAL_ID }}`. Replace these:

**Method A: Manual Update (Recommended)**
1. Open the workflow in n8n
2. For each node with a credential:
   - Click the node
   - In the right panel, select the credential dropdown
   - Choose the credential you created (e.g., "TIP PostgreSQL")
3. Save the workflow

**Nodes requiring credentials:**
- Update Status - Analyzing
- Insert into PostgreSQL Vector Store
- Insert Tabular Rows
- Update Status - Completed (Tabular)
- Update Status - Completed (Text)
- Error Handler

**Method B: Find & Replace in JSON**
1. Export the workflow
2. Open in text editor
3. Replace `{{ POSTGRES_CREDENTIAL_ID }}` with actual credential ID
4. Re-import

#### 2. Configure Webhook URL

1. Click on **"Document Upload Webhook"** node
2. Note the webhook URL (e.g., `http://n8n.tip.localhost/webhook/tip-document-processing`)
3. Copy this URL - you'll need it for backend configuration

#### 3. Configure Ollama Connection

The workflow uses Ollama for embeddings. Verify configuration:

1. Click **"Embeddings Ollama"** node
2. Check settings:
   - Model: `nomic-embed-text`
   - Base URL: `http://host.docker.internal:11434`

**Note:** `host.docker.internal` allows n8n container to access Ollama running on host machine.

#### 4. Activate Workflow

1. Click the **Activate** toggle in top-right corner
2. Workflow should show status: "Active"

### Configure RAG AI Agent Workflow

#### 1. Update Credential Placeholders

Similar to Document Processing workflow, update credentials for these nodes:
- Postgres Chat Memory
- List Documents
- Get File Contents
- Query Document Rows

#### 2. Configure Vector Store

1. Click **"TIP Vector Store"** node
2. Verify settings:
   - Mode: `retrieve-as-tool`
   - Tool Name: `knowledge_search`
   - Table Name: `knowledge_document_chunks`
   - Query Name: `match_knowledge_document_chunks`
   - Top K: `5` (can adjust for more/fewer results)

#### 3. Update System Prompt (Optional)

To customize the AI agent's behavior:

1. Click **"TIP RAG AI Agent"** node
2. In **Options** → **System Message**, edit the prompt
3. Example customizations:
   - Add specific domain knowledge
   - Adjust tone (formal/casual)
   - Add output formatting instructions
   - Specify security handling procedures

#### 4. Configure Chat Webhook

1. Click **"When chat message received"** node
2. Note the chat URL (e.g., `http://n8n.tip.localhost/webhook/tip-rag-chat`)
3. This URL will be used by TIP frontend for chat integration

#### 5. Activate Workflow

1. Click the **Activate** toggle
2. Workflow should show status: "Active"

---

## Backend Integration

### Update backend-python Configuration

Edit `backend-python/.env`:

```bash
# Enable n8n integration
N8N_ENABLED=true
N8N_DOCUMENT_PROCESSING_WEBHOOK=http://n8n:5678/webhook/tip-document-processing

# n8n API configuration (for monitoring)
N8N_API_URL=http://n8n:5678
N8N_API_KEY=your-n8n-api-key-here
```

**Important Notes:**
- Use `http://n8n:5678` (Docker internal network) not `http://n8n.tip.localhost`
- The webhook path must match the path configured in n8n workflow
- Restart backend-python after changes: `docker-compose restart backend-python`

### Verify Environment Variables

```bash
# Check backend-python env vars
docker-compose exec backend-python sh -c 'env | grep N8N'

# Expected output:
# N8N_ENABLED=true
# N8N_DOCUMENT_PROCESSING_WEBHOOK=http://n8n:5678/webhook/tip-document-processing
# N8N_API_URL=http://n8n:5678
```

### Update Frontend Configuration (Future)

When integrating chat interface in frontend:

```typescript
// frontend/src/services/chatApi.ts

const N8N_CHAT_WEBHOOK = process.env.REACT_APP_N8N_CHAT_WEBHOOK ||
  'http://n8n.tip.localhost/webhook/tip-rag-chat';

export async function sendChatMessage(message: string, sessionId: string) {
  const response = await fetch(N8N_CHAT_WEBHOOK, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.REACT_APP_N8N_API_KEY || ''
    },
    body: JSON.stringify({
      chatInput: message,
      sessionId: sessionId,
      userId: getCurrentUserId()
    })
  });

  return response.json();
}
```

---

## Testing

### Test 1: Database Migration

Verify tables and functions exist:

```bash
docker-compose exec db psql -U postgres -d tip
```

```sql
-- Check tables
\dt document_rows

-- Check functions
\df match_knowledge_document_chunks
\df get_document_full_text

-- Check views
\dv document_processing_summary
\dv vector_search_readiness
```

Expected output: All objects should exist.

### Test 2: Document Upload

```bash
# Create a test file
echo "This is a sample document about government transition planning. It covers key milestones, stakeholder responsibilities, and knowledge transfer procedures." > /tmp/test-doc.txt

# Upload via Python API
curl -X POST http://api.tip.localhost/api/knowledge/upload \
  -F "file=@/tmp/test-doc.txt" \
  -F "uploaded_by=demo-user-id" \
  -F "security_classification=UNCLASSIFIED"

# Response should include:
# {
#   "document_id": "...",
#   "status": "UPLOADED",
#   "message": "Document uploaded successfully. Processing in background."
# }
```

### Test 3: Monitor Processing

#### Option A: Via n8n UI

1. Open n8n: `http://n8n.tip.localhost`
2. Navigate to **Workflows** → **TIP Document Processing**
3. Click **Executions** tab
4. Look for recent execution
5. Click to view execution details
6. Verify all nodes executed successfully (green checkmarks)

#### Option B: Via Database

```sql
-- Check document status
SELECT id, filename, upload_status, chunk_count, processing_error
FROM knowledge_documents
ORDER BY created_at DESC
LIMIT 5;

-- Expected: upload_status should progress UPLOADED → ANALYZING → COMPLETED
```

### Test 4: Verify Chunks Created

```sql
-- Count chunks
SELECT COUNT(*) FROM knowledge_document_chunks;

-- View sample chunks
SELECT id, document_id, chunk_index,
       LEFT(content, 100) as content_preview,
       token_count,
       vector_model
FROM knowledge_document_chunks
ORDER BY created_at DESC
LIMIT 5;

-- Check embeddings exist
SELECT COUNT(*) as chunks_with_embeddings
FROM knowledge_document_chunks
WHERE embedding IS NOT NULL;
```

### Test 5: Vector Search

```sql
-- Get a test embedding (normally from Ollama)
SELECT embedding INTO TEMP TABLE test_embedding
FROM knowledge_document_chunks
LIMIT 1;

-- Test similarity search
SELECT id, content, similarity, filename
FROM match_knowledge_document_chunks(
  query_embedding := (SELECT embedding FROM test_embedding),
  match_count := 5,
  similarity_threshold := 0.5
);

-- Should return up to 5 similar chunks
```

### Test 6: RAG Query (via n8n Chat)

#### Option A: Using n8n Chat UI

1. Open n8n workflow: **TIP RAG AI Agent**
2. Click **Chat** button in top-right
3. Type a question: "What are the key milestones for transition planning?"
4. Verify response includes:
   - Direct answer
   - Source citations
   - Relevant context from uploaded documents

#### Option B: Using curl

```bash
curl -X POST http://n8n.tip.localhost/webhook/tip-rag-chat \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "chatInput": "What are the key milestones for transition planning?",
    "sessionId": "test-session-123",
    "userId": "demo-user-id"
  }'
```

### Test 7: SQL Query Tool (Tabular Data)

Upload a CSV file:

```bash
# Create sample contract data
cat > /tmp/contracts.csv <<EOF
contractor,contract_number,contract_value,status
Acme Corp,FA8625-20-C-0001,1500000,Active
Beta Inc,FA8625-20-C-0002,2300000,Active
Gamma LLC,FA8625-20-C-0003,750000,Completed
EOF

# Upload
curl -X POST http://api.tip.localhost/api/knowledge/upload \
  -F "file=@/tmp/contracts.csv" \
  -F "uploaded_by=demo-user-id" \
  -F "security_classification=UNCLASSIFIED"
```

Wait for processing (check status), then test query:

```bash
# Via n8n chat
curl -X POST http://n8n.tip.localhost/webhook/tip-rag-chat \
  -H "Content-Type: application/json" \
  -d '{
    "chatInput": "What is the total value of all active contracts?",
    "sessionId": "test-session-456",
    "userId": "demo-user-id"
  }'

# Expected: Agent should use SQL tool to query document_rows table
# and return: $3,800,000
```

---

## Troubleshooting

### Issue: Document Status Stuck at "UPLOADED"

**Cause:** Webhook not reaching n8n or workflow not activated

**Solution:**
1. Check workflow is activated (toggle in n8n UI)
2. Verify webhook URL in backend-python `.env`
3. Test webhook manually:
   ```bash
   curl -X POST http://n8n:5678/webhook/tip-document-processing \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'
   ```
4. Check n8n logs: `docker-compose logs n8n | grep webhook`

### Issue: Document Status "FAILED" with Ollama Error

**Cause:** Ollama not accessible from n8n container

**Solution:**
1. Verify Ollama running: `curl http://localhost:11434/api/tags`
2. Check n8n can reach host:
   ```bash
   docker-compose exec n8n sh
   curl http://host.docker.internal:11434/api/tags
   ```
3. If fails, ensure Docker Desktop "Allow the default Docker socket" is enabled
4. Alternative: Run Ollama in Docker and use `http://ollama:11434`

### Issue: Vector Search Returns No Results

**Cause:** IVFFlat index not built or embeddings missing

**Solution:**
1. Check embeddings exist:
   ```sql
   SELECT COUNT(*) FROM knowledge_document_chunks WHERE embedding IS NOT NULL;
   ```
2. Rebuild IVFFlat index:
   ```sql
   REINDEX INDEX idx_knowledge_document_chunks_embedding;
   ```
3. Verify function signature matches:
   ```sql
   \df match_knowledge_document_chunks
   ```

### Issue: RAG Agent Always Returns "I don't know"

**Cause:** Similarity threshold too high or vector model mismatch

**Solution:**
1. Lower similarity threshold in function call (try 0.5 instead of 0.7)
2. Verify embedding dimensions match:
   ```sql
   SELECT vector_dims(embedding) FROM knowledge_document_chunks LIMIT 1;
   -- Should return: 768 (for nomic-embed-text)
   ```
3. Check vector store configuration in n8n matches table schema

### Issue: Chat Memory Not Working

**Cause:** PostgreSQL chat memory table not created

**Solution:**
1. Check if table exists:
   ```sql
   \dt *chat*
   ```
2. If missing, n8n should auto-create it on first use
3. Manually create if needed:
   ```sql
   CREATE TABLE IF NOT EXISTS n8n_chat_histories (
     session_id VARCHAR(255) PRIMARY KEY,
     messages JSONB NOT NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

### Issue: Webhook Authentication Failures

**Cause:** API key mismatch between n8n and backend

**Solution:**
1. Verify same API key in both locations:
   - n8n credential: "TIP API Auth"
   - backend-python `.env`: N8N_API_KEY
2. Test without authentication first (disable in webhook node)
3. Re-enable once working

### Issue: Tabular Data Not Queryable

**Cause:** Schema not stored or JSONB structure incorrect

**Solution:**
1. Check schema stored:
   ```sql
   SELECT id, filename, chunking_strategy
   FROM knowledge_documents
   WHERE mime_type LIKE '%spreadsheet%' OR mime_type = 'text/csv';
   ```
2. Verify JSONB structure:
   ```sql
   SELECT row_data FROM document_rows LIMIT 1;
   -- Should show: {"column1": "value1", "column2": "value2", ...}
   ```
3. Test manual query:
   ```sql
   SELECT row_data->>'contractor' FROM document_rows LIMIT 5;
   ```

---

## Performance Optimization

### For Large Datasets (>10,000 chunks)

```sql
-- Increase IVFFlat lists (more clusters = better accuracy, slower build)
DROP INDEX idx_knowledge_document_chunks_embedding;
CREATE INDEX idx_knowledge_document_chunks_embedding
  ON knowledge_document_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 500);  -- Increased from 100

-- Or switch to HNSW index (better accuracy, slower build)
DROP INDEX idx_knowledge_document_chunks_embedding;
CREATE INDEX idx_knowledge_document_chunks_embedding
  ON knowledge_document_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

### Adjust Chunk Settings

In Document Processing workflow, edit **Character Text Splitter** node:
- Chunk Size: 800 (default) - smaller = more granular, more chunks
- Chunk Overlap: 100 (default) - higher = more context, more duplicates

### Cache Embeddings

For frequently queried text, cache embeddings:

```sql
CREATE TABLE query_embedding_cache (
  query_text TEXT PRIMARY KEY,
  embedding vector(768),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_query_embedding_cache_embedding
  ON query_embedding_cache USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

---

## Next Steps

1. **Integrate with TIP Frontend**
   - Add chat component that calls n8n RAG agent webhook
   - Display document sources with citations
   - Implement streaming responses for better UX

2. **Add Advanced RAG Techniques**
   - Hybrid search (vector + keyword)
   - Re-ranking with LLM
   - Query expansion
   - Document summaries

3. **Monitor and Improve**
   - Track query performance metrics
   - Analyze common questions
   - Tune chunk size based on query patterns
   - Add user feedback loop for answer quality

4. **Security Hardening**
   - Implement JWT authentication for webhooks
   - Add rate limiting
   - Audit logging for all queries
   - Row-level security based on user clearance

---

**Configuration Complete!** 🎉

You should now have a fully functional TIP Agentic RAG system integrated with n8n.

# TIP Agentic RAG - Deployment Guide

## Overview

This guide explains how to deploy the TIP Agentic RAG n8n workflows to work with your TIP Application database.

---

## Important: Database Schema Requirements

The n8n Agentic RAG workflows require **dedicated database tables** that are separate from TIP's existing knowledge management tables. This separation ensures:

- ✅ **No conflicts** with existing TIP knowledge_chunks and knowledge_documents tables
- ✅ **Simplified schema** optimized for n8n workflow processing
- ✅ **Clear separation** between TIP's transition-specific knowledge and n8n's general RAG
- ✅ **Independent scaling** of both systems

### Existing TIP Tables

Your TIP database currently has:
- `knowledge_chunks` - Transition-specific knowledge chunks with complex schema
- `knowledge_documents` - Document metadata for transitions
- These tables include fields like: artifactId, transitionId, contentHash, etc.

### Required n8n Tables

The n8n workflows expect these separate tables:
- `knowledge_document_chunks` - Simplified chunks for RAG processing
- `document_rows` - Tabular data from CSV/Excel files
- `get_document_full_text()` - PostgreSQL function for full document retrieval
- `match_knowledge_document_chunks()` - Vector similarity search function

---

## Deployment Steps

### Step 1: Run Database Migration

The migration creates the required tables and functions **without modifying** your existing TIP knowledge management tables.

**Option A: Using Docker Exec (Recommended)**

```bash
# From TIP project root
 thing to understand is actions or
```

**Option B: Copy and Run Manually**

If the migration file is not in your Docker volume:

```bash
# Copy the migration file to the database container
docker cp assets/n8n-agentic-RAG-workflow/tip-agentic-rag/database-migration-tip-agentic-rag.sql better-db-1:/tmp/

# Run the migration
docker-compose exec db psql -U user -d tip -f /tmp/database-migration-tip-agentic-rag.sql

# Clean up
docker-compose exec db rm /tmp/database-migration-tip-agentic-rag.sql
```

**Verify Migration Succeeded:**

```bash
docker-compose exec db psql -U user -d tip -c "\dt knowledge*"
```

**Expected Output:**
```
                    List of relations
 Schema |            Name             | Type  | Owner
--------+-----------------------------+-------+-------
 public | knowledge_chunks            | table | user
 public | knowledge_document_chunks   | table | user  ← NEW
 public | knowledge_documents         | table | user
(3 rows)
```

**Check Functions:**

```bash
docker-compose exec db psql -U user -d tip -c "\df get_document_full_text"
```

**Expected Output:**
```
                           List of functions
 Schema |         Name             | Result data type | Argument data types | Type
--------+--------------------------+------------------+---------------------+------
 public | get_document_full_text   | text             | doc_id text         | func
```

### Step 2: Verify Vector Extension

Ensure pgvector is installed with correct dimension support:

```bash
docker-compose exec db psql -U user -d tip -c "\dx vector"
```

**Expected Output:**
```
                          List of installed extensions
  Name   | Version |   Schema   |                     Description
---------+---------+------------+-----------------------------------------------------
 vector  | 0.8.0   | public     | vector data type and ivfflat and hnsw access methods
```

**Verify Table Schema:**

```bash
docker-compose exec db psql -U user -d tip -c "\d knowledge_document_chunks"
```

**Check for:**
- `embedding vector(768)` column (768 dimensions for Ollama nomic-embed-text)
- `ivfflat` index on embedding column
- `vector_model` column to track which model was used

### Step 3: Import n8n Workflows

#### 3a. Import Document Processing Workflow

1. Open n8n: `http://n8n.tip.localhost`
2. Navigate to: **Workflows** → **Add Workflow** → **Import from File**
3. Select: `TIP_Document_Processing_Enhanced_Workflow.json`

**Configure Credentials:**

For each PostgreSQL node (you'll see credential warnings):
- Click the node with the warning icon
- In the **Credentials** dropdown, select or create: **TIP PostgreSQL**
  - Host: `db`
  - Port: `5432`
  - Database: `tip`
  - User: `user`
  - Password: `password`

**Nodes requiring PostgreSQL credentials:**
- Insert Chunks to PostgreSQL
- Update Status - Analyzing
- Create Version Record
- Add to Curation Queue
- Auto-Approve High Quality
- Mark for Manual Review
- Handle Error

4. **Activate Workflow:** Toggle the switch in the top-right corner

5. **Copy Webhook URL:**
   - Click the "Document Upload Webhook" node
   - Copy the webhook URL (e.g., `http://n8n:5678/webhook/tip-document-processing-enhanced`)
   - Save this for Step 4

#### 3b. Import RAG Agent Workflow

1. **Workflows** → **Add Workflow** → **Import from File**
2. Select: `TIP_Agentic_RAG_Enhanced_Workflow.json`

**Configure Credentials:**

For PostgreSQL nodes:
- Knowledge Vector Store Tool
- Get Full Document Tool
- SQL Query Tool
- PostgreSQL Chat Memory

All should use: **TIP PostgreSQL** credential

3. **Activate Workflow**

4. **Copy Chat Webhook URL:**
   - Click "When chat message received" node
   - Copy webhook URL (e.g., `http://n8n:5678/webhook/tip-rag-chat-enhanced`)
   - Save for Step 4

### Step 4: Configure Backend Integration

Update `backend-python/.env`:

```bash
# n8n Integration
N8N_ENABLED=true
N8N_DOCUMENT_PROCESSING_WEBHOOK=http://n8n:5678/webhook/tip-document-processing-enhanced
N8N_RAG_CHAT_WEBHOOK=http://n8n:5678/webhook/tip-rag-chat-enhanced

# Ollama Configuration (if not already set)
OLLAMA_API_URL=http://host.docker.internal:11434
OLLAMA_DEFAULT_MODEL=llama3.2:latest
```

**Restart Backend:**

```bash
docker-compose restart backend-python
```

**Verify Configuration:**

```bash
docker-compose exec backend-python sh -c 'env | grep N8N'
```

**Expected Output:**
```
N8N_ENABLED=true
N8N_DOCUMENT_PROCESSING_WEBHOOK=http://n8n:5678/webhook/tip-document-processing-enhanced
N8N_RAG_CHAT_WEBHOOK=http://n8n:5678/webhook/tip-rag-chat-enhanced
```

### Step 5: Verify Ollama is Running

The workflows use Ollama for local embeddings and chat:

**Check Ollama Status:**

```bash
curl http://localhost:11434/api/tags
```

**Expected Output:**
```json
{
  "models": [
    {
      "name": "llama3.2:latest",
      ...
    },
    {
      "name": "nomic-embed-text:latest",
      ...
    }
  ]
}
```

**If Ollama is not running:**

```bash
# Start Ollama service
ollama serve

# Pull required models
ollama pull llama3.2:latest
ollama pull nomic-embed-text:latest
```

**Verify Models:**

```bash
ollama list
```

**Expected Output:**
```
NAME                    ID              SIZE      MODIFIED
llama3.2:latest         a80c4f17acd5    2.0 GB    2 hours ago
nomic-embed-text:latest 0a109f422b47    274 MB    2 hours ago
```

---

## Testing the Deployment

### Test 1: Document Processing Workflow

Upload a test document to verify the workflow processes correctly:

```bash
# Create a test document
echo "This is a test document for TIP Agentic RAG. It contains information about transition planning." > /tmp/test-rag-doc.txt

# Upload via n8n webhook (simulating backend Python API)
curl -X POST http://n8n.tip.localhost/webhook/tip-document-processing-enhanced \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": "test-doc-001",
    "filename": "test-rag-doc.txt",
    "file_content": "'$(base64 /tmp/test-rag-doc.txt)'",
    "mime_type": "text/plain",
    "uploaded_by": "test-user"
  }'
```

**Check n8n Execution:**
1. Open n8n: `http://n8n.tip.localhost`
2. Go to **Executions** tab
3. Look for recent execution of "TIP Document Processing (Enhanced)"
4. Click to view details
5. Verify all nodes succeeded (green checkmarks)

**Check Database:**

```bash
docker-compose exec db psql -U user -d tip -c "
  SELECT
    id,
    document_id,
    chunk_index,
    vector_model,
    LENGTH(content) as content_length,
    array_length(embedding, 1) as embedding_dim
  FROM knowledge_document_chunks
  WHERE document_id = 'test-doc-001'
  LIMIT 5;
"
```

**Expected Output:**
```
 id | document_id | chunk_index | vector_model | content_length | embedding_dim
----+-------------+-------------+--------------+----------------+---------------
... | test-doc-001|     0       | nomic-embed-text |     150      |     768
```

### Test 2: RAG Query Workflow

Test the chat/query functionality:

```bash
curl -X POST http://n8n.tip.localhost/webhook/tip-rag-chat-enhanced \
  -H "Content-Type: application/json" \
  -d '{
    "chatInput": "What information is in the test document?",
    "sessionId": "test-session-001",
    "userId": "test-user"
  }'
```

**Expected Response:**
```json
{
  "response": "Based on the knowledge base, the test document contains information about transition planning for the TIP (Transition Intelligence Platform) Agentic RAG system.",
  "sessionId": "test-session-001",
  "timestamp": "2025-10-26T..."
}
```

**Check n8n Execution:**
1. Go to **Executions** → "TIP RAG AI Agent (Enhanced)"
2. Verify execution succeeded
3. Check which tools the agent used:
   - Should see "knowledge_search" tool invoked
   - May see "List Documents" tool invoked
4. Verify Ollama nodes succeeded:
   - "Ollama Chat Model" - green checkmark
   - "Embeddings Ollama" - green checkmark

### Test 3: Vector Search Functionality

Test the vector similarity search directly:

```bash
docker-compose exec db psql -U user -d tip -c "
  SELECT
    id,
    document_id,
    chunk_index,
    LEFT(content, 50) as content_preview,
    1 - (embedding <=> (SELECT embedding FROM knowledge_document_chunks WHERE document_id = 'test-doc-001' LIMIT 1)) as similarity
  FROM knowledge_document_chunks
  WHERE document_id = 'test-doc-001'
  ORDER BY embedding <=> (SELECT embedding FROM knowledge_document_chunks WHERE document_id = 'test-doc-001' LIMIT 1)
  LIMIT 3;
"
```

This should return chunks with similarity scores (1.0 being perfect match).

---

## Troubleshooting

### Error: "relation knowledge_document_chunks does not exist"

**Cause:** Migration was not run successfully

**Solution:**
1. Verify migration file path: `assets/n8n-agentic-RAG-workflow/tip-agentic-rag/database-migration-tip-agentic-rag.sql`
2. Copy to container and run manually (see Step 1 Option B)
3. Check for SQL errors in migration output

### Error: "function get_document_full_text does not exist"

**Cause:** Migration did not complete or function creation failed

**Solution:**
```bash
# Check if function exists
docker-compose exec db psql -U user -d tip -c "\df get_document_full_text"

# If not, manually create it:
docker-compose exec db psql -U user -d tip <<'EOF'
CREATE OR REPLACE FUNCTION get_document_full_text(doc_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    full_text TEXT;
BEGIN
    SELECT STRING_AGG(content, E'\n\n' ORDER BY chunk_index)
    INTO full_text
    FROM knowledge_document_chunks
    WHERE document_id = doc_id;

    RETURN COALESCE(full_text, '');
END;
$$;
EOF
```

### Error: "Ollama connection refused" or "Model not found"

**Cause:** Ollama is not running or models are not pulled

**Solution:**
```bash
# Start Ollama
ollama serve

# Pull models
ollama pull llama3.2:latest
ollama pull nomic-embed-text:latest

# Verify from Docker container
docker-compose exec backend-python curl http://host.docker.internal:11434/api/tags
```

### Error: "embedding dimension mismatch"

**Cause:** Database has wrong vector dimension (1536 instead of 768)

**Solution:**
```bash
# Check current dimension
docker-compose exec db psql -U user -d tip -c "\d knowledge_document_chunks" | grep embedding

# If it shows vector(1536), update to vector(768):
docker-compose exec db psql -U user -d tip <<'EOF'
ALTER TABLE knowledge_document_chunks
ALTER COLUMN embedding TYPE vector(768);

-- Rebuild index
DROP INDEX IF EXISTS idx_knowledge_document_chunks_embedding;
CREATE INDEX idx_knowledge_document_chunks_embedding
ON knowledge_document_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
EOF
```

### Workflow Execution Failures

**Check n8n logs:**
```bash
docker-compose logs n8n | tail -50
```

**Check for:**
- PostgreSQL connection errors
- Ollama connection timeouts
- Credential issues

**Common fixes:**
1. Verify all credentials are configured in n8n
2. Ensure workflows are activated (toggle switch ON)
3. Check webhook URLs are accessible from backend-python
4. Verify Ollama is running on host machine

---

## Next Steps

After successful deployment:

1. **Integrate with TIP Frontend:**
   - Add RAG chat interface to TIP frontend
   - Connect to n8n webhook: `N8N_RAG_CHAT_WEBHOOK`
   - Display responses in chat UI

2. **Connect Document Upload:**
   - Update backend-python `/api/knowledge/upload` endpoint
   - Trigger n8n webhook after file upload
   - Track processing status

3. **Monitor Performance:**
   - Check n8n execution times
   - Monitor Ollama resource usage
   - Review PostgreSQL query performance

4. **Scale as Needed:**
   - Add more Ollama instances for parallel processing
   - Increase n8n worker threads
   - Optimize database indexes

---

## Additional Resources

- **Tool Documentation:** [TOOL_DOCUMENTATION.md](TOOL_DOCUMENTATION.md) - Detailed guide for all 5 RAG tools
- **Architecture:** [ENHANCED_ARCHITECTURE.md](ENHANCED_ARCHITECTURE.md) - System design and data flow
- **Main README:** [README.md](README.md) - Overview and key concepts
- **Migration File:** [database-migration-tip-agentic-rag.sql](database-migration-tip-agentic-rag.sql) - Database schema

---

## Summary Checklist

- [ ] Database migration run successfully
- [ ] `knowledge_document_chunks` table exists with vector(768)
- [ ] `document_rows` table exists for CSV/Excel data
- [ ] `get_document_full_text()` function created
- [ ] `match_knowledge_document_chunks()` function created
- [ ] pgvector extension installed and verified
- [ ] Document Processing workflow imported and activated
- [ ] RAG Agent workflow imported and activated
- [ ] All PostgreSQL credentials configured in n8n
- [ ] Backend Python `.env` updated with webhook URLs
- [ ] Backend Python restarted
- [ ] Ollama running with required models pulled
- [ ] Test document processed successfully
- [ ] Test RAG query returned results
- [ ] Vector search working correctly

**Deployment Complete!** 🚀

The TIP Agentic RAG system is now ready to process documents and answer questions using local Ollama models.

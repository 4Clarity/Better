# TIP Agentic RAG - Deployment & Testing Guide

Complete step-by-step guide to deploy and test the TIP Agentic RAG system.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Steps](#deployment-steps)
3. [Verification & Testing](#verification--testing)
4. [Sample Test Scenarios](#sample-test-scenarios)
5. [Production Deployment](#production-deployment)
6. [Rollback Procedures](#rollback-procedures)

---

## Pre-Deployment Checklist

### Environment Requirements

- [ ] Docker and Docker Compose installed
- [ ] TIP application running (db, backend-node, backend-python, n8n, minio)
- [ ] Ollama installed and running with `nomic-embed-text` model
- [ ] Minimum 8GB RAM available for services
- [ ] PostgreSQL 16+ with pgvector extension

### Verify TIP Services

```bash
# Check all services are running
docker-compose ps

# Expected services:
# - db (PostgreSQL)
# - backend-node
# - backend-python
# - n8n
# - minio
# - reverse-proxy (Traefik)

# Check service health
curl http://api.tip.localhost/health
curl http://py.tip.localhost/health
curl http://n8n.tip.localhost/healthz
```

### Verify Database Extensions

```bash
docker-compose exec db psql -U postgres -d tip -c "\dx"

# Must show:
# Name: vector | Version: 0.8.0 | Schema: public
```

If missing:

```bash
docker-compose exec db psql -U postgres -d tip -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### Verify Ollama

```bash
# Check Ollama is running
curl http://localhost:11434/api/tags

# Check nomic-embed-text model exists
ollama list | grep nomic-embed-text

# If not installed:
ollama pull nomic-embed-text
```

---

## Deployment Steps

### Step 1: Run Database Migration

```bash
# From project root
docker-compose exec db psql -U postgres -d tip -f /docker-entrypoint-initdb.d/migrations/database-migration-tip-agentic-rag.sql
```

**Note:** You'll need to copy the migration file to the migrations directory first:

```bash
# Copy migration file
cp assets/n8n-agentic-RAG-workflow/tip-agentic-rag/database-migration-tip-agentic-rag.sql \
   database/migrations/020_tip_agentic_rag.sql

# Run migration
docker-compose exec db psql -U postgres -d tip < /docker-entrypoint-initdb.d/migrations/020_tip_agentic_rag.sql
```

**Expected Output:**

```
NOTICE: Created IVFFlat vector index with 100 lists
NOTICE: ========================================
NOTICE: TIP Agentic RAG Migration Complete
NOTICE: ========================================
NOTICE: Tables Created:
NOTICE:   - document_rows (tabular data storage)
...
```

**Verify Migration:**

```bash
docker-compose exec db psql -U postgres -d tip
```

```sql
-- Check tables exist
\dt document_rows

-- Check functions exist
\df match_knowledge_document_chunks
\df get_document_full_text

-- Check views exist
\dv document_processing_summary
\dv vector_search_readiness

-- Exit psql
\q
```

### Step 2: Configure n8n Credentials

1. **Access n8n:**
   ```
   Open: http://n8n.tip.localhost
   ```

2. **Create PostgreSQL Credential:**
   - Navigate: **Settings** → **Credentials** → **New**
   - Search: "Postgres"
   - Configure:
     ```yaml
     Name: TIP PostgreSQL
     Host: db
     Port: 5432
     Database: tip
     User: user
     Password: password
     SSL: Disable
     ```
   - Click **Save**
   - **Copy the credential ID** (e.g., `abc123...`)

3. **Create HTTP Header Auth Credential (Optional):**
   - Navigate: **Settings** → **Credentials** → **New**
   - Search: "Header Auth"
   - Configure:
     ```yaml
     Name: TIP API Auth
     Header Name: x-api-key
     Value: tip-n8n-secret-key-change-in-production
     ```
   - Click **Save**

4. **Create OpenAI Credential (if using OpenAI):**
   - Navigate: **Settings** → **Credentials** → **New**
   - Search: "OpenAI"
   - Configure:
     ```yaml
     Name: OpenAI API
     API Key: {{ YOUR_OPENAI_API_KEY }}
     ```
   - Click **Save**

   **Or skip if using Ollama for chat model.**

### Step 3: Import n8n Workflows

#### Import Document Processing Workflow

1. In n8n: **Workflows** → **Add Workflow** → **Import from File**
2. Select: `assets/n8n-agentic-RAG-workflow/tip-agentic-rag/TIP_Document_Processing_Workflow.json`
3. Click **Import**
4. **Update credentials** for all nodes:
   - Click each node with a credential icon
   - Select "TIP PostgreSQL" from dropdown
   - Save workflow

5. **Copy Webhook URL:**
   - Click "Document Upload Webhook" node
   - Copy the webhook URL (e.g., `http://n8n.tip.localhost/webhook/tip-document-processing`)

6. **Activate workflow:**
   - Toggle **Active** switch in top-right corner

#### Import RAG AI Agent Workflow

1. In n8n: **Workflows** → **Add Workflow** → **Import from File**
2. Select: `assets/n8n-agentic-RAG-workflow/tip-agentic-rag/TIP_Agentic_RAG_Workflow.json`
3. Click **Import**
4. **Update credentials** for all nodes (same as above)
5. **Copy Chat Webhook URL:**
   - Click "When chat message received" node
   - Copy the webhook URL (e.g., `http://n8n.tip.localhost/webhook/tip-rag-chat`)

6. **Activate workflow:**
   - Toggle **Active** switch

### Step 4: Configure Backend Integration

Edit `backend-python/.env`:

```bash
# Enable n8n integration
N8N_ENABLED=true

# Document processing webhook (use Docker internal network)
N8N_DOCUMENT_PROCESSING_WEBHOOK=http://n8n:5678/webhook/tip-document-processing

# n8n API for monitoring (optional)
N8N_API_URL=http://n8n:5678
N8N_API_KEY=tip-n8n-secret-key-change-in-production
```

**Restart backend-python:**

```bash
docker-compose restart backend-python

# Verify environment variables
docker-compose exec backend-python sh -c 'env | grep N8N'
```

---

## Verification & Testing

### Test 1: Database Migration Verification

```sql
-- Connect to database
docker-compose exec db psql -U postgres -d tip

-- Check document_rows table
SELECT COUNT(*) FROM document_rows;
-- Expected: 0 or test data count

-- Check vector index
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE indexname = 'idx_knowledge_document_chunks_embedding';
-- Expected: 1 row with ivfflat index

-- Check functions
SELECT * FROM match_knowledge_document_chunks(
  query_embedding := array_fill(0.1, ARRAY[768])::vector,
  match_count := 5
);
-- Expected: Returns test chunks if seed data exists

-- Check views
SELECT * FROM vector_search_readiness;
-- Expected: Shows chunk count and embedding coverage

\q
```

### Test 2: Upload Text Document

```bash
# Create sample document
cat > /tmp/transition-guide.txt <<EOF
Government Transition Planning Guide

Key Milestones:
1. T-180 days: Initial stakeholder identification
2. T-120 days: Knowledge capture begins
3. T-90 days: Contractor handover preparation
4. T-60 days: Security clearance processing
5. T-30 days: Final transition briefings
6. T-0 days: Contract transition complete

Critical Success Factors:
- Early stakeholder engagement
- Comprehensive documentation
- Clear communication channels
- Regular progress monitoring
- Risk mitigation planning
EOF

# Upload document
curl -X POST http://api.tip.localhost/api/knowledge/upload \
  -F "file=@/tmp/transition-guide.txt" \
  -F "uploaded_by=demo-user-id" \
  -F "security_classification=UNCLASSIFIED"

# Expected response:
# {
#   "document_id": "uuid-here",
#   "filename": "transition-guide.txt",
#   "status": "UPLOADED",
#   "message": "Document uploaded successfully. Processing in background."
# }

# Save document_id for later tests
export DOC_ID="<document_id_from_response>"
```

### Test 3: Monitor Document Processing

#### Option A: Via n8n Execution History

1. Open: `http://n8n.tip.localhost`
2. Navigate: **Workflows** → **TIP Document Processing**
3. Click: **Executions** tab
4. Find recent execution
5. Verify: All nodes green (success)

#### Option B: Via Database

```bash
# Wait 30 seconds for processing
sleep 30

# Check status
docker-compose exec db psql -U postgres -d tip -c \
  "SELECT id, filename, upload_status, chunk_count FROM knowledge_documents WHERE id = '$DOC_ID';"

# Expected: upload_status = 'COMPLETED', chunk_count > 0
```

### Test 4: Verify Chunks Created

```sql
docker-compose exec db psql -U postgres -d tip

SELECT
    document_id,
    chunk_index,
    token_count,
    semantic_boundary_type,
    LEFT(content, 80) as content_preview,
    (embedding IS NOT NULL) as has_embedding
FROM knowledge_document_chunks
WHERE document_id = '${DOC_ID}'
ORDER BY chunk_index;

-- Expected: Multiple chunks with embeddings
```

### Test 5: Test Vector Search

```bash
# Search for relevant content
curl -X POST http://api.tip.localhost/api/knowledge/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the key milestones for transition planning?",
    "limit": 3,
    "similarity_threshold": 0.5
  }'

# Expected: Returns relevant chunks from uploaded document
# Response format:
# {
#   "query": "What are the key milestones...",
#   "results": [
#     {
#       "id": "chunk-id",
#       "content": "Key Milestones: 1. T-180 days...",
#       "similarity": 0.87,
#       "document_id": "...",
#       "filename": "transition-guide.txt"
#     }
#   ],
#   "count": 3
# }
```

### Test 6: Test RAG Query

```bash
# Ask a question using RAG
curl -X POST http://n8n.tip.localhost/webhook/tip-rag-chat \
  -H "Content-Type: application/json" \
  -H "x-api-key: tip-n8n-secret-key-change-in-production" \
  -d '{
    "chatInput": "What are the critical success factors for transition planning?",
    "sessionId": "test-session-001",
    "userId": "demo-user-id"
  }'

# Expected: AI agent response citing the document
# Response format:
# {
#   "output": "Based on the transition planning guide, the critical success factors are:\n\n1. Early stakeholder engagement\n2. Comprehensive documentation\n3. Clear communication channels\n4. Regular progress monitoring\n5. Risk mitigation planning\n\nSource: transition-guide.txt"
# }
```

---

## Sample Test Scenarios

### Scenario 1: Upload and Query PDF Document

```bash
# 1. Create sample PDF (requires pandoc or similar)
echo "# Contract Requirements\n\nAll contractors must:\n- Have active security clearance\n- Submit weekly progress reports\n- Attend bi-weekly stakeholder meetings" | \
  pandoc -o /tmp/contract-reqs.pdf

# 2. Upload
curl -X POST http://api.tip.localhost/api/knowledge/upload \
  -F "file=@/tmp/contract-reqs.pdf" \
  -F "uploaded_by=demo-user-id" \
  -F "security_classification=UNCLASSIFIED"

# 3. Wait for processing (30-60 seconds)
sleep 60

# 4. Query
curl -X POST http://n8n.tip.localhost/webhook/tip-rag-chat \
  -H "Content-Type: application/json" \
  -d '{
    "chatInput": "What are the contractor requirements for security clearance?",
    "sessionId": "test-session-002",
    "userId": "demo-user-id"
  }'

# Expected: Answer mentions active security clearance requirement
```

### Scenario 2: Upload CSV and Query with SQL

```bash
# 1. Create sample contract data
cat > /tmp/contracts.csv <<EOF
contractor,contract_number,contract_value,start_date,end_date,status
Acme Corp,FA8625-20-C-0001,1500000,2025-01-01,2025-12-31,Active
Beta Inc,FA8625-20-C-0002,2300000,2025-02-01,2026-01-31,Active
Gamma LLC,FA8625-20-C-0003,750000,2024-06-01,2025-05-31,Completed
Delta Systems,FA8625-20-C-0004,1850000,2025-03-01,2026-02-28,Active
EOF

# 2. Upload
curl -X POST http://api.tip.localhost/api/knowledge/upload \
  -F "file=@/tmp/contracts.csv" \
  -F "uploaded_by=demo-user-id" \
  -F "security_classification=UNCLASSIFIED"

# Save document ID
export CSV_DOC_ID="<response-document-id>"

# 3. Wait for processing
sleep 60

# 4. Verify rows inserted
docker-compose exec db psql -U postgres -d tip -c \
  "SELECT COUNT(*) FROM document_rows WHERE dataset_id = '$CSV_DOC_ID';"
# Expected: 4

# 5. Query with SQL via RAG agent
curl -X POST http://n8n.tip.localhost/webhook/tip-rag-chat \
  -H "Content-Type: application/json" \
  -d '{
    "chatInput": "What is the total value of all active contracts?",
    "sessionId": "test-session-003",
    "userId": "demo-user-id"
  }'

# Expected: Agent uses SQL tool to calculate: $5,650,000
```

### Scenario 3: Multi-Document Cross-Reference

```bash
# 1. Upload multiple related documents
cat > /tmp/stakeholder-roles.txt <<EOF
Stakeholder Roles and Responsibilities

Government PM: Overall contract oversight and decision authority
Incoming Contractor PM: Transition planning and knowledge capture
Outgoing Contractor PM: Knowledge transfer and handover
Security Officer: Clearance processing and facility access
EOF

cat > /tmp/communication-plan.txt <<EOF
Communication Plan

Weekly Status Meetings:
- Attendees: All PMs and Security Officer
- Topics: Progress updates, issues, risks
- Duration: 60 minutes

Daily Standups:
- Attendees: PM teams only
- Topics: Daily accomplishments and blockers
- Duration: 15 minutes
EOF

# Upload both
curl -X POST http://api.tip.localhost/api/knowledge/upload \
  -F "file=@/tmp/stakeholder-roles.txt" \
  -F "uploaded_by=demo-user-id"

curl -X POST http://api.tip.localhost/api/knowledge/upload \
  -F "file=@/tmp/communication-plan.txt" \
  -F "uploaded_by=demo-user-id"

# Wait for processing
sleep 60

# 2. Query across documents
curl -X POST http://n8n.tip.localhost/webhook/tip-rag-chat \
  -H "Content-Type: application/json" \
  -d '{
    "chatInput": "Who attends the weekly status meetings and what is discussed?",
    "sessionId": "test-session-004",
    "userId": "demo-user-id"
  }'

# Expected: Agent combines info from both documents
```

### Scenario 4: Test Full Document Retrieval

```bash
# Query that requires full context
curl -X POST http://n8n.tip.localhost/webhook/tip-rag-chat \
  -H "Content-Type: application/json" \
  -d '{
    "chatInput": "Show me the complete transition planning guide",
    "sessionId": "test-session-005",
    "userId": "demo-user-id"
  }'

# Expected: Agent uses "Get File Contents" tool to retrieve full document
```

---

## Production Deployment

### Pre-Production Checklist

- [ ] All test scenarios pass
- [ ] Database migration successful
- [ ] n8n workflows activated
- [ ] Backend integration verified
- [ ] Performance tested with realistic data volume
- [ ] Security review completed
- [ ] Monitoring configured
- [ ] Backup procedures in place

### Security Hardening

1. **Change Default Credentials:**
   ```bash
   # Generate strong API key
   openssl rand -hex 32

   # Update in backend-python/.env and n8n credential
   ```

2. **Enable HTTPS:**
   - Configure Traefik SSL certificates
   - Update webhook URLs to use HTTPS

3. **Implement Rate Limiting:**
   - Add rate limiting to n8n webhooks
   - Configure in Traefik middleware

4. **Add Audit Logging:**
   ```sql
   CREATE TABLE rag_query_audit (
     id SERIAL PRIMARY KEY,
     user_id TEXT,
     query TEXT,
     session_id TEXT,
     response TEXT,
     sources JSONB,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

5. **Restrict Database Access:**
   - Create limited permissions user for n8n
   - Grant only required permissions

### Performance Tuning

1. **Optimize Vector Index:**
   ```sql
   -- For datasets > 50k chunks
   DROP INDEX idx_knowledge_document_chunks_embedding;
   CREATE INDEX idx_knowledge_document_chunks_embedding
     ON knowledge_document_chunks
     USING ivfflat (embedding vector_cosine_ops)
     WITH (lists = 500);  -- Increase from 100
   ```

2. **Connection Pooling:**
   - Configure n8n PostgreSQL credential with connection pooling
   - Adjust max connections in PostgreSQL

3. **Caching:**
   - Implement embedding cache for common queries
   - Cache document metadata

### Monitoring Setup

1. **n8n Workflow Monitoring:**
   ```bash
   # Enable n8n metrics
   # In n8n container environment:
   N8N_METRICS=true
   N8N_METRICS_INCLUDE_DEFAULT_METRICS=true
   ```

2. **Database Monitoring:**
   ```sql
   -- Create monitoring view
   CREATE VIEW rag_system_health AS
   SELECT
     (SELECT COUNT(*) FROM knowledge_documents) as total_documents,
     (SELECT COUNT(*) FROM knowledge_documents WHERE upload_status = 'COMPLETED') as completed_documents,
     (SELECT COUNT(*) FROM knowledge_documents WHERE upload_status = 'FAILED') as failed_documents,
     (SELECT COUNT(*) FROM knowledge_document_chunks) as total_chunks,
     (SELECT COUNT(*) FROM knowledge_document_chunks WHERE embedding IS NOT NULL) as chunks_with_embeddings,
     (SELECT COUNT(*) FROM document_rows) as tabular_rows,
     pg_size_pretty(pg_total_relation_size('knowledge_document_chunks')) as chunks_table_size,
     pg_size_pretty(pg_total_relation_size('document_rows')) as rows_table_size;
   ```

3. **Alert Configuration:**
   - Alert on document processing failures
   - Alert on high query latency
   - Alert on low embedding coverage

---

## Rollback Procedures

### Rollback Database Migration

```bash
# Connect to database
docker-compose exec db psql -U postgres -d tip

# Drop in reverse order
DROP VIEW IF EXISTS vector_search_readiness;
DROP VIEW IF EXISTS document_processing_summary;
DROP FUNCTION IF EXISTS get_document_full_text(TEXT);
DROP FUNCTION IF EXISTS match_knowledge_document_chunks(vector, INTEGER, FLOAT, JSONB);
DROP TABLE IF EXISTS document_rows CASCADE;

-- Note: Keep knowledge_documents and knowledge_document_chunks
-- as they were created in earlier migrations (017, 018)
```

### Deactivate n8n Workflows

1. Open n8n: `http://n8n.tip.localhost`
2. Navigate to each workflow
3. Toggle **Active** switch to OFF

### Disable Backend Integration

Edit `backend-python/.env`:

```bash
N8N_ENABLED=false
```

Restart:

```bash
docker-compose restart backend-python
```

---

## Success Criteria

Deployment is successful when:

✅ Database migration completes without errors
✅ Both n8n workflows are activated and show "Active" status
✅ Document upload creates chunks with embeddings
✅ Vector search returns relevant results (similarity > 0.5)
✅ RAG queries return coherent answers with source citations
✅ Tabular data queries execute SQL correctly
✅ Multi-document queries synthesize information
✅ Chat memory persists across sessions
✅ Error handling works (document marked FAILED on errors)
✅ Monitoring views show accurate data

---

## Next Steps After Deployment

1. **Load Production Data:**
   - Upload existing transition documents
   - Verify processing completes successfully
   - Monitor chunk distribution and embedding coverage

2. **Integrate with Frontend:**
   - Add chat component to TIP UI
   - Implement document upload interface
   - Display source citations with answers

3. **Optimize Based on Usage:**
   - Analyze query patterns
   - Tune chunk size and overlap
   - Adjust similarity thresholds
   - Add domain-specific prompts

4. **Expand Capabilities:**
   - Add document summarization
   - Implement query expansion
   - Enable streaming responses
   - Add multi-modal support (images, tables)

---

**Deployment Complete!** 🚀

Your TIP Agentic RAG system is now fully operational and ready for production use.

# 🚀 TIP Agentic RAG Workflow

**Adapted from:** [Ultimate n8n Agentic RAG Template](../README.md) by [Cole Medin](https://www.youtube.com/@ColeMedin)

## What is this?

This is a **TIP Application-specific** implementation of an **Agentic RAG (Retrieval Augmented Generation)** system in n8n. This adaptation replaces:
- ✅ **Google Drive** → **TIP MinIO Object Storage**
- ✅ **Supabase** → **TIP PostgreSQL with pgvector**
- ✅ **External Postgres** → **TIP's existing database**
- ✅ **Standalone workflow** → **Integrated with TIP's knowledge management system**

Unlike standard RAG which only performs simple lookups, this agent can reason ab
 this is what you're gonna be using most of the time when building automationout TIP's knowledge base, self-improve retrieval, and dynamically switch between different tools based on the specific question.

## Architecture Overview

### Data Flow we can take a couple of examples with Google sheets you might want to update Rose create a seat or get a spreadsheet and diffusing dropbox you can upload a file get a file create a folder move a file from one folder to another if you slack you can send a message get a message get a user get all of the messages from a specific channel if using salesforce which is a run we can get a company get a contact for lead
```
Document Upload (TIP Frontend)
    ↓
Backend Python API (/api/knowledge/upload)
    ↓
n8n Webhook Trigger (Document Processing Workflow)
    ↓
├─ PDF/DOCX/TXT → Extract Text → Chunk → Embed → Store in knowledge_document_chunks
├─ CSV/Excel → Extract Rows → Store in document_rows → Create summary chunks
└─ Update knowledge_documents status (ANALYZING → CHUNKING → EMBEDDING → COMPLETED)
    ↓
RAG Query (TIP Chat Interface)
    ↓
n8n AI Agent with Tools:
    ├─ RAG Vector Search (knowledge_document_chunks)
    ├─ SQL Query (document_rows for tabular data)
    ├─ Full Document Retrieval (knowledge_documents)
    └─ Document Metadata Lookup (knowledge_documents)
```

### Database Tables (TIP PostgreSQL)

1. **`knowledge_documents`** - Document metadata and processing status
   - Replaces: Supabase `document_metadata` table
   - Added fields: `n8n_workflow_id`, `chunking_strategy`, `security_classification`

2. **`knowledge_document_chunks`** - Vector-embedded text chunks
   - Replaces: Supabase `documents` table
   - Uses: pgvector extension with `vector(768)` embeddings
   - Index: IVFFlat for fast cosine similarity search

3. **`document_rows`** - Tabular data storage (CSV/Excel)
   - Uses: JSONB for flexible schema
   - Enables: SQL queries on spreadsheet data

### Storage Solution

**MinIO Object Storage** (S3-compatible)
- Endpoint: `http://minio:9000`
- Bucket: `knowledge-docs`
- Path structure: `knowledge/{security_classification}/{document_id}/{filename}`
- Access: Direct from n8n via MinIO credentials

### Embedding Service

**TIP's Ollama Integration** (backend-python)
- Model: `nomic-embed-text` (768 dimensions)
- Endpoint: `http://host.docker.internal:11434`
- Service: `backend-python/src/services/embedding_service.py`

## Why Agentic RAG?

Standard RAG has significant limitations for government transition planning:
- ❌ Poor analysis of numerical/tabular data (contracts, budgets, schedules)
- ❌ Missing context due to document chunking (policy documents, procedures)
- ❌ Inability to connect information across documents (cross-contract insights)
- ❌ No dynamic tool selection based on question type

## What makes this TIP adaptation powerful:

- ✅ **Intelligent tool selection**: Switches between RAG lookups, SQL queries, or full document retrieval based on the question
- ✅ **Complete document context**: Accesses entire documents when needed instead of just chunks
- ✅ **Accurate numerical analysis**: Uses SQL for precise calculations on contract/budget data
- ✅ **Cross-document insights**: Connects information across transition knowledge base
- ✅ **Multi-file processing**: Handles multiple documents in a single workflow loop
- ✅ **Efficient storage**: Uses JSONB in PostgreSQL to store tabular data without creating new tables for each CSV
- ✅ **Security integration**: Respects TIP's security classifications and user permissions
- ✅ **MinIO integration**: Uses TIP's existing object storage for document files

## Getting Started

### Prerequisites

1. **TIP Application Running**
   ```bash
   docker-compose up -d db backend-node backend-python minio n8n
   ```

2. **Database Extensions Enabled**
   - ✅ pgvector extension (verified in migration 016)
   - ✅ PostgreSQL 16+

3. **n8n Accessible**
   - URL: `http://n8n.tip.localhost`
   - Credentials configured for PostgreSQL and MinIO

### Step 1: Run Database Migration Scripts

```bash
# From project root
docker-compose exec db psql -U postgres -d tip -f /docker-entrypoint-initdb.d/migrations/tip-agentic-rag-tables.sql
```

This creates:
- `document_rows` table for tabular data
- `match_knowledge_document_chunks` function for vector search
- Indexes for efficient queries

### Step 2: Import n8n Workflow

1. Open n8n: `http://n8n.tip.localhost`
2. Navigate to **Workflows** → **Import from File**
3. Select: `TIP_Agentic_RAG_Workflow.json`
4. Configure credentials:
   - **PostgreSQL**: Use existing TIP database credentials
   - **MinIO**: Configure with TIP MinIO endpoint
   - **Ollama/OpenAI**: Configure embedding service

### Step 3: Activate Workflows

Two workflows are included:

1. **TIP Document Processing Workflow**
   - Trigger: Webhook from Python API
   - Purpose: Process uploaded documents (extract, chunk, embed)
   - Webhook URL: `http://n8n.tip.localhost/webhook/tip-document-processing`

2. **TIP RAG AI Agent Workflow**
   - Trigger: Chat webhook from frontend
   - Purpose: Answer questions using RAG + SQL tools
   - Chat URL: `http://n8n.tip.localhost/webhook/tip-rag-chat`

### Step 4: Configure TIP Backend

Update `backend-python/.env`:

```bash
# Enable n8n integration
N8N_ENABLED=true
N8N_DOCUMENT_PROCESSING_WEBHOOK=http://n8n.tip.localhost/webhook/tip-document-processing

# n8n API configuration (for monitoring)
N8N_API_URL=http://n8n.tip.localhost
N8N_API_KEY=your-n8n-api-key-here
```

### Step 5: Test the System

#### Test Document Upload
```bash
curl -X POST http://api.tip.localhost/api/knowledge/upload \
  -F "file=@sample-document.pdf" \
  -F "uploaded_by=demo-user-id" \
  -F "security_classification=UNCLASSIFIED"
```

#### Test RAG Query
```bash
curl -X POST http://api.tip.localhost/api/knowledge/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the key milestones for transition planning?",
    "max_context_chunks": 5,
    "similarity_threshold": 0.7
  }'
```

## Key Differences from Original Template

| Feature | Original Template | TIP Adaptation |
|---------|------------------|----------------|
| **File Storage** | Google Drive | MinIO (S3-compatible) |
| **Vector DB** | Supabase | PostgreSQL + pgvector |
| **Embeddings** | OpenAI API | Ollama (nomic-embed-text) |
| **Triggers** | Google Drive watch | Python API webhook |
| **Chat Memory** | External Postgres | TIP PostgreSQL |
| **Authentication** | None | TIP auth tokens |
| **Security** | Not included | Classification-based RBAC |
| **Tabular Storage** | Supabase JSONB | PostgreSQL JSONB |

## Workflow Components

### Document Processing Tools

1. **File Type Router** - Switches processing based on MIME type:
   - `application/pdf` → Extract PDF Text
   - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` → Extract Excel
   - `text/csv` → Extract CSV
   - `text/plain`, `text/markdown` → Extract Document Text

2. **Chunking & Embedding**
   - Text splitter: Character-based (default 800 chars, 100 overlap)
   - Embedding: Ollama `nomic-embed-text` (768d vectors)
   - Storage: `knowledge_document_chunks` table

3. **Tabular Data Processing**
   - Row extraction: Individual rows stored in `document_rows` with JSONB
   - Schema capture: Stored in `knowledge_documents.chunking_strategy`
   - Summary embedding: Concatenated data for RAG retrieval

### RAG AI Agent Tools

1. **Vector Search Tool** (`documents`)
   - Function: `match_knowledge_document_chunks`
   - Uses: Cosine similarity on embeddings
   - Returns: Top-k similar chunks with metadata

2. **List Documents Tool**
   - Table: `knowledge_documents`
   - Purpose: Agent discovers available documents and schemas
   - Includes: File titles, types, schemas (for CSV/Excel)

3. **Get File Contents Tool**
   - SQL: Concatenates all chunks for a document ID
   - Purpose: Full-context retrieval when RAG chunks insufficient
   - Use case: Reading complete policies or procedures

4. **Query Document Rows Tool**
   - Table: `document_rows`
   - Purpose: SQL queries on tabular data (JSONB fields)
   - Use case: "Sum all contract values" or "Find max budget"

## Customization for TIP Use Cases

### System Prompt Tuning

Edit the RAG AI Agent node's system message:

```text
You are a TIP assistant specializing in government transition planning.
You help answer questions about:
- Transition timelines and milestones
- Contract requirements and deliverables
- Stakeholder roles and responsibilities
- Knowledge transfer procedures
- Security classifications and compliance

Always cite sources using document titles and chunk references.
If information requires security clearance above the user's level, politely decline.
```

### Adding Document Metadata

Extend `knowledge_documents` table to include:
- Document summaries (generated during processing)
- Tags/categories specific to transition types
- Related document links

### Advanced RAG Techniques

1. **Hybrid Search**: Combine vector similarity + keyword matching
2. **Re-ranking**: Use LLM to re-score retrieved chunks by relevance
3. **Query Expansion**: Generate similar questions to improve recall
4. **Chunk Optimization**: Adjust chunk size based on document type

## Monitoring & Debugging

### n8n Workflow Execution History
- View: n8n UI → Executions tab
- Check: Success/failure rates, execution times
- Debug: Inspect node outputs for each execution

### Database Queries

```sql
-- Check document processing status
SELECT upload_status, COUNT(*)
FROM knowledge_documents
GROUP BY upload_status;

-- Find documents with most chunks
SELECT filename, chunk_count
FROM knowledge_documents
ORDER BY chunk_count DESC
LIMIT 10;

-- Test vector search function
SELECT id, content, similarity
FROM match_knowledge_document_chunks(
  query_embedding := '[0.1, 0.2, ...]'::vector,  -- Replace with actual embedding
  match_count := 5,
  filter := '{}'::jsonb
);
```

### Python API Logs

```bash
docker-compose logs backend-python | grep knowledge
```

## Security Considerations

1. **Classification Enforcement**
   - Vector search filters by `security_classification`
   - Documents inherit classification from upload metadata
   - User permissions checked before RAG query execution

2. **MinIO Access Control**
   - Use TIP's existing MinIO policies
   - Documents stored in classification-specific paths
   - Pre-signed URLs for time-limited access

3. **n8n Webhook Authentication**
   - Add API key authentication to webhook triggers
   - Validate JWT tokens from TIP backend
   - Rate limiting on public endpoints

## Troubleshooting

### Document Processing Stuck

**Symptom**: Document status remains `ANALYZING` or `CHUNKING`

**Solution**:
1. Check n8n execution history for errors
2. Verify Ollama is running: `curl http://host.docker.internal:11434/api/tags`
3. Check Python API logs for webhook trigger failures
4. Manually retry: Re-upload document or trigger workflow via n8n UI

### Vector Search Returns No Results

**Symptom**: RAG queries return empty results

**Solution**:
1. Verify chunks exist: `SELECT COUNT(*) FROM knowledge_document_chunks;`
2. Check embedding vectors are populated: `SELECT id FROM knowledge_document_chunks WHERE embedding IS NULL;`
3. Test similarity function: Run manual query with known embedding
4. Rebuild IVFFlat index: See migration script comments

### Tabular Data SQL Errors

**Symptom**: Agent fails when querying CSV/Excel data

**Solution**:
1. Verify schema stored: `SELECT chunking_strategy FROM knowledge_documents WHERE mime_type LIKE '%spreadsheet%';`
2. Check JSONB structure: `SELECT row_data FROM document_rows LIMIT 1;`
3. Update agent's SQL examples in tool description

## Contributing

Improvements specific to TIP integration:
- Keycloak authentication for n8n webhooks
- Advanced security classification logic
- Transition-specific document metadata
- Integration with TIP's existing knowledge curation workflows

## License

This adaptation maintains the original template's license while extending it for the TIP Application.

---

**Original Template**: [Ultimate Agentic RAG AI Agent Template](https://github.com/colemdn/n8n-agentic-rag-template)
**TIP Application**: Government Transition Intelligence Platform

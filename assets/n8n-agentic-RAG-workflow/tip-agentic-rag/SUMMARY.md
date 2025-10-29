# TIP Agentic RAG - Project Summary

## Overview

This directory contains a complete adaptation of Cole Medin's **Ultimate Agentic RAG Template** for the **TIP (Transition Intelligence Platform)** application. The adaptation replaces external services (Google Drive, Supabase) with TIP's existing infrastructure (MinIO, PostgreSQL with pgvector).

## What's Included

### 📁 Files in This Directory

1. **README.md** - High-level overview, architecture, and getting started guide
2. **CONFIGURATION_GUIDE.md** - Detailed n8n setup and credential configuration
3. **DEPLOYMENT_TESTING_GUIDE.md** - Step-by-step deployment with comprehensive tests
4. **database-migration-tip-agentic-rag.sql** - Database schema for TIP integration
5. **TIP_Agentic_RAG_Workflow.json** - n8n RAG AI Agent workflow
6. **TIP_Document_Processing_Workflow.json** - n8n document processing workflow
7. **SUMMARY.md** - This file

## Key Adaptations

### Original → TIP Replacements

| Component | Original Template | TIP Adaptation |
|-----------|------------------|----------------|
| **File Storage** | Google Drive | MinIO (S3-compatible) |
| **Vector Database** | Supabase | PostgreSQL + pgvector |
| **Embeddings** | OpenAI API | Ollama (nomic-embed-text) |
| **Triggers** | Google Drive watch | Python API webhook |
| **Chat Memory** | External Postgres | TIP PostgreSQL |
| **Tabular Storage** | Supabase JSONB | PostgreSQL JSONB |

## Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        Document Upload                          │
│                     (TIP Frontend → Python API)                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    n8n Webhook Trigger                          │
│              (Document Processing Workflow)                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
    ┌───────────────────┐     ┌──────────────────┐
    │   Text Documents  │     │ Tabular Documents│
    │  (PDF, DOCX, TXT) │     │   (CSV, Excel)   │
    └─────────┬─────────┘     └────────┬─────────┘
              │                        │
              ▼                        ▼
    ┌─────────────────┐     ┌──────────────────────┐
    │ Extract → Chunk │     │ Extract Rows → JSONB │
    │  → Embed (768d) │     │  + Create Summary    │
    └─────────┬───────┘     └────────┬─────────────┘
              │                      │
              ▼                      ▼
    ┌─────────────────────────────────────────────┐
    │  PostgreSQL Storage (TIP Database)          │
    │  - knowledge_document_chunks (vector)       │
    │  - document_rows (JSONB)                    │
    │  - knowledge_documents (metadata)           │
    └─────────────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │      RAG Query Interface       │
        │   (TIP Frontend Chat or API)   │
        └────────────┬───────────────────┘
                     │
                     ▼
        ┌────────────────────────────────┐
        │   n8n RAG AI Agent Workflow    │
        │                                │
        │  Tools:                        │
        │  ✓ Vector Search (RAG)         │
        │  ✓ SQL Query (Tabular Data)    │
        │  ✓ Full Document Retrieval     │
        │  ✓ Document Metadata Lookup    │
        └────────────┬───────────────────┘
                     │
                     ▼
        ┌────────────────────────────────┐
        │   AI-Generated Response        │
        │   with Source Citations        │
        └────────────────────────────────┘
```

## Quick Start

### 1. Prerequisites

```bash
# Verify services running
docker-compose ps | grep -E 'db|backend-python|n8n'

# Check Ollama
curl http://localhost:11434/api/tags | grep nomic-embed-text

# Check pgvector extension
docker-compose exec db psql -U postgres -d tip -c "\dx" | grep vector
```

### 2. Deploy (5 Steps)

```bash
# Step 1: Run database migration
docker-compose exec db psql -U postgres -d tip \
  -f /docker-entrypoint-initdb.d/migrations/020_tip_agentic_rag.sql

# Step 2: Import workflows into n8n
# (Manual: Import via n8n UI - see CONFIGURATION_GUIDE.md)

# Step 3: Configure n8n credentials
# (Manual: Create PostgreSQL credential - see CONFIGURATION_GUIDE.md)

# Step 4: Update backend-python .env
echo "N8N_ENABLED=true" >> backend-python/.env
echo "N8N_DOCUMENT_PROCESSING_WEBHOOK=http://n8n:5678/webhook/tip-document-processing" >> backend-python/.env

# Step 5: Restart backend-python
docker-compose restart backend-python
```

### 3. Test (3 Quick Tests)

```bash
# Test 1: Upload document
curl -X POST http://api.tip.localhost/api/knowledge/upload \
  -F "file=@sample.txt" \
  -F "uploaded_by=demo-user-id"

# Test 2: Check processing (wait 30s)
sleep 30
docker-compose exec db psql -U postgres -d tip \
  -c "SELECT * FROM document_processing_summary;"

# Test 3: Query RAG agent
curl -X POST http://n8n.tip.localhost/webhook/tip-rag-chat \
  -H "Content-Type: application/json" \
  -d '{"chatInput": "What are the key milestones?", "sessionId": "test"}'
```

## Database Schema

### New Tables

1. **`document_rows`** (tabular data)
   - `id` - Serial primary key
   - `dataset_id` - References knowledge_documents.id
   - `row_data` - JSONB containing CSV/Excel row data
   - Indexes: JSONB GIN, dataset_id

2. Uses existing tables from migrations 017 & 018:
   - `knowledge_documents` - Document metadata and processing status
   - `knowledge_document_chunks` - Vector-embedded text chunks

### New Functions

1. **`match_knowledge_document_chunks()`** - Vector similarity search
   - Parameters: query_embedding, match_count, similarity_threshold, filter
   - Returns: Ranked chunks with similarity scores
   - Uses: IVFFlat index for fast cosine similarity

2. **`get_document_full_text()`** - Full document retrieval
   - Parameter: document_id
   - Returns: Concatenated text from all chunks in order
   - Used by: RAG agent when full context needed

### New Views

1. **`document_processing_summary`** - Processing pipeline status
2. **`vector_search_readiness`** - Embedding coverage metrics

## n8n Workflows

### Workflow 1: TIP Document Processing

**Trigger:** Webhook from backend-python API
**Purpose:** Process uploaded documents (extract, chunk, embed, store)

**Nodes:**
1. Document Upload Webhook (trigger)
2. Extract Document Info
3. Update Status - Analyzing
4. Decode Base64 File
5. Route by File Type (Switch)
6. Extract PDF/Excel/CSV/Text
7. Aggregate Rows (for tabular)
8. Insert Tabular Rows
9. Character Text Splitter
10. Embeddings Ollama
11. Default Data Loader
12. Insert into PostgreSQL Vector Store
13. Update Status - Completed
14. Error Handler

**Flow:**
```
Webhook → Extract Info → Update Status → Decode → Route by Type →
├─ PDF → Chunk → Embed → Store → Complete
├─ Excel → Extract Rows → Store Rows + Summary → Complete
├─ CSV → Extract Rows → Store Rows + Summary → Complete
└─ Text → Chunk → Embed → Store → Complete
```

### Workflow 2: TIP RAG AI Agent

**Trigger:** Chat webhook or HTTP POST
**Purpose:** Answer questions using RAG, SQL, and document retrieval

**Nodes:**
1. When chat message received / Webhook (trigger)
2. Edit Fields
3. TIP RAG AI Agent
4. Respond to Webhook

**Agent Tools:**
1. **knowledge_search** - Vector similarity search on chunks
2. **List Documents** - Browse available documents and schemas
3. **Get File Contents** - Retrieve full document text
4. **Query Document Rows** - Execute SQL on tabular data

**System Prompt:** Customized for government transition planning domain

## Configuration Variables

### n8n Credentials Required

- **TIP PostgreSQL** - Database connection (host: db, port: 5432, database: tip)
- **TIP API Auth** (Optional) - HTTP header authentication for webhooks
- **OpenAI API** (Optional) - If using OpenAI instead of Ollama

### Environment Variables (.env)

```bash
# Backend Python
N8N_ENABLED=true
N8N_DOCUMENT_PROCESSING_WEBHOOK=http://n8n:5678/webhook/tip-document-processing
N8N_API_URL=http://n8n:5678
N8N_API_KEY=your-api-key-here
```

### Workflow Placeholders to Replace

In JSON files, replace these placeholders:
- `{{ POSTGRES_CREDENTIAL_ID }}` → Actual credential ID from n8n
- `{{ HTTP_HEADER_AUTH_ID }}` → Actual credential ID from n8n
- `{{ OPENAI_CREDENTIAL_ID }}` → Actual credential ID from n8n (if using)
- `{{ UNIQUE_ID }}` → Any unique string for webhook IDs

## Key Features

### 🎯 Intelligent Tool Selection

Agent automatically chooses the right approach:
- **Vector Search (RAG)** - For semantic questions about policies, procedures
- **SQL Queries** - For numerical analysis of contracts, budgets, schedules
- **Full Document Retrieval** - When complete context is needed
- **Document Metadata** - For discovering available information

### 🔒 Security Integration

- Security classification filtering on vector searches
- User-based access control (integrated with TIP auth)
- Secure webhook authentication
- Audit logging capability

### 📊 Tabular Data Support

- CSV/Excel rows stored in JSONB format
- Schema automatically captured and stored
- Natural language to SQL query translation
- Flexible column access without rigid schemas

### 🚀 Performance Optimizations

- IVFFlat vector index for fast similarity search (O(log n) vs O(n))
- JSONB GIN indexes for efficient tabular queries
- Connection pooling for database access
- Chunking strategy optimized per document type

## Testing Checklist

- [ ] Database migration successful
- [ ] Workflows imported and activated
- [ ] Text document upload → chunks created → embeddings stored
- [ ] PDF document processed successfully
- [ ] CSV/Excel data stored in document_rows
- [ ] Vector search returns relevant results (similarity > 0.5)
- [ ] RAG query returns coherent answer with citations
- [ ] SQL query tool executes on tabular data
- [ ] Full document retrieval works
- [ ] Chat memory persists across sessions
- [ ] Error handling marks documents as FAILED on errors

## Monitoring

### Quick Health Check

```bash
# Check processing status
docker-compose exec db psql -U postgres -d tip \
  -c "SELECT * FROM document_processing_summary;"

# Check vector readiness
docker-compose exec db psql -U postgres -d tip \
  -c "SELECT * FROM vector_search_readiness;"

# Check n8n executions
# Visit: http://n8n.tip.localhost → Executions
```

### Performance Metrics

Monitor these in production:
- Document processing time (target: < 60s for typical docs)
- Vector search latency (target: < 500ms)
- Embedding coverage (target: > 95% of chunks)
- Failed document rate (target: < 5%)
- RAG query response time (target: < 3s)

## Troubleshooting

### Common Issues

1. **Document stuck at "UPLOADED"**
   - Check n8n workflow is activated
   - Verify webhook URL in backend-python .env
   - Check n8n execution history for errors

2. **No vector search results**
   - Verify embeddings exist: `SELECT COUNT(*) FROM knowledge_document_chunks WHERE embedding IS NOT NULL;`
   - Check similarity threshold (try lowering to 0.5)
   - Rebuild IVFFlat index

3. **Ollama connection errors**
   - Verify Ollama running: `curl http://localhost:11434/api/tags`
   - Check Docker can access host: `docker-compose exec n8n curl http://host.docker.internal:11434/api/tags`

See **CONFIGURATION_GUIDE.md** and **DEPLOYMENT_TESTING_GUIDE.md** for detailed troubleshooting.

## Production Recommendations

1. **Security:**
   - Change default API keys
   - Enable HTTPS for webhooks
   - Implement rate limiting
   - Add query audit logging

2. **Performance:**
   - Increase IVFFlat lists for large datasets (>50k chunks)
   - Adjust chunk size based on document types
   - Cache common query embeddings
   - Monitor and tune similarity thresholds

3. **Monitoring:**
   - Set up alerts for processing failures
   - Track query latency metrics
   - Monitor embedding coverage
   - Log user feedback on answer quality

4. **Backup:**
   - Regular database backups (includes vectors)
   - Export n8n workflows periodically
   - Document configuration changes

## Next Steps

1. **Integration:**
   - [ ] Add chat component to TIP frontend
   - [ ] Implement document upload UI
   - [ ] Display source citations with answers
   - [ ] Add user feedback mechanism

2. **Enhancement:**
   - [ ] Implement document summarization
   - [ ] Add query expansion for better recall
   - [ ] Enable streaming responses
   - [ ] Support multi-modal content (images, tables)

3. **Optimization:**
   - [ ] Analyze query patterns and tune chunk size
   - [ ] Implement hybrid search (vector + keyword)
   - [ ] Add re-ranking with LLM
   - [ ] Create domain-specific system prompts

## Resources

- **Original Template:** [Ultimate Agentic RAG Template](https://github.com/colemdn/n8n-agentic-rag-template) by Cole Medin
- **n8n Documentation:** https://docs.n8n.io/
- **pgvector Documentation:** https://github.com/pgvector/pgvector
- **Ollama Documentation:** https://ollama.ai/
- **TIP Application Docs:** /docs/technical/

## Support

For issues or questions:
1. Check troubleshooting sections in guides
2. Review n8n execution history for errors
3. Examine database logs and views
4. Consult TIP project documentation

---

**Status:** Ready for deployment ✅

**Version:** 1.0.0 (Initial TIP adaptation)

**Last Updated:** 2025-10-26

**Adapted By:** James (BMad Dev Agent)

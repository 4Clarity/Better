# TIP Agentic RAG - Enhanced System Deployment Guide

## Table of Contents
1. [Overview](#overview)
2. [What's New](#whats-new)
3. [Prerequisites](#prerequisites)
4. [Deployment Steps](#deployment-steps)
5. [Testing the Enhanced Features](#testing-the-enhanced-features)
6. [Troubleshooting](#troubleshooting)
7. [API Reference](#api-reference)

---

## Overview

This guide covers the deployment of the **enhanced TIP Agentic RAG system** which includes:

- **Docling Integration**: Advanced document processing with layout understanding, table extraction, and image handling
- **mem0 Integration**: Fact extraction, versioning, and intelligent context retrieval
- **Curation Workflow**: 5-state approval system with automatic quality scoring
- **Communication Files**: Inbound communication processing (emails, Slack messages)
- **Version Tracking**: Content hash-based duplicate detection and version history
- **Enhanced n8n Workflows**: Auto-approval, quality scoring, and curator notifications

---

## What's New

### 1. Docling Document Processing

**Benefits over basic extraction:**
- Preserves document layout and structure
- Extracts tables to structured DataFrames
- Detects and processes images with captions
- Understands section hierarchy
- Better handling of complex PDFs and presentations

**Supported formats:**
- PDF
- DOCX
- PPTX
- HTML
- Images (PNG, JPG)

### 2. mem0 Fact Management

**Features:**
- Automatic fact extraction from documents
- Fact categorization (dates, entities, requirements, metrics, etc.)
- Confidence scoring
- Related fact detection
- Version tracking of facts
- Context-aware retrieval

**Fact types extracted:**
- Dates and timelines
- Entities (organizations, agencies)
- Metrics and numbers
- Definitions and requirements
- Processes and procedures
- People and roles
- Locations

### 3. Curation Workflow

**5-State Process:**
```
PENDING → IN_REVIEW → APPROVED
                    ↓
                 REJECTED → ARCHIVED
```

**Features:**
- Automatic quality scoring (0-1.0 scale)
- Auto-approval for high-quality documents (score ≥ 0.7)
- Curator assignment and workload tracking
- Auto-escalation for items older than 48 hours
- Priority levels (high, normal, low)
- Reviewer notes and audit trail

### 4. Communication Files Processing

**Supported sources:**
- Email (IMAP/SMTP)
- Slack messages
- Microsoft Teams
- Generic webhooks

**Processing flow:**
1. Ingest communication with metadata
2. Extract attachments
3. Process attachments through document pipeline
4. Link documents back to original communication
5. Add to curation queue

---

## Prerequisites

### System Requirements

```bash
# 1. Verify base TIP system is running
docker-compose ps | grep -E 'db|backend-python|backend-node|n8n'

# 2. Check Ollama with required models
curl http://localhost:11434/api/tags | jq '.models[] | select(.name | contains("nomic-embed-text") or contains("llama3.2"))'

# 3. Check pgvector extension
docker-compose exec db psql -U user -d tip -c "\dx vector"
```

### Python Dependencies

Add to `backend-python/requirements.txt`:

```txt
# Enhanced document processing
docling>=1.0.0
docling-core>=1.0.0

# Memory and fact management
mem0ai>=0.1.0

# Existing dependencies (verify present)
langchain>=0.1.0
pgvector>=0.2.0
psycopg2-binary>=2.9.9
```

### Install Dependencies

```bash
# Stop backend-python
docker-compose stop backend-python

# Rebuild with new dependencies
docker-compose build backend-python

# Start backend-python
docker-compose up -d backend-python

# Verify imports
docker-compose exec backend-python python -c "import docling; import mem0; print('Dependencies OK')"
```

---

## Deployment Steps

### Step 1: Database Migration (5 minutes)

```bash
# Copy the enhanced migration file
cp assets/n8n-agentic-RAG-workflow/tip-agentic-rag/database-migration-enhanced-rag.sql \
   database/migrations/021_enhanced_rag.sql

# Run the migration
docker-compose exec db psql -U user -d tip \
  -f /docker-entrypoint-initdb.d/migrations/021_enhanced_rag.sql

# Verify migration success
docker-compose exec db psql -U user -d tip -c "
  SELECT tablename FROM pg_tables
  WHERE tablename IN ('document_versions', 'document_facts', 'curation_queue', 'communication_files')
"
```

**Expected output:**
```
 tablename
---------------------------
 document_versions
 document_facts
 curation_queue
 communication_files
 mem0_memories
(5 rows)

TIP Enhanced RAG Migration Complete
```

### Step 2: Deploy Enhanced Python Services (3 minutes)

The enhanced services are already in place:
- `backend-python/src/services/docling_processor.py`
- `backend-python/src/services/mem0_service.py`
- `backend-python/src/services/document_processor.py` (updated)

```bash
# Restart backend-python to load new services
docker-compose restart backend-python

# Verify services loaded
docker-compose logs backend-python | grep -E "DoclingProcessor|Mem0Service"
```

**Expected output:**
```
DoclingProcessor initialized successfully
Mem0Service initialized successfully
```

### Step 3: Deploy Communication Files API (2 minutes)

The communication files service and routes are already deployed:
- `backend-node/src/services/communication-files.service.ts`
- `backend-node/src/routes/communication-files.routes.ts`
- Routes registered in `backend-node/src/server.ts`

```bash
# Restart backend-node
docker-compose restart backend-node

# Verify routes registered
docker-compose logs backend-node | grep "communications"
```

### Step 4: Configure Environment Variables (2 minutes)

```bash
# Add to backend-python/.env
cat >> backend-python/.env <<EOF

# Ollama Configuration for mem0
OLLAMA_API_URL=http://host.docker.internal:11434
OLLAMA_CHAT_MODEL=llama3.2:latest
OLLAMA_EMBEDDING_MODEL=nomic-embed-text:latest

# Enhanced Processing
ENABLE_DOCLING=true
ENABLE_MEM0=true
ENABLE_FACT_EXTRACTION=true

# Curation Settings
AUTO_APPROVE_THRESHOLD=0.7
CURATOR_NOTIFICATION_EMAIL=curator@tip.example.com
EOF

# Restart to apply changes
docker-compose restart backend-python
```

### Step 5: Import Enhanced n8n Workflows (10 minutes)

#### Import Document Processing Workflow

1. Open n8n: `http://n8n.tip.localhost`
2. Go to: **Workflows** → **Add Workflow** → **Import from File**
3. Select: `assets/n8n-agentic-RAG-workflow/tip-agentic-rag/TIP_Document_Processing_Enhanced_Workflow.json`
4. Update credentials:
   - Click each PostgreSQL node
   - Select "TIP PostgreSQL" credential
   - Save
5. Copy webhook URL from "Document Upload Webhook" node
6. Update `backend-python/.env`:
   ```bash
   N8N_DOCUMENT_PROCESSING_WEBHOOK=http://n8n:5678/webhook/tip-document-processing-enhanced
   ```
7. Toggle **Active** (top-right switch)

#### Import Enhanced RAG Agent Workflow

1. **Workflows** → **Add Workflow** → **Import from File**
2. Select: `assets/n8n-agentic-RAG-workflow/tip-agentic-rag/TIP_Agentic_RAG_Enhanced_Workflow.json`
3. Update all credentials (PostgreSQL nodes)
4. Copy webhook URL from "When chat message received" node
5. Toggle **Active**

### Step 6: Restart All Services (1 minute)

```bash
docker-compose restart backend-python backend-node

# Verify all services healthy
docker-compose ps
```

---

## Testing the Enhanced Features

### Test 1: Document Upload with Docling (3 minutes)

```bash
# Create a test document with tables
cat > /tmp/test-transition-plan.txt <<EOF
Transition Timeline

Phase 1: Preparation (T-180 to T-120 days)
- Initial stakeholder identification: March 15, 2024
- Knowledge capture planning: March 22, 2024
- Security clearance initiation: April 1, 2024

Contract Information:
Contract ID: ABC-2024-001
Contractor: Acme Transition Services LLC
Total Value: $2,500,000
Duration: 180 days

Key Personnel:
- Government PM: Jane Smith (jane.smith@agency.gov)
- Contractor PM: John Doe (john.doe@acme.com)
- Security Officer: Bob Wilson (bob.wilson@agency.gov)
EOF

# Upload document
curl -X POST http://api.tip.localhost/api/knowledge/upload \
  -F "file=@/tmp/test-transition-plan.txt" \
  -F "uploaded_by=test-user-id" \
  -F "security_classification=UNCLASSIFIED"

# Save the document_id from response
```

### Test 2: Verify Version Tracking (1 minute)

```bash
# Wait 30 seconds for processing
sleep 30

# Check version created
docker-compose exec db psql -U user -d tip -c "
  SELECT * FROM document_versioning_summary;
"
```

**Expected output:**
```
 document_id | total_versions | latest_version | content_hash_latest | latest_created_at
-------------+----------------+----------------+---------------------+-------------------
 <doc-id>    | 1              | 1              | <hash>              | <timestamp>
```

### Test 3: Verify Fact Extraction (1 minute)

```bash
# Check facts extracted
docker-compose exec db psql -U user -d tip -c "
  SELECT fact_text, fact_type, confidence_score, curation_status
  FROM document_facts
  ORDER BY confidence_score DESC
  LIMIT 10;
"
```

**Expected facts:**
- Date fact: "Initial stakeholder identification: March 15, 2024" (type: date)
- Entity fact: "Acme Transition Services LLC" (type: entity)
- Metric fact: "$2,500,000" (type: metric)
- Person fact: "Jane Smith (jane.smith@agency.gov)" (type: person)

### Test 4: Verify Curation Queue (1 minute)

```bash
# Check curation queue created
docker-compose exec db psql -U user -d tip -c "
  SELECT * FROM curation_workload_dashboard;
"
```

**Expected output:**
```
 total_items | pending | in_review | approved | rejected | high_priority | avg_quality_score
-------------+---------+-----------+----------+----------+---------------+-------------------
 1           | 0       | 0         | 1        | 0        | 0             | 0.85
```

Note: Document should be auto-approved if quality score ≥ 0.7

### Test 5: Query Facts via mem0 (2 minutes)

```bash
# Search for date facts
curl -X POST http://backend-python:8000/api/knowledge/facts/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "When is the initial stakeholder meeting?",
    "fact_types": ["date"],
    "limit": 5,
    "min_confidence": 0.7
  }'
```

**Expected response:**
```json
{
  "query": "When is the initial stakeholder meeting?",
  "facts": [
    {
      "fact_text": "Initial stakeholder identification: March 15, 2024",
      "fact_type": "date",
      "confidence_score": 0.95,
      "memory_id": "<mem0-id>",
      "document_id": "<doc-id>",
      "source_document": "test-transition-plan.txt"
    }
  ],
  "count": 1
}
```

### Test 6: Enhanced RAG Query (2 minutes)

```bash
# Query using enhanced RAG agent with fact search
curl -X POST http://n8n.tip.localhost/webhook/tip-rag-chat-enhanced \
  -H "Content-Type: application/json" \
  -d '{
    "chatInput": "What is the contract value and who is the government PM?",
    "sessionId": "test-session-enhanced",
    "userId": "test-user"
  }'
```

**Expected response:**
```json
{
  "response": "Based on the extracted facts from test-transition-plan.txt:\n\n1. **Contract Value**: $2,500,000 (Fact ID: xyz-789, confidence: 0.92)\n2. **Government PM**: Jane Smith (jane.smith@agency.gov) (Fact ID: abc-456, confidence: 0.95)\n\nThe contract (ABC-2024-001) is with Acme Transition Services LLC for a duration of 180 days.",
  "sessionId": "test-session-enhanced",
  "timestamp": "2025-10-26T12:00:00.000Z"
}
```

### Test 7: Communication File Ingestion (3 minutes)

```bash
# Ingest a test email
curl -X POST http://api.tip.localhost/api/communications/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "source_type": "email",
    "sender": "stakeholder@agency.gov",
    "recipients": ["pm@contractor.com"],
    "subject": "Transition Kickoff Meeting Agenda",
    "body_text": "Please find attached the agenda for our T-180 kickoff meeting.\n\nKey topics:\n1. Timeline review\n2. Security clearance process\n3. Knowledge capture planning\n\nLet me know if you have questions.",
    "attachments_metadata": {
      "attachments": [
        {
          "filename": "meeting-agenda.pdf",
          "mime_type": "application/pdf",
          "size_bytes": 45678,
          "storage_path": "/minio/communications/agenda-001.pdf"
        }
      ]
    },
    "received_at": "2025-10-26T10:00:00Z"
  }'
```

**Expected response:**
```json
{
  "success": true,
  "communication_id": "<comm-id>",
  "attachments_processed": 1,
  "documents_created": ["<doc-id>"],
  "curation_queue_id": "<queue-id>"
}
```

### Test 8: Verify Curation Queue Status (1 minute)

```bash
# Get pending items for curation
curl http://api.tip.localhost/api/communications/pending
```

**Expected response:**
```json
{
  "count": 1,
  "communications": [
    {
      "id": "<comm-id>",
      "source_type": "email",
      "sender": "stakeholder@agency.gov",
      "subject": "Transition Kickoff Meeting Agenda",
      "curation_status": "pending",
      "received_at": "2025-10-26T10:00:00.000Z"
    }
  ]
}
```

---

## Troubleshooting

### Docling Import Errors

**Problem:** `ImportError: No module named 'docling'`

**Solution:**
```bash
# Rebuild backend-python with dependencies
docker-compose build --no-cache backend-python
docker-compose up -d backend-python
```

### mem0 Connection Errors

**Problem:** `mem0.errors.ConnectionError: Cannot connect to Ollama`

**Solution:**
```bash
# Verify Ollama is running and accessible
curl http://host.docker.internal:11434/api/tags

# Check backend-python can reach Ollama
docker-compose exec backend-python curl http://host.docker.internal:11434/api/tags

# If fails, check Docker network settings
docker-compose exec backend-python ping host.docker.internal
```

### No Facts Extracted

**Problem:** Facts table is empty after document upload

**Solution:**
```bash
# Check fact extraction is enabled
docker-compose exec backend-python env | grep ENABLE_MEM0

# Check backend-python logs for errors
docker-compose logs backend-python | grep -i "fact\|mem0"

# Test fact extraction directly
docker-compose exec backend-python python -c "
from src.services.mem0_service import get_mem0_service
service = get_mem0_service()
print('mem0 service initialized:', service)
"
```

### Curation Queue Not Updating

**Problem:** Documents not appearing in curation queue

**Solution:**
```bash
# Check triggers are enabled
docker-compose exec db psql -U user -d tip -c "
  SELECT tgname, tgenabled FROM pg_trigger
  WHERE tgname LIKE 'trg_%curation%';
"

# Manually add to queue (testing)
docker-compose exec db psql -U user -d tip -c "
  INSERT INTO curation_queue (id, item_type, item_id, status, priority, created_at, updated_at)
  VALUES (gen_random_uuid()::TEXT, 'document', '<doc-id>', 'pending', 'normal', NOW(), NOW());
"
```

### Enhanced Workflow Not Triggering

**Problem:** Documents processed by original workflow, not enhanced one

**Solution:**
```bash
# Check webhook URL in backend-python
docker-compose exec backend-python env | grep N8N_DOCUMENT_PROCESSING_WEBHOOK

# Should point to: http://n8n:5678/webhook/tip-document-processing-enhanced

# Update .env and restart
docker-compose restart backend-python
```

---

## API Reference

### Communication Files Endpoints

#### POST /api/communications/ingest
Ingest a new communication (email, Slack, etc.)

**Request:**
```json
{
  "source_type": "email|slack|teams|other",
  "sender": "email@example.com",
  "recipients": ["recipient@example.com"],
  "subject": "Email subject",
  "body_text": "Email body",
  "attachments_metadata": {
    "attachments": [
      {
        "filename": "file.pdf",
        "mime_type": "application/pdf",
        "size_bytes": 12345,
        "storage_path": "/path/to/file"
      }
    ]
  },
  "received_at": "2025-10-26T10:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "communication_id": "uuid",
  "attachments_processed": 1,
  "documents_created": ["doc-id"],
  "curation_queue_id": "queue-id"
}
```

#### GET /api/communications/pending
Get all pending communications

**Response:**
```json
{
  "count": 5,
  "communications": [...]
}
```

#### PATCH /api/communications/:id/status
Update communication curation status

**Request:**
```json
{
  "status": "approved|rejected|in_review|archived",
  "reviewed_by": "user-id",
  "notes": "Optional review notes"
}
```

#### POST /api/communications/search
Search communications

**Request:**
```json
{
  "query": "search text",
  "source_type": "email",
  "status": "pending",
  "date_from": "2025-10-01T00:00:00Z",
  "date_to": "2025-10-31T23:59:59Z"
}
```

### Fact Search Endpoint

#### POST /api/knowledge/facts/search
Search extracted facts using mem0

**Request:**
```json
{
  "query": "What are the key dates?",
  "fact_types": ["date", "metric"],
  "limit": 10,
  "min_confidence": 0.7
}
```

**Response:**
```json
{
  "query": "What are the key dates?",
  "facts": [
    {
      "fact_text": "Initial meeting: March 15, 2024",
      "fact_type": "date",
      "confidence_score": 0.95,
      "memory_id": "mem0-id",
      "document_id": "doc-id",
      "source_document": "filename.pdf"
    }
  ],
  "count": 1
}
```

---

## Success Criteria

✅ **Database Migration:**
- All 5 new tables created (document_versions, document_facts, curation_queue, communication_files, mem0_memories)
- 3 helper views created (document_versioning_summary, fact_extraction_summary, curation_workload_dashboard)
- All triggers and functions working

✅ **Docling Integration:**
- Documents processed with Docling show enhanced metadata
- Tables extracted from PDFs/DOCX stored in document_rows
- Images and sections detected

✅ **mem0 Integration:**
- Facts extracted from uploaded documents
- Fact types categorized correctly
- Confidence scores calculated
- Facts searchable via API

✅ **Curation Workflow:**
- Documents added to curation queue after processing
- Quality scores calculated (0-1.0 range)
- High-quality documents (≥0.7) auto-approved
- Low-quality documents marked for manual review
- Curator notifications sent

✅ **Communication Files:**
- Communications ingested via API
- Attachments extracted and processed
- Documents linked to source communications
- Communications searchable

✅ **Enhanced RAG Agent:**
- 5 tools available (vector search, SQL, full doc, metadata, fact search)
- Fact search returns structured results with confidence scores
- Agent cites sources with fact IDs
- Chat memory persists across sessions

---

## Next Steps

1. **Frontend Integration:**
   - Add fact search to knowledge UI
   - Create curation queue management interface
   - Display document version history
   - Show communication files inbox

2. **Monitoring:**
   - Set up alerts for curation queue backlog
   - Monitor fact extraction quality
   - Track auto-approval rates
   - Monitor Docling/mem0 processing times

3. **Optimization:**
   - Tune quality scoring thresholds
   - Adjust fact extraction confidence levels
   - Optimize Docling processing for large documents
   - Cache frequently accessed facts

4. **Security:**
   - Implement fact-level access control
   - Add communication source authentication
   - Enable curator role-based permissions
   - Audit curation decisions

---

**Deployment Time:** ~25 minutes
**Testing Time:** ~15 minutes
**Total:** ~40 minutes to enhanced system

🚀 **Enhanced TIP Agentic RAG is ready!**

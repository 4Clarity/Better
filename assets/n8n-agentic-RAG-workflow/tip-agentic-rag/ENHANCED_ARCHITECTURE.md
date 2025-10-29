# TIP Agentic RAG - Enhanced Architecture with Docling, mem0, and Curation

## Overview

This document describes the enhanced TIP Agentic RAG system incorporating:
1. **Docling** - Advanced document processing with layout understanding
2. **mem0** - Versioning, fact extraction, and memory management
3. **Curation Workflow** - Information approval and quality control
4. **Communication Files** - Inbound communication processing

---

## Enhanced Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    Document Ingestion Sources                     │
├────────────────┬─────────────────┬──────────────┬────────────────┤
│ DocumentUpload │ CommunicationFiles │ WeeklyCuration │ API Upload │
└────────┬───────┴────────┬────────┴──────┬───────┴────────┬───────┘
         │                 │               │                 │
         └─────────────────┴───────────────┴─────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Python API: /api/knowledge/upload                      │
│        (with duplicate detection & versioning strategy)             │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   n8n: Document Processing Workflow                 │
│                                                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐  │
│  │  Docling Parser │───▶│  mem0 Manager   │───▶│  Embedding   │  │
│  │ - Layout aware  │    │ - Fact extract  │    │  Generation  │  │
│  │ - Tables, imgs  │    │ - Versioning    │    │  (Ollama)    │  │
│  │ - Metadata rich │    │ - Memory store  │    │              │  │
│  └─────────────────┘    └─────────────────┘    └──────────────┘  │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                PostgreSQL Storage (TIP Database)                    │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │ knowledge_       │  │ document_        │  │ document_facts   │ │
│  │ documents        │  │ versions         │  │ (mem0)           │ │
│  │ - Main record    │  │ - Version history│  │ - Extracted facts│ │
│  │ - Latest version │  │ - Changes tracked│  │ - Fact memory    │ │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘ │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │ knowledge_       │  │ document_rows    │  │ curation_queue   │ │
│  │ document_chunks  │  │ (tabular data)   │  │ - Pending review │ │
│  │ - Vector embedded│  │ - JSONB rows     │  │ - Approval flow  │ │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘ │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Curation & Approval Workflow                    │
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐           │
│  │   Pending   │───▶│  In Review  │───▶│  Approved   │           │
│  │   (Queue)   │    │  (Curator)  │    │  (Public)   │           │
│  └─────────────┘    └─────────────┘    └─────────────┘           │
│         │                   │                                       │
│         └───────────────────┴─────────▶ Rejected (Archive)        │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    RAG Query with mem0 Enhancement                  │
│                                                                     │
│  User Query ──▶ mem0 Context Retrieval ──▶ Vector Search ──▶      │
│                 (relevant facts/history)    (chunks)               │
│                                                                     │
│                ──▶ Combined Context ──▶ LLM Response               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component 1: Docling Integration

### What is Docling?

Docling is an advanced document processing library that:
- **Layout-aware parsing** - Understands document structure (headers, sections, tables)
- **Multi-format support** - PDF, DOCX, HTML, Markdown with better fidelity
- **Table extraction** - Preserves table structure and relationships
- **Image handling** - Extracts and describes images/diagrams
- **Metadata enrichment** - Document type, sections, authorship

### Implementation

**File:** `backend-python/src/services/docling_processor.py` (new)

```python
from docling.document_converter import DocumentConverter
from docling.datamodel.base_models import ConversionStatus

class DoclingProcessor:
    def __init__(self):
        self.converter = DocumentConverter()

    async def process_document(self, file_path: str, mime_type: str):
        """
        Process document with Docling for enhanced extraction

        Returns:
            - text_content: Extracted text
            - tables: List of extracted tables
            - metadata: Document structure metadata
            - images: List of image descriptions
        """
        result = self.converter.convert(file_path)

        if result.status != ConversionStatus.SUCCESS:
            raise ValueError(f"Docling conversion failed: {result.status}")

        return {
            "text_content": result.document.export_to_text(),
            "tables": [table.export_to_dataframe() for table in result.document.tables],
            "metadata": {
                "title": result.document.title,
                "sections": [s.heading for s in result.document.sections],
                "page_count": result.document.num_pages,
                "doc_type": result.document.doc_type
            },
            "images": [img.description for img in result.document.images]
        }
```

### Benefits Over Current Approach

| Feature | Current (PyPDF2/python-docx) | Docling |
|---------|------------------------------|---------|
| **PDF Tables** | Lost/mangled | Preserved with structure |
| **Layout Understanding** | None | Headers, sections, hierarchy |
| **Images** | Ignored | Extracted and described |
| **Formatting** | Lost | Preserved (bold, lists, etc.) |
| **Multi-column** | Broken | Correctly ordered |
| **Headers/Footers** | Mixed with content | Identified and filtered |

---

## Component 2: mem0 Integration

### What is mem0?

mem0 is a memory layer for AI applications that:
- **Fact Extraction** - Automatically identifies and stores key facts
- **Versioning** - Tracks fact changes over time
- **Memory Retrieval** - Provides relevant context for queries
- **Deduplication** - Prevents storing duplicate information
- **User-specific memory** - Per-user or per-session context

### Database Schema Extensions

```sql
-- mem0 Fact Storage
CREATE TABLE document_facts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    document_id TEXT NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    version_id TEXT REFERENCES document_versions(id),

    -- Fact content
    fact_text TEXT NOT NULL,
    fact_type VARCHAR(50), -- 'definition', 'procedure', 'requirement', 'timeline', etc.
    confidence_score DECIMAL(3,2), -- 0.0 to 1.0

    -- mem0 integration
    memory_id TEXT, -- mem0's internal ID
    related_facts TEXT[], -- IDs of related facts

    -- Metadata
    extracted_by VARCHAR(50), -- 'llm', 'rule-based', 'manual'
    curation_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    curated_by TEXT,
    curated_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document Versioning
CREATE TABLE document_versions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    document_id TEXT NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,

    -- Version metadata
    uploaded_by TEXT NOT NULL REFERENCES users(id),
    upload_reason TEXT, -- 'update', 'correction', 'new_information'
    change_summary TEXT,

    -- Storage
    storage_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    content_hash VARCHAR(64) NOT NULL, -- SHA256 of file content

    -- Processing
    chunk_count INTEGER DEFAULT 0,
    processing_status VARCHAR(20) DEFAULT 'pending',

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    superseded_at TIMESTAMP,

    CONSTRAINT unique_document_version UNIQUE (document_id, version_number)
);

-- mem0 Memory Index
CREATE TABLE mem0_memories (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    agent_id TEXT,
    memory_text TEXT NOT NULL,
    memory_type VARCHAR(50),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    access_count INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX idx_document_facts_document_id ON document_facts(document_id);
CREATE INDEX idx_document_facts_curation_status ON document_facts(curation_status);
CREATE INDEX idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX idx_mem0_memories_user_id ON mem0_memories(user_id);
CREATE GIN INDEX idx_document_facts_related ON document_facts USING GIN (related_facts);
CREATE GIN INDEX idx_mem0_memories_metadata ON mem0_memories USING GIN (metadata);
```

### mem0 Service Implementation

**File:** `backend-python/src/services/mem0_service.py` (new)

```python
from mem0 import Memory
from typing import List, Dict, Optional

class Mem0Service:
    def __init__(self):
        # Initialize mem0 with PostgreSQL backend
        config = {
            "graph_store": {
                "provider": "neo4j",  # or postgres with pg_graph extension
                "config": {...}
            },
            "vector_store": {
                "provider": "pgvector",
                "config": {...}
            },
            "llm": {
                "provider": "ollama",
                "config": {...}
            }
        }
        self.memory = Memory.from_config(config)

    async def extract_facts(self, document_id: str, content: str, metadata: Dict) -> List[Dict]:
        """
        Extract facts from document content using mem0

        Returns list of extracted facts with confidence scores
        """
        facts = self.memory.add(
            content,
            user_id=metadata.get("uploaded_by"),
            metadata={
                "document_id": document_id,
                "document_type": metadata.get("mime_type"),
                "security_classification": metadata.get("security_classification")
            }
        )
        return facts

    async def get_relevant_context(
        self,
        query: str,
        user_id: str,
        limit: int = 5
    ) -> List[Dict]:
        """
        Retrieve relevant facts/memories for a query
        """
        memories = self.memory.search(
            query,
            user_id=user_id,
            limit=limit
        )
        return memories

    async def update_fact(self, memory_id: str, new_content: str):
        """
        Update an existing fact with new information
        """
        self.memory.update(memory_id, new_content)

    async def get_fact_history(self, memory_id: str) -> List[Dict]:
        """
        Get version history of a fact
        """
        return self.memory.history(memory_id)
```

---

## Component 3: Curation & Approval Workflow

### Curation Queue Schema

```sql
CREATE TABLE curation_queue (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

    -- What's being curated
    item_type VARCHAR(20) NOT NULL, -- 'document', 'fact', 'chunk', 'communication'
    item_id TEXT NOT NULL,

    -- Curation details
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_review', 'approved', 'rejected'
    priority VARCHAR(10) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    source VARCHAR(50), -- 'upload', 'communication', 'weekly_curation', 'api'

    -- Assignment
    assigned_to TEXT REFERENCES users(id),
    assigned_at TIMESTAMP,

    -- Review
    reviewed_by TEXT REFERENCES users(id),
    reviewed_at TIMESTAMP,
    review_notes TEXT,
    rejection_reason TEXT,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_item CHECK (
        (item_type = 'document' AND item_id IN (SELECT id FROM knowledge_documents)) OR
        (item_type = 'fact' AND item_id IN (SELECT id FROM document_facts)) OR
        (item_type = 'communication')
    )
);

CREATE INDEX idx_curation_queue_status ON curation_queue(status);
CREATE INDEX idx_curation_queue_assigned_to ON curation_queue(assigned_to);
CREATE INDEX idx_curation_queue_priority ON curation_queue(priority);
```

### Curation Workflow States

```
PENDING ──────────────▶ IN_REVIEW ──────────────▶ APPROVED
                            │                         │
                            │                         ▼
                            └────────▶ REJECTED ──▶ ARCHIVED

State Transitions:
- PENDING → IN_REVIEW: Curator claims item
- IN_REVIEW → APPROVED: Curator approves with notes
- IN_REVIEW → REJECTED: Curator rejects with reason
- REJECTED → PENDING: Re-submit after corrections
```

### n8n Curation Workflow Nodes

1. **Auto-Curation Check** - ML model scores document quality
2. **Queue Assignment** - Routes to appropriate curator based on topic
3. **Notification** - Alerts curator via email/slack
4. **Approval Handler** - Processes approval (makes public, indexes)
5. **Rejection Handler** - Archives and notifies submitter
6. **Escalation** - High-priority items escalate if not reviewed in 24h

---

## Component 4: Communication Files Processing

### Communication Files Source

**Purpose:** Process inbound communications (emails, messages, attachments) for knowledge capture.

**URL:** `http://tip.localhost/knowledge/communication-files`

### Communication Files Schema

```sql
CREATE TABLE communication_files (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

    -- Source metadata
    source_type VARCHAR(20) NOT NULL, -- 'email', 'slack', 'teams', 'upload'
    source_id TEXT, -- Email message ID, Slack thread ID, etc.
    sender TEXT, -- Email/username of sender
    recipients TEXT[], -- List of recipients
    subject TEXT,

    -- Content
    body_text TEXT,
    body_html TEXT,
    attachments JSONB, -- Array of attachment metadata

    -- Processing
    processed BOOLEAN DEFAULT FALSE,
    document_id TEXT REFERENCES knowledge_documents(id),
    facts_extracted INTEGER DEFAULT 0,

    -- Curation
    curation_status VARCHAR(20) DEFAULT 'pending',
    requires_review BOOLEAN DEFAULT TRUE,

    -- Timestamps
    received_at TIMESTAMP,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_communication_files_curation ON communication_files(curation_status);
CREATE INDEX idx_communication_files_processed ON communication_files(processed);
CREATE INDEX idx_communication_files_source ON communication_files(source_type, source_id);
```

### Communication Processing Flow

```
Email/Message Received
    │
    ▼
Parse & Extract Attachments
    │
    ├─▶ Body Text → Extract Facts → Curation Queue
    │
    └─▶ Attachments → Docling Process → Document Upload Flow
    │
    ▼
Link Communication to Generated Documents
    │
    ▼
Notification to Knowledge Curator
```

### Communication Files API

**File:** `backend-node/src/routes/communication.routes.ts` (new)

```typescript
router.post('/api/communications/ingest', async (req, reply) => {
  const { source_type, source_id, sender, recipients, subject, body, attachments } = req.body;

  // 1. Store communication record
  const comm = await prisma.communication_files.create({
    data: {
      source_type,
      source_id,
      sender,
      recipients,
      subject,
      body_text: body,
      received_at: new Date()
    }
  });

  // 2. Process attachments
  for (const attachment of attachments) {
    // Upload to knowledge base
    const doc = await uploadDocument(attachment);
    // Link to communication
    await linkCommunicationToDocument(comm.id, doc.id);
  }

  // 3. Extract facts from body
  const facts = await extractFactsFromText(body, comm.id);

  // 4. Add to curation queue
  await prisma.curation_queue.create({
    data: {
      item_type: 'communication',
      item_id: comm.id,
      source: 'communication',
      priority: determinePriority(subject, sender)
    }
  });

  return { communication_id: comm.id, status: 'queued' };
});
```

---

## Enhanced n8n Workflows

### 1. Enhanced Document Processing Workflow

**Changes from Base Version:**

```diff
Document Upload Webhook
  │
  ▼
+ Check for Duplicate (content hash)
+ │
+ ├─▶ Existing: Version Check → Create Version
+ │
+ └─▶ New: Continue Processing
  │
  ▼
Extract Document Info
  │
  ▼
- Route by File Type → Extract Text
+ Route by File Type → Docling Process (NEW)
+ │
+ ├─▶ Extract Text (enhanced with layout)
+ ├─▶ Extract Tables → Store as document_rows
+ ├─▶ Extract Images → Store metadata
+ └─▶ Extract Metadata → Store in document
  │
  ▼
+ mem0 Fact Extraction (NEW)
+ │
+ └─▶ Store Facts → document_facts table
  │
  ▼
Chunk & Embed (existing)
  │
  ▼
+ Auto-Curation Check (NEW)
+ │
+ ├─▶ High Quality → Auto-Approve
+ └─▶ Needs Review → Curation Queue
  │
  ▼
Update Status → COMPLETED
```

### 2. New Communication Processing Workflow

**File:** `TIP_Communication_Processing_Workflow.json` (new)

```json
{
  "name": "TIP Communication Processing",
  "nodes": [
    {
      "name": "Communication Webhook",
      "type": "webhook",
      "parameters": {
        "path": "tip-communication-ingest"
      }
    },
    {
      "name": "Parse Email/Message",
      "type": "code",
      "parameters": {
        "functionCode": "// Extract sender, subject, body, attachments"
      }
    },
    {
      "name": "Store Communication Record",
      "type": "postgres",
      "parameters": {
        "operation": "insert",
        "table": "communication_files"
      }
    },
    {
      "name": "Process Attachments Loop",
      "type": "splitInBatches"
    },
    {
      "name": "Upload Attachment as Document",
      "type": "httpRequest",
      "parameters": {
        "url": "http://py.tip.localhost/api/knowledge/upload"
      }
    },
    {
      "name": "Extract Facts from Body",
      "type": "code",
      "parameters": {
        "functionCode": "// Call mem0 to extract facts"
      }
    },
    {
      "name": "Add to Curation Queue",
      "type": "postgres",
      "parameters": {
        "operation": "insert",
        "table": "curation_queue"
      }
    },
    {
      "name": "Notify Curator",
      "type": "sendEmail"
    }
  ]
}
```

### 3. New Curation Approval Workflow

**File:** `TIP_Curation_Workflow.json` (new)

```json
{
  "name": "TIP Curation Workflow",
  "nodes": [
    {
      "name": "Curation Action Webhook",
      "type": "webhook",
      "parameters": {
        "path": "tip-curation-action"
      }
    },
    {
      "name": "Get Curation Item",
      "type": "postgres",
      "parameters": {
        "operation": "select",
        "table": "curation_queue"
      }
    },
    {
      "name": "Action Router",
      "type": "switch",
      "parameters": {
        "rules": [
          {"condition": "action === 'approve'"},
          {"condition": "action === 'reject'"},
          {"condition": "action === 'request_changes'"}
        ]
      }
    },
    {
      "name": "Approve Handler",
      "type": "code",
      "parameters": {
        "functionCode": "// Mark as approved, make public, index for search"
      }
    },
    {
      "name": "Reject Handler",
      "type": "code",
      "parameters": {
        "functionCode": "// Archive, notify submitter, log reason"
      }
    },
    {
      "name": "Update Curation Status",
      "type": "postgres",
      "parameters": {
        "operation": "update",
        "table": "curation_queue"
      }
    }
  ]
}
```

---

## Integration with Existing TIP Features

### Frontend Components

1. **Enhanced DocumentUpload.tsx**
   - Show version history (already has DocumentRevisions)
   - Display extracted tables preview
   - Show auto-detected facts
   - Curation status indicator

2. **New CommunicationFiles.tsx** (exists, needs enhancement)
   - List inbound communications
   - Show processing status
   - Bulk approve/reject actions
   - Filter by source (email, slack, etc.)

3. **Enhanced ApprovalQueue.tsx** (exists)
   - Group by priority
   - Filter by item type
   - Bulk actions
   - Review interface with fact diff

4. **New FactsCuration.tsx** (exists)
   - Browse extracted facts
   - Edit/merge facts
   - Link related facts
   - Fact version history

### API Endpoints

```typescript
// Enhanced knowledge routes
POST   /api/knowledge/upload          // Enhanced with Docling & mem0
GET    /api/knowledge/documents/:id/versions  // Version history
GET    /api/knowledge/documents/:id/facts     // Extracted facts
POST   /api/knowledge/facts/:id/approve       // Approve fact

// New communication routes
POST   /api/communications/ingest     // Ingest email/message
GET    /api/communications             // List communications
GET    /api/communications/:id         // Get communication details
POST   /api/communications/:id/process // Manually trigger processing

// New curation routes
GET    /api/curation/queue            // Get pending items
POST   /api/curation/:id/approve      // Approve item
POST   /api/curation/:id/reject       // Reject item
POST   /api/curation/:id/assign       // Assign to curator
GET    /api/curation/stats            // Curation metrics
```

---

## Deployment Plan

### Phase 1: Core Enhancements (Week 1)

- [ ] Update requirements.txt with mem0
- [ ] Implement DoclingProcessor service
- [ ] Add versioning schema migrations
- [ ] Update document upload API with versioning
- [ ] Test Docling vs PyPDF2 on sample documents

### Phase 2: mem0 Integration (Week 2)

- [ ] Add mem0 schema migrations (facts, memories)
- [ ] Implement Mem0Service
- [ ] Integrate fact extraction into processing pipeline
- [ ] Add fact curation UI components
- [ ] Test fact extraction quality

### Phase 3: Curation Workflow (Week 3)

- [ ] Add curation queue schema
- [ ] Implement curation API endpoints
- [ ] Enhance ApprovalQueue component
- [ ] Create n8n Curation Workflow
- [ ] Add curator notifications

### Phase 4: Communication Files (Week 4)

- [ ] Add communication schema
- [ ] Implement communication ingestion API
- [ ] Enhance CommunicationFiles component
- [ ] Create n8n Communication Workflow
- [ ] Test email/slack integration

### Phase 5: RAG Enhancement (Week 5)

- [ ] Update RAG agent to use mem0 context
- [ ] Add fact-based retrieval tool
- [ ] Enhance system prompt with fact awareness
- [ ] Test query quality improvements
- [ ] Benchmark vs baseline

---

## Success Metrics

### Document Processing
- **Docling Accuracy:** > 95% table extraction accuracy
- **Processing Time:** < 2 minutes for typical documents
- **Fact Extraction:** Average 10-20 facts per document

### Versioning
- **Duplicate Detection:** 100% accuracy on content hash
- **Version Tracking:** All changes recorded with metadata
- **Storage Efficiency:** Delta compression for similar versions

### Curation
- **Queue Throughput:** < 24 hours from submission to review
- **Approval Rate:** 80-90% approved on first review
- **Auto-Approval:** 30-40% of high-quality docs auto-approved

### Communication Processing
- **Ingestion Speed:** Real-time (< 5 seconds)
- **Attachment Processing:** 100% success rate
- **Fact Extraction:** Capture key points from 90%+ of communications

### RAG Quality
- **Answer Accuracy:** 15-20% improvement with mem0 context
- **Source Citations:** Include relevant facts and documents
- **Response Time:** < 3 seconds with mem0 retrieval

---

## Next Steps

1. Review this architecture with team
2. Prioritize phases based on business needs
3. Set up development environment with mem0
4. Create proof-of-concept for Docling processing
5. Design detailed curation UI mockups

---

**Document Version:** 1.0.0
**Created:** 2025-10-26
**Status:** Proposed Architecture

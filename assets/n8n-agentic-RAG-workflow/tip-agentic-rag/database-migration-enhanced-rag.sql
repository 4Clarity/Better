-- Migration 021: Enhanced TIP Agentic RAG with Docling, mem0, and Curation
-- Description: Add versioning, fact extraction, and curation workflow
-- Dependencies: Migration 020 (TIP Agentic RAG base tables)
-- Date: 2025-10-26

-- ============================================================================
-- PART 1: Document Versioning
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_versions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    document_id TEXT NOT NULL,
    version_number INTEGER NOT NULL,

    -- Version metadata
    uploaded_by TEXT NOT NULL,
    upload_reason VARCHAR(50), -- 'initial', 'update', 'correction', 'new_information'
    change_summary TEXT,
    version_notes TEXT,

    -- Storage
    storage_path TEXT NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size > 0),
    content_hash VARCHAR(64) NOT NULL, -- SHA256 hash
    mime_type VARCHAR(100) NOT NULL,

    -- Processing status
    chunk_count INTEGER DEFAULT 0,
    processing_status VARCHAR(20) DEFAULT 'pending',
    processing_error TEXT,

    -- Docling enhanced metadata
    docling_metadata JSONB, -- {tables_count, images_count, sections, doc_type}

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    superseded_at TIMESTAMP,

    -- Foreign key
    CONSTRAINT fk_document_versions_document_id
        FOREIGN KEY (document_id)
        REFERENCES knowledge_documents(id)
        ON DELETE CASCADE,

    -- Unique constraint
    CONSTRAINT unique_document_version UNIQUE (document_id, version_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_created_at ON document_versions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_versions_content_hash ON document_versions(content_hash);

-- Comments
COMMENT ON TABLE document_versions IS 'Tracks all versions of uploaded documents with content hashing for duplicate detection';
COMMENT ON COLUMN document_versions.content_hash IS 'SHA256 hash of file content for duplicate detection and version comparison';
COMMENT ON COLUMN document_versions.docling_metadata IS 'Metadata from Docling processing: tables, images, sections, document type';

-- ============================================================================
-- PART 2: mem0 Fact Storage
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_facts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    document_id TEXT NOT NULL,
    version_id TEXT,
    chunk_id TEXT, -- Reference to specific chunk if applicable

    -- Fact content
    fact_text TEXT NOT NULL,
    fact_type VARCHAR(50), -- 'definition', 'procedure', 'requirement', 'timeline', 'milestone', 'role', 'deliverable'
    fact_category VARCHAR(50), -- 'transition', 'contract', 'stakeholder', 'security', 'technical'
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),

    -- mem0 integration
    memory_id TEXT UNIQUE, -- mem0's internal memory ID
    related_facts TEXT[], -- IDs of related/similar facts
    embedding vector(768), -- Fact embedding for similarity search

    -- Context
    source_section TEXT, -- Section/heading where fact was found
    source_page INTEGER, -- Page number if applicable
    context_snippet TEXT, -- Surrounding text for context

    -- Curation
    curation_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'merged'
    curated_by TEXT,
    curated_at TIMESTAMP,
    curation_notes TEXT,
    merged_into TEXT, -- ID of fact this was merged into

    -- Metadata
    extracted_by VARCHAR(50) DEFAULT 'llm', -- 'llm', 'rule-based', 'manual', 'mem0'
    extraction_method JSONB, -- Details about extraction (model, parameters)

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign keys
    CONSTRAINT fk_document_facts_document_id
        FOREIGN KEY (document_id)
        REFERENCES knowledge_documents(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_document_facts_version_id
        FOREIGN KEY (version_id)
        REFERENCES document_versions(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_document_facts_curated_by
        FOREIGN KEY (curated_by)
        REFERENCES users(id)
        ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_document_facts_document_id ON document_facts(document_id);
CREATE INDEX IF NOT EXISTS idx_document_facts_curation_status ON document_facts(curation_status);
CREATE INDEX IF NOT EXISTS idx_document_facts_fact_type ON document_facts(fact_type);
CREATE INDEX IF NOT EXISTS idx_document_facts_fact_category ON document_facts(fact_category);
CREATE INDEX IF NOT EXISTS idx_document_facts_memory_id ON document_facts(memory_id) WHERE memory_id IS NOT NULL;
CREATE GIN INDEX IF NOT EXISTS idx_document_facts_related ON document_facts USING GIN (related_facts);

-- Vector similarity index for facts
CREATE INDEX IF NOT EXISTS idx_document_facts_embedding
    ON document_facts
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Comments
COMMENT ON TABLE document_facts IS 'Stores extracted facts from documents with mem0 integration for memory management';
COMMENT ON COLUMN document_facts.memory_id IS 'Reference to mem0 memory system for cross-document fact tracking';
COMMENT ON COLUMN document_facts.related_facts IS 'Array of fact IDs that are semantically related or contradictory';

-- ============================================================================
-- PART 3: mem0 Memory Index
-- ============================================================================

CREATE TABLE IF NOT EXISTS mem0_memories (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    agent_id TEXT DEFAULT 'tip-rag-agent',

    -- Memory content
    memory_text TEXT NOT NULL,
    memory_type VARCHAR(50), -- 'fact', 'conversation', 'preference', 'context'
    memory_category VARCHAR(50),

    -- Relationships
    related_document_id TEXT,
    related_fact_id TEXT,

    -- Metadata
    metadata JSONB,
    embedding vector(768),

    -- Usage tracking
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    importance_score DECIMAL(3,2) DEFAULT 0.5,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign keys
    CONSTRAINT fk_mem0_memories_user_id
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_mem0_memories_related_document
        FOREIGN KEY (related_document_id)
        REFERENCES knowledge_documents(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_mem0_memories_related_fact
        FOREIGN KEY (related_fact_id)
        REFERENCES document_facts(id)
        ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mem0_memories_user_id ON mem0_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_mem0_memories_type ON mem0_memories(memory_type);
CREATE INDEX IF NOT EXISTS idx_mem0_memories_importance ON mem0_memories(importance_score DESC);
CREATE GIN INDEX IF NOT EXISTS idx_mem0_memories_metadata ON mem0_memories USING GIN (metadata);

-- Vector index for memory search
CREATE INDEX IF NOT EXISTS idx_mem0_memories_embedding
    ON mem0_memories
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Comments
COMMENT ON TABLE mem0_memories IS 'mem0 memory index for user/agent context and cross-document knowledge';
COMMENT ON COLUMN mem0_memories.importance_score IS 'Relevance score (0-1) for memory prioritization and pruning';

-- ============================================================================
-- PART 4: Curation Workflow
-- ============================================================================

CREATE TABLE IF NOT EXISTS curation_queue (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

    -- What's being curated
    item_type VARCHAR(20) NOT NULL, -- 'document', 'fact', 'chunk', 'communication', 'fact_group'
    item_id TEXT NOT NULL,
    parent_document_id TEXT, -- Link to source document if applicable

    -- Curation details
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_review', 'approved', 'rejected', 'changes_requested'
    priority VARCHAR(10) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    source VARCHAR(50), -- 'upload', 'communication', 'weekly_curation', 'api', 'auto_detected'

    -- Assignment
    assigned_to TEXT,
    assigned_at TIMESTAMP,
    claimed_by TEXT, -- Curator who claimed the review
    claimed_at TIMESTAMP,

    -- Review
    reviewed_by TEXT,
    reviewed_at TIMESTAMP,
    review_notes TEXT,
    rejection_reason TEXT,
    requested_changes TEXT,

    -- Quality scores (auto-generated)
    quality_score DECIMAL(3,2), -- 0.0 to 1.0
    completeness_score DECIMAL(3,2),
    relevance_score DECIMAL(3,2),

    -- Metadata
    submission_metadata JSONB,
    escalated BOOLEAN DEFAULT FALSE,
    escalation_reason TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP,

    -- Foreign keys
    CONSTRAINT fk_curation_queue_assigned_to
        FOREIGN KEY (assigned_to)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_curation_queue_reviewed_by
        FOREIGN KEY (reviewed_by)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_curation_queue_parent_document
        FOREIGN KEY (parent_document_id)
        REFERENCES knowledge_documents(id)
        ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_curation_queue_status ON curation_queue(status);
CREATE INDEX IF NOT EXISTS idx_curation_queue_assigned_to ON curation_queue(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_curation_queue_priority ON curation_queue(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_curation_queue_item ON curation_queue(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_curation_queue_escalated ON curation_queue(escalated) WHERE escalated = TRUE;
CREATE GIN INDEX IF NOT EXISTS idx_curation_queue_metadata ON curation_queue USING GIN (submission_metadata);

-- Comments
COMMENT ON TABLE curation_queue IS 'Queue for reviewing and approving knowledge content before making it public';
COMMENT ON COLUMN curation_queue.quality_score IS 'Auto-generated quality assessment (0-1) based on completeness, formatting, etc.';

-- ============================================================================
-- PART 5: Communication Files
-- ============================================================================

CREATE TABLE IF NOT EXISTS communication_files (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

    -- Source metadata
    source_type VARCHAR(20) NOT NULL, -- 'email', 'slack', 'teams', 'upload', 'api'
    source_id TEXT, -- External ID (email message ID, Slack thread ID)
    source_url TEXT, -- Link to original message

    -- Sender/Recipients
    sender TEXT, -- Email address or username
    sender_name TEXT,
    recipients TEXT[], -- Array of recipient emails/usernames
    cc_recipients TEXT[],

    -- Content
    subject TEXT,
    body_text TEXT,
    body_html TEXT,
    thread_id TEXT, -- For grouping related messages

    -- Attachments
    attachments_count INTEGER DEFAULT 0,
    attachments_metadata JSONB, -- [{name, size, mime_type, document_id}, ...]

    -- Processing
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP,
    processing_error TEXT,

    -- Linked documents
    generated_document_ids TEXT[], -- Documents created from this communication

    -- Fact extraction
    facts_extracted INTEGER DEFAULT 0,
    facts_pending_review INTEGER DEFAULT 0,

    -- Curation
    curation_status VARCHAR(20) DEFAULT 'pending',
    curation_queue_id TEXT,
    requires_review BOOLEAN DEFAULT TRUE,
    auto_approve_eligible BOOLEAN DEFAULT FALSE,

    -- Classification
    topic VARCHAR(50), -- Auto-detected topic
    importance VARCHAR(10), -- 'low', 'medium', 'high'
    sensitivity VARCHAR(20), -- 'public', 'internal', 'confidential'

    -- Timestamps
    received_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key
    CONSTRAINT fk_communication_files_curation_queue
        FOREIGN KEY (curation_queue_id)
        REFERENCES curation_queue(id)
        ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_communication_files_curation ON communication_files(curation_status);
CREATE INDEX IF NOT EXISTS idx_communication_files_processed ON communication_files(processed);
CREATE INDEX IF NOT EXISTS idx_communication_files_source ON communication_files(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_communication_files_thread ON communication_files(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_communication_files_sender ON communication_files(sender);
CREATE INDEX IF NOT EXISTS idx_communication_files_received ON communication_files(received_at DESC);
CREATE GIN INDEX IF NOT EXISTS idx_communication_files_recipients ON communication_files USING GIN (recipients);
CREATE GIN INDEX IF NOT EXISTS idx_communication_files_generated_docs ON communication_files USING GIN (generated_document_ids);

-- Comments
COMMENT ON TABLE communication_files IS 'Inbound communications (emails, messages) for knowledge capture and curation';
COMMENT ON COLUMN communication_files.attachments_metadata IS 'JSONB array of attachment metadata with links to created documents';

-- ============================================================================
-- PART 6: Enhanced Functions
-- ============================================================================

-- Function: Get document version history
CREATE OR REPLACE FUNCTION get_document_version_history(doc_id TEXT)
RETURNS TABLE (
    version_id TEXT,
    version_number INTEGER,
    uploaded_by TEXT,
    upload_reason VARCHAR,
    change_summary TEXT,
    file_size BIGINT,
    chunk_count INTEGER,
    created_at TIMESTAMP,
    superseded_at TIMESTAMP,
    is_current BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dv.id,
        dv.version_number,
        dv.uploaded_by,
        dv.upload_reason,
        dv.change_summary,
        dv.file_size,
        dv.chunk_count,
        dv.created_at,
        dv.superseded_at,
        (dv.superseded_at IS NULL) as is_current
    FROM document_versions dv
    WHERE dv.document_id = doc_id
    ORDER BY dv.version_number DESC;
END;
$$;

-- Function: Search facts by similarity
CREATE OR REPLACE FUNCTION search_facts_by_similarity(
    query_embedding vector(768),
    similarity_threshold FLOAT DEFAULT 0.7,
    match_count INTEGER DEFAULT 10,
    approved_only BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
    fact_id TEXT,
    fact_text TEXT,
    fact_type VARCHAR,
    document_id TEXT,
    similarity FLOAT,
    confidence_score DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        df.id,
        df.fact_text,
        df.fact_type,
        df.document_id,
        1 - (df.embedding <=> query_embedding) AS similarity,
        df.confidence_score
    FROM document_facts df
    WHERE
        df.embedding IS NOT NULL
        AND (1 - (df.embedding <=> query_embedding)) >= similarity_threshold
        AND (NOT approved_only OR df.curation_status = 'approved')
    ORDER BY df.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Function: Get curation queue summary
CREATE OR REPLACE FUNCTION get_curation_queue_summary()
RETURNS TABLE (
    status VARCHAR,
    item_type VARCHAR,
    count BIGINT,
    avg_age_hours NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cq.status,
        cq.item_type,
        COUNT(*) as count,
        ROUND(EXTRACT(EPOCH FROM AVG(NOW() - cq.created_at)) / 3600, 1) as avg_age_hours
    FROM curation_queue cq
    WHERE cq.status IN ('pending', 'in_review')
    GROUP BY cq.status, cq.item_type
    ORDER BY cq.status, count DESC;
END;
$$;

-- Comments
COMMENT ON FUNCTION get_document_version_history IS 'Retrieve complete version history for a document';
COMMENT ON FUNCTION search_facts_by_similarity IS 'Vector similarity search for facts with approval filtering';
COMMENT ON FUNCTION get_curation_queue_summary IS 'Get overview of pending curation items by type and age';

-- ============================================================================
-- PART 7: Triggers
-- ============================================================================

-- Trigger: Update document_facts.updated_at on change
CREATE OR REPLACE FUNCTION update_document_facts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_facts_updated_at_trigger
    BEFORE UPDATE ON document_facts
    FOR EACH ROW
    EXECUTE FUNCTION update_document_facts_timestamp();

-- Trigger: Update curation_queue.updated_at on change
CREATE OR REPLACE FUNCTION update_curation_queue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER curation_queue_updated_at_trigger
    BEFORE UPDATE ON curation_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_curation_queue_timestamp();

-- Trigger: Auto-escalate old curation items
CREATE OR REPLACE FUNCTION auto_escalate_curation_items()
RETURNS TRIGGER AS $$
BEGIN
    -- Escalate if in pending/in_review for more than 48 hours
    IF (NEW.status IN ('pending', 'in_review') AND
        EXTRACT(EPOCH FROM (NOW() - NEW.created_at)) > 172800 AND
        NEW.escalated = FALSE) THEN
        NEW.escalated = TRUE;
        NEW.escalation_reason = 'Auto-escalated: No review after 48 hours';
        NEW.priority = CASE
            WHEN NEW.priority = 'normal' THEN 'high'
            WHEN NEW.priority = 'high' THEN 'urgent'
            ELSE NEW.priority
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_escalate_trigger
    BEFORE UPDATE ON curation_queue
    FOR EACH ROW
    EXECUTE FUNCTION auto_escalate_curation_items();

-- ============================================================================
-- PART 8: Views for Monitoring
-- ============================================================================

-- View: Document versioning overview
CREATE OR REPLACE VIEW document_versioning_summary AS
SELECT
    kd.id as document_id,
    kd.filename,
    COUNT(dv.id) as version_count,
    MAX(dv.version_number) as current_version,
    MIN(dv.created_at) as first_uploaded,
    MAX(dv.created_at) as last_updated,
    SUM(dv.file_size) as total_storage_bytes
FROM knowledge_documents kd
LEFT JOIN document_versions dv ON kd.id = dv.document_id
GROUP BY kd.id, kd.filename
ORDER BY last_updated DESC;

-- View: Fact extraction overview
CREATE OR REPLACE VIEW fact_extraction_summary AS
SELECT
    kd.id as document_id,
    kd.filename,
    COUNT(df.id) as total_facts,
    COUNT(CASE WHEN df.curation_status = 'approved' THEN 1 END) as approved_facts,
    COUNT(CASE WHEN df.curation_status = 'pending' THEN 1 END) as pending_facts,
    COUNT(CASE WHEN df.curation_status = 'rejected' THEN 1 END) as rejected_facts,
    AVG(df.confidence_score) as avg_confidence
FROM knowledge_documents kd
LEFT JOIN document_facts df ON kd.id = df.document_id
GROUP BY kd.id, kd.filename
HAVING COUNT(df.id) > 0
ORDER BY total_facts DESC;

-- View: Curation workload dashboard
CREATE OR REPLACE VIEW curation_workload_dashboard AS
SELECT
    COALESCE(u.username, 'Unassigned') as curator,
    cq.status,
    COUNT(*) as item_count,
    AVG(EXTRACT(EPOCH FROM (NOW() - cq.created_at)) / 3600) as avg_age_hours,
    MIN(cq.created_at) as oldest_item,
    COUNT(CASE WHEN cq.escalated THEN 1 END) as escalated_count
FROM curation_queue cq
LEFT JOIN users u ON cq.assigned_to = u.id
WHERE cq.status IN ('pending', 'in_review')
GROUP BY COALESCE(u.username, 'Unassigned'), cq.status
ORDER BY escalated_count DESC, avg_age_hours DESC;

-- Comments
COMMENT ON VIEW document_versioning_summary IS 'Overview of document versions and storage usage';
COMMENT ON VIEW fact_extraction_summary IS 'Summary of fact extraction and curation status per document';
COMMENT ON VIEW curation_workload_dashboard IS 'Curator workload and aging items for queue management';

-- ============================================================================
-- PART 9: Seed Data
-- ============================================================================

-- Insert test communication file
INSERT INTO communication_files (
    id,
    source_type,
    source_id,
    sender,
    sender_name,
    recipients,
    subject,
    body_text,
    received_at,
    topic,
    importance
) VALUES (
    'test-comm-001',
    'email',
    'msg-12345',
    'contractor@example.com',
    'John Contractor',
    ARRAY['pm@tip.gov'],
    'Transition Milestone Update - T-90 Days',
    'Team, we have completed the knowledge capture phase and are ready to begin contractor handover preparations. Attached are the preliminary documentation review reports.',
    NOW() - INTERVAL '2 hours',
    'transition',
    'high'
) ON CONFLICT (id) DO NOTHING;

-- Insert test curation queue item
INSERT INTO curation_queue (
    id,
    item_type,
    item_id,
    status,
    priority,
    source,
    quality_score,
    due_date
) VALUES (
    'test-curation-001',
    'communication',
    'test-comm-001',
    'pending',
    'high',
    'communication',
    0.85,
    NOW() + INTERVAL '24 hours'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PART 10: Permissions
-- ============================================================================

-- Grant permissions to application user
GRANT ALL ON document_versions TO "user";
GRANT ALL ON document_facts TO "user";
GRANT ALL ON mem0_memories TO "user";
GRANT ALL ON curation_queue TO "user";
GRANT ALL ON communication_files TO "user";

GRANT SELECT ON document_versioning_summary TO "user";
GRANT SELECT ON fact_extraction_summary TO "user";
GRANT SELECT ON curation_workload_dashboard TO "user";

-- ============================================================================
-- PART 11: Validation and Summary
-- ============================================================================

DO $$
DECLARE
    version_count INTEGER;
    fact_count INTEGER;
    curation_count INTEGER;
    comm_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO version_count FROM document_versions;
    SELECT COUNT(*) INTO fact_count FROM document_facts;
    SELECT COUNT(*) INTO curation_count FROM curation_queue;
    SELECT COUNT(*) INTO comm_count FROM communication_files;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Enhanced TIP Agentic RAG Migration Complete';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'New Tables Created:';
    RAISE NOTICE '  - document_versions (versioning)';
    RAISE NOTICE '  - document_facts (mem0 fact storage)';
    RAISE NOTICE '  - mem0_memories (memory index)';
    RAISE NOTICE '  - curation_queue (approval workflow)';
    RAISE NOTICE '  - communication_files (inbound comms)';
    RAISE NOTICE '';
    RAISE NOTICE 'New Functions Created:';
    RAISE NOTICE '  - get_document_version_history()';
    RAISE NOTICE '  - search_facts_by_similarity()';
    RAISE NOTICE '  - get_curation_queue_summary()';
    RAISE NOTICE '';
    RAISE NOTICE 'New Views Created:';
    RAISE NOTICE '  - document_versioning_summary';
    RAISE NOTICE '  - fact_extraction_summary';
    RAISE NOTICE '  - curation_workload_dashboard';
    RAISE NOTICE '';
    RAISE NOTICE 'Current Data:';
    RAISE NOTICE '  - Document Versions: %', version_count;
    RAISE NOTICE '  - Facts: %', fact_count;
    RAISE NOTICE '  - Curation Queue: %', curation_count;
    RAISE NOTICE '  - Communications: %', comm_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Install mem0: pip install mem0ai';
    RAISE NOTICE '  2. Implement DoclingProcessor service';
    RAISE NOTICE '  3. Implement Mem0Service';
    RAISE NOTICE '  4. Update n8n workflows with new nodes';
    RAISE NOTICE '  5. Test document versioning flow';
    RAISE NOTICE '========================================';
END $$;

-- Migration complete
SELECT 'Enhanced TIP Agentic RAG migration completed successfully' AS status;

-- Migration: 017_add_knowledge_documents_table.sql
-- Description: Create knowledge_documents table for tracking uploaded documents and their processing status
-- Dependencies: Migration 016 (knowledge_chunks table with vector support)
-- Date: 2025-10-20

-- Create upload_status enum
DO $$ BEGIN
    CREATE TYPE knowledge_document_status AS ENUM (
        'UPLOADED',
        'ANALYZING',
        'CHUNKING',
        'EMBEDDING',
        'COMPLETED',
        'FAILED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create knowledge_documents table
CREATE TABLE IF NOT EXISTS knowledge_documents (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size > 0),
    mime_type VARCHAR(100) NOT NULL,
    storage_path TEXT NOT NULL,
    upload_status knowledge_document_status NOT NULL DEFAULT 'UPLOADED',
    processing_error TEXT,
    chunk_count INTEGER DEFAULT 0 CHECK (chunk_count >= 0),

    -- NEW: LLM Chunking Strategy Metadata
    chunking_strategy JSONB,
    chunking_analysis_time_ms INTEGER CHECK (chunking_analysis_time_ms >= 0),
    n8n_workflow_id VARCHAR(255),

    -- User and security
    uploaded_by TEXT NOT NULL,
    security_classification VARCHAR(50) DEFAULT 'UNCLASSIFIED',

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Foreign keys
    CONSTRAINT fk_knowledge_documents_uploaded_by FOREIGN KEY (uploaded_by)
        REFERENCES users(id) ON DELETE SET NULL
);

-- Add foreign key constraint from knowledge_chunks to knowledge_documents
ALTER TABLE knowledge_chunks
DROP CONSTRAINT IF EXISTS fk_knowledge_chunks_document_id;

ALTER TABLE knowledge_chunks
ADD CONSTRAINT fk_knowledge_chunks_document_id
    FOREIGN KEY (document_id)
    REFERENCES knowledge_documents(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_upload_status ON knowledge_documents(upload_status);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_uploaded_by ON knowledge_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_security_classification ON knowledge_documents(security_classification);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_created_at ON knowledge_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_n8n_workflow_id ON knowledge_documents(n8n_workflow_id) WHERE n8n_workflow_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_mime_type ON knowledge_documents(mime_type);

-- Create GIN index on chunking_strategy JSONB for fast JSON queries
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_chunking_strategy_gin ON knowledge_documents USING GIN (chunking_strategy);

-- Add comments for documentation
COMMENT ON TABLE knowledge_documents IS 'Tracks uploaded documents and their processing status for RAG knowledge base';
COMMENT ON COLUMN knowledge_documents.filename IS 'Sanitized filename used for storage';
COMMENT ON COLUMN knowledge_documents.original_name IS 'Original filename from user upload';
COMMENT ON COLUMN knowledge_documents.file_size IS 'File size in bytes';
COMMENT ON COLUMN knowledge_documents.mime_type IS 'MIME type (e.g., application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document)';
COMMENT ON COLUMN knowledge_documents.storage_path IS 'MinIO storage path (e.g., knowledge/unclassified/2025-10-20/user-id/document.pdf)';
COMMENT ON COLUMN knowledge_documents.upload_status IS 'Current processing status of the document';
COMMENT ON COLUMN knowledge_documents.processing_error IS 'Error message if processing failed';
COMMENT ON COLUMN knowledge_documents.chunk_count IS 'Number of chunks created from this document';
COMMENT ON COLUMN knowledge_documents.chunking_strategy IS 'JSON object containing LLM-recommended chunking strategy (e.g., {recommended_chunk_size_range: [400,800], semantic_boundaries: ["paragraph","section"], ...})';
COMMENT ON COLUMN knowledge_documents.chunking_analysis_time_ms IS 'Time taken for LLM chunking analysis in milliseconds';
COMMENT ON COLUMN knowledge_documents.n8n_workflow_id IS 'Reference to n8n workflow execution ID for tracking and debugging';
COMMENT ON COLUMN knowledge_documents.uploaded_by IS 'User ID who uploaded the document';
COMMENT ON COLUMN knowledge_documents.security_classification IS 'Security classification (UNCLASSIFIED, CONFIDENTIAL, SECRET, TOP_SECRET)';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_knowledge_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER knowledge_documents_updated_at_trigger
    BEFORE UPDATE ON knowledge_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_knowledge_documents_updated_at();

-- Seed data: Create one test document record
INSERT INTO knowledge_documents (
    id,
    filename,
    original_name,
    file_size,
    mime_type,
    storage_path,
    upload_status,
    chunk_count,
    chunking_strategy,
    chunking_analysis_time_ms,
    n8n_workflow_id,
    uploaded_by,
    security_classification
) VALUES (
    'test-doc-001',
    'test-document-sample.pdf',
    'Sample Technical Documentation.pdf',
    524288, -- 512 KB
    'application/pdf',
    'knowledge/unclassified/2025-10-20/demo-user-id/test-document-sample.pdf',
    'COMPLETED',
    15,
    jsonb_build_object(
        'recommended_chunk_size_range', jsonb_build_array(400, 800),
        'semantic_boundaries', jsonb_build_array('paragraph', 'section'),
        'overlap_tokens', 75,
        'special_handling', jsonb_build_object(
            'code_blocks', 'preserve_complete',
            'tables', 'keep_together',
            'lists', 'preserve_with_context'
        ),
        'rationale', 'Technical document with code examples and structured content'
    ),
    2847,
    'n8n-exec-12345',
    'demo-user-id',
    'UNCLASSIFIED'
) ON CONFLICT (id) DO NOTHING;

-- Migration completed successfully
DO $$
DECLARE
    doc_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO doc_count FROM knowledge_documents;

    RAISE NOTICE '=== Migration 017 completed successfully ===';
    RAISE NOTICE 'Created knowledge_documents table';
    RAISE NOTICE 'Added foreign key constraint from knowledge_chunks to knowledge_documents';
    RAISE NOTICE 'Created indexes for efficient queries';
    RAISE NOTICE 'Seeded test document record';
    RAISE NOTICE 'Total documents in table: %', doc_count;
END $$;

-- Migration: 019_add_n8n_workflow_id.sql
-- Description: Add n8n workflow tracking, duplicate detection, and document revision management
-- Dependencies: Migration 017 (knowledge_documents table), Migration 018 (knowledge_chunks table)
-- Date: 2025-10-23
-- Story: 2.2.1 - n8n Workflow Orchestration for Document Processing

-- ============================================================================
-- PART 1: n8n Workflow Tracking Enhancements
-- ============================================================================

-- Add n8n workflow execution tracking columns
ALTER TABLE knowledge_documents
ADD COLUMN IF NOT EXISTS n8n_execution_status VARCHAR(50) DEFAULT 'NONE',
ADD COLUMN IF NOT EXISTS n8n_execution_error TEXT,
ADD COLUMN IF NOT EXISTS n8n_triggered_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS n8n_completed_at TIMESTAMP;

-- Create index for querying by n8n execution status
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_n8n_execution_status
ON knowledge_documents(n8n_execution_status);

-- Add comments for n8n workflow columns
COMMENT ON COLUMN knowledge_documents.n8n_execution_status IS 'n8n workflow execution status: NONE, RUNNING, COMPLETED, FAILED';
COMMENT ON COLUMN knowledge_documents.n8n_execution_error IS 'Error message if n8n workflow failed';
COMMENT ON COLUMN knowledge_documents.n8n_triggered_at IS 'Timestamp when n8n workflow was triggered';
COMMENT ON COLUMN knowledge_documents.n8n_completed_at IS 'Timestamp when n8n workflow completed (success or failure)';

-- ============================================================================
-- PART 2: Duplicate Detection & Content Hashing
-- ============================================================================

-- Add content hash column for duplicate detection (SHA256 = 64 hex characters)
ALTER TABLE knowledge_documents
ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64);

-- Create unique index on content_hash for fast duplicate lookup
-- Using partial index (WHERE content_hash IS NOT NULL) to allow NULL values
CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_documents_content_hash_unique
ON knowledge_documents(content_hash)
WHERE content_hash IS NOT NULL;

-- Add regular index for queries (faster than unique index for lookups)
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_content_hash
ON knowledge_documents(content_hash);

-- Add comment for content_hash
COMMENT ON COLUMN knowledge_documents.content_hash IS 'SHA256 hash of file content for duplicate detection (64 hex characters)';

-- ============================================================================
-- PART 3: Document Revision Management
-- ============================================================================

-- Add revision tracking columns
ALTER TABLE knowledge_documents
ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1 NOT NULL CHECK (version_number >= 1),
ADD COLUMN IF NOT EXISTS parent_document_id TEXT,
ADD COLUMN IF NOT EXISTS is_latest_version BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN IF NOT EXISTS revision_notes TEXT;

-- Add foreign key constraint for parent_document_id (self-referencing)
ALTER TABLE knowledge_documents
ADD CONSTRAINT fk_knowledge_documents_parent_document_id
    FOREIGN KEY (parent_document_id)
    REFERENCES knowledge_documents(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- Create index on parent_document_id for version history queries
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_parent_document_id
ON knowledge_documents(parent_document_id);

-- Create composite index for efficient "latest version" queries
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_parent_latest
ON knowledge_documents(parent_document_id, is_latest_version)
WHERE parent_document_id IS NOT NULL;

-- Add comments for revision columns
COMMENT ON COLUMN knowledge_documents.version_number IS 'Version number for document revisions (starts at 1)';
COMMENT ON COLUMN knowledge_documents.parent_document_id IS 'Reference to parent document for revisions (NULL for original uploads)';
COMMENT ON COLUMN knowledge_documents.is_latest_version IS 'Flag indicating if this is the latest version of the document';
COMMENT ON COLUMN knowledge_documents.revision_notes IS 'Optional notes about what changed in this revision';

-- ============================================================================
-- PART 4: Update Existing Records with Default Values
-- ============================================================================

-- Update existing records to set default values for new columns
UPDATE knowledge_documents
SET
    version_number = 1,
    is_latest_version = true,
    n8n_execution_status = COALESCE(n8n_execution_status, 'NONE')
WHERE version_number IS NULL OR is_latest_version IS NULL OR n8n_execution_status IS NULL;

-- ============================================================================
-- PART 5: Validation and Success Confirmation
-- ============================================================================

-- Validate that all columns were created successfully
DO $$
DECLARE
    col_count INTEGER;
    idx_count INTEGER;
    doc_count INTEGER;
BEGIN
    -- Check new columns exist
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_name = 'knowledge_documents'
    AND column_name IN (
        'n8n_execution_status',
        'n8n_execution_error',
        'n8n_triggered_at',
        'n8n_completed_at',
        'content_hash',
        'version_number',
        'parent_document_id',
        'is_latest_version',
        'revision_notes'
    );

    -- Check new indexes exist
    SELECT COUNT(*) INTO idx_count
    FROM pg_indexes
    WHERE tablename = 'knowledge_documents'
    AND indexname IN (
        'idx_knowledge_documents_n8n_execution_status',
        'idx_knowledge_documents_content_hash_unique',
        'idx_knowledge_documents_content_hash',
        'idx_knowledge_documents_parent_document_id',
        'idx_knowledge_documents_parent_latest'
    );

    -- Get document count
    SELECT COUNT(*) INTO doc_count FROM knowledge_documents;

    -- Log success
    RAISE NOTICE '=== Migration 019 completed successfully ===';
    RAISE NOTICE 'Added % new columns to knowledge_documents table', col_count;
    RAISE NOTICE 'Created % new indexes', idx_count;
    RAISE NOTICE 'Updated % existing documents with default values', doc_count;
    RAISE NOTICE '';
    RAISE NOTICE 'New Features Enabled:';
    RAISE NOTICE '  ✓ n8n workflow execution tracking';
    RAISE NOTICE '  ✓ Duplicate detection via content hashing (SHA256)';
    RAISE NOTICE '  ✓ Document revision management with version history';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Update Prisma schema with new columns';
    RAISE NOTICE '  2. Regenerate Prisma client: npx prisma generate';
    RAISE NOTICE '  3. Restart backend services';
    RAISE NOTICE '  4. Configure environment variables for n8n and duplicate handling';

    -- Validation checks
    IF col_count < 9 THEN
        RAISE WARNING 'Expected 9 columns, but only found %', col_count;
    END IF;

    IF idx_count < 5 THEN
        RAISE WARNING 'Expected 5 indexes, but only found %', idx_count;
    END IF;
END $$;

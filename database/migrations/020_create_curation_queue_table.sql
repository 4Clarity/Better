-- Migration 020: Create curation_queue table
-- Purpose: Document quality scoring and curation workflow
-- Date: 2025-10-28

CREATE TABLE IF NOT EXISTS curation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_type VARCHAR(50) NOT NULL,  -- 'document', 'chunk', etc.
    item_id UUID NOT NULL,  -- References knowledge_documents.id or other tables
    status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- 'pending', 'approved', 'rejected', 'in_review'
    priority VARCHAR(50) DEFAULT 'normal',  -- 'low', 'normal', 'high', 'urgent'
    quality_score DECIMAL(3,2),  -- 0.00 to 1.00
    metadata JSONB,  -- Additional metadata (chunk_count, avg_tokens, etc.)
    assigned_to UUID,  -- User ID of curator (optional)
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_curation_queue_status ON curation_queue(status);
CREATE INDEX IF NOT EXISTS idx_curation_queue_item ON curation_queue(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_curation_queue_priority ON curation_queue(priority);
CREATE INDEX IF NOT EXISTS idx_curation_queue_created_at ON curation_queue(created_at);

-- Comments
COMMENT ON TABLE curation_queue IS 'Queue for document and content curation workflow';
COMMENT ON COLUMN curation_queue.quality_score IS 'Calculated quality score from 0.00 to 1.00';
COMMENT ON COLUMN curation_queue.metadata IS 'JSON metadata like chunk_count, avg_tokens, filename_quality, etc.';

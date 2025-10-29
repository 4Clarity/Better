-- Migration: TIP Agentic RAG Tables
-- Description: Create additional tables and functions needed for TIP Agentic RAG workflow
-- Dependencies:
--   - Migration 017 (knowledge_documents)
--   - Migration 018 (knowledge_document_chunks with vector support)
-- Date: 2025-10-26
-- Purpose: Enable n8n agentic RAG workflow with tabular data support

-- ============================================================================
-- PART 1: Create document_rows table for tabular data (CSV/Excel)
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_rows (
    id SERIAL PRIMARY KEY,
    dataset_id TEXT NOT NULL,
    row_data JSONB NOT NULL,  -- Store the actual row data flexibly
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key to knowledge_documents
    CONSTRAINT fk_document_rows_dataset_id
        FOREIGN KEY (dataset_id)
        REFERENCES knowledge_documents(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_document_rows_dataset_id ON document_rows(dataset_id);
CREATE INDEX IF NOT EXISTS idx_document_rows_data_gin ON document_rows USING GIN (row_data);
CREATE INDEX IF NOT EXISTS idx_document_rows_created_at ON document_rows(created_at DESC);

-- Add comments
COMMENT ON TABLE document_rows IS 'Stores rows from tabular documents (CSV, Excel) in JSONB format for flexible SQL queries';
COMMENT ON COLUMN document_rows.dataset_id IS 'References knowledge_documents.id for the source document';
COMMENT ON COLUMN document_rows.row_data IS 'JSONB object containing row data with column names as keys';

-- ============================================================================
-- PART 2: Create vector similarity search function for RAG queries
-- ============================================================================

-- Function: match_knowledge_document_chunks
-- Purpose: Perform vector similarity search on knowledge document chunks
-- Used by: n8n RAG AI Agent workflow vector search tool

CREATE OR REPLACE FUNCTION match_knowledge_document_chunks(
    query_embedding vector(768),
    match_count INTEGER DEFAULT 5,
    similarity_threshold FLOAT DEFAULT 0.7,
    filter JSONB DEFAULT '{}'::jsonb
) RETURNS TABLE (
    id TEXT,
    document_id TEXT,
    content TEXT,
    chunk_index INTEGER,
    similarity FLOAT,
    semantic_boundary_type VARCHAR(50),
    thought_completeness_score DECIMAL(3,2),
    filename VARCHAR(255),
    original_name VARCHAR(255),
    security_classification VARCHAR(50)
)
LANGUAGE plpgsql
AS $$
DECLARE
    min_similarity FLOAT := similarity_threshold;
BEGIN
    RETURN QUERY
    SELECT
        kdc.id,
        kdc.document_id,
        kdc.content,
        kdc.chunk_index,
        1 - (kdc.embedding <=> query_embedding) AS similarity,
        kdc.semantic_boundary_type,
        kdc.thought_completeness_score,
        kd.filename,
        kd.original_name,
        kd.security_classification
    FROM knowledge_document_chunks kdc
    INNER JOIN knowledge_documents kd ON kdc.document_id = kd.id
    WHERE
        kdc.embedding IS NOT NULL
        AND (1 - (kdc.embedding <=> query_embedding)) >= min_similarity
        AND (
            filter = '{}'::jsonb
            OR kd.security_classification = (filter->>'security_classification')
        )
    ORDER BY kdc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Add comment
COMMENT ON FUNCTION match_knowledge_document_chunks IS 'Vector similarity search for RAG queries with optional security classification filter';

-- ============================================================================
-- PART 3: Create convenience function to get full document text
-- ============================================================================

-- Function: get_document_full_text
-- Purpose: Retrieve complete document text by concatenating all chunks in order
-- Used by: n8n RAG AI Agent "Get File Contents" tool

CREATE OR REPLACE FUNCTION get_document_full_text(doc_id TEXT)
RETURNS TABLE (
    document_id TEXT,
    filename VARCHAR(255),
    full_text TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        kd.id AS document_id,
        kd.filename,
        string_agg(kdc.content, ' ' ORDER BY kdc.chunk_index) AS full_text
    FROM knowledge_documents kd
    INNER JOIN knowledge_document_chunks kdc ON kd.id = kdc.document_id
    WHERE kd.id = doc_id
    GROUP BY kd.id, kd.filename;
END;
$$;

-- Add comment
COMMENT ON FUNCTION get_document_full_text IS 'Retrieve full document text by concatenating chunks in order';

-- ============================================================================
-- PART 4: Create indexes for n8n workflow performance
-- ============================================================================

-- Ensure vector index exists with proper configuration for IVFFlat
-- This is critical for performance on large datasets (>10k chunks)
DO $$
BEGIN
    -- Check if index exists
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'knowledge_document_chunks'
        AND indexname = 'idx_knowledge_document_chunks_embedding'
    ) THEN
        -- Create IVFFlat index for cosine similarity
        CREATE INDEX idx_knowledge_document_chunks_embedding
            ON knowledge_document_chunks
            USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 100);

        RAISE NOTICE 'Created IVFFlat vector index with 100 lists';
    ELSE
        RAISE NOTICE 'IVFFlat vector index already exists';
    END IF;
END $$;

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_completed
    ON knowledge_documents(id)
    WHERE upload_status = 'COMPLETED';

CREATE INDEX IF NOT EXISTS idx_knowledge_document_chunks_not_null_embedding
    ON knowledge_document_chunks(document_id)
    WHERE embedding IS NOT NULL;

-- ============================================================================
-- PART 5: Insert seed data for testing
-- ============================================================================

-- Insert sample tabular data rows (simulating CSV upload)
INSERT INTO document_rows (dataset_id, row_data)
SELECT
    'test-doc-001',
    jsonb_build_object(
        'contractor', 'Acme Corp',
        'contract_number', 'FA8625-20-C-0001',
        'contract_value', 1500000,
        'start_date', '2025-01-01',
        'end_date', '2025-12-31',
        'status', 'Active'
    )
WHERE NOT EXISTS (
    SELECT 1 FROM document_rows WHERE dataset_id = 'test-doc-001'
)
LIMIT 1;

-- Insert sample document chunks with embeddings (for testing vector search)
DO $$
DECLARE
    chunk_id TEXT;
    test_embedding vector(768);
BEGIN
    -- Generate a simple test embedding (normally created by Ollama)
    -- This is just for testing - real embeddings come from the embedding service
    test_embedding := array_fill(0.1, ARRAY[768])::vector;

    -- Insert test chunk only if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM knowledge_document_chunks WHERE document_id = 'test-doc-001' AND chunk_index = 0
    ) THEN
        chunk_id := gen_random_uuid()::TEXT;

        INSERT INTO knowledge_document_chunks (
            id,
            document_id,
            chunk_index,
            content,
            token_count,
            embedding,
            vector_model,
            semantic_boundary_type,
            thought_completeness_score,
            chunk_strategy_applied
        ) VALUES (
            chunk_id,
            'test-doc-001',
            0,
            'This is a sample technical documentation chunk about government transition planning. It covers key milestones, stakeholder roles, and knowledge transfer procedures.',
            32,
            test_embedding,
            'nomic-embed-text',
            'paragraph',
            0.95,
            jsonb_build_object(
                'chunk_size', 150,
                'overlap', 25,
                'strategy', 'semantic_paragraph'
            )
        );

        RAISE NOTICE 'Inserted test document chunk: %', chunk_id;
    ELSE
        RAISE NOTICE 'Test document chunk already exists';
    END IF;
END $$;

-- ============================================================================
-- PART 6: Validation and migration summary
-- ============================================================================

DO $$
DECLARE
    doc_count INTEGER;
    chunk_count INTEGER;
    row_count INTEGER;
    vector_index_exists BOOLEAN;
BEGIN
    -- Count records
    SELECT COUNT(*) INTO doc_count FROM knowledge_documents;
    SELECT COUNT(*) INTO chunk_count FROM knowledge_document_chunks;
    SELECT COUNT(*) INTO row_count FROM document_rows;

    -- Check vector index
    SELECT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'knowledge_document_chunks'
        AND indexname = 'idx_knowledge_document_chunks_embedding'
    ) INTO vector_index_exists;

    -- Print summary
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TIP Agentic RAG Migration Complete';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tables Created:';
    RAISE NOTICE '  - document_rows (tabular data storage)';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions Created:';
    RAISE NOTICE '  - match_knowledge_document_chunks (vector search)';
    RAISE NOTICE '  - get_document_full_text (full document retrieval)';
    RAISE NOTICE '';
    RAISE NOTICE 'Indexes Created:';
    RAISE NOTICE '  - IVFFlat vector index: %', vector_index_exists;
    RAISE NOTICE '  - JSONB GIN indexes for document_rows';
    RAISE NOTICE '';
    RAISE NOTICE 'Current Data:';
    RAISE NOTICE '  - Documents: %', doc_count;
    RAISE NOTICE '  - Chunks: %', chunk_count;
    RAISE NOTICE '  - Tabular Rows: %', row_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Import TIP_Agentic_RAG_Workflow.json into n8n';
    RAISE NOTICE '  2. Configure n8n credentials (PostgreSQL, MinIO, Ollama)';
    RAISE NOTICE '  3. Update backend-python .env with N8N_ENABLED=true';
    RAISE NOTICE '  4. Test document upload via /api/knowledge/upload';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- PART 7: Create helper views for monitoring (optional)
-- ============================================================================

-- View: document_processing_summary
-- Purpose: Monitor document processing pipeline status
CREATE OR REPLACE VIEW document_processing_summary AS
SELECT
    upload_status,
    COUNT(*) AS document_count,
    AVG(chunk_count) AS avg_chunks,
    SUM(file_size) AS total_size_bytes,
    COUNT(CASE WHEN processing_error IS NOT NULL THEN 1 END) AS error_count
FROM knowledge_documents
GROUP BY upload_status
ORDER BY
    CASE upload_status
        WHEN 'COMPLETED' THEN 1
        WHEN 'EMBEDDING' THEN 2
        WHEN 'CHUNKING' THEN 3
        WHEN 'ANALYZING' THEN 4
        WHEN 'UPLOADED' THEN 5
        WHEN 'FAILED' THEN 6
    END;

COMMENT ON VIEW document_processing_summary IS 'Summary of document processing pipeline status for monitoring';

-- View: vector_search_readiness
-- Purpose: Check readiness for RAG queries
CREATE OR REPLACE VIEW vector_search_readiness AS
SELECT
    COUNT(*) AS total_chunks,
    COUNT(embedding) AS chunks_with_embeddings,
    ROUND(100.0 * COUNT(embedding) / NULLIF(COUNT(*), 0), 2) AS embedding_coverage_pct,
    COUNT(DISTINCT document_id) AS unique_documents,
    AVG(token_count) AS avg_token_count,
    MAX(created_at) AS last_chunk_created
FROM knowledge_document_chunks;

COMMENT ON VIEW vector_search_readiness IS 'Check if system is ready for vector searches';

-- Grant permissions to application user
GRANT SELECT ON document_processing_summary TO "user";
GRANT SELECT ON vector_search_readiness TO "user";
GRANT ALL ON document_rows TO "user";
GRANT ALL ON document_rows_id_seq TO "user";

-- Migration complete
SELECT 'TIP Agentic RAG migration completed successfully' AS status;

-- Migration: 016_add_vector_embeddings_to_knowledge_chunks.sql
-- Description: Add vector embeddings support to knowledge_chunks table using pgvector extension
-- Dependencies: Requires pgvector extension v0.8.0+
-- Date: 2025-10-20

-- Verify pgvector extension is installed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'vector'
    ) THEN
        RAISE EXCEPTION 'pgvector extension is not installed. Please install it first with: CREATE EXTENSION vector;';
    END IF;
END $$;

-- Add vector embedding column to knowledge_chunks table
-- Using 768 dimensions for Ollama nomic-embed-text model
ALTER TABLE knowledge_chunks
ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Add vector_model field to track which embedding model was used
ALTER TABLE knowledge_chunks
ADD COLUMN IF NOT EXISTS vector_model VARCHAR(100);

-- Add chunk_strategy_applied field to store the chunking strategy used for this specific chunk
ALTER TABLE knowledge_chunks
ADD COLUMN IF NOT EXISTS chunk_strategy_applied JSONB;

-- Add semantic_boundary_type to indicate type of boundary (paragraph, section, etc.)
ALTER TABLE knowledge_chunks
ADD COLUMN IF NOT EXISTS semantic_boundary_type VARCHAR(50);

-- Add thought_completeness_score to track LLM-assessed completeness (0-1)
ALTER TABLE knowledge_chunks
ADD COLUMN IF NOT EXISTS thought_completeness_score DECIMAL(3,2) CHECK (thought_completeness_score >= 0 AND thought_completeness_score <= 1);

-- Add document_id foreign key to knowledge_documents table (will be created in next migration)
-- Note: This will be populated after knowledge_documents table exists
ALTER TABLE knowledge_chunks
ADD COLUMN IF NOT EXISTS document_id TEXT;

-- Create IVFFlat index on embedding column for fast cosine similarity search
-- Using lists=100 as recommended for datasets < 1M vectors
-- Note: Index will be created after we have some data
-- CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding_ivfflat
-- ON knowledge_chunks
-- USING ivfflat (embedding vector_cosine_ops)
-- WITH (lists = 100);

-- For now, create a placeholder comment to remind us to build the index later
COMMENT ON COLUMN knowledge_chunks.embedding IS 'Vector embedding (768 dimensions for nomic-embed-text). Create IVFFlat index after populating data: CREATE INDEX idx_knowledge_chunks_embedding_ivfflat ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);';

-- Create index on vector_model for filtering by model type
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_vector_model ON knowledge_chunks(vector_model);

-- Create index on document_id for efficient document-based queries
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_document_id ON knowledge_chunks(document_id);

-- Create index on semantic_boundary_type for filtering by boundary type
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_semantic_boundary_type ON knowledge_chunks(semantic_boundary_type);

-- Create index on thought_completeness_score for quality filtering
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_thought_completeness_score ON knowledge_chunks(thought_completeness_score DESC);

-- Add comments to new columns for documentation
COMMENT ON COLUMN knowledge_chunks.vector_model IS 'Embedding model used (e.g., nomic-embed-text, text-embedding-004)';
COMMENT ON COLUMN knowledge_chunks.chunk_strategy_applied IS 'JSON object containing the chunking strategy applied to create this chunk';
COMMENT ON COLUMN knowledge_chunks.semantic_boundary_type IS 'Type of semantic boundary used (e.g., paragraph, section, code_block, table)';
COMMENT ON COLUMN knowledge_chunks.thought_completeness_score IS 'LLM-assessed score (0-1) indicating how complete this chunk is as a standalone thought unit';
COMMENT ON COLUMN knowledge_chunks.document_id IS 'Reference to the knowledge_documents table (foreign key added in migration 017)';

-- Verification: Test vector operations work
DO $$
DECLARE
    test_vector vector(768);
    test_similarity DECIMAL;
BEGIN
    -- Create a test vector
    test_vector := array_fill(0.1, ARRAY[768])::vector(768);

    -- Test cosine distance calculation
    test_similarity := test_vector <=> test_vector;

    -- Should be 0 (identical vectors)
    IF test_similarity != 0 THEN
        RAISE WARNING 'Vector operations may not be working correctly. Cosine distance should be 0 for identical vectors.';
    ELSE
        RAISE NOTICE 'pgvector operations verified successfully. Cosine distance: %', test_similarity;
    END IF;
END $$;

-- Migration completed successfully
DO $$
BEGIN
    RAISE NOTICE '=== Migration 016 completed successfully ===';
    RAISE NOTICE 'Added vector embedding support to knowledge_chunks table';
    RAISE NOTICE 'Embedding dimension: 768 (nomic-embed-text compatible)';
    RAISE NOTICE 'Remember to create IVFFlat index after populating embeddings';
END $$;

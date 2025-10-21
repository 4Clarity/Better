-- Migration 018: Create knowledge_document_chunks table for RAG system
-- This is separate from knowledge_chunks which is tied to artifacts/transitions

CREATE TABLE IF NOT EXISTS knowledge_document_chunks (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    document_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL CHECK (chunk_index >= 0),
    content TEXT NOT NULL,
    token_count INTEGER NOT NULL CHECK (token_count > 0),

    -- Vector Embeddings
    embedding vector(768),
    vector_model VARCHAR(100),

    -- LLM Chunking Strategy Metadata
    chunk_strategy_applied JSONB,
    semantic_boundary_type VARCHAR(50),
    thought_completeness_score DECIMAL(3,2) CHECK (thought_completeness_score >= 0 AND thought_completeness_score <= 1),

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Key
    CONSTRAINT fk_knowledge_document_chunks_document_id
        FOREIGN KEY (document_id)
        REFERENCES knowledge_documents(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    -- Unique constraint
    CONSTRAINT unique_document_chunk_index
        UNIQUE (document_id, chunk_index)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_knowledge_document_chunks_document_id
    ON knowledge_document_chunks(document_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_document_chunks_vector_model
    ON knowledge_document_chunks(vector_model);

CREATE INDEX IF NOT EXISTS idx_knowledge_document_chunks_semantic_boundary
    ON knowledge_document_chunks(semantic_boundary_type);

CREATE INDEX IF NOT EXISTS idx_knowledge_document_chunks_completeness_score
    ON knowledge_document_chunks(thought_completeness_score DESC);

-- GIN index for JSONB chunk strategy
CREATE INDEX IF NOT EXISTS idx_knowledge_document_chunks_strategy
    ON knowledge_document_chunks USING GIN (chunk_strategy_applied);

-- Vector similarity search index using IVFFlat
-- This is CRITICAL for performance - without this index, every vector search
-- performs a sequential scan calculating distance to ALL chunks (O(n) complexity)
-- With IVFFlat index: O(log n) complexity, 10-100x faster on large datasets
--
-- IVFFlat parameters:
-- - lists: Number of inverted lists (clusters). Rule of thumb: sqrt(total_rows)
--   Starting with 100 for datasets < 100K chunks, can be tuned as data grows
-- - vector_cosine_ops: Use cosine distance operator (matches query in vector_search.py)
--
-- For datasets > 1M chunks, consider switching to HNSW index (better accuracy, slower build)
CREATE INDEX IF NOT EXISTS idx_knowledge_document_chunks_embedding
    ON knowledge_document_chunks
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- COMMENT
COMMENT ON TABLE knowledge_document_chunks IS 'Stores document chunks for RAG vector search, separate from artifact/transition chunks';

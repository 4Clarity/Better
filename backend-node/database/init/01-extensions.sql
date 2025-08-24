-- Enable required PostgreSQL extensions for TIP
-- This script runs during database initialization

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgvector for vector embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable pg_crypto for encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enable pg_trgm for text search optimization
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable btree_gin for advanced indexing
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- Create custom functions for audit logging
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function for generating secure random tokens
CREATE OR REPLACE FUNCTION generate_secure_token(length INTEGER DEFAULT 32)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(length), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Create function for vector similarity search
CREATE OR REPLACE FUNCTION vector_cosine_similarity(a vector, b vector)
RETURNS FLOAT AS $$
BEGIN
    RETURN 1 - (a <=> b);
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-- Create service account
CREATE USER IF NOT EXISTS better_service WITH PASSWORD 'better_service_2024!';

-- Grant necessary permissions to service account
GRANT USAGE ON SCHEMA public TO better_service;
GRANT CREATE ON SCHEMA public TO better_service;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO better_service;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO better_service;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO better_service;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO better_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO better_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO better_service;
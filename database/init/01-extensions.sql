-- Enable required PostgreSQL extensions for TIP Platform
-- This script runs automatically when the database is first created

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for password hashing and crypto functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable vector extension for semantic search (if available)
-- Note: This extension may not be available in all PostgreSQL installations
-- If it fails, vector search features will be disabled
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS "vector";
    RAISE NOTICE 'Vector extension enabled successfully';
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Vector extension not available: %', SQLERRM;
    RAISE NOTICE 'Continuing without vector search capabilities';
END
$$;

-- Create a simple function to check extension availability
CREATE OR REPLACE FUNCTION check_extensions()
RETURNS TABLE(extension_name TEXT, is_available BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.extname::TEXT,
        TRUE as is_available
    FROM pg_extension e
    WHERE e.extname IN ('uuid-ossp', 'pgcrypto', 'vector');
END;
$$ LANGUAGE plpgsql;

-- Show which extensions are loaded
SELECT * FROM check_extensions();

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Database initialization completed successfully';
END
$$;
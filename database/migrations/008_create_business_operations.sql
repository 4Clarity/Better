-- Migration: 008_create_business_operations.sql
-- Description: Create business_operations table for managing business operations
-- Date: 2025-10-12
-- Story: 4.2 Phase 3 - Business Operations Management

-- Business Operations are distinct entities from Programs/Products
-- They represent organizational operations that Programs/Products can be linked to
-- This table stores all Business Operation specific fields

CREATE TABLE IF NOT EXISTS business_operations (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Basic Information
    name VARCHAR(200) NOT NULL,
    description TEXT,

    -- Business Operation Specific Fields
    business_function VARCHAR(200),
    technical_domain VARCHAR(200),
    scope TEXT,
    objectives TEXT,
    deliverables TEXT,
    performance_metrics JSONB DEFAULT '{}'::jsonb,

    -- Support Period
    support_period_start DATE,
    support_period_end DATE,
    current_contract_end DATE,

    -- Key Personnel (Foreign Keys to users table)
    government_pm_id VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
    director_id VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
    current_manager_id VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,

    -- Security Classification
    security_classification VARCHAR(50) DEFAULT 'UNCLASSIFIED',

    -- Audit Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) NOT NULL REFERENCES users(id),
    updated_by VARCHAR(100) NOT NULL REFERENCES users(id),

    -- Constraints
    CONSTRAINT business_operations_name_not_empty CHECK (CHAR_LENGTH(TRIM(name)) > 0)
);

-- Create indexes for performance
CREATE INDEX idx_business_operations_name ON business_operations(name);
CREATE INDEX idx_business_operations_business_function ON business_operations(business_function);
CREATE INDEX idx_business_operations_technical_domain ON business_operations(technical_domain);
CREATE INDEX idx_business_operations_government_pm ON business_operations(government_pm_id);
CREATE INDEX idx_business_operations_director ON business_operations(director_id);
CREATE INDEX idx_business_operations_current_manager ON business_operations(current_manager_id);
CREATE INDEX idx_business_operations_created_at ON business_operations(created_at);
CREATE INDEX idx_business_operations_support_period ON business_operations(support_period_start, support_period_end);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_business_operations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_business_operations_updated_at
    BEFORE UPDATE ON business_operations
    FOR EACH ROW
    EXECUTE FUNCTION update_business_operations_updated_at();

-- Insert a test Business Operation record
INSERT INTO business_operations (
    name,
    description,
    business_function,
    technical_domain,
    scope,
    objectives,
    deliverables,
    performance_metrics,
    support_period_start,
    support_period_end,
    current_contract_end,
    government_pm_id,
    director_id,
    current_manager_id,
    security_classification,
    created_by,
    updated_by
)
SELECT
    'Test Business Operation',
    'This is a test business operation created during database migration',
    'Test Function',
    'Test Domain',
    'Test operational scope',
    'Test objectives for business operation',
    'Test deliverables',
    '{"availability": "99.9%", "responseTime": "<2s"}'::jsonb,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '1 year',
    CURRENT_DATE + INTERVAL '6 months',
    u1.id,
    u2.id,
    u3.id,
    'UNCLASSIFIED',
    u1.id,
    u1.id
FROM
    (SELECT id FROM users LIMIT 1) u1,
    (SELECT id FROM users LIMIT 1 OFFSET 0) u2,
    (SELECT id FROM users LIMIT 1 OFFSET 0) u3
WHERE EXISTS (SELECT 1 FROM users);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON business_operations TO tip_service;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tip_service;

-- Add comment to table
COMMENT ON TABLE business_operations IS 'Business Operations - organizational operations that Programs/Products can be linked to';

-- Rollback script (for reference)
-- To rollback this migration, run:
-- DROP TRIGGER IF EXISTS trigger_business_operations_updated_at ON business_operations;
-- DROP FUNCTION IF EXISTS update_business_operations_updated_at();
-- DROP TABLE IF EXISTS business_operations CASCADE;

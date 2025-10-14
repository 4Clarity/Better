-- Migration: 010_create_contracts.sql
-- Description: Create contracts table for managing support contracts linked to business operations
-- Date: 2025-10-13
-- Story: Contracts Management Feature

-- Contracts represent support contracts associated with Business Operations
-- This table stores all contract-specific information

CREATE TABLE IF NOT EXISTS contracts (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign Keys
    business_operation_id UUID NOT NULL REFERENCES business_operations(id) ON DELETE CASCADE ON UPDATE NO ACTION,
    contractor_pm_id VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL ON UPDATE NO ACTION,

    -- Contract Information
    contract_name VARCHAR(255) NOT NULL,
    contract_number VARCHAR(100) NOT NULL UNIQUE,
    contractor_name VARCHAR(255) NOT NULL,

    -- Contract Dates
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    can_be_extended BOOLEAN DEFAULT true,

    -- Contract Status
    status VARCHAR(20) NOT NULL DEFAULT 'PLANNING',

    -- Audit Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT contracts_contract_name_not_empty CHECK (CHAR_LENGTH(TRIM(contract_name)) > 0),
    CONSTRAINT contracts_contract_number_not_empty CHECK (CHAR_LENGTH(TRIM(contract_number)) > 0),
    CONSTRAINT contracts_contractor_name_not_empty CHECK (CHAR_LENGTH(TRIM(contractor_name)) > 0),
    CONSTRAINT contracts_dates_valid CHECK (end_date > start_date),
    CONSTRAINT contracts_status_valid CHECK (status IN ('PLANNING', 'ACTIVE', 'RENEWAL', 'EXPIRING', 'EXPIRED', 'EXTENDED'))
);

-- Create indexes for performance
CREATE INDEX idx_contracts_business_operation ON contracts(business_operation_id);
CREATE INDEX idx_contracts_contractor_pm ON contracts(contractor_pm_id);
CREATE INDEX idx_contracts_contract_number ON contracts(contract_number);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_start_date ON contracts(start_date);
CREATE INDEX idx_contracts_end_date ON contracts(end_date);
CREATE INDEX idx_contracts_created_at ON contracts(created_at);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_contracts_updated_at
    BEFORE UPDATE ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION update_contracts_updated_at();

-- Insert a test contract record for the test business operation
INSERT INTO contracts (
    business_operation_id,
    contract_name,
    contract_number,
    contractor_name,
    start_date,
    end_date,
    can_be_extended,
    status
)
SELECT
    bo.id,
    'Test Support Contract',
    'CTR-2025-001',
    'Test Contractor Inc.',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '1 year',
    true,
    'PLANNING'
FROM business_operations bo
WHERE bo.name = 'Test Business Operation'
LIMIT 1;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON contracts TO tip_service;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tip_service;

-- Add comment to table
COMMENT ON TABLE contracts IS 'Support Contracts - contracts associated with Business Operations';

-- Rollback script (for reference)
-- To rollback this migration, run:
-- DROP TRIGGER IF EXISTS trigger_contracts_updated_at ON contracts;
-- DROP FUNCTION IF EXISTS update_contracts_updated_at();
-- DROP TABLE IF EXISTS contracts CASCADE;

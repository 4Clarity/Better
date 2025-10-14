-- Migration: 007_add_business_operation_type_discriminator.sql
-- Story: 4.2 Relationships and Integration - Phase 3
-- Purpose: Add type discriminator and self-referential foreign key to product_programs
-- Date: 2025-10-12

BEGIN;

-- Step 1: Create the BusinessOperationType enum
CREATE TYPE "BusinessOperationType" AS ENUM ('Operation', 'Program', 'Product');

-- Step 2: Add the business_operation_type column with default value
ALTER TABLE product_programs
ADD COLUMN business_operation_type "BusinessOperationType" DEFAULT 'Program';

-- Step 3: Add the business_operation_id column (nullable for self-referential FK)
ALTER TABLE product_programs
ADD COLUMN business_operation_id UUID;

-- Step 4: Update existing data - set all current records to 'Program' type
-- This is redundant with the default but makes the intent explicit
UPDATE product_programs
SET business_operation_type = 'Program'
WHERE business_operation_type IS NULL;

-- Step 5: Create the self-referential foreign key constraint
ALTER TABLE product_programs
ADD CONSTRAINT fk_product_programs_business_operation
FOREIGN KEY (business_operation_id)
REFERENCES product_programs(id)
ON DELETE SET NULL
ON UPDATE NO ACTION;

-- Step 6: Create indexes for query performance
CREATE INDEX idx_product_programs_business_operation_type
ON product_programs(business_operation_type);

CREATE INDEX idx_product_programs_business_operation_id
ON product_programs(business_operation_id);

-- Step 7: Add comment to table for documentation
COMMENT ON COLUMN product_programs.business_operation_type IS
'Type discriminator: Operation (parent business operation), Program (implements operation), Product (implements operation)';

COMMENT ON COLUMN product_programs.business_operation_id IS
'Self-referential FK: Programs and Products reference their parent Business Operation';

COMMIT;

-- Rollback script (for reference, run manually if needed):
-- BEGIN;
-- ALTER TABLE product_programs DROP CONSTRAINT IF EXISTS fk_product_programs_business_operation;
-- DROP INDEX IF EXISTS idx_product_programs_business_operation_type;
-- DROP INDEX IF EXISTS idx_product_programs_business_operation_id;
-- ALTER TABLE product_programs DROP COLUMN IF EXISTS business_operation_id;
-- ALTER TABLE product_programs DROP COLUMN IF EXISTS business_operation_type;
-- DROP TYPE IF EXISTS "BusinessOperationType";
-- COMMIT;

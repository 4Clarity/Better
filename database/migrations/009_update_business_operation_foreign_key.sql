-- Migration: 009_update_business_operation_foreign_key.sql
-- Description: Update foreign key constraint to reference business_operations table instead of product_programs
-- Date: 2025-10-12
-- Story: 4.2 Phase 3 - Fix Business Operations linking

-- The business_operation_id in product_programs should reference business_operations table
-- not the product_programs table (the old self-referential relationship)

-- Step 1: Drop the old foreign key constraint
ALTER TABLE product_programs
DROP CONSTRAINT IF EXISTS fk_product_programs_business_operation;

-- Step 2: Add the new foreign key constraint pointing to business_operations table
ALTER TABLE product_programs
ADD CONSTRAINT fk_product_programs_business_operation
FOREIGN KEY (business_operation_id)
REFERENCES business_operations(id)
ON DELETE SET NULL
ON UPDATE NO ACTION;

-- Add a comment explaining the relationship
COMMENT ON CONSTRAINT fk_product_programs_business_operation ON product_programs IS
'Links Programs and Products to their parent Business Operation in the business_operations table';

-- Rollback script (for reference)
-- To rollback this migration, run:
-- ALTER TABLE product_programs DROP CONSTRAINT IF EXISTS fk_product_programs_business_operation;
-- ALTER TABLE product_programs ADD CONSTRAINT fk_product_programs_business_operation
--   FOREIGN KEY (business_operation_id) REFERENCES product_programs(id) ON DELETE SET NULL;

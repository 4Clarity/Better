-- Migration: Add product_program_id to transitions table
-- Story: 4.2 - Phase 2 (Transition Categorization)
-- Date: 2025-10-12
-- Description: Adds nullable product_program_id foreign key to transitions table
--              to allow categorizing transitions by Product/Program

-- Add product_program_id column to transitions table
ALTER TABLE transitions
ADD COLUMN product_program_id UUID NULL;

-- Add foreign key constraint to product_programs table
-- onDelete: SET NULL - When a product/program is deleted, uncategorize transitions
-- onUpdate: NO ACTION - Product/program IDs should not change
ALTER TABLE transitions
ADD CONSTRAINT fk_transitions_product_program
FOREIGN KEY (product_program_id)
REFERENCES product_programs(id)
ON DELETE SET NULL
ON UPDATE NO ACTION;

-- Create index for performance on product_program_id lookups
CREATE INDEX idx_transitions_product_program_id ON transitions(product_program_id);

-- Comment on column
COMMENT ON COLUMN transitions.product_program_id IS 'Optional foreign key to product_programs table for categorizing transitions';

-- All existing transitions will have product_program_id = NULL (uncategorized)
-- This is intentional and matches the acceptance criteria (AC: 12)

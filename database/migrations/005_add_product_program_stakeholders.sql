-- Migration: Add Product/Program Stakeholders Junction Table
-- Story: 4.2 Relationships and Integration - Phase 1 (Stakeholders)
-- Date: 2025-10-10

-- Create product_program_stakeholders junction table
CREATE TABLE IF NOT EXISTS product_program_stakeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_program_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  role VARCHAR(100),
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  assigned_by TEXT NOT NULL,

  CONSTRAINT fk_stakeholder_product_program FOREIGN KEY (product_program_id)
    REFERENCES product_programs(id) ON DELETE CASCADE,
  CONSTRAINT fk_stakeholder_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_stakeholder_assigned_by FOREIGN KEY (assigned_by)
    REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT unique_product_program_user UNIQUE (product_program_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_stakeholders_product_program_id ON product_program_stakeholders(product_program_id);
CREATE INDEX IF NOT EXISTS idx_stakeholders_user_id ON product_program_stakeholders(user_id);
CREATE INDEX IF NOT EXISTS idx_stakeholders_assigned_by ON product_program_stakeholders(assigned_by);

-- Grant permissions (adjust as needed for your environment)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON product_program_stakeholders TO your_app_user;

-- Note: No seed data for stakeholders as these will be assigned through the UI

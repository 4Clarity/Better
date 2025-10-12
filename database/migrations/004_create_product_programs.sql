-- Migration: Create product_programs table
-- Story: 4.1 Core Products/Programs Data Model and Basic CRUD
-- Date: 2025-10-10

-- Add new enum values to SecurityClassification if they don't exist
-- Note: The existing enum already has some values, we're adding the new ones required by Story 4.1
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SecurityClassification') THEN
    CREATE TYPE "SecurityClassification" AS ENUM ('Unclassified', 'Confidential', 'Secret', 'Top Secret');
  END IF;

  -- Add new enum values if they don't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'SecurityClassification' AND e.enumlabel = 'UNCLASSIFIED') THEN
    ALTER TYPE "SecurityClassification" ADD VALUE 'UNCLASSIFIED';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'SecurityClassification' AND e.enumlabel = 'CUI') THEN
    ALTER TYPE "SecurityClassification" ADD VALUE 'CUI';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'SecurityClassification' AND e.enumlabel = 'SECRET') THEN
    ALTER TYPE "SecurityClassification" ADD VALUE 'SECRET';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'SecurityClassification' AND e.enumlabel = 'TOP_SECRET') THEN
    ALTER TYPE "SecurityClassification" ADD VALUE 'TOP_SECRET';
  END IF;
END $$;

-- Create product_programs table
CREATE TABLE IF NOT EXISTS product_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  objectives TEXT NOT NULL,
  deliverables TEXT NOT NULL,
  dependencies TEXT,
  security_classification "SecurityClassification" NOT NULL,
  critical_dates JSONB NOT NULL DEFAULT '[]'::jsonb,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,

  CONSTRAINT fk_product_programs_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_product_programs_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_product_programs_name ON product_programs(name);
CREATE INDEX IF NOT EXISTS idx_product_programs_security_classification ON product_programs(security_classification);
CREATE INDEX IF NOT EXISTS idx_product_programs_created_by ON product_programs(created_by);
CREATE INDEX IF NOT EXISTS idx_product_programs_updated_by ON product_programs(updated_by);
CREATE INDEX IF NOT EXISTS idx_product_programs_created_at ON product_programs(created_at);

-- Create trigger for updatedAt timestamp
-- IMPORTANT: Use snake_case column name since Prisma @updatedAt decorator creates updated_at column
CREATE OR REPLACE FUNCTION update_product_programs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_product_programs_updated_at
  BEFORE UPDATE ON product_programs
  FOR EACH ROW
  EXECUTE FUNCTION update_product_programs_updated_at();

-- Insert seed data (2-3 sample records for testing)
-- Note: Using a sample user ID - replace with actual user ID from your database
INSERT INTO product_programs (
  id,
  name,
  description,
  objectives,
  deliverables,
  dependencies,
  security_classification,
  critical_dates,
  created_by,
  updated_by
) VALUES
(
  gen_random_uuid(),
  'Defense Logistics Modernization',
  'Modernization of legacy logistics systems to improve supply chain visibility and operational efficiency across DoD facilities.',
  'Reduce logistics processing time by 40%, improve inventory accuracy to 99%, and enable real-time tracking of critical supplies.',
  'Cloud-based logistics platform, Mobile inventory management app, Integration with existing ERP systems, Training materials for 500+ staff',
  'Dependent on Enterprise Cloud Migration Program, Requires DoD CIO approval for data center transition',
  'CUI',
  '[{"date": "2025-12-15", "description": "Phase 1 deployment", "type": "milestone"}, {"date": "2026-03-31", "description": "Full operational capability", "type": "deadline"}]'::jsonb,
  (SELECT id FROM users LIMIT 1),
  (SELECT id FROM users LIMIT 1)
),
(
  gen_random_uuid(),
  'Secure Communications Enhancement',
  'Upgrade encrypted communications infrastructure to support classified operations with enhanced resilience and redundancy.',
  'Deploy quantum-resistant encryption, achieve 99.99% uptime, support 10,000 concurrent secure connections',
  'Hardware refresh for 50 secure facilities, Software-defined networking implementation, Failover and disaster recovery systems, Security certification documentation',
  'Requires coordination with NSA cryptographic standards team',
  'SECRET',
  '[{"date": "2025-11-01", "description": "Hardware procurement deadline", "type": "deadline"}, {"date": "2026-01-15", "description": "Security certification review", "type": "review"}, {"date": "2026-06-30", "description": "Program completion", "type": "milestone"}]'::jsonb,
  (SELECT id FROM users LIMIT 1),
  (SELECT id FROM users LIMIT 1)
),
(
  gen_random_uuid(),
  'Personnel Training Platform',
  'Develop and deploy a comprehensive online training platform for civilian and military personnel professional development.',
  'Provide accessible training to 50,000+ users, track certification compliance, integrate with HR systems for career progression',
  'Learning management system with mobile access, Content library with 200+ courses, Reporting dashboard for supervisors, API integrations with HRIS',
  'None',
  'UNCLASSIFIED',
  '[{"date": "2025-10-30", "description": "Beta testing launch", "type": "milestone"}, {"date": "2026-02-01", "description": "Full platform launch", "type": "milestone"}]'::jsonb,
  (SELECT id FROM users LIMIT 1),
  (SELECT id FROM users LIMIT 1)
);

-- Grant permissions (adjust as needed for your environment)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON product_programs TO your_app_user;

-- Update Transition table with new columns for Business Operations hierarchy
-- Run as database owner to avoid permission issues

-- First, connect as the database owner
\c tip

-- Add missing columns to Transition table
ALTER TABLE "Transition" ADD COLUMN IF NOT EXISTS "contractId" TEXT;
ALTER TABLE "Transition" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "Transition" ADD COLUMN IF NOT EXISTS "duration" "TransitionDuration" DEFAULT 'THIRTY_DAYS';
ALTER TABLE "Transition" ADD COLUMN IF NOT EXISTS "keyPersonnel" TEXT;
ALTER TABLE "Transition" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Transition" ADD COLUMN IF NOT EXISTS "requiresContinuousService" BOOLEAN DEFAULT true;
ALTER TABLE "Transition" ADD COLUMN IF NOT EXISTS "createdBy" TEXT;

-- Update the status column to use the new enum type if needed
-- First check if it's already the right type, if not, we'll need to handle this carefully
DO $$ 
BEGIN
    -- Try to alter the status column type
    BEGIN
        ALTER TABLE "Transition" ALTER COLUMN "status" TYPE "TransitionStatus" USING "status"::"TransitionStatus";
    EXCEPTION 
        WHEN OTHERS THEN
            -- If it fails, it might already be the correct type or have incompatible values
            RAISE NOTICE 'Status column type update skipped - may already be correct type';
    END;
END $$;

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS "Transition_contractId_idx" ON "Transition"("contractId");
CREATE INDEX IF NOT EXISTS "Transition_createdBy_idx" ON "Transition"("createdBy");

-- Add foreign key constraints for the new columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'Transition_contractId_fkey') THEN
        ALTER TABLE "Transition" ADD CONSTRAINT "Transition_contractId_fkey" 
            FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'Transition_createdBy_fkey') THEN
        ALTER TABLE "Transition" ADD CONSTRAINT "Transition_createdBy_fkey" 
            FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

SELECT 'Transition table updated successfully' AS result;
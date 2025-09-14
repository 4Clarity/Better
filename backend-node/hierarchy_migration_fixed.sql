-- Add transition hierarchy enums
CREATE TYPE "TransitionLevel" AS ENUM ('MAJOR', 'PERSONNEL', 'OPERATIONAL');
CREATE TYPE "TransitionSource" AS ENUM ('STRATEGIC', 'CONTRACTUAL', 'PERSONNEL', 'COMMUNICATION', 'CHANGE_REQUEST', 'ENHANCEMENT');

-- Add new columns to existing transitions table
ALTER TABLE "transitions" 
ADD COLUMN "transitionLevel" "TransitionLevel" DEFAULT 'OPERATIONAL',
ADD COLUMN "transitionSource" "TransitionSource",
ADD COLUMN "impactScope" TEXT,
ADD COLUMN "approvalLevel" TEXT,
ADD COLUMN "parentTransitionId" TEXT;

-- Migrate existing data based on current patterns
UPDATE "transitions" SET 
  "transitionLevel" = CASE 
    WHEN "contractName" IS NOT NULL AND "contractName" != '' THEN 'MAJOR'::"TransitionLevel"
    ELSE 'OPERATIONAL'::"TransitionLevel"
  END,
  "transitionSource" = CASE
    WHEN "contractName" IS NOT NULL AND "contractName" != '' THEN 'CONTRACTUAL'::"TransitionSource"
    ELSE 'ENHANCEMENT'::"TransitionSource"
  END,
  "impactScope" = CASE
    WHEN "contractName" IS NOT NULL AND "contractName" != '' THEN 'enterprise'
    ELSE 'process'
  END,
  "approvalLevel" = CASE
    WHEN "contractName" IS NOT NULL AND "contractName" != '' THEN 'executive'
    ELSE 'operational'
  END;

-- Add foreign key constraint for parent-child relationships
ALTER TABLE "transitions" 
ADD CONSTRAINT "transitions_parentTransitionId_fkey" 
FOREIGN KEY ("parentTransitionId") REFERENCES "transitions"("id");

-- Add indexes for performance
CREATE INDEX "transitions_transitionLevel_idx" ON "transitions"("transitionLevel");
CREATE INDEX "transitions_transitionSource_idx" ON "transitions"("transitionSource");
CREATE INDEX "transitions_parentTransitionId_idx" ON "transitions"("parentTransitionId");
CREATE INDEX "transitions_impactScope_idx" ON "transitions"("impactScope");
CREATE INDEX "transitions_approvalLevel_idx" ON "transitions"("approvalLevel");
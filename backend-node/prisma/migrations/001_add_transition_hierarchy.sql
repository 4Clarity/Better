-- Add transition hierarchy enums
CREATE TYPE "TransitionLevel" AS ENUM ('MAJOR', 'PERSONNEL', 'OPERATIONAL');
CREATE TYPE "TransitionSource" AS ENUM ('STRATEGIC', 'CONTRACTUAL', 'PERSONNEL', 'COMMUNICATION', 'CHANGE_REQUEST', 'ENHANCEMENT');

-- Add new columns to existing Transition table
ALTER TABLE "Transition" 
ADD COLUMN "transitionLevel" "TransitionLevel" DEFAULT 'OPERATIONAL',
ADD COLUMN "transitionSource" "TransitionSource",
ADD COLUMN "impactScope" TEXT,
ADD COLUMN "approvalLevel" TEXT,
ADD COLUMN "parentTransitionId" TEXT;

-- Migrate existing data based on current patterns
UPDATE "Transition" SET 
  "transitionLevel" = CASE 
    WHEN "contractId" IS NOT NULL THEN 'MAJOR'::"TransitionLevel"
    WHEN "contractName" IS NOT NULL THEN 'PERSONNEL'::"TransitionLevel"
    ELSE 'OPERATIONAL'::"TransitionLevel"
  END,
  "transitionSource" = CASE
    WHEN "contractId" IS NOT NULL THEN 'CONTRACTUAL'::"TransitionSource"
    WHEN "contractName" IS NOT NULL THEN 'PERSONNEL'::"TransitionSource"
    ELSE 'ENHANCEMENT'::"TransitionSource"
  END,
  "impactScope" = CASE
    WHEN "contractId" IS NOT NULL THEN 'enterprise'
    WHEN "contractName" IS NOT NULL THEN 'department'
    ELSE 'process'
  END,
  "approvalLevel" = CASE
    WHEN "contractId" IS NOT NULL THEN 'executive'
    WHEN "contractName" IS NOT NULL THEN 'management'
    ELSE 'operational'
  END;

-- Add foreign key constraint for parent-child relationships
ALTER TABLE "Transition" 
ADD CONSTRAINT "Transition_parentTransitionId_fkey" 
FOREIGN KEY ("parentTransitionId") REFERENCES "Transition"("id");

-- Add indexes for performance
CREATE INDEX "Transition_transitionLevel_idx" ON "Transition"("transitionLevel");
CREATE INDEX "Transition_transitionSource_idx" ON "Transition"("transitionSource");
CREATE INDEX "Transition_parentTransitionId_idx" ON "Transition"("parentTransitionId");
CREATE INDEX "Transition_impactScope_idx" ON "Transition"("impactScope");
CREATE INDEX "Transition_approvalLevel_idx" ON "Transition"("approvalLevel");
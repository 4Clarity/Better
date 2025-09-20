-- Business Operations Migration Script - Part 2

-- Add Foreign Key Constraints
ALTER TABLE "BusinessOperation" ADD CONSTRAINT "BusinessOperation_currentManagerId_fkey" 
    FOREIGN KEY ("currentManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BusinessOperation" ADD CONSTRAINT "BusinessOperation_governmentPMId_fkey" 
    FOREIGN KEY ("governmentPMId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BusinessOperation" ADD CONSTRAINT "BusinessOperation_directorId_fkey" 
    FOREIGN KEY ("directorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OperationStakeholder" ADD CONSTRAINT "OperationStakeholder_businessOperationId_fkey" 
    FOREIGN KEY ("businessOperationId") REFERENCES "BusinessOperation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OperationStakeholder" ADD CONSTRAINT "OperationStakeholder_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Contract" ADD CONSTRAINT "Contract_businessOperationId_fkey" 
    FOREIGN KEY ("businessOperationId") REFERENCES "BusinessOperation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Contract" ADD CONSTRAINT "Contract_contractorPMId_fkey" 
    FOREIGN KEY ("contractorPMId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Transition" ADD CONSTRAINT "Transition_contractId_fkey" 
    FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Transition" ADD CONSTRAINT "Transition_createdBy_fkey" 
    FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_transitionId_fkey" 
    FOREIGN KEY ("transitionId") REFERENCES "Transition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Insert sample users for testing
INSERT INTO "User" ("id", "email", "firstName", "lastName", "role", "updatedAt")
VALUES 
    ('default-pm-id', 'pm@example.com', 'Program', 'Manager', 'program_manager', CURRENT_TIMESTAMP),
    ('default-director-id', 'director@example.com', 'Operations', 'Director', 'director', CURRENT_TIMESTAMP)
ON CONFLICT ("email") DO NOTHING;

-- Migration completed
SELECT 'Business Operations migration completed successfully' AS result;

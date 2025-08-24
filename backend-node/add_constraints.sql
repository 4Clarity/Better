-- Add Foreign Key Constraints (without IF NOT EXISTS which is not supported in PostgreSQL < 9.6)

-- Add Foreign Key Constraints for BusinessOperation
BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'BusinessOperation_currentManagerId_fkey') THEN
        ALTER TABLE "BusinessOperation" ADD CONSTRAINT "BusinessOperation_currentManagerId_fkey" 
            FOREIGN KEY ("currentManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'BusinessOperation_governmentPMId_fkey') THEN
        ALTER TABLE "BusinessOperation" ADD CONSTRAINT "BusinessOperation_governmentPMId_fkey" 
            FOREIGN KEY ("governmentPMId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'BusinessOperation_directorId_fkey') THEN
        ALTER TABLE "BusinessOperation" ADD CONSTRAINT "BusinessOperation_directorId_fkey" 
            FOREIGN KEY ("directorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- Add Foreign Key Constraints for OperationStakeholder
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'OperationStakeholder_businessOperationId_fkey') THEN
        ALTER TABLE "OperationStakeholder" ADD CONSTRAINT "OperationStakeholder_businessOperationId_fkey" 
            FOREIGN KEY ("businessOperationId") REFERENCES "BusinessOperation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'OperationStakeholder_userId_fkey') THEN
        ALTER TABLE "OperationStakeholder" ADD CONSTRAINT "OperationStakeholder_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Add Foreign Key Constraints for Contract
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'Contract_businessOperationId_fkey') THEN
        ALTER TABLE "Contract" ADD CONSTRAINT "Contract_businessOperationId_fkey" 
            FOREIGN KEY ("businessOperationId") REFERENCES "BusinessOperation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'Contract_contractorPMId_fkey') THEN
        ALTER TABLE "Contract" ADD CONSTRAINT "Contract_contractorPMId_fkey" 
            FOREIGN KEY ("contractorPMId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Add Foreign Key Constraints for AuditLog
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'AuditLog_userId_fkey') THEN
        ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

COMMIT;

SELECT 'Foreign key constraints added successfully' AS result;
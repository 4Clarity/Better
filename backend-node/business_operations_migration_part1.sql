-- Business Operations Migration Script - Part 1

-- Drop Tables
DROP TABLE IF EXISTS "audit_log" CASCADE;
DROP TABLE IF EXISTS "milestones" CASCADE;
DROP TABLE IF EXISTS "transitions" CASCADE;
DROP TABLE IF EXISTS "contract" CASCADE;
DROP TABLE IF EXISTS "operation_stakeholder" CASCADE;
DROP TABLE IF EXISTS "business_operation" CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;

-- Drop Enum Types
DROP TYPE IF EXISTS "TransitionStatus";
DROP TYPE IF EXISTS "ContractStatus";
DROP TYPE IF EXISTS "StakeholderType";
DROP TYPE IF EXISTS "TransitionDuration";
DROP TYPE IF EXISTS "MilestoneStatus";
DROP TYPE IF EXISTS "PriorityLevel";

-- CreateEnum (only create if not exists)
DO $$ BEGIN
    CREATE TYPE "TransitionStatus" AS ENUM ('NOT_STARTED', 'ON_TRACK', 'AT_RISK', 'BLOCKED', 'COMPLETED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ContractStatus" AS ENUM ('PLANNING', 'ACTIVE', 'RENEWAL', 'EXPIRING', 'EXPIRED', 'EXTENDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "StakeholderType" AS ENUM ('INTERNAL_PROGRAM', 'INTERNAL_TECHNICAL', 'INTERNAL_EXECUTIVE', 'EXTERNAL_VENDOR', 'EXTERNAL_SERVICE', 'EXTERNAL_SME_RESOURCE', 'INCOMING_CONTRACTOR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TransitionDuration" AS ENUM ('IMMEDIATE', 'THIRTY_DAYS', 'FORTY_FIVE_DAYS', 'SIXTY_DAYS', 'NINETY_DAYS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'OVERDUE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PriorityLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create User table (new)
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Create unique index on email for User table
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- Create BusinessOperation table (new)
CREATE TABLE IF NOT EXISTS "BusinessOperation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "businessFunction" TEXT NOT NULL,
    "technicalDomain" TEXT NOT NULL,
    "description" TEXT,
    "scope" TEXT NOT NULL,
    "objectives" TEXT NOT NULL,
    "performanceMetrics" JSONB NOT NULL,
    "supportPeriodStart" TIMESTAMP(3) NOT NULL,
    "supportPeriodEnd" TIMESTAMP(3) NOT NULL,
    "currentContractEnd" TIMESTAMP(3) NOT NULL,
    "currentManagerId" TEXT,
    "governmentPMId" TEXT NOT NULL,
    "directorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BusinessOperation_pkey" PRIMARY KEY ("id")
);

-- Create indexes for BusinessOperation
CREATE INDEX IF NOT EXISTS "BusinessOperation_businessFunction_idx" ON "BusinessOperation"("businessFunction");
CREATE INDEX IF NOT EXISTS "BusinessOperation_technicalDomain_idx" ON "BusinessOperation"("technicalDomain");
CREATE INDEX IF NOT EXISTS "BusinessOperation_governmentPMId_idx" ON "BusinessOperation"("governmentPMId");
CREATE INDEX IF NOT EXISTS "BusinessOperation_directorId_idx" ON "BusinessOperation"("directorId");

-- Create OperationStakeholder table (new)
CREATE TABLE IF NOT EXISTS "OperationStakeholder" (
    "id" TEXT NOT NULL,
    "businessOperationId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "organization" TEXT,
    "stakeholderType" "StakeholderType" NOT NULL,
    "receiveNotifications" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OperationStakeholder_pkey" PRIMARY KEY ("id")
);

-- Create indexes for OperationStakeholder
CREATE INDEX IF NOT EXISTS "OperationStakeholder_businessOperationId_idx" ON "OperationStakeholder"("businessOperationId");
CREATE INDEX IF NOT EXISTS "OperationStakeholder_stakeholderType_idx" ON "OperationStakeholder"("stakeholderType");
CREATE INDEX IF NOT EXISTS "OperationStakeholder_userId_idx" ON "OperationStakeholder"("userId");

-- Create Contract table (new)
CREATE TABLE IF NOT EXISTS "Contract" (
    "id" TEXT NOT NULL,
    "businessOperationId" TEXT NOT NULL,
    "contractName" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "contractorName" TEXT NOT NULL,
    "contractorPMId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "canBeExtended" BOOLEAN NOT NULL DEFAULT true,
    "status" "ContractStatus" NOT NULL DEFAULT 'PLANNING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- Create indexes for Contract
CREATE UNIQUE INDEX IF NOT EXISTS "Contract_contractNumber_key" ON "Contract"("contractNumber");
CREATE INDEX IF NOT EXISTS "Contract_businessOperationId_idx" ON "Contract"("businessOperationId");
CREATE INDEX IF NOT EXISTS "Contract_contractNumber_idx" ON "Contract"("contractNumber");
CREATE INDEX IF NOT EXISTS "Contract_status_idx" ON "Contract"("status");
CREATE INDEX IF NOT EXISTS "Contract_endDate_idx" ON "Contract"("endDate");

-- Create Transition table (new)
CREATE TABLE IF NOT EXISTS "Transition" (
    "id" TEXT NOT NULL,
    "contractName" TEXT,
    "contractNumber" TEXT,
    "contractId" TEXT,
    "name" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "duration" "TransitionDuration" NOT NULL DEFAULT 'THIRTY_DAYS',
    "keyPersonnel" TEXT,
    "description" TEXT,
    "status" "TransitionStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "requiresContinuousService" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Transition_pkey" PRIMARY KEY ("id")
);

-- Create indexes for updated Transition table
CREATE INDEX IF NOT EXISTS "Transition_status_idx" ON "Transition"("status");
CREATE INDEX IF NOT EXISTS "Transition_contractId_idx" ON "Transition"("contractId");
CREATE INDEX IF NOT EXISTS "Transition_contractNumber_idx" ON "Transition"("contractNumber");
CREATE INDEX IF NOT EXISTS "Transition_createdBy_idx" ON "Transition"("createdBy");
CREATE INDEX IF NOT EXISTS "Transition_startDate_idx" ON "Transition"("startDate");
CREATE INDEX IF NOT EXISTS "Transition_endDate_idx" ON "Transition"("endDate");

-- Create Milestone table (new)
CREATE TABLE IF NOT EXISTS "Milestone" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "priority" "PriorityLevel" NOT NULL DEFAULT 'MEDIUM',
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "transitionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- Create indexes for updated Milestone table
CREATE INDEX IF NOT EXISTS "Milestone_status_idx" ON "Milestone"("status");
CREATE INDEX IF NOT EXISTS "Milestone_dueDate_idx" ON "Milestone"("dueDate");
CREATE INDEX IF NOT EXISTS "Milestone_transitionId_idx" ON "Milestone"("transitionId");

-- Create AuditLog table (new)
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "userId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- Create indexes for AuditLog
CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");
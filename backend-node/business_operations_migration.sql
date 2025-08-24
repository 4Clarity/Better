-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."TransitionStatus" AS ENUM ('NOT_STARTED', 'ON_TRACK', 'AT_RISK', 'BLOCKED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."ContractStatus" AS ENUM ('PLANNING', 'ACTIVE', 'RENEWAL', 'EXPIRING', 'EXPIRED', 'EXTENDED');

-- CreateEnum
CREATE TYPE "public"."StakeholderType" AS ENUM ('INTERNAL_PROGRAM', 'INTERNAL_TECHNICAL', 'INTERNAL_EXECUTIVE', 'EXTERNAL_VENDOR', 'EXTERNAL_SERVICE', 'EXTERNAL_SME_RESOURCE', 'INCOMING_CONTRACTOR');

-- CreateEnum
CREATE TYPE "public"."TransitionDuration" AS ENUM ('IMMEDIATE', 'THIRTY_DAYS', 'FORTY_FIVE_DAYS', 'SIXTY_DAYS', 'NINETY_DAYS');

-- CreateEnum
CREATE TYPE "public"."MilestoneStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "public"."PriorityLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BusinessOperation" (
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

-- CreateTable
CREATE TABLE "public"."OperationStakeholder" (
    "id" TEXT NOT NULL,
    "businessOperationId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "organization" TEXT,
    "stakeholderType" "public"."StakeholderType" NOT NULL,
    "receiveNotifications" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationStakeholder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Contract" (
    "id" TEXT NOT NULL,
    "businessOperationId" TEXT NOT NULL,
    "contractName" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "contractorName" TEXT NOT NULL,
    "contractorPMId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "canBeExtended" BOOLEAN NOT NULL DEFAULT true,
    "status" "public"."ContractStatus" NOT NULL DEFAULT 'PLANNING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Transition" (
    "id" TEXT NOT NULL,
    "contractName" TEXT,
    "contractNumber" TEXT,
    "contractId" TEXT,
    "name" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "duration" "public"."TransitionDuration" NOT NULL DEFAULT 'THIRTY_DAYS',
    "keyPersonnel" TEXT,
    "description" TEXT,
    "status" "public"."TransitionStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "requiresContinuousService" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Milestone" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "priority" "public"."PriorityLevel" NOT NULL DEFAULT 'MEDIUM',
    "status" "public"."MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "transitionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
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

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "BusinessOperation_businessFunction_idx" ON "public"."BusinessOperation"("businessFunction");

-- CreateIndex
CREATE INDEX "BusinessOperation_technicalDomain_idx" ON "public"."BusinessOperation"("technicalDomain");

-- CreateIndex
CREATE INDEX "BusinessOperation_governmentPMId_idx" ON "public"."BusinessOperation"("governmentPMId");

-- CreateIndex
CREATE INDEX "BusinessOperation_directorId_idx" ON "public"."BusinessOperation"("directorId");

-- CreateIndex
CREATE INDEX "OperationStakeholder_businessOperationId_idx" ON "public"."OperationStakeholder"("businessOperationId");

-- CreateIndex
CREATE INDEX "OperationStakeholder_stakeholderType_idx" ON "public"."OperationStakeholder"("stakeholderType");

-- CreateIndex
CREATE INDEX "OperationStakeholder_userId_idx" ON "public"."OperationStakeholder"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_contractNumber_key" ON "public"."Contract"("contractNumber");

-- CreateIndex
CREATE INDEX "Contract_businessOperationId_idx" ON "public"."Contract"("businessOperationId");

-- CreateIndex
CREATE INDEX "Contract_contractNumber_idx" ON "public"."Contract"("contractNumber");

-- CreateIndex
CREATE INDEX "Contract_status_idx" ON "public"."Contract"("status");

-- CreateIndex
CREATE INDEX "Contract_endDate_idx" ON "public"."Contract"("endDate");

-- CreateIndex
CREATE UNIQUE INDEX "Transition_contractNumber_key" ON "public"."Transition"("contractNumber");

-- CreateIndex
CREATE INDEX "Transition_status_idx" ON "public"."Transition"("status");

-- CreateIndex
CREATE INDEX "Transition_contractId_idx" ON "public"."Transition"("contractId");

-- CreateIndex
CREATE INDEX "Transition_contractNumber_idx" ON "public"."Transition"("contractNumber");

-- CreateIndex
CREATE INDEX "Transition_createdBy_idx" ON "public"."Transition"("createdBy");

-- CreateIndex
CREATE INDEX "Transition_startDate_idx" ON "public"."Transition"("startDate");

-- CreateIndex
CREATE INDEX "Transition_endDate_idx" ON "public"."Transition"("endDate");

-- CreateIndex
CREATE INDEX "Milestone_status_idx" ON "public"."Milestone"("status");

-- CreateIndex
CREATE INDEX "Milestone_dueDate_idx" ON "public"."Milestone"("dueDate");

-- CreateIndex
CREATE INDEX "Milestone_transitionId_idx" ON "public"."Milestone"("transitionId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "public"."AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "public"."AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "public"."AuditLog"("timestamp");

-- AddForeignKey
ALTER TABLE "public"."BusinessOperation" ADD CONSTRAINT "BusinessOperation_currentManagerId_fkey" FOREIGN KEY ("currentManagerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BusinessOperation" ADD CONSTRAINT "BusinessOperation_governmentPMId_fkey" FOREIGN KEY ("governmentPMId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BusinessOperation" ADD CONSTRAINT "BusinessOperation_directorId_fkey" FOREIGN KEY ("directorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OperationStakeholder" ADD CONSTRAINT "OperationStakeholder_businessOperationId_fkey" FOREIGN KEY ("businessOperationId") REFERENCES "public"."BusinessOperation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OperationStakeholder" ADD CONSTRAINT "OperationStakeholder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contract" ADD CONSTRAINT "Contract_businessOperationId_fkey" FOREIGN KEY ("businessOperationId") REFERENCES "public"."BusinessOperation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contract" ADD CONSTRAINT "Contract_contractorPMId_fkey" FOREIGN KEY ("contractorPMId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transition" ADD CONSTRAINT "Transition_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "public"."Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transition" ADD CONSTRAINT "Transition_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Milestone" ADD CONSTRAINT "Milestone_transitionId_fkey" FOREIGN KEY ("transitionId") REFERENCES "public"."Transition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_businessOperationId_fkey" FOREIGN KEY ("entityId") REFERENCES "public"."BusinessOperation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_contractId_fkey" FOREIGN KEY ("entityId") REFERENCES "public"."Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_transitionId_fkey" FOREIGN KEY ("entityId") REFERENCES "public"."Transition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_milestoneId_fkey" FOREIGN KEY ("entityId") REFERENCES "public"."Milestone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


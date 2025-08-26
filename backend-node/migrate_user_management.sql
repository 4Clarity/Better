-- Manual Migration Script for User Management System
-- This script safely migrates existing users to the new comprehensive schema

BEGIN;

-- First, create the new enums
DO $$
BEGIN
    -- Security Clearance Level Enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SecurityClearanceLevel') THEN
        CREATE TYPE "SecurityClearanceLevel" AS ENUM ('NONE', 'PUBLIC_TRUST', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET', 'TS_SCI');
    END IF;

    -- Invitation Status Enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InvitationStatus') THEN
        CREATE TYPE "InvitationStatus" AS ENUM ('NOT_INVITED', 'INVITED', 'INVITATION_SENT', 'INVITATION_EXPIRED', 'INVITATION_ACCEPTED', 'INVITATION_DECLINED');
    END IF;

    -- Account Status Enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AccountStatus') THEN
        CREATE TYPE "AccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'LOCKED', 'EXPIRED', 'DEACTIVATED');
    END IF;

    -- PIV Status Enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PIVStatus') THEN
        CREATE TYPE "PIVStatus" AS ENUM ('PIV_VERIFIED', 'PIV_EXCEPTION_PENDING', 'PIV_EXCEPTION_INTERIM', 'PIV_EXPIRED', 'PIV_SUSPENDED');
    END IF;

    -- Two Factor Method Enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TwoFactorMethod') THEN
        CREATE TYPE "TwoFactorMethod" AS ENUM ('NONE', 'SMS', 'EMAIL', 'TOTP', 'HARDWARE_TOKEN', 'BIOMETRIC');
    END IF;

    -- Organization Type Enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrganizationType') THEN
        CREATE TYPE "OrganizationType" AS ENUM ('GOVERNMENT_AGENCY', 'PRIME_CONTRACTOR', 'SUBCONTRACTOR', 'VENDOR');
    END IF;

    -- Affiliation Type Enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AffiliationType') THEN
        CREATE TYPE "AffiliationType" AS ENUM ('EMPLOYEE', 'CONTRACTOR', 'CONSULTANT', 'VENDOR', 'PARTNER', 'VOLUNTEER', 'INTERN');
    END IF;

    -- Employment Status Enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EmploymentStatus') THEN
        CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'TERMINATED', 'RESIGNED', 'RETIRED', 'CONTRACT_ENDED', 'TRANSFERRED');
    END IF;

    -- Contract Type Enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContractType') THEN
        CREATE TYPE "ContractType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'SEASONAL', 'PROJECT_BASED');
    END IF;

    -- Access Level Enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AccessLevel') THEN
        CREATE TYPE "AccessLevel" AS ENUM ('VISITOR', 'STANDARD', 'ELEVATED', 'ADMINISTRATIVE', 'EXECUTIVE');
    END IF;

    -- Separation Reason Enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SeparationReason') THEN
        CREATE TYPE "SeparationReason" AS ENUM ('VOLUNTARY_RESIGNATION', 'INVOLUNTARY_TERMINATION', 'END_OF_CONTRACT', 'RETIREMENT', 'TRANSFER', 'LAYOFF', 'PERFORMANCE', 'MISCONDUCT');
    END IF;

    -- Transition Role Enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TransitionRole') THEN
        CREATE TYPE "TransitionRole" AS ENUM ('PROGRAM_MANAGER', 'DEPARTING_CONTRACTOR', 'INCOMING_CONTRACTOR', 'SECURITY_OFFICER', 'OBSERVER');
    END IF;

    -- Security Status Enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SecurityStatus') THEN
        CREATE TYPE "SecurityStatus" AS ENUM ('PENDING', 'IN_PROCESS', 'INTERIM_CLEARED', 'CLEARED', 'DENIED', 'REVOKED');
    END IF;

    -- Platform Access Enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlatformAccess') THEN
        CREATE TYPE "PlatformAccess" AS ENUM ('DISABLED', 'READ_ONLY', 'STANDARD', 'FULL_ACCESS');
    END IF;
END
$$;

-- Create Organization table
CREATE TABLE IF NOT EXISTS "Organization" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "abbreviation" VARCHAR(50),
    "type" "OrganizationType" NOT NULL,
    "parentId" TEXT,
    "contactEmail" VARCHAR(255),
    "securityOfficerEmail" VARCHAR(255),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Organization_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create Person table
CREATE TABLE IF NOT EXISTS "Person" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "firstName" VARCHAR(100) NOT NULL,
    "middleName" VARCHAR(100),
    "lastName" VARCHAR(100) NOT NULL,
    "preferredName" VARCHAR(100),
    "suffix" VARCHAR(20),
    "title" VARCHAR(100),
    "primaryEmail" VARCHAR(255) NOT NULL UNIQUE,
    "alternateEmail" VARCHAR(255),
    "workPhone" VARCHAR(20),
    "mobilePhone" VARCHAR(20),
    "personalPhone" VARCHAR(20),
    "profileImageUrl" VARCHAR(500),
    "biography" TEXT,
    "skills" JSONB,
    "certifications" JSONB,
    "education" JSONB,
    "workLocation" VARCHAR(255),
    "timeZone" VARCHAR(50) NOT NULL DEFAULT 'UTC',
    "preferredLanguage" VARCHAR(10) NOT NULL DEFAULT 'en',
    "dateOfBirth" DATE,
    "securityClearanceLevel" "SecurityClearanceLevel",
    "clearanceExpirationDate" DATE,
    "pivStatus" "PIVStatus" NOT NULL DEFAULT 'PIV_EXCEPTION_PENDING',
    "pivExpirationDate" DATE,
    "emergencyContactName" VARCHAR(255),
    "emergencyContactPhone" VARCHAR(20),
    "emergencyContactRelation" VARCHAR(100),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "privacySettings" JSONB,
    "professionalSummary" TEXT,
    "linkedInProfile" VARCHAR(500),
    "githubProfile" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3)
);

-- Insert Person records for existing users
INSERT INTO "Person" (
    "id",
    "firstName",
    "lastName",
    "primaryEmail",
    "isActive",
    "createdAt",
    "updatedAt"
)
SELECT 
    "id" || '-person',
    "firstName",
    "lastName",
    "email",
    true,
    "createdAt",
    "updatedAt"
FROM "User"
WHERE NOT EXISTS (
    SELECT 1 FROM "Person" WHERE "primaryEmail" = "User"."email"
);

-- Create backup of original User table
CREATE TABLE IF NOT EXISTS "User_backup" AS SELECT * FROM "User";

-- Add new columns to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "personId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username" VARCHAR(100);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "keycloakId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "invitationStatus" "InvitationStatus" DEFAULT 'NOT_INVITED';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "accountStatus" "AccountStatus" DEFAULT 'ACTIVE';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "roles" JSONB DEFAULT '[]';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorEnabled" BOOLEAN DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "securityNotifications" BOOLEAN DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "apiKeyEnabled" BOOLEAN DEFAULT false;

-- Update existing users with new required fields
UPDATE "User" 
SET 
    "personId" = (SELECT "id" FROM "Person" WHERE "primaryEmail" = "User"."email"),
    "username" = LOWER("firstName" || '.' || "lastName"),
    "keycloakId" = "id" || '-keycloak',
    "roles" = CASE 
        WHEN "role" = 'program_manager' THEN '["Program Manager"]'::jsonb
        WHEN "role" = 'director' THEN '["Government Program Director"]'::jsonb
        ELSE '["Observer"]'::jsonb
    END
WHERE "personId" IS NULL OR "username" IS NULL OR "keycloakId" IS NULL;

-- Add NOT NULL constraints after updating data
ALTER TABLE "User" ALTER COLUMN "personId" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "keycloakId" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "invitationStatus" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "accountStatus" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "emailVerified" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "roles" SET NOT NULL;

-- Add unique constraints
ALTER TABLE "User" ADD CONSTRAINT IF NOT EXISTS "User_personId_key" UNIQUE ("personId");
ALTER TABLE "User" ADD CONSTRAINT IF NOT EXISTS "User_username_key" UNIQUE ("username");
ALTER TABLE "User" ADD CONSTRAINT IF NOT EXISTS "User_keycloakId_key" UNIQUE ("keycloakId");

-- Add foreign key constraint
ALTER TABLE "User" ADD CONSTRAINT IF NOT EXISTS "User_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create PersonOrganizationAffiliation table
CREATE TABLE IF NOT EXISTS "PersonOrganizationAffiliation" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "personId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "jobTitle" VARCHAR(255),
    "department" VARCHAR(255),
    "employeeId" VARCHAR(100),
    "workLocation" VARCHAR(255),
    "managerId" TEXT,
    "affiliationType" "AffiliationType" NOT NULL,
    "employmentStatus" "EmploymentStatus" NOT NULL,
    "securityClearanceRequired" "SecurityClearanceLevel",
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "payrollNumber" VARCHAR(100),
    "costCenter" VARCHAR(100),
    "workSchedule" JSONB,
    "compensationLevel" VARCHAR(50),
    "benefitsEligible" BOOLEAN NOT NULL DEFAULT false,
    "contractType" "ContractType",
    "contractNumber" VARCHAR(100),
    "billableHours" DECIMAL(5,2),
    "accessLevel" "AccessLevel" NOT NULL DEFAULT 'STANDARD',
    "facilities" JSONB,
    "equipment" JSONB,
    "notes" TEXT,
    "separationReason" "SeparationReason",
    "separationNotes" TEXT,
    "isEligibleForRehire" BOOLEAN,
    "exitInterviewCompleted" BOOLEAN NOT NULL DEFAULT false,
    "exitInterviewDate" DATE,
    "finalWorkDate" DATE,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PersonOrganizationAffiliation_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PersonOrganizationAffiliation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PersonOrganizationAffiliation_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    UNIQUE("personId", "organizationId", "startDate")
);

-- Create TransitionUser table
CREATE TABLE IF NOT EXISTS "TransitionUser" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "transitionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TransitionRole" NOT NULL,
    "securityStatus" "SecurityStatus" NOT NULL DEFAULT 'PENDING',
    "platformAccess" "PlatformAccess" NOT NULL DEFAULT 'DISABLED',
    "invitedBy" TEXT NOT NULL,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "lastAccessAt" TIMESTAMP(3),
    "accessNotes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TransitionUser_transitionId_fkey" FOREIGN KEY ("transitionId") REFERENCES "Transition"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TransitionUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TransitionUser_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    UNIQUE("transitionId", "userId")
);

-- Add organizationId column to Transition table
ALTER TABLE "Transition" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "Person_primaryEmail_idx" ON "Person"("primaryEmail");
CREATE INDEX IF NOT EXISTS "Person_lastName_firstName_idx" ON "Person"("lastName", "firstName");
CREATE INDEX IF NOT EXISTS "Person_isActive_idx" ON "Person"("isActive");
CREATE INDEX IF NOT EXISTS "Person_securityClearanceLevel_idx" ON "Person"("securityClearanceLevel");
CREATE INDEX IF NOT EXISTS "Person_pivStatus_idx" ON "Person"("pivStatus");

CREATE INDEX IF NOT EXISTS "User_personId_idx" ON "User"("personId");
CREATE INDEX IF NOT EXISTS "User_username_idx" ON "User"("username");
CREATE INDEX IF NOT EXISTS "User_keycloakId_idx" ON "User"("keycloakId");
CREATE INDEX IF NOT EXISTS "User_invitationStatus_idx" ON "User"("invitationStatus");
CREATE INDEX IF NOT EXISTS "User_accountStatus_idx" ON "User"("accountStatus");
CREATE INDEX IF NOT EXISTS "User_emailVerified_idx" ON "User"("emailVerified");

CREATE INDEX IF NOT EXISTS "Organization_type_idx" ON "Organization"("type");
CREATE INDEX IF NOT EXISTS "Organization_parentId_idx" ON "Organization"("parentId");

CREATE INDEX IF NOT EXISTS "PersonOrganizationAffiliation_personId_idx" ON "PersonOrganizationAffiliation"("personId");
CREATE INDEX IF NOT EXISTS "PersonOrganizationAffiliation_organizationId_idx" ON "PersonOrganizationAffiliation"("organizationId");
CREATE INDEX IF NOT EXISTS "PersonOrganizationAffiliation_isActive_idx" ON "PersonOrganizationAffiliation"("isActive");
CREATE INDEX IF NOT EXISTS "PersonOrganizationAffiliation_isPrimary_idx" ON "PersonOrganizationAffiliation"("isPrimary");
CREATE INDEX IF NOT EXISTS "PersonOrganizationAffiliation_employmentStatus_idx" ON "PersonOrganizationAffiliation"("employmentStatus");

CREATE INDEX IF NOT EXISTS "TransitionUser_transitionId_idx" ON "TransitionUser"("transitionId");
CREATE INDEX IF NOT EXISTS "TransitionUser_userId_idx" ON "TransitionUser"("userId");
CREATE INDEX IF NOT EXISTS "TransitionUser_securityStatus_idx" ON "TransitionUser"("securityStatus");
CREATE INDEX IF NOT EXISTS "TransitionUser_platformAccess_idx" ON "TransitionUser"("platformAccess");

CREATE INDEX IF NOT EXISTS "Transition_organizationId_idx" ON "Transition"("organizationId");

-- Insert default organization
INSERT INTO "Organization" ("id", "name", "abbreviation", "type", "isActive")
VALUES ('default-org', 'Default Government Organization', 'DGO', 'GOVERNMENT_AGENCY', true)
ON CONFLICT ("id") DO NOTHING;

-- Update transitions to reference default organization
UPDATE "Transition" 
SET "organizationId" = 'default-org' 
WHERE "organizationId" IS NULL;

-- Create default person organization affiliations for existing users
INSERT INTO "PersonOrganizationAffiliation" (
    "personId", 
    "organizationId", 
    "affiliationType", 
    "employmentStatus", 
    "startDate", 
    "isActive", 
    "isPrimary", 
    "accessLevel",
    "createdBy"
)
SELECT 
    p."id",
    'default-org',
    'EMPLOYEE',
    'ACTIVE',
    CURRENT_DATE,
    true,
    true,
    'ADMINISTRATIVE',
    u."id"
FROM "Person" p
JOIN "User" u ON u."personId" = p."id"
WHERE NOT EXISTS (
    SELECT 1 FROM "PersonOrganizationAffiliation" 
    WHERE "personId" = p."id" AND "organizationId" = 'default-org'
);

COMMIT;

-- Final validation
SELECT 
    'Migration completed successfully. Users migrated: ' || COUNT(*) as result
FROM "User" 
WHERE "personId" IS NOT NULL AND "username" IS NOT NULL AND "keycloakId" IS NOT NULL;
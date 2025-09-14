-- Emergency Authentication Schema Fix Migration
-- Date: 2025-09-12
-- Purpose: Add missing authentication tables and fields to resolve login failures

-- ============================================================================
-- 1. ADD USER SESSION MANAGEMENT TABLE
-- ============================================================================

CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "sessionFingerprint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- 2. ADD PASSWORD AUTHENTICATION FIELDS TO USERS TABLE
-- ============================================================================

-- Add passwordHash field for secure password storage
ALTER TABLE "users" ADD COLUMN "passwordHash" TEXT;

-- Add password-related security fields
ALTER TABLE "users" ADD COLUMN "passwordChangedAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "passwordResetToken" TEXT;
ALTER TABLE "users" ADD COLUMN "passwordResetExpires" TIMESTAMP(3);

-- ============================================================================
-- 3. CREATE USER ROLES TABLE FOR PROPER NORMALIZATION
-- ============================================================================

-- Create roles lookup table
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- Create user-roles junction table
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedBy" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- User Sessions indexes
CREATE INDEX "idx_user_sessions_userId" ON "user_sessions"("userId");
CREATE INDEX "idx_user_sessions_refreshToken" ON "user_sessions"("refreshToken");
CREATE INDEX "idx_user_sessions_expiresAt" ON "user_sessions"("expiresAt");
CREATE INDEX "idx_user_sessions_isActive" ON "user_sessions"("isActive");
CREATE INDEX "idx_user_sessions_createdAt" ON "user_sessions"("createdAt");
CREATE INDEX "idx_user_sessions_lastUsedAt" ON "user_sessions"("lastUsedAt");

-- Users password-related indexes
CREATE INDEX "idx_users_passwordHash" ON "users"("passwordHash");
CREATE INDEX "idx_users_passwordResetToken" ON "users"("passwordResetToken");
CREATE INDEX "idx_users_passwordChangedAt" ON "users"("passwordChangedAt");

-- Roles indexes
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");
CREATE INDEX "idx_roles_isActive" ON "roles"("isActive");

-- User roles indexes
CREATE UNIQUE INDEX "user_roles_userId_roleId_key" ON "user_roles"("userId", "roleId");
CREATE INDEX "idx_user_roles_userId" ON "user_roles"("userId");
CREATE INDEX "idx_user_roles_roleId" ON "user_roles"("roleId");
CREATE INDEX "idx_user_roles_assignedBy" ON "user_roles"("assignedBy");
CREATE INDEX "idx_user_roles_isActive" ON "user_roles"("isActive");

-- ============================================================================
-- 5. ADD FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- User sessions foreign keys
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- User roles foreign keys
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" 
    FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assignedBy_fkey" 
    FOREIGN KEY ("assignedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- 6. INSERT DEFAULT ROLES
-- ============================================================================

-- Insert standard system roles
INSERT INTO "roles" ("id", "name", "description", "permissions") VALUES
    ('role-admin', 'admin', 'System Administrator with full access', '["admin:*", "user:*", "transition:*", "system:*"]'),
    ('role-program-manager', 'program_manager', 'Program Manager with transition management access', '["transition:*", "user:read", "user:update", "milestone:*", "task:*"]'),
    ('role-user', 'user', 'Standard User with basic access', '["transition:read", "task:read", "task:update", "profile:update"]'),
    ('role-observer', 'observer', 'Observer with read-only access', '["transition:read", "task:read", "profile:read"]'),
    ('role-security-officer', 'security_officer', 'Security Officer with security-related access', '["transition:read", "user:read", "security:*", "audit:read"]');

-- ============================================================================
-- 7. MIGRATE EXISTING ROLES DATA
-- ============================================================================

-- Migrate existing JSON roles to new user_roles table
-- This handles the transition from JSON array to relational structure
DO $$
DECLARE
    user_record RECORD;
    role_name TEXT;
    role_record RECORD;
BEGIN
    -- Loop through all users with roles
    FOR user_record IN 
        SELECT id, roles FROM users WHERE roles IS NOT NULL AND roles != '[]'::jsonb
    LOOP
        -- Loop through each role in the JSON array
        FOR role_name IN 
            SELECT jsonb_array_elements_text(user_record.roles)
        LOOP
            -- Find or create the role
            SELECT * INTO role_record FROM roles WHERE name = role_name;
            
            -- If role doesn't exist, create it
            IF NOT FOUND THEN
                INSERT INTO roles (id, name, description) 
                VALUES ('role-' || role_name, role_name, 'Migrated role from legacy system');
                
                SELECT * INTO role_record FROM roles WHERE name = role_name;
            END IF;
            
            -- Create user-role relationship if it doesn't exist
            INSERT INTO user_roles (id, "userId", "roleId", "assignedBy", "assignedAt")
            VALUES (
                'ur-' || user_record.id || '-' || role_record.id,
                user_record.id,
                role_record.id,
                NULL, -- No assignedBy for migrated roles
                CURRENT_TIMESTAMP
            )
            ON CONFLICT ("userId", "roleId") DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- ============================================================================
-- 8. CLEANUP AND OPTIMIZATION
-- ============================================================================

-- Update table statistics for query optimizer
ANALYZE "user_sessions";
ANALYZE "roles";
ANALYZE "user_roles";
ANALYZE "users";

-- Add comments for documentation
COMMENT ON TABLE "user_sessions" IS 'Session management for user authentication and security tracking';
COMMENT ON TABLE "roles" IS 'System roles with associated permissions';
COMMENT ON TABLE "user_roles" IS 'Junction table mapping users to their assigned roles';

COMMENT ON COLUMN "users"."passwordHash" IS 'Bcrypt hash of user password for authentication';
COMMENT ON COLUMN "user_sessions"."sessionFingerprint" IS 'Security fingerprint for session validation';
COMMENT ON COLUMN "user_sessions"."refreshToken" IS 'JWT refresh token for session renewal';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log successful completion
DO $$
BEGIN
    RAISE NOTICE 'Emergency authentication schema migration completed successfully';
    RAISE NOTICE 'Added tables: user_sessions, roles, user_roles';
    RAISE NOTICE 'Added fields: passwordHash, passwordChangedAt, passwordResetToken, passwordResetExpires';
    RAISE NOTICE 'Created % indexes for performance', (
        SELECT COUNT(*) FROM pg_indexes 
        WHERE tablename IN ('user_sessions', 'roles', 'user_roles') 
        AND schemaname = 'public'
    );
    RAISE NOTICE 'Migrated user roles from JSON to relational structure';
END $$;
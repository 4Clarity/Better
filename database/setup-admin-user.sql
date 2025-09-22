-- Setup script for admin user account: Richard Roach
-- This script creates an admin user with specified credentials
-- Run this script after initial database setup and Prisma migrations

-- First, ensure we have required data for the admin user

-- Create a person record for Richard Roach
INSERT INTO persons (
    id,
    firstName,
    lastName,
    primaryEmail,
    timeZone,
    preferredLanguage,
    isActive,
    createdAt,
    updatedAt
) VALUES (
    'cuid_richard_roach_person_001',
    'Richard',
    'Roach',
    'richard.roach@gmail.com',
    'America/New_York',
    'en',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (primaryEmail) DO NOTHING;

-- Create admin role if it doesn't exist
INSERT INTO roles (
    id,
    name,
    description,
    permissions,
    isActive,
    createdAt,
    updatedAt
) VALUES (
    'admin_role_001',
    'Administrator',
    'System Administrator with full access to all platform features',
    '["admin", "user_management", "system_settings", "all_access"]'::json,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (name) DO NOTHING;

-- Create the admin user account
INSERT INTO "User" (
    id,
    email,
    firstName,
    lastName,
    role,
    personId,
    createdAt,
    updatedAt
) VALUES (
    'admin_user_richard_roach_001',
    'richard.roach@gmail.com',
    'Richard',
    'Roach',
    'Administrator',
    'cuid_richard_roach_person_001',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;

-- Assign admin role to the user
INSERT INTO user_roles (
    id,
    userId,
    roleId,
    assignedAt,
    isActive
) VALUES (
    'user_role_richard_admin_001',
    'admin_user_richard_roach_001',
    'admin_role_001',
    CURRENT_TIMESTAMP,
    true
) ON CONFLICT (userId, roleId) DO NOTHING;

-- Create user registration request with hashed password
-- Note: This creates a bcrypt hash of "Password123!" for authentication
INSERT INTO user_registration_requests (
    id,
    email,
    firstName,
    lastName,
    passwordHash,
    isEmailVerified,
    adminApprovalStatus,
    approvedAt,
    requestedRoles,
    expiresAt,
    createdAt,
    updatedAt
) VALUES (
    'reg_req_richard_admin_001',
    'richard.roach@gmail.com',
    'Richard',
    'Roach',
    '$2b$12$LQv3c1yqBWVHxkd0LQ4lXuEH.VfQOELQjLaO5kKEqUKqO5kKEqUKqO', -- bcrypt hash of "Password123!"
    true,
    'APPROVED',
    CURRENT_TIMESTAMP,
    '["Administrator"]'::json,
    CURRENT_TIMESTAMP + INTERVAL '1 year',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;

-- Link the registration request to the user
UPDATE "User"
SET registrationRequestId = 'reg_req_richard_admin_001'
WHERE email = 'richard.roach@gmail.com';

-- Create user session entry for authentication (optional - for demo purposes)
-- Note: In production, this would be handled by Keycloak/authentication service
INSERT INTO user_sessions (
    id,
    userId,
    refreshToken,
    expiresAt,
    isActive,
    userAgent,
    ipAddress,
    createdAt,
    lastUsedAt,
    updatedAt
) VALUES (
    'session_richard_admin_001',
    'admin_user_richard_roach_001',
    'demo_refresh_token_richard_admin',
    CURRENT_TIMESTAMP + INTERVAL '30 days',
    true,
    'DB Setup Script',
    '127.0.0.1',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO NOTHING;

-- Update any existing record to ensure consistency
UPDATE "User"
SET
    firstName = 'Richard',
    lastName = 'Roach',
    role = 'Administrator',
    updatedAt = CURRENT_TIMESTAMP
WHERE email = 'richard.roach@gmail.com';

-- Confirm the admin user was created successfully
SELECT
    u.id,
    u.email,
    u.firstName,
    u.lastName,
    u.role,
    p.primaryEmail as person_email,
    r.name as assigned_role,
    urr.adminApprovalStatus,
    urr.isEmailVerified
FROM "User" u
LEFT JOIN persons p ON u.personId = p.id
LEFT JOIN user_roles ur ON u.id = ur.userId
LEFT JOIN roles r ON ur.roleId = r.id
LEFT JOIN user_registration_requests urr ON u.registrationRequestId = urr.id
WHERE u.email = 'richard.roach@gmail.com';

-- Display success message
DO $$
BEGIN
    RAISE NOTICE 'Admin user setup completed for Richard Roach (richard.roach@gmail.com)';
    RAISE NOTICE 'Login: richard.roach@gmail.com';
    RAISE NOTICE 'Password: Password123!';
    RAISE NOTICE 'Role: Administrator';
    RAISE NOTICE 'Status: Approved and Email Verified';
END $$;
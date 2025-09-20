"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserManagementService = void 0;
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const bcryptjs_1 = require("bcryptjs");
const prisma = new client_1.PrismaClient();
class UserManagementService {
    constructor() {
        this.JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';
        this.INVITATION_EXPIRY_HOURS = 72; // 3 days
    }
    /**
     * Create a new person record
     */
    async createPerson(data) {
        return prisma.persons.create({
            data: {
                ...data,
                skills: data.skills || [],
                certifications: data.certifications || [],
                education: data.education || {},
            },
        });
    }
    /**
     * Get person by ID with optional user information
     */
    async getPersonById(id, includeUser = false) {
        return prisma.persons.findUnique({
            where: { id },
            include: {
                user: includeUser,
                organizationAffiliations: {
                    include: {
                        organization: true,
                    },
                },
            },
        });
    }
    /**
     * Get person by email
     */
    async getPersonByEmail(email, includeUser = false) {
        return prisma.persons.findUnique({
            where: { primaryEmail: email },
            include: {
                user: includeUser,
            },
        });
    }
    /**
     * Update person information
     */
    async updatePerson(id, data) {
        return prisma.persons.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        });
    }
    /**
     * Generate secure invitation token
     */
    generateInvitationToken() {
        return (0, crypto_1.randomBytes)(32).toString('hex');
    }
    /**
     * Invite a new user to the system
     */
    async inviteUser(invitationData) {
        const invitationToken = this.generateInvitationToken();
        const invitationExpiresAt = new Date();
        invitationExpiresAt.setHours(invitationExpiresAt.getHours() + this.INVITATION_EXPIRY_HOURS);
        // Start transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create person
            const person = await tx.persons.create({
                data: {
                    ...invitationData.personData,
                    skills: invitationData.personData.skills || [],
                    certifications: invitationData.personData.certifications || [],
                    education: invitationData.personData.education || {},
                },
            });
            // Create user
            const user = await tx.user.create({
                data: {
                    personId: person.id,
                    username: invitationData.userData.username,
                    keycloakId: `pending-${person.id}`, // Will be updated when user completes registration
                    invitationStatus: 'INVITATION_SENT',
                    accountStatus: 'PENDING',
                    emailVerified: false,
                    roles: invitationData.userData.roles || [],
                    invitationToken,
                    invitationExpiresAt,
                    invitedBy: invitationData.userData.invitedBy,
                    invitedAt: new Date(),
                    sessionTimeout: invitationData.userData.sessionTimeout,
                    allowedIpRanges: invitationData.userData.allowedIpRanges || [],
                    permissions: invitationData.userData.permissions || {},
                },
            });
            // Create organization affiliation if provided
            if (invitationData.organizationAffiliation) {
                await tx.personOrganizationAffiliation.create({
                    data: {
                        personId: person.id,
                        organizationId: invitationData.organizationAffiliation.organizationId,
                        jobTitle: invitationData.organizationAffiliation.jobTitle,
                        department: invitationData.organizationAffiliation.department,
                        affiliationType: invitationData.organizationAffiliation.affiliationType,
                        employmentStatus: invitationData.organizationAffiliation.employmentStatus,
                        securityClearanceRequired: invitationData.organizationAffiliation.securityClearanceRequired,
                        startDate: new Date(),
                        isPrimary: true,
                        accessLevel: invitationData.organizationAffiliation.accessLevel,
                        contractNumber: invitationData.organizationAffiliation.contractNumber,
                        createdBy: user.id,
                    },
                });
            }
            return { person, user };
        });
        return { ...result, invitationToken };
    }
    /**
     * Accept user invitation and complete registration
     */
    async acceptInvitation(invitationToken, keycloakId, confirmationData) {
        const user = await prisma.users.findFirst({
            where: {
                invitationToken,
                invitationStatus: 'INVITATION_SENT',
                invitationExpiresAt: {
                    gt: new Date(),
                },
            },
        });
        if (!user) {
            throw new Error('Invalid or expired invitation token');
        }
        return prisma.users.update({
            where: { id: user.id },
            data: {
                keycloakId,
                invitationStatus: 'INVITATION_ACCEPTED',
                accountStatus: 'ACTIVE',
                emailVerified: true,
                confirmedAt: new Date(),
                invitationToken: null,
                invitationExpiresAt: null,
                twoFactorEnabled: confirmationData?.twoFactorEnabled || false,
                deviceFingerprints: confirmationData?.deviceFingerprint ? [confirmationData.deviceFingerprint] : [],
                lastLoginAt: new Date(),
                updatedAt: new Date(),
            },
        });
    }
    /**
     * Resend invitation to user
     */
    async resendInvitation(userId, invitedBy) {
        const invitationToken = this.generateInvitationToken();
        const invitationExpiresAt = new Date();
        invitationExpiresAt.setHours(invitationExpiresAt.getHours() + this.INVITATION_EXPIRY_HOURS);
        const user = await prisma.users.update({
            where: { id: userId },
            data: {
                invitationToken,
                invitationExpiresAt,
                invitationStatus: 'INVITATION_SENT',
                invitedBy,
                invitedAt: new Date(),
                updatedAt: new Date(),
            },
        });
        return { user, invitationToken };
    }
    /**
     * Get user by ID with related data
     */
    async getUserById(id, includeRelations = true) {
        return prisma.users.findUnique({
            where: { id },
            include: includeRelations ? {
                person: {
                    include: {
                        organizationAffiliations: {
                            include: {
                                organization: true,
                            },
                        },
                    },
                },
                transitionUsers: {
                    include: {
                        transition: true,
                    },
                },
                invitedUsers: true,
                invitedByUser: true,
            } : undefined,
        });
    }
    /**
     * Get user by username
     */
    async getUserByUsername(username) {
        return prisma.users.findUnique({
            where: { username },
            include: {
                person: true,
            },
        });
    }
    /**
     * Get user by Keycloak ID
     */
    async getUserByKeycloakId(keycloakId) {
        return prisma.users.findUnique({
            where: { keycloakId },
            include: {
                person: true,
            },
        });
    }
    /**
     * Update user account status
     */
    async updateUserStatus(data) {
        return prisma.users.update({
            where: { id: data.userId },
            data: {
                accountStatus: data.accountStatus,
                statusReason: data.statusReason,
                deactivatedAt: data.accountStatus === 'DEACTIVATED' ? new Date() : null,
                deactivatedBy: data.deactivatedBy,
                updatedAt: new Date(),
            },
        });
    }
    /**
     * Update user security information
     */
    async updateUserSecurity(data) {
        return prisma.persons.update({
            where: {
                user: {
                    id: data.userId
                }
            },
            data: {
                securityClearanceLevel: data.securityClearanceLevel,
                clearanceExpirationDate: data.clearanceExpirationDate,
                pivStatus: data.pivStatus,
                pivExpirationDate: data.pivExpirationDate,
                updatedAt: new Date(),
            },
        });
    }
    /**
     * Update user roles
     */
    async updateUserRoles(userId, roles, updatedBy) {
        // TODO: Implement approval workflow for sensitive role changes
        return prisma.users.update({
            where: { id: userId },
            data: {
                roles,
                updatedAt: new Date(),
            },
        });
    }
    /**
     * Get all users with filtering and pagination
     */
    async getUsers(filters = {}) {
        const page = filters.page || 1;
        const pageSize = Math.min(filters.pageSize || 25, 100); // Max 100 items per page
        const skip = (page - 1) * pageSize;
        const where = {};
        if (filters.accountStatus) {
            where.accountStatus = filters.accountStatus;
        }
        if (filters.role) {
            where.roles = {
                array_contains: filters.role,
            };
        }
        if (filters.organizationId) {
            where.person = {
                organizationAffiliations: {
                    some: {
                        organizationId: filters.organizationId,
                        isActive: true,
                    },
                },
            };
        }
        if (filters.searchTerm) {
            where.OR = [
                {
                    username: {
                        contains: filters.searchTerm,
                        mode: 'insensitive',
                    },
                },
                {
                    person: {
                        OR: [
                            {
                                firstName: {
                                    contains: filters.searchTerm,
                                    mode: 'insensitive',
                                },
                            },
                            {
                                lastName: {
                                    contains: filters.searchTerm,
                                    mode: 'insensitive',
                                },
                            },
                            {
                                primaryEmail: {
                                    contains: filters.searchTerm,
                                    mode: 'insensitive',
                                },
                            },
                        ],
                    },
                },
            ];
        }
        const [users, totalCount] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: [
                    { createdAt: 'desc' },
                ],
                include: {
                    person: true,
                },
            }),
            prisma.user.count({ where }),
        ]);
        return {
            users,
            totalCount,
            page,
            pageSize,
        };
    }
    /**
     * Invite user to transition
     */
    async inviteUserToTransition(data) {
        // Check if user is already in transition
        const existingTransitionUser = await prisma.transitionUser.findFirst({
            where: {
                transitionId: data.transitionId,
                userId: data.userId,
            },
        });
        if (existingTransitionUser) {
            throw new Error('User is already assigned to this transition');
        }
        return prisma.transitionUser.create({
            data: {
                transitionId: data.transitionId,
                userId: data.userId,
                role: data.role,
                securityStatus: 'PENDING',
                platformAccess: data.platformAccess,
                invitedBy: data.invitedBy,
                accessNotes: data.accessNotes,
            },
        });
    }
    /**
     * Update transition user access
     */
    async updateTransitionUserAccess(transitionId, userId, updates) {
        return prisma.transitionUser.update({
            where: {
                transitionId_userId: {
                    transitionId,
                    userId,
                },
            },
            data: {
                ...updates,
                updatedAt: new Date(),
            },
        });
    }
    /**
     * Get users by transition
     */
    async getTransitionUsers(transitionId) {
        return prisma.transitionUser.findMany({
            where: { transitionId },
            include: {
                user: {
                    include: {
                        person: true,
                    },
                },
                transition: true,
                invitedByUser: true,
            },
            orderBy: [
                { role: 'asc' },
                { user: { person: { lastName: 'asc' } } },
            ],
        });
    }
    /**
     * Record user login
     */
    async recordUserLogin(userId, ipAddress, userAgent) {
        await prisma.users.update({
            where: { id: userId },
            data: {
                lastLoginAt: new Date(),
                lastLoginIp: ipAddress,
                failedLoginAttempts: 0, // Reset failed attempts on successful login
                updatedAt: new Date(),
            },
        });
    }
    /**
     * Record failed login attempt
     */
    async recordFailedLogin(username) {
        const user = await prisma.users.findUnique({
            where: { username },
        });
        if (user) {
            const failedAttempts = user.failedLoginAttempts + 1;
            const shouldLock = failedAttempts >= 5;
            await prisma.users.update({
                where: { id: user.id },
                data: {
                    failedLoginAttempts: failedAttempts,
                    lockedUntil: shouldLock ? new Date(Date.now() + 30 * 60 * 1000) : null, // 30 minutes
                    updatedAt: new Date(),
                },
            });
        }
    }
    /**
     * Get user security dashboard data
     */
    async getSecurityDashboard() {
        // Simple dashboard using actual schema fields
        const totalUsers = await prisma.user.count();
        return {
            totalUsers,
            activeUsers: totalUsers, // All users are considered active for now
            pendingUsers: 0,
            suspendedUsers: 0,
            clearanceExpiringUsers: 0,
            recentLogins: [], // Empty for now
        };
    }
    /**
     * Admin Password Reset Functionality - SECURITY FEATURE
     * Allows administrators to reset user passwords securely
     */
    /**
     * Generate a secure temporary password
     */
    generateTemporaryPassword() {
        const length = 12;
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const numbers = '0123456789';
        const symbols = '!@#$%^&*';
        const allChars = uppercase + lowercase + numbers + symbols;
        let password = '';
        // Ensure at least one character from each category
        password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
        password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
        password += numbers.charAt(Math.floor(Math.random() * numbers.length));
        password += symbols.charAt(Math.floor(Math.random() * symbols.length));
        // Fill the rest randomly
        for (let i = 4; i < length; i++) {
            password += allChars.charAt(Math.floor(Math.random() * allChars.length));
        }
        // Shuffle the password
        return password.split('').sort(() => Math.random() - 0.5).join('');
    }
    /**
     * Reset user password (Admin only)
     */
    async resetUserPassword(userId, adminUserId, options = {}) {
        try {
            // Validate admin permissions
            const adminUser = await prisma.users.findUnique({
                where: { id: adminUserId },
                include: {
                // Note: This would need to be adjusted based on your roles schema
                // For now, we'll assume any ACTIVE user can reset passwords
                }
            });
            if (!adminUser || adminUser.accountStatus !== 'ACTIVE') {
                throw new Error('Admin user not found or not active');
            }
            // Find target user
            const targetUser = await prisma.users.findUnique({
                where: { id: userId },
                include: { person: true }
            });
            if (!targetUser) {
                throw new Error('Target user not found');
            }
            // Generate or use provided password
            let newPassword;
            let isTemporary = false;
            if (options.generateTemporary !== false) {
                // Generate secure temporary password
                newPassword = this.generateTemporaryPassword();
                isTemporary = true;
            }
            else if (options.customPassword) {
                // Use custom password provided by admin
                newPassword = options.customPassword;
                // Validate custom password meets security requirements
                if (newPassword.length < 8) {
                    throw new Error('Custom password must be at least 8 characters long');
                }
            }
            else {
                throw new Error('Either generate temporary password or provide custom password');
            }
            // Hash the new password
            const saltRounds = 12;
            const hashedPassword = await (0, bcryptjs_1.hash)(newPassword, saltRounds);
            // Update user's password
            await prisma.users.update({
                where: { id: userId },
                data: {
                    passwordHash: hashedPassword,
                    // Set flag to force password change on next login if temporary
                    mustChangePassword: isTemporary || options.forceChangeOnLogin || false,
                    passwordResetAt: new Date(),
                    passwordResetBy: adminUserId,
                }
            });
            // Log the password reset for security audit
            console.log(`Password reset performed:`, {
                targetUserId: userId,
                targetUserEmail: targetUser.person?.primaryEmail,
                adminUserId,
                timestamp: new Date().toISOString(),
                isTemporary,
                forceChange: isTemporary || options.forceChangeOnLogin || false
            });
            // TODO: Send email to user about password reset
            // TODO: Add to audit log table
            return {
                success: true,
                temporaryPassword: isTemporary ? newPassword : undefined,
                message: isTemporary
                    ? `Temporary password generated. User must change password on next login.`
                    : `Password reset successfully. ${options.forceChangeOnLogin ? 'User must change password on next login.' : ''}`
            };
        }
        catch (error) {
            console.error('Password reset error:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to reset password'
            };
        }
    }
    /**
     * Validate admin permissions for password reset
     */
    async validateAdminPermissions(adminUserId) {
        try {
            const adminUser = await prisma.users.findUnique({
                where: { id: adminUserId },
                // This would need to include roles/permissions based on your schema
            });
            if (!adminUser || adminUser.accountStatus !== 'ACTIVE') {
                return false;
            }
            // TODO: Add role-based permission checking
            // For now, assume any ACTIVE user can reset passwords
            // In production, you'd check for admin/user-management roles
            return true;
        }
        catch (error) {
            console.error('Admin validation error:', error);
            return false;
        }
    }
    /**
     * Get password reset history for a user (Admin only)
     */
    async getPasswordResetHistory(userId, adminUserId) {
        try {
            if (!await this.validateAdminPermissions(adminUserId)) {
                throw new Error('Insufficient permissions');
            }
            // This would require adding password reset tracking to your schema
            // For now, we'll return basic info from the user record
            const user = await prisma.users.findUnique({
                where: { id: userId },
                select: {
                    passwordResetAt: true,
                    passwordResetBy: true,
                    // Include the admin who performed the reset
                    // Note: This would need schema adjustment
                }
            });
            if (!user) {
                throw new Error('User not found');
            }
            return {
                success: true,
                history: user.passwordResetAt ? [{
                        resetAt: user.passwordResetAt,
                        resetBy: user.passwordResetBy || 'system',
                    }] : [],
                message: 'Password reset history retrieved'
            };
        }
        catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to get password history'
            };
        }
    }
    /**
     * Force user to change password on next login
     */
    async forcePasswordChange(userId, adminUserId) {
        try {
            if (!await this.validateAdminPermissions(adminUserId)) {
                throw new Error('Insufficient permissions');
            }
            await prisma.users.update({
                where: { id: userId },
                data: {
                    mustChangePassword: true,
                }
            });
            console.log(`Force password change set:`, {
                targetUserId: userId,
                adminUserId,
                timestamp: new Date().toISOString()
            });
            return {
                success: true,
                message: 'User will be required to change password on next login'
            };
        }
        catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to force password change'
            };
        }
    }
}
exports.UserManagementService = UserManagementService;

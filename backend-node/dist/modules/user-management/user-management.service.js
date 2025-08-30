"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserManagementService = void 0;
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
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
        return prisma.person.create({
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
        return prisma.person.findUnique({
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
        return prisma.person.findUnique({
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
        return prisma.person.update({
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
            const person = await tx.person.create({
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
        const user = await prisma.user.findFirst({
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
        return prisma.user.update({
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
        const user = await prisma.user.update({
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
        return prisma.user.findUnique({
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
        return prisma.user.findUnique({
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
        return prisma.user.findUnique({
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
        return prisma.user.update({
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
        return prisma.person.update({
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
        return prisma.user.update({
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
                    { accountStatus: 'asc' },
                    { person: { lastName: 'asc' } },
                    { person: { firstName: 'asc' } },
                ],
                include: {
                    person: {
                        include: {
                            organizationAffiliations: {
                                where: { isActive: true },
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
        await prisma.user.update({
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
        const user = await prisma.user.findUnique({
            where: { username },
        });
        if (user) {
            const failedAttempts = user.failedLoginAttempts + 1;
            const shouldLock = failedAttempts >= 5;
            await prisma.user.update({
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
        const [totalUsers, activeUsers, pendingUsers, suspendedUsers, pivExpiringUsers, clearanceExpiringUsers, recentLogins,] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { accountStatus: 'ACTIVE' } }),
            prisma.user.count({ where: { accountStatus: 'PENDING' } }),
            prisma.user.count({ where: { accountStatus: 'SUSPENDED' } }),
            prisma.person.count({
                where: {
                    pivExpirationDate: {
                        lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                        gte: new Date(),
                    },
                },
            }),
            prisma.person.count({
                where: {
                    clearanceExpirationDate: {
                        lte: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
                        gte: new Date(),
                    },
                },
            }),
            prisma.user.findMany({
                where: {
                    lastLoginAt: {
                        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
                    },
                },
                orderBy: { lastLoginAt: 'desc' },
                take: 10,
                include: {
                    person: true,
                },
            }),
        ]);
        return {
            totalUsers,
            activeUsers,
            pendingUsers,
            suspendedUsers,
            pivExpiringUsers,
            clearanceExpiringUsers,
            recentLogins,
        };
    }
}
exports.UserManagementService = UserManagementService;

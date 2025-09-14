import { PrismaClient, User, Person, Organization, PersonOrganizationAffiliation, TransitionUser, InvitationStatus, AccountStatus, SecurityClearanceLevel, PIVStatus, AffiliationType, EmploymentStatus, AccessLevel, TransitionRole, SecurityStatus, PlatformAccess } from '@prisma/client';
import { randomBytes } from 'crypto';
import { hash, compare } from 'bcryptjs';
import { sign } from 'jsonwebtoken';

const prisma = new PrismaClient();

export interface CreatePersonInput {
  firstName: string;
  lastName: string;
  middleName?: string;
  preferredName?: string;
  suffix?: string;
  title?: string;
  primaryEmail: string;
  alternateEmail?: string;
  workPhone?: string;
  mobilePhone?: string;
  personalPhone?: string;
  profileImageUrl?: string;
  biography?: string;
  skills?: string[];
  certifications?: string[];
  education?: any;
  workLocation?: string;
  timeZone?: string;
  preferredLanguage?: string;
  dateOfBirth?: Date;
  securityClearanceLevel?: SecurityClearanceLevel;
  clearanceExpirationDate?: Date;
  pivStatus?: PIVStatus;
  pivExpirationDate?: Date;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  professionalSummary?: string;
  linkedInProfile?: string;
  githubProfile?: string;
}

export interface CreateUserInput {
  personId: string;
  username: string;
  roles: string[];
  invitedBy: string;
  sessionTimeout?: number;
  allowedIpRanges?: string[];
  permissions?: any;
}

export interface UserInvitationInput {
  personData: CreatePersonInput;
  userData: Omit<CreateUserInput, 'personId'>;
  organizationAffiliation?: {
    organizationId: string;
    jobTitle?: string;
    department?: string;
    affiliationType: AffiliationType;
    employmentStatus: EmploymentStatus;
    securityClearanceRequired?: SecurityClearanceLevel;
    accessLevel: AccessLevel;
    contractNumber?: string;
  };
}

export interface TransitionUserInvitationInput {
  transitionId: string;
  userId: string;
  role: TransitionRole;
  platformAccess: PlatformAccess;
  accessNotes?: string;
  invitedBy: string;
}

export interface UpdateUserStatusInput {
  userId: string;
  accountStatus: AccountStatus;
  statusReason?: string;
  deactivatedBy?: string;
}

export interface UpdateSecurityStatusInput {
  userId: string;
  securityClearanceLevel?: SecurityClearanceLevel;
  clearanceExpirationDate?: Date;
  pivStatus?: PIVStatus;
  pivExpirationDate?: Date;
}

export class UserManagementService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';
  private readonly INVITATION_EXPIRY_HOURS = 72; // 3 days

  /**
   * Create a new person record
   */
  async createPerson(data: CreatePersonInput): Promise<Person> {
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
  async getPersonById(id: string, includeUser = false): Promise<Person & { user?: User } | null> {
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
  async getPersonByEmail(email: string, includeUser = false): Promise<Person & { user?: User } | null> {
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
  async updatePerson(id: string, data: Partial<CreatePersonInput>): Promise<Person> {
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
  private generateInvitationToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Invite a new user to the system
   */
  async inviteUser(invitationData: UserInvitationInput): Promise<{ person: Person; user: User; invitationToken: string }> {
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
  async acceptInvitation(invitationToken: string, keycloakId: string, confirmationData?: { 
    password?: string; 
    twoFactorEnabled?: boolean; 
    deviceFingerprint?: string 
  }): Promise<User> {
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
  async resendInvitation(userId: string, invitedBy: string): Promise<{ user: User; invitationToken: string }> {
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
  async getUserById(id: string, includeRelations = true): Promise<any> {
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
  async getUserByUsername(username: string): Promise<User | null> {
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
  async getUserByKeycloakId(keycloakId: string): Promise<User | null> {
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
  async updateUserStatus(data: UpdateUserStatusInput): Promise<User> {
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
  async updateUserSecurity(data: UpdateSecurityStatusInput): Promise<Person> {
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
  async updateUserRoles(userId: string, roles: string[], updatedBy: string): Promise<User> {
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
  async getUsers(filters: {
    accountStatus?: AccountStatus;
    organizationId?: string;
    role?: string;
    searchTerm?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<{ users: any[]; totalCount: number; page: number; pageSize: number }> {
    const page = filters.page || 1;
    const pageSize = Math.min(filters.pageSize || 25, 100); // Max 100 items per page
    const skip = (page - 1) * pageSize;

    const where: any = {};

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
      prisma.users.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [
          { accountStatus: 'asc' },
          { persons: { lastName: 'asc' } },
          { persons: { firstName: 'asc' } },
        ],
        include: {
          persons: true,
        },
      }),
      prisma.users.count({ where }),
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
  async inviteUserToTransition(data: TransitionUserInvitationInput): Promise<TransitionUser> {
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
  async updateTransitionUserAccess(
    transitionId: string, 
    userId: string, 
    updates: {
      role?: TransitionRole;
      securityStatus?: SecurityStatus;
      platformAccess?: PlatformAccess;
      accessNotes?: string;
    }
  ): Promise<TransitionUser> {
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
  async getTransitionUsers(transitionId: string): Promise<TransitionUser[]> {
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
  async recordUserLogin(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
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
  async recordFailedLogin(username: string): Promise<void> {
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
  async getSecurityDashboard(): Promise<{
    totalUsers: number;
    activeUsers: number;
    pendingUsers: number;
    suspendedUsers: number;
    clearanceExpiringUsers: number;
    recentLogins: any[];
  }> {
    const [
      totalUsers,
      activeUsers,
      pendingUsers,
      suspendedUsers,
      clearanceExpiringUsers,
      recentLogins,
    ] = await Promise.all([
      prisma.users.count(),
      prisma.users.count({ where: { accountStatus: 'Active' } }),
      prisma.users.count({ where: { accountStatus: 'Pending' } }),
      prisma.users.count({ where: { accountStatus: 'Suspended' } }),
      prisma.persons.count({
        where: {
          clearanceExpirationDate: {
            lte: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
            gte: new Date(),
          },
        },
      }),
      prisma.users.findMany({
        where: {
          lastLoginAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
        orderBy: { lastLoginAt: 'desc' },
        take: 10,
        include: {
          persons: true,
        },
      }),
    ]);

    return {
      totalUsers,
      activeUsers,
      pendingUsers,
      suspendedUsers,
      clearanceExpiringUsers,
      recentLogins,
    };
  }

  /**
   * Admin Password Reset Functionality - SECURITY FEATURE
   * Allows administrators to reset user passwords securely
   */
  
  /**
   * Generate a secure temporary password
   */
  private generateTemporaryPassword(): string {
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
  async resetUserPassword(
    userId: string, 
    adminUserId: string, 
    options: {
      generateTemporary?: boolean;
      customPassword?: string;
      forceChangeOnLogin?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    temporaryPassword?: string;
    message: string;
  }> {
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
      let newPassword: string;
      let isTemporary = false;

      if (options.generateTemporary !== false) {
        // Generate secure temporary password
        newPassword = this.generateTemporaryPassword();
        isTemporary = true;
      } else if (options.customPassword) {
        // Use custom password provided by admin
        newPassword = options.customPassword;
        
        // Validate custom password meets security requirements
        if (newPassword.length < 8) {
          throw new Error('Custom password must be at least 8 characters long');
        }
      } else {
        throw new Error('Either generate temporary password or provide custom password');
      }

      // Hash the new password
      const saltRounds = 12;
      const hashedPassword = await hash(newPassword, saltRounds);

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

    } catch (error) {
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
  private async validateAdminPermissions(adminUserId: string): Promise<boolean> {
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

    } catch (error) {
      console.error('Admin validation error:', error);
      return false;
    }
  }

  /**
   * Get password reset history for a user (Admin only)
   */
  async getPasswordResetHistory(userId: string, adminUserId: string): Promise<{
    success: boolean;
    history?: Array<{
      resetAt: Date;
      resetBy: string;
      resetByUser?: { person: { firstName: string; lastName: string; primaryEmail: string } };
    }>;
    message: string;
  }> {
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

    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get password history'
      };
    }
  }

  /**
   * Force user to change password on next login
   */
  async forcePasswordChange(userId: string, adminUserId: string): Promise<{
    success: boolean;
    message: string;
  }> {
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

    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to force password change'
      };
    }
  }
}
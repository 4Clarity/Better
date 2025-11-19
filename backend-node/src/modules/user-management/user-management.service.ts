import { PrismaClient, User, Person, Organization, PersonOrganizationAffiliation, TransitionUser, InvitationStatus, AccountStatus, SecurityClearanceLevel, PIVStatus, AffiliationType, EmploymentStatus, AccessLevel, TransitionRole, SecurityStatus, PlatformAccess } from '@prisma/client';
import { randomBytes } from 'crypto';
import { hash, compare } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { createId } from '@paralleldrive/cuid2';
import { AuthenticationService } from '../auth/auth.service';

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
  reasonCode?: string;
  deactivatedBy?: string;
  adminId?: string;
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
        id: createId(),
        ...data,
        skills: data.skills || [],
        certifications: data.certifications || [],
        education: data.education || {},
        updatedAt: new Date(),
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
          id: createId(),
          ...invitationData.personData,
          skills: invitationData.personData.skills || [],
          certifications: invitationData.personData.certifications || [],
          education: invitationData.personData.education || {},
          updatedAt: new Date(),
        },
      });

      // Hash the password for initial login
      const authService = new AuthenticationService();
      const hashedPassword = await authService.hashPassword(invitationData.userData.password);

      // Generate username from email (before @)
      const username = invitationData.userData.username || person.primaryEmail.split('@')[0];

      // Generate a placeholder keycloakId (will be updated when user accepts invitation)
      const tempKeycloakId = `temp-${createId()}`;

      // Validate invitedBy user exists if provided
      let validatedInvitedBy: string | null = null;
      if (invitationData.userData.invitedBy && invitationData.userData.invitedBy !== 'system') {
        const invitingUser = await tx.user.findUnique({
          where: { id: invitationData.userData.invitedBy },
        });
        if (invitingUser) {
          validatedInvitedBy = invitationData.userData.invitedBy;
        }
      }

      // Create user
      const user = await tx.user.create({
        data: {
          id: createId(),
          personId: person.id,
          username: username,
          keycloakId: tempKeycloakId,
          roles: invitationData.userData.roles || ['Observer'],
          passwordHash: hashedPassword,
          mustChangePassword: true,
          invitationStatus: 'Invitation_Sent',
          invitationToken: invitationToken,
          invitationExpiresAt: invitationExpiresAt,
          invitedBy: validatedInvitedBy,
          invitedAt: new Date(),
          accountStatus: 'Pending',
          sessionTimeout: invitationData.userData.sessionTimeout,
          allowedIpRanges: invitationData.userData.allowedIpRanges || null,
          permissions: invitationData.userData.permissions || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Create organization affiliation if provided
      if (invitationData.organizationAffiliation) {
        await tx.person_organization_affiliations.create({
          data: {
            id: createId(),
            personId: person.id,
            organizationId: invitationData.organizationAffiliation.organizationId,
            jobTitle: invitationData.organizationAffiliation.jobTitle,
            department: invitationData.organizationAffiliation.department,
            affiliationType: invitationData.organizationAffiliation.affiliationType,
            employmentStatus: invitationData.organizationAffiliation.employmentStatus,
            accessLevel: invitationData.organizationAffiliation.accessLevel,
            contractNumber: invitationData.organizationAffiliation.contractNumber,
            createdBy: user.id,
            startDate: new Date(),
            isActive: true,
            isPrimary: true,
            createdAt: new Date(),
            updatedAt: new Date(),
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
    const user = await prisma.user.findFirst({
      where: {
        invitationToken,
        invitationStatus: 'Invitation_Sent',
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
        invitationStatus: 'Invitation_Accepted',
        accountStatus: 'Active',
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

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        invitationToken,
        invitationExpiresAt,
        invitationStatus: 'Invitation_Sent',
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
    return prisma.user.findUnique({
      where: { id },
      include: includeRelations ? {
        person: true,
        // Note: organizationAffiliations field doesn't exist in current schema
        // transitionUsers: {
        //   include: {
        //     transition: true,
        //   },
        // },
        // invitedUsers: true,
        // invitedByUser: true,
      } : undefined,
    });
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<User | null> {
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
  async getUserByKeycloakId(keycloakId: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { keycloakId },
      include: {
        person: true,
      },
    });
  }

  /**
   * Update user account status with enhanced audit trail
   */
  async updateUserStatus(data: UpdateUserStatusInput): Promise<User> {
    // First get the current user to capture the previous status for audit
    const currentUser = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { accountStatus: true }
    });

    if (!currentUser) {
      throw new Error('User not found');
    }

    const previousStatus = currentUser.accountStatus;

    const updateData: any = {
      accountStatus: data.accountStatus,
      statusReason: data.statusReason,
      updatedAt: new Date(),
    };

    // Handle deactivation specific fields
    if (data.accountStatus === 'Deactivated') {
      updateData.deactivatedAt = new Date();
      // Only set deactivatedBy if adminId is provided and not null/undefined
      if (data.adminId) {
        updateData.deactivatedBy = data.adminId;
      } else if (data.deactivatedBy) {
        updateData.deactivatedBy = data.deactivatedBy;
      }
    } else if (data.accountStatus === 'Active' || data.accountStatus === 'Pending') {
      // When activating/pending, we need to use disconnect to clear the foreign key relation
      // Setting to null directly violates the foreign key constraint
      updateData.deactivatedAt = null;
      // Don't modify deactivatedBy - leave it as is for audit trail
      // If you really need to clear it, you would need to handle the FK constraint properly
    }

    const updatedUser = await prisma.user.update({
      where: { id: data.userId },
      data: updateData,
    });

    // Log status change for audit trail with correct from/to statuses
    await this.logStatusChange({
      userId: data.userId,
      fromStatus: previousStatus,
      toStatus: data.accountStatus,
      reason: data.statusReason,
      reasonCode: data.reasonCode,
      changedBy: data.adminId,
      timestamp: new Date(),
    });

    return updatedUser;
  }

  /**
   * Update user status with validation - optimized single-call version
   */
  async updateUserStatusWithValidation(data: UpdateUserStatusInput): Promise<User> {
    // Get current user to validate existence and capture previous status
    const currentUser = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { accountStatus: true }
    });

    if (!currentUser) {
      throw new Error('User not found');
    }

    // Validate status transition
    const validation = this.validateStatusChange(currentUser.accountStatus, data.accountStatus);
    if (!validation.isValid) {
      throw new Error(`Invalid status transition: ${validation.reason}`);
    }

    // Proceed with update
    return this.updateUserStatus(data);
  }

  /**
   * Log status change for audit trail
   */
  private async logStatusChange(logData: {
    userId: string;
    fromStatus: string;
    toStatus: string;
    reason?: string;
    reasonCode?: string;
    changedBy?: string;
    timestamp: Date;
  }): Promise<void> {
    // TODO: Create audit log table and implement logging
    console.log('User status change:', {
      userId: logData.userId,
      statusChange: `${logData.fromStatus} -> ${logData.toStatus}`,
      reason: logData.reason,
      reasonCode: logData.reasonCode,
      changedBy: logData.changedBy,
      timestamp: logData.timestamp.toISOString(),
    });
  }

  /**
   * Get user status history for audit trail
   */
  async getUserStatusHistory(userId: string): Promise<Array<{
    id: string;
    fromStatus: string;
    toStatus: string;
    reason?: string;
    reasonCode?: string;
    changedBy?: string;
    changedAt: Date;
    changedByUser?: {
      person: {
        firstName: string;
        lastName: string;
        primaryEmail: string;
      };
    };
  }>> {
    // TODO: Implement with actual audit log table
    // For now return empty array
    return [];
  }

  /**
   * Validate status change business rules
   */
  validateStatusChange(fromStatus: AccountStatus, toStatus: AccountStatus): {
    isValid: boolean;
    reason?: string;
  } {
    // Define valid status transitions
    const validTransitions: Record<string, string[]> = {
      'Pending': ['Active', 'Suspended', 'Deactivated'],
      'Active': ['Inactive', 'Suspended', 'Deactivated'],
      'Inactive': ['Active', 'Suspended', 'Deactivated'],
      'Suspended': ['Active', 'Deactivated'],
      'Locked': ['Active', 'Deactivated'],
      'Expired': ['Active', 'Deactivated'],
      'Deactivated': [], // Generally cannot reactivate deactivated users
    };

    const allowedTransitions = validTransitions[fromStatus] || [];

    if (!allowedTransitions.includes(toStatus)) {
      return {
        isValid: false,
        reason: `Cannot transition from ${fromStatus} to ${toStatus}`,
      };
    }

    return { isValid: true };
  }

  /**
   * Convert UI security clearance level to Prisma enum format
   */
  private convertSecurityClearanceLevel(level?: string): string | undefined {
    if (!level) return undefined;

    const mapping: Record<string, string> = {
      'NONE': 'None',
      'PUBLIC_TRUST': 'Public_Trust',
      'CONFIDENTIAL': 'Confidential',
      'SECRET': 'Secret',
      'TOP_SECRET': 'Top_Secret',
      'TS_SCI': 'TS_SCI',
    };

    return mapping[level] || level;
  }

  /**
   * Convert date string to ISO DateTime or return undefined/null
   */
  private convertToDateTime(dateString?: string | null): Date | null | undefined {
    if (!dateString) return dateString === null ? null : undefined;

    // If it's already a valid date string (YYYY-MM-DD), convert to full DateTime
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return new Date(`${dateString}T00:00:00.000Z`);
    }

    // Try to parse as Date
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? undefined : date;
  }

  /**
   * Update user security information
   * Note: PIV fields are not yet in the database schema, so they're ignored for now
   */
  async updateUserSecurity(data: UpdateSecurityStatusInput): Promise<Person> {
    // First, find the user to get their personId
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { personId: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Now update the person record using the personId
    return prisma.persons.update({
      where: {
        id: user.personId,
      },
      data: {
        securityClearanceLevel: this.convertSecurityClearanceLevel(data.securityClearanceLevel) as any,
        clearanceExpirationDate: this.convertToDateTime(data.clearanceExpirationDate),
        // PIV fields don't exist in persons table yet - skip them
        // pivStatus: data.pivStatus,
        // pivExpirationDate: this.convertToDateTime(data.pivExpirationDate),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Update user roles
   */
  async updateUserRoles(userId: string, roles: string[], updatedBy: string): Promise<User> {
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
  async inviteUserToTransition(data: TransitionUserInvitationInput): Promise<TransitionUser> {
    // Check if user is already in transition
    const existingTransitionUser = await prisma.transition_users.findFirst({
      where: {
        transitionId: data.transitionId,
        userId: data.userId,
      },
    });

    if (existingTransitionUser) {
      throw new Error('User is already assigned to this transition');
    }

    return prisma.transition_users.create({
      data: {
        id: createId(), // Generate unique ID
        transitionId: data.transitionId,
        userId: data.userId,
        role: data.role,
        securityStatus: 'Pending', // Match Prisma enum format
        platformAccess: data.platformAccess,
        invitedBy: data.invitedBy,
        invitedAt: new Date(),
        accessNotes: data.accessNotes,
        updatedAt: new Date(), // Required field
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
    return prisma.transition_users.update({
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
  async getTransitionUsers(transitionId: string): Promise<any[]> {
    const results = await prisma.transition_users.findMany({
      where: { transitionId },
      include: {
        users_transition_users_userIdTousers: {
          include: {
            person: true,
          },
        },
        transitions: true,
        users_transition_users_invitedByTousers: true,
      },
      orderBy: [
        { role: 'asc' },
        { users_transition_users_userIdTousers: { person: { lastName: 'asc' } } },
      ],
    });

    // Transform Prisma relation names to frontend-expected field names
    return results.map(tu => ({
      ...tu,
      user: tu.users_transition_users_userIdTousers,
      transition: tu.transitions,
      invitedByUser: tu.users_transition_users_invitedByTousers,
      // Remove the Prisma-generated relation names from the response
      users_transition_users_userIdTousers: undefined,
      transitions: undefined,
      users_transition_users_invitedByTousers: undefined,
    }));
  }

  /**
   * Record user login
   */
  async recordUserLogin(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
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
  async recordFailedLogin(username: string): Promise<void> {
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
  async getSecurityDashboard(): Promise<{
    totalUsers: number;
    activeUsers: number;
    pendingInvitations: number;
    expiringSecurity: number;
    pivStatusCounts: Record<string, number>;
    clearanceLevelCounts: Record<string, number>;
    recentActivity: Array<{
      id: string;
      type: string;
      description: string;
      timestamp: string;
      userId?: string;
    }>;
  }> {
    // Simple dashboard using actual schema fields
    const totalUsers = await prisma.user.count();

    return {
      totalUsers,
      activeUsers: totalUsers, // All users are considered active for now
      pendingInvitations: 0, // Renamed from pendingUsers to match frontend
      expiringSecurity: 0, // Renamed from clearanceExpiringUsers to match frontend
      pivStatusCounts: {}, // TODO: Implement PIV status breakdown
      clearanceLevelCounts: {}, // TODO: Implement clearance level breakdown
      recentActivity: [], // Renamed from recentLogins to match frontend
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
      const adminUser = await prisma.user.findUnique({
        where: { id: adminUserId },
        include: { 
          // Note: This would need to be adjusted based on your roles schema
          // For now, we'll assume any ACTIVE user can reset passwords
        }
      });

      if (!adminUser || adminUser.accountStatus !== 'Active') {
        throw new Error('Admin user not found or not active');
      }

      // Find target user
      const targetUser = await prisma.user.findUnique({
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
      await prisma.user.update({
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
      const adminUser = await prisma.user.findUnique({
        where: { id: adminUserId },
        // This would need to include roles/permissions based on your schema
      });

      if (!adminUser || adminUser.accountStatus !== 'Active') {
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
      const user = await prisma.user.findUnique({
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

      await prisma.user.update({
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
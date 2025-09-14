import { PrismaClient, ApprovalStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { EmailService } from './email.service';

const prisma = new PrismaClient();

export interface RegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  organizationName?: string;
  position?: string;
  registrationIP?: string;
  userAgent?: string;
}

export interface RegistrationResult {
  id: string;
  message: string;
  requiresVerification: boolean;
  requiresApproval?: boolean;
  isFirstUser?: boolean;
  isAdmin?: boolean;
}

export class UserRegistrationService {
  private emailService: EmailService;
  private bcryptRounds: number = 12; // bcrypt salt rounds for password hashing

  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * Self-Registration: Create registration request
   */
  async registerUser(data: RegistrationData): Promise<RegistrationResult> {
    try {
      // 1. Validate input data
      this.validateRegistrationData(data);

      // 2. Validate email uniqueness
      const existingUser = await prisma.users.findFirst({
        where: { persons: { primaryEmail: data.email.toLowerCase() } }
      });

      if (existingUser) {
        throw new Error('Email address already registered');
      }

      const existingRequest = await prisma.user_registration_requests.findUnique({
        where: { email: data.email.toLowerCase() }
      });

      if (existingRequest && existingRequest.adminApprovalStatus === 'PENDING') {
        throw new Error('Registration request already pending');
      }

      // 3. Hash password securely
      const passwordHash = await bcrypt.hash(data.password, this.bcryptRounds);

      // 4. Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // 5. Create registration request
      const registrationRequest = await prisma.user_registration_requests.upsert({
        where: { email: data.email.toLowerCase() },
        create: {
          email: data.email.toLowerCase(),
          firstName: data.firstName,
          lastName: data.lastName,
          organizationName: data.organizationName,
          position: data.position,
          passwordHash,
          verificationToken,
          verificationTokenExpiry,
          registrationIP: data.registrationIP,
          userAgent: data.userAgent,
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
        },
        update: {
          firstName: data.firstName,
          lastName: data.lastName,
          organizationName: data.organizationName,
          position: data.position,
          passwordHash,
          verificationToken,
          verificationTokenExpiry,
          adminApprovalStatus: 'PENDING',
          isEmailVerified: false,
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
          updatedAt: new Date(),
        }
      });

      // 6. Send verification email
      await this.emailService.sendVerificationEmail(
        data.email,
        verificationToken,
        data.firstName
      );

      return {
        id: registrationRequest.id,
        message: 'Registration request created. Please check your email for verification.',
        requiresVerification: true
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw error instanceof Error ? error : new Error('Registration failed');
    }
  }

  /**
   * Email Verification: Verify email and check for first user
   */
  async verifyEmail(token: string): Promise<RegistrationResult> {
    try {
      const request = await prisma.user_registration_requests.findFirst({
        where: {
          verificationToken: token,
          verificationTokenExpiry: { gt: new Date() },
          isEmailVerified: false
        }
      });

      if (!request) {
        throw new Error('Invalid or expired verification token');
      }

      // Check if this would be the first user
      const userCount = await prisma.users.count();
      const isFirstUser = userCount === 0;

      // Mark email as verified
      await prisma.user_registration_requests.update({
        where: { id: request.id },
        data: {
          isEmailVerified: true,
          verificationToken: null,
          verificationTokenExpiry: null,
          updatedAt: new Date()
        }
      });

      if (isFirstUser) {
        // Auto-approve first user as admin
        return await this.handleFirstUserRegistration(request.id);
      } else {
        // Notify admins for approval
        await this.notifyAdminsForApproval(request);

        return {
          id: request.id,
          message: 'Email verified successfully. Your registration is pending admin approval.',
          requiresVerification: false,
          requiresApproval: true,
          isFirstUser: false
        };
      }
    } catch (error) {
      console.error('Email verification error:', error);
      throw error instanceof Error ? error : new Error('Email verification failed');
    }
  }

  /**
   * Admin Approval: Approve registration request
   */
  async approveRegistration(requestId: string, adminId: string, roles: string[] = ['user']): Promise<RegistrationResult> {
    try {
      const request = await prisma.user_registration_requests.findUnique({
        where: { id: requestId }
      });

      if (!request) {
        throw new Error('Registration request not found');
      }

      if (!request.isEmailVerified) {
        throw new Error('Email must be verified before approval');
      }

      if (request.adminApprovalStatus !== 'PENDING') {
        throw new Error('Registration request is not in pending status');
      }

      // Create user account in transaction
      const result = await prisma.$transaction(async (tx) => {
        // 1. Create person record
        const person = await tx.persons.create({
          data: {
            firstName: request.firstName,
            lastName: request.lastName,
            primaryEmail: request.email,
            organizationName: request.organizationName,
            position: request.position,
          }
        });

        // 2. Create user record
        const user = await tx.users.create({
          data: {
            username: request.email,
            personId: person.id,
            passwordHash: request.passwordHash,
            accountStatus: 'ACTIVE',
            registrationRequestId: request.id,
            accountApprovalStatus: 'APPROVED',
            emailVerifiedAt: new Date(),
            keycloakId: crypto.randomUUID(), // Generate placeholder keycloak ID
          }
        });

        // 3. Assign roles
        await this.assignRolesToUser(tx, user.id, roles);

        // 4. Update registration request
        await tx.user_registration_requests.update({
          where: { id: requestId },
          data: {
            adminApprovalStatus: 'APPROVED',
            approvedBy: adminId,
            approvedAt: new Date(),
            updatedAt: new Date()
          }
        });

        return { user, person };
      });

      // 5. Send welcome email
      await this.emailService.sendWelcomeEmail(request.email, roles.includes('admin'));

      return {
        id: result.user.id,
        message: 'Registration approved successfully',
        requiresVerification: false,
        requiresApproval: false
      };
    } catch (error) {
      console.error('Registration approval error:', error);
      throw error instanceof Error ? error : new Error('Registration approval failed');
    }
  }

  /**
   * Admin Rejection: Reject registration request
   */
  async rejectRegistration(requestId: string, adminId: string, reason: string): Promise<RegistrationResult> {
    try {
      const request = await prisma.user_registration_requests.findUnique({
        where: { id: requestId }
      });

      if (!request) {
        throw new Error('Registration request not found');
      }

      await prisma.user_registration_requests.update({
        where: { id: requestId },
        data: {
          adminApprovalStatus: 'REJECTED',
          approvedBy: adminId,
          approvedAt: new Date(),
          rejectedReason: reason,
          updatedAt: new Date()
        }
      });

      // Send rejection email
      await this.emailService.sendRejectionEmail(request.email, reason);

      return {
        id: request.id,
        message: 'Registration rejected successfully',
        requiresVerification: false,
        requiresApproval: false
      };
    } catch (error) {
      console.error('Registration rejection error:', error);
      throw error instanceof Error ? error : new Error('Registration rejection failed');
    }
  }

  /**
   * Get registration status for a specific email
   */
  async getRegistrationStatus(email: string): Promise<{
    id?: string;
    status: ApprovalStatus;
    emailVerified: boolean;
    createdAt?: Date;
    expiresAt?: Date;
    firstName?: string;
  } | null> {
    try {
      const request = await prisma.user_registration_requests.findUnique({
        where: { email: email.toLowerCase() },
        select: {
          id: true,
          adminApprovalStatus: true,
          isEmailVerified: true,
          createdAt: true,
          expiresAt: true,
          firstName: true
        }
      });

      if (!request) {
        return null;
      }

      return {
        id: request.id,
        status: request.adminApprovalStatus,
        emailVerified: request.isEmailVerified,
        createdAt: request.createdAt,
        expiresAt: request.expiresAt,
        firstName: request.firstName
      };
    } catch (error) {
      console.error('Error getting registration status:', error);
      throw new Error('Failed to get registration status');
    }
  }

  /**
   * Get pending registration requests (admin only)
   */
  async getPendingRegistrations(): Promise<any[]> {
    try {
      return await prisma.user_registration_requests.findMany({
        where: {
          adminApprovalStatus: 'PENDING',
          isEmailVerified: true,
          expiresAt: { gt: new Date() }
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          organizationName: true,
          position: true,
          createdAt: true,
          registrationIP: true
        }
      });
    } catch (error) {
      console.error('Error getting pending registrations:', error);
      throw new Error('Failed to get pending registrations');
    }
  }

  /**
   * First User Admin Logic: Auto-approve first registration
   */
  private async handleFirstUserRegistration(requestId: string): Promise<RegistrationResult> {
    try {
      const adminRoles = ['admin', 'program_manager', 'user'];
      const result = await this.approveRegistration(requestId, 'system', adminRoles);

      return {
        id: result.id,
        message: 'Email verified and account created. You are now the platform administrator.',
        requiresVerification: false,
        requiresApproval: false,
        isFirstUser: true,
        isAdmin: true
      };
    } catch (error) {
      console.error('First user registration error:', error);
      throw new Error('Failed to process first user registration');
    }
  }

  /**
   * Notify admins of pending approval
   */
  private async notifyAdminsForApproval(request: any): Promise<void> {
    try {
      // Find active admin users
      const admins = await prisma.users.findMany({
        where: {
          user_roles_user_roles_userIdTousers: {
            some: {
              roles: { name: 'admin' },
              isActive: true
            }
          },
          accountStatus: 'ACTIVE'
        },
        include: { persons: true }
      });

      const adminEmails = admins
        .map(admin => admin.persons?.primaryEmail)
        .filter(Boolean) as string[];

      if (adminEmails.length > 0) {
        await this.emailService.sendAdminNotification(adminEmails, request);
        console.log(`Admin notification sent to ${adminEmails.length} administrators`);
      } else {
        console.warn('No active administrators found to notify');
      }
    } catch (error) {
      console.error('Error notifying admins:', error);
      // Don't throw here - user registration should succeed even if admin notification fails
    }
  }

  /**
   * Assign roles to user
   */
  private async assignRolesToUser(tx: any, userId: string, roleNames: string[]): Promise<void> {
    try {
      for (const roleName of roleNames) {
        // Find or create role
        let role = await tx.roles.findFirst({
          where: { name: roleName }
        });

        if (!role) {
          // Create role if it doesn't exist
          role = await tx.roles.create({
            data: {
              id: crypto.randomUUID(),
              name: roleName,
              description: `${roleName.charAt(0).toUpperCase() + roleName.slice(1)} role`,
              permissions: [],
              isActive: true
            }
          });
        }

        // Assign role to user
        await tx.user_roles.create({
          data: {
            id: crypto.randomUUID(),
            userId,
            roleId: role.id,
            assignedBy: userId, // Self-assigned during registration
            isActive: true
          }
        });
      }
    } catch (error) {
      console.error('Error assigning roles to user:', error);
      throw new Error('Failed to assign roles to user');
    }
  }

  /**
   * Validate registration data
   */
  private validateRegistrationData(data: RegistrationData): void {
    const errors: string[] = [];

    // Required fields
    if (!data.firstName?.trim()) errors.push('First name is required');
    if (!data.lastName?.trim()) errors.push('Last name is required');
    if (!data.email?.trim()) errors.push('Email is required');
    if (!data.password) errors.push('Password is required');

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (data.email && !emailRegex.test(data.email)) {
      errors.push('Please enter a valid email address');
    }

    // Password strength validation
    if (data.password) {
      if (data.password.length < 8) {
        errors.push('Password must be at least 8 characters long');
      }
      if (data.password.length > 128) {
        errors.push('Password must be less than 128 characters long');
      }

      // Check for basic complexity
      const hasLowercase = /[a-z]/.test(data.password);
      const hasUppercase = /[A-Z]/.test(data.password);
      const hasNumbers = /\d/.test(data.password);
      const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(data.password);

      const complexityCount = [hasLowercase, hasUppercase, hasNumbers, hasSpecialChars].filter(Boolean).length;

      if (complexityCount < 3) {
        errors.push('Password must contain at least 3 of: lowercase, uppercase, numbers, special characters');
      }

      // Check for common weak passwords
      const weakPasswords = [
        'password', 'admin', '123456', 'password123', 'admin123',
        'qwerty', 'letmein', 'welcome', 'monkey', 'dragon'
      ];

      if (weakPasswords.includes(data.password.toLowerCase())) {
        errors.push('Password is too common. Please choose a stronger password');
      }
    }

    // String length validations
    if (data.firstName && data.firstName.length > 100) {
      errors.push('First name must be less than 100 characters');
    }
    if (data.lastName && data.lastName.length > 100) {
      errors.push('Last name must be less than 100 characters');
    }
    if (data.email && data.email.length > 255) {
      errors.push('Email must be less than 255 characters');
    }
    if (data.organizationName && data.organizationName.length > 255) {
      errors.push('Organization name must be less than 255 characters');
    }
    if (data.position && data.position.length > 255) {
      errors.push('Position must be less than 255 characters');
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Resend verification email for pending registration
   */
  async resendVerificationEmail(email: string): Promise<RegistrationResult> {
    try {
      const request = await prisma.user_registration_requests.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (!request) {
        throw new Error('No registration request found for this email');
      }

      if (request.isEmailVerified) {
        throw new Error('Email address has already been verified');
      }

      if (request.adminApprovalStatus !== 'PENDING') {
        throw new Error('Registration request is not in pending status');
      }

      // Check if request has expired
      if (request.expiresAt && request.expiresAt < new Date()) {
        throw new Error('Registration request has expired. Please register again');
      }

      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Update registration request with new token
      await prisma.user_registration_requests.update({
        where: { id: request.id },
        data: {
          verificationToken,
          verificationTokenExpiry,
          updatedAt: new Date()
        }
      });

      // Send new verification email
      await this.emailService.sendVerificationEmail(
        request.email,
        verificationToken,
        request.firstName
      );

      return {
        id: request.id,
        message: 'New verification email sent successfully',
        requiresVerification: true
      };
    } catch (error) {
      console.error('Resend verification email error:', error);
      throw error instanceof Error ? error : new Error('Failed to resend verification email');
    }
  }

  /**
   * Clean up expired registration requests
   */
  async cleanupExpiredRequests(): Promise<number> {
    try {
      const result = await prisma.user_registration_requests.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            {
              adminApprovalStatus: 'PENDING',
              createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // 7 days old
            }
          ]
        }
      });

      console.log(`Cleaned up ${result.count} expired registration requests`);
      return result.count;
    } catch (error) {
      console.error('Error cleaning up expired requests:', error);
      return 0;
    }
  }
}
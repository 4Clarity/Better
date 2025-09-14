import { UserRegistrationService } from '../user-registration.service';
import { EmailService } from '../email.service';
import { PrismaClient } from '@prisma/client';

// Mock EmailService
jest.mock('../email.service');

// Mock PrismaClient
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    users: {
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn()
    },
    user_registration_requests: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn()
    },
    persons: {
      create: jest.fn()
    },
    roles: {
      findFirst: jest.fn(),
      create: jest.fn()
    },
    user_roles: {
      create: jest.fn()
    },
    $transaction: jest.fn()
  }))
}));

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password')
}));

// Mock crypto
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({
    toString: jest.fn(() => 'mock-token')
  })),
  randomUUID: jest.fn(() => 'mock-uuid')
}));

describe('UserRegistrationService', () => {
  let userRegistrationService: UserRegistrationService;
  let mockPrisma: any;
  let mockEmailService: jest.Mocked<EmailService>;

  beforeEach(() => {
    userRegistrationService = new UserRegistrationService();
    mockPrisma = new PrismaClient();
    mockEmailService = new EmailService() as jest.Mocked<EmailService>;

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    const validRegistrationData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'StrongPassword123!',
      organizationName: 'Test Org',
      position: 'Developer'
    };

    it('should register a new user successfully', async () => {
      // Mock database responses
      mockPrisma.users.findFirst.mockResolvedValue(null);
      mockPrisma.user_registration_requests.findUnique.mockResolvedValue(null);
      mockPrisma.user_registration_requests.upsert.mockResolvedValue({
        id: 'test-id',
        ...validRegistrationData
      });

      mockEmailService.sendVerificationEmail.mockResolvedValue();

      const result = await userRegistrationService.registerUser(validRegistrationData);

      expect(result).toEqual({
        id: 'test-id',
        message: 'Registration request created. Please check your email for verification.',
        requiresVerification: true
      });

      expect(mockPrisma.users.findFirst).toHaveBeenCalledWith({
        where: { persons: { primaryEmail: validRegistrationData.email.toLowerCase() } }
      });
    });

    it('should throw error if email already exists', async () => {
      mockPrisma.users.findFirst.mockResolvedValue({ id: 'existing-user' });

      await expect(
        userRegistrationService.registerUser(validRegistrationData)
      ).rejects.toThrow('Email address already registered');
    });

    it('should throw error if registration already pending', async () => {
      mockPrisma.users.findFirst.mockResolvedValue(null);
      mockPrisma.user_registration_requests.findUnique.mockResolvedValue({
        adminApprovalStatus: 'PENDING'
      });

      await expect(
        userRegistrationService.registerUser(validRegistrationData)
      ).rejects.toThrow('Registration request already pending');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        ...validRegistrationData,
        firstName: '',
        email: 'invalid-email'
      };

      await expect(
        userRegistrationService.registerUser(invalidData)
      ).rejects.toThrow('Validation failed');
    });

    it('should validate password strength', async () => {
      const weakPasswordData = {
        ...validRegistrationData,
        password: 'weak'
      };

      await expect(
        userRegistrationService.registerUser(weakPasswordData)
      ).rejects.toThrow('Password must be at least 8 characters');
    });
  });

  describe('verifyEmail', () => {
    it('should verify email for first user and auto-approve as admin', async () => {
      const mockRequest = {
        id: 'request-id',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        passwordHash: 'hashed-password'
      };

      mockPrisma.user_registration_requests.findFirst.mockResolvedValue(mockRequest);
      mockPrisma.users.count.mockResolvedValue(0); // First user
      mockPrisma.user_registration_requests.update.mockResolvedValue(mockRequest);

      // Mock the approval process
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback({
          persons: { create: jest.fn().mockResolvedValue({ id: 'person-id' }) },
          users: { create: jest.fn().mockResolvedValue({ id: 'user-id' }) },
          roles: { findFirst: jest.fn().mockResolvedValue({ id: 'role-id' }) },
          user_roles: { create: jest.fn().mockResolvedValue({}) },
          user_registration_requests: { update: jest.fn().mockResolvedValue({}) }
        });
      });

      mockEmailService.sendWelcomeEmail.mockResolvedValue();

      const result = await userRegistrationService.verifyEmail('valid-token');

      expect(result.isFirstUser).toBe(true);
      expect(result.isAdmin).toBe(true);
      expect(result.requiresApproval).toBe(false);
    });

    it('should verify email for non-first user and require approval', async () => {
      const mockRequest = {
        id: 'request-id',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      };

      mockPrisma.user_registration_requests.findFirst.mockResolvedValue(mockRequest);
      mockPrisma.users.count.mockResolvedValue(1); // Not first user
      mockPrisma.user_registration_requests.update.mockResolvedValue(mockRequest);
      mockPrisma.users.findMany.mockResolvedValue([]); // No admins to notify

      const result = await userRegistrationService.verifyEmail('valid-token');

      expect(result.isFirstUser).toBe(false);
      expect(result.requiresApproval).toBe(true);
    });

    it('should throw error for invalid token', async () => {
      mockPrisma.user_registration_requests.findFirst.mockResolvedValue(null);

      await expect(
        userRegistrationService.verifyEmail('invalid-token')
      ).rejects.toThrow('Invalid or expired verification token');
    });
  });

  describe('approveRegistration', () => {
    it('should approve registration successfully', async () => {
      const mockRequest = {
        id: 'request-id',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        passwordHash: 'hashed-password',
        isEmailVerified: true,
        adminApprovalStatus: 'PENDING'
      };

      mockPrisma.user_registration_requests.findUnique.mockResolvedValue(mockRequest);
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback({
          persons: { create: jest.fn().mockResolvedValue({ id: 'person-id' }) },
          users: { create: jest.fn().mockResolvedValue({ id: 'user-id' }) },
          roles: { findFirst: jest.fn().mockResolvedValue({ id: 'role-id' }) },
          user_roles: { create: jest.fn().mockResolvedValue({}) },
          user_registration_requests: { update: jest.fn().mockResolvedValue({}) }
        });
      });

      mockEmailService.sendWelcomeEmail.mockResolvedValue();

      const result = await userRegistrationService.approveRegistration('request-id', 'admin-id');

      expect(result.message).toBe('Registration approved successfully');
      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith(mockRequest.email, false);
    });

    it('should throw error if email not verified', async () => {
      const mockRequest = {
        id: 'request-id',
        isEmailVerified: false,
        adminApprovalStatus: 'PENDING'
      };

      mockPrisma.user_registration_requests.findUnique.mockResolvedValue(mockRequest);

      await expect(
        userRegistrationService.approveRegistration('request-id', 'admin-id')
      ).rejects.toThrow('Email must be verified before approval');
    });
  });

  describe('rejectRegistration', () => {
    it('should reject registration successfully', async () => {
      const mockRequest = {
        id: 'request-id',
        email: 'john@example.com'
      };

      mockPrisma.user_registration_requests.findUnique.mockResolvedValue(mockRequest);
      mockPrisma.user_registration_requests.update.mockResolvedValue(mockRequest);
      mockEmailService.sendRejectionEmail.mockResolvedValue();

      const result = await userRegistrationService.rejectRegistration(
        'request-id',
        'admin-id',
        'Insufficient qualifications'
      );

      expect(result.message).toBe('Registration rejected successfully');
      expect(mockEmailService.sendRejectionEmail).toHaveBeenCalledWith(
        mockRequest.email,
        'Insufficient qualifications'
      );
    });
  });

  describe('getPendingRegistrations', () => {
    it('should return pending registration requests', async () => {
      const mockRequests = [
        {
          id: 'request-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com'
        }
      ];

      mockPrisma.user_registration_requests.findMany.mockResolvedValue(mockRequests);

      const result = await userRegistrationService.getPendingRegistrations();

      expect(result).toEqual(mockRequests);
      expect(mockPrisma.user_registration_requests.findMany).toHaveBeenCalledWith({
        where: {
          adminApprovalStatus: 'PENDING',
          isEmailVerified: true,
          expiresAt: { gt: expect.any(Date) }
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
    });
  });

  describe('getRegistrationStatus', () => {
    it('should return registration status', async () => {
      const mockRequest = {
        id: 'request-id',
        adminApprovalStatus: 'PENDING',
        isEmailVerified: true,
        createdAt: new Date(),
        expiresAt: new Date(),
        firstName: 'John'
      };

      mockPrisma.user_registration_requests.findUnique.mockResolvedValue(mockRequest);

      const result = await userRegistrationService.getRegistrationStatus('john@example.com');

      expect(result).toEqual({
        id: mockRequest.id,
        status: mockRequest.adminApprovalStatus,
        emailVerified: mockRequest.isEmailVerified,
        createdAt: mockRequest.createdAt,
        expiresAt: mockRequest.expiresAt,
        firstName: mockRequest.firstName
      });
    });

    it('should return null for non-existent request', async () => {
      mockPrisma.user_registration_requests.findUnique.mockResolvedValue(null);

      const result = await userRegistrationService.getRegistrationStatus('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('cleanupExpiredRequests', () => {
    it('should clean up expired requests', async () => {
      mockPrisma.user_registration_requests.deleteMany.mockResolvedValue({ count: 5 });

      const result = await userRegistrationService.cleanupExpiredRequests();

      expect(result).toBe(5);
      expect(mockPrisma.user_registration_requests.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { expiresAt: { lt: expect.any(Date) } },
            {
              adminApprovalStatus: 'PENDING',
              createdAt: { lt: expect.any(Date) }
            }
          ]
        }
      });
    });
  });
});
import { UserManagementService } from '../user-management.service';
import { AccountStatus } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  })),
}));

describe('UserManagementService - Enhanced Status Management', () => {
  let service: UserManagementService;
  let mockPrisma: any;

  beforeEach(() => {
    service = new UserManagementService();
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('validateStatusChange', () => {
    it('should allow valid transitions from ACTIVE', () => {
      const validTransitions = ['INACTIVE', 'SUSPENDED', 'DEACTIVATED'];

      validTransitions.forEach(toStatus => {
        const result = service.validateStatusChange('ACTIVE' as AccountStatus, toStatus as AccountStatus);
        expect(result.isValid).toBe(true);
      });
    });

    it('should allow valid transitions from PENDING', () => {
      const validTransitions = ['ACTIVE', 'SUSPENDED', 'DEACTIVATED'];

      validTransitions.forEach(toStatus => {
        const result = service.validateStatusChange('PENDING' as AccountStatus, toStatus as AccountStatus);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid transitions from DEACTIVATED', () => {
      const invalidTransitions = ['ACTIVE', 'SUSPENDED', 'INACTIVE'];

      invalidTransitions.forEach(toStatus => {
        const result = service.validateStatusChange('DEACTIVATED' as AccountStatus, toStatus as AccountStatus);
        expect(result.isValid).toBe(false);
        expect(result.reason).toContain('Cannot transition from DEACTIVATED');
      });
    });

    it('should reject invalid transitions from SUSPENDED', () => {
      const result = service.validateStatusChange('SUSPENDED' as AccountStatus, 'INACTIVE' as AccountStatus);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Cannot transition from SUSPENDED to INACTIVE');
    });

    it('should handle unknown status gracefully', () => {
      const result = service.validateStatusChange('UNKNOWN' as AccountStatus, 'ACTIVE' as AccountStatus);
      expect(result.isValid).toBe(false);
    });
  });

  describe('updateUserStatus', () => {
    beforeEach(() => {
      // Setup common mocks
      const mockUser = {
        id: 'user-1',
        accountStatus: 'ACTIVE',
      };

      // Mock the initial findUnique call
      jest.spyOn(service as any, 'prisma', 'get').mockReturnValue({
        user: {
          findUnique: jest.fn().mockResolvedValue(mockUser),
          update: jest.fn().mockResolvedValue({
            ...mockUser,
            accountStatus: 'SUSPENDED',
            statusReason: 'Security violation',
            updatedAt: new Date(),
          }),
        },
      });

      // Mock the logStatusChange method
      jest.spyOn(service as any, 'logStatusChange').mockResolvedValue(undefined);
    });

    it('should update user status with audit trail', async () => {
      const updateData = {
        userId: 'user-1',
        accountStatus: 'SUSPENDED' as AccountStatus,
        statusReason: 'Security violation',
        reasonCode: 'security_violation',
        adminId: 'admin-1',
      };

      const result = await service.updateUserStatus(updateData);

      expect(result.accountStatus).toBe('SUSPENDED');
      expect(result.statusReason).toBe('Security violation');
    });

    it('should set deactivation fields for DEACTIVATED status', async () => {
      const updateData = {
        userId: 'user-1',
        accountStatus: 'DEACTIVATED' as AccountStatus,
        statusReason: 'Employee terminated',
        adminId: 'admin-1',
      };

      await service.updateUserStatus(updateData);

      // Verify the update call included deactivation fields
      const mockPrisma = (service as any).prisma;
      const updateCall = mockPrisma.user.update.mock.calls[0][0];

      expect(updateCall.data.deactivatedAt).toBeInstanceOf(Date);
      expect(updateCall.data.deactivatedBy).toBe('admin-1');
    });

    it('should clear deactivation fields for ACTIVE status', async () => {
      const updateData = {
        userId: 'user-1',
        accountStatus: 'ACTIVE' as AccountStatus,
        statusReason: 'Investigation cleared',
        adminId: 'admin-1',
      };

      await service.updateUserStatus(updateData);

      // Verify the update call cleared deactivation fields
      const mockPrisma = (service as any).prisma;
      const updateCall = mockPrisma.user.update.mock.calls[0][0];

      expect(updateCall.data.deactivatedAt).toBe(null);
      expect(updateCall.data.deactivatedBy).toBe(null);
    });

    it('should throw error for non-existent user', async () => {
      // Mock user not found
      jest.spyOn(service as any, 'prisma', 'get').mockReturnValue({
        user: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      });

      const updateData = {
        userId: 'non-existent',
        accountStatus: 'SUSPENDED' as AccountStatus,
        statusReason: 'Test',
        adminId: 'admin-1',
      };

      await expect(service.updateUserStatus(updateData))
        .rejects.toThrow('User not found');
    });
  });

  describe('updateUserStatusWithValidation', () => {
    it('should validate and update status in single operation', async () => {
      const mockUser = {
        id: 'user-1',
        accountStatus: 'ACTIVE',
      };

      // Mock prisma calls
      jest.spyOn(service as any, 'prisma', 'get').mockReturnValue({
        user: {
          findUnique: jest.fn().mockResolvedValue(mockUser),
          update: jest.fn().mockResolvedValue({
            ...mockUser,
            accountStatus: 'SUSPENDED',
          }),
        },
      });

      jest.spyOn(service as any, 'logStatusChange').mockResolvedValue(undefined);

      const updateData = {
        userId: 'user-1',
        accountStatus: 'SUSPENDED' as AccountStatus,
        statusReason: 'Security violation',
        adminId: 'admin-1',
      };

      const result = await service.updateUserStatusWithValidation(updateData);
      expect(result.accountStatus).toBe('SUSPENDED');
    });

    it('should reject invalid status transitions', async () => {
      const mockUser = {
        id: 'user-1',
        accountStatus: 'DEACTIVATED',
      };

      jest.spyOn(service as any, 'prisma', 'get').mockReturnValue({
        user: {
          findUnique: jest.fn().mockResolvedValue(mockUser),
        },
      });

      const updateData = {
        userId: 'user-1',
        accountStatus: 'ACTIVE' as AccountStatus,
        statusReason: 'Try to reactivate',
        adminId: 'admin-1',
      };

      await expect(service.updateUserStatusWithValidation(updateData))
        .rejects.toThrow('Invalid status transition');
    });
  });

  describe('getUserStatusHistory', () => {
    it('should return empty array (placeholder implementation)', async () => {
      const history = await service.getUserStatusHistory('user-1');
      expect(Array.isArray(history)).toBe(true);
      expect(history).toHaveLength(0);
    });
  });
});
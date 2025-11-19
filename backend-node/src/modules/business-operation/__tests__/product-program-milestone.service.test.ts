import {
  createMilestone,
  getMilestoneById,
  getMilestonesByProductProgram,
  updateMilestone,
  deleteMilestone,
  markMilestoneAchieved,
  canModifyMilestone,
  createMilestoneSchema,
  updateMilestoneSchema,
} from '../product-program-milestone.service';
import { PrismaClient } from '@prisma/client';

// Mock Prisma Client
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    product_programs: {
      findUnique: jest.fn(),
    },
    product_program_milestones: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

const prisma = new PrismaClient();

describe('ProductProgramMilestoneService', () => {
  const mockUserId = 'test-user-id';
  const mockProductProgramId = 'test-product-program-id';
  const mockMilestoneId = 'test-milestone-id';

  const mockUser = {
    id: mockUserId,
    person: {
      firstName: 'Test',
      lastName: 'User',
      primaryEmail: 'test@example.com',
    },
  };

  const mockProductProgram = {
    id: mockProductProgramId,
    name: 'Test Product/Program',
  };

  const mockMilestone = {
    id: mockMilestoneId,
    product_program_id: mockProductProgramId,
    title: 'Test Milestone',
    description: 'Test description',
    target_date: new Date('2025-12-31'),
    status: 'UPCOMING',
    achieved_at: null,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
    created_by: mockUserId,
    updated_by: mockUserId,
    users_product_program_milestones_created_byTousers: mockUser,
    users_product_program_milestones_updated_byTousers: mockUser,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Validation Schemas', () => {
    describe('createMilestoneSchema', () => {
      it('should validate correct milestone data', () => {
        const validData = {
          title: 'Test Milestone',
          description: 'Test description',
          targetDate: '2025-12-31',
          status: 'UPCOMING',
        };

        const result = createMilestoneSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should validate milestone data with minimal fields', () => {
        const validData = {
          title: 'Test Milestone',
          targetDate: '2025-12-31',
        };

        const result = createMilestoneSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should reject milestone with missing title', () => {
        const invalidData = {
          targetDate: '2025-12-31',
        };

        const result = createMilestoneSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it('should reject milestone with missing targetDate', () => {
        const invalidData = {
          title: 'Test Milestone',
        };

        const result = createMilestoneSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it('should reject milestone with empty title', () => {
        const invalidData = {
          title: '',
          targetDate: '2025-12-31',
        };

        const result = createMilestoneSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it('should reject title exceeding 200 characters', () => {
        const invalidData = {
          title: 'A'.repeat(201),
          targetDate: '2025-12-31',
        };

        const result = createMilestoneSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it('should reject invalid status', () => {
        const invalidData = {
          title: 'Test Milestone',
          targetDate: '2025-12-31',
          status: 'INVALID_STATUS',
        };

        const result = createMilestoneSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });
    });

    describe('updateMilestoneSchema', () => {
      it('should validate partial updates', () => {
        const validData = {
          title: 'Updated Milestone',
        };

        const result = updateMilestoneSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should allow empty update object', () => {
        const result = updateMilestoneSchema.safeParse({});
        expect(result.success).toBe(true);
      });
    });
  });

  describe('createMilestone', () => {
    const createData = {
      title: 'Test Milestone',
      description: 'Test description',
      targetDate: '2025-12-31',
      status: 'UPCOMING' as const,
    };

    it('should create a milestone successfully', async () => {
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
      (prisma.product_program_milestones.create as jest.Mock).mockResolvedValue(mockMilestone);

      const result = await createMilestone(mockProductProgramId, createData, mockUserId);

      expect(prisma.product_programs.findUnique).toHaveBeenCalledWith({
        where: { id: mockProductProgramId },
        select: { id: true, name: true },
      });
      expect(prisma.product_program_milestones.create).toHaveBeenCalled();
      expect(result.id).toBe(mockMilestoneId);
      expect(result.title).toBe('Test Milestone');
    });

    it('should create milestone without optional fields', async () => {
      const minimalData = {
        title: 'Minimal Milestone',
        targetDate: '2025-12-31',
      };
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
      (prisma.product_program_milestones.create as jest.Mock).mockResolvedValue({
        ...mockMilestone,
        description: null,
      });

      const result = await createMilestone(mockProductProgramId, minimalData, mockUserId);

      expect(result.description).toBeNull();
    });

    it('should throw error if product/program not found', async () => {
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(createMilestone(mockProductProgramId, createData, mockUserId)).rejects.toThrow(
        'Product/Program not found'
      );
    });

    it('should throw error for invalid target date format', async () => {
      const invalidData = { ...createData, targetDate: 'invalid-date' };
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);

      await expect(
        createMilestone(mockProductProgramId, invalidData, mockUserId)
      ).rejects.toThrow('Invalid target date format');
    });

    it('should handle database errors', async () => {
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
      (prisma.product_program_milestones.create as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await expect(createMilestone(mockProductProgramId, createData, mockUserId)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('getMilestoneById', () => {
    it('should fetch a milestone by ID successfully', async () => {
      (prisma.product_program_milestones.findUnique as jest.Mock).mockResolvedValue(mockMilestone);

      const result = await getMilestoneById(mockMilestoneId);

      expect(prisma.product_program_milestones.findUnique).toHaveBeenCalledWith({
        where: { id: mockMilestoneId },
        include: expect.any(Object),
      });
      expect(result.id).toBe(mockMilestoneId);
      expect(result.title).toBe('Test Milestone');
    });

    it('should throw error if milestone not found', async () => {
      (prisma.product_program_milestones.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getMilestoneById('invalid-id')).rejects.toThrow('Milestone not found');
    });
  });

  describe('getMilestonesByProductProgram', () => {
    const mockMilestones = [mockMilestone];

    it('should fetch all milestones for a product/program successfully', async () => {
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
      (prisma.product_program_milestones.findMany as jest.Mock).mockResolvedValue(mockMilestones);

      const result = await getMilestonesByProductProgram(mockProductProgramId);

      expect(prisma.product_programs.findUnique).toHaveBeenCalledWith({
        where: { id: mockProductProgramId },
        select: { id: true },
      });
      expect(prisma.product_program_milestones.findMany).toHaveBeenCalledWith({
        where: { product_program_id: mockProductProgramId },
        include: expect.any(Object),
        orderBy: [{ target_date: 'asc' }, { status: 'asc' }],
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockMilestoneId);
    });

    it('should return empty array if no milestones found', async () => {
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
      (prisma.product_program_milestones.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getMilestonesByProductProgram(mockProductProgramId);

      expect(result).toEqual([]);
    });

    it('should throw error if product/program not found', async () => {
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getMilestonesByProductProgram(mockProductProgramId)).rejects.toThrow(
        'Product/Program not found'
      );
    });

    it('should handle database errors', async () => {
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
      (prisma.product_program_milestones.findMany as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await expect(getMilestonesByProductProgram(mockProductProgramId)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('updateMilestone', () => {
    const updateData = {
      title: 'Updated Milestone',
      description: 'Updated description',
      status: 'IN_PROGRESS' as const,
    };

    it('should update a milestone successfully', async () => {
      (prisma.product_program_milestones.findUnique as jest.Mock).mockResolvedValue(mockMilestone);
      (prisma.product_program_milestones.update as jest.Mock).mockResolvedValue({
        ...mockMilestone,
        ...updateData,
      });

      const result = await updateMilestone(mockMilestoneId, updateData, mockUserId);

      expect(prisma.product_program_milestones.findUnique).toHaveBeenCalled();
      expect(prisma.product_program_milestones.update).toHaveBeenCalledWith({
        where: { id: mockMilestoneId },
        data: expect.objectContaining({
          title: 'Updated Milestone',
          description: 'Updated description',
          status: 'IN_PROGRESS',
          updated_by: mockUserId,
        }),
        include: expect.any(Object),
      });
      expect(result.title).toBe('Updated Milestone');
    });

    it('should update milestone with new target date', async () => {
      const newTargetDate = '2026-06-30';
      const dataWithDate = { ...updateData, targetDate: newTargetDate };
      (prisma.product_program_milestones.findUnique as jest.Mock).mockResolvedValue(mockMilestone);
      (prisma.product_program_milestones.update as jest.Mock).mockResolvedValue({
        ...mockMilestone,
        target_date: new Date(newTargetDate),
      });

      const result = await updateMilestone(mockMilestoneId, dataWithDate, mockUserId);

      expect(prisma.product_program_milestones.update).toHaveBeenCalledWith({
        where: { id: mockMilestoneId },
        data: expect.objectContaining({
          target_date: new Date(newTargetDate),
        }),
        include: expect.any(Object),
      });
    });

    it('should throw error if milestone not found', async () => {
      (prisma.product_program_milestones.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(updateMilestone('invalid-id', updateData, mockUserId)).rejects.toThrow(
        'Milestone not found'
      );
    });

    it('should throw error for invalid target date format', async () => {
      const invalidData = { targetDate: 'invalid-date' };
      (prisma.product_program_milestones.findUnique as jest.Mock).mockResolvedValue(mockMilestone);

      await expect(updateMilestone(mockMilestoneId, invalidData, mockUserId)).rejects.toThrow(
        'Invalid target date format'
      );
    });

    it('should handle database errors', async () => {
      (prisma.product_program_milestones.findUnique as jest.Mock).mockResolvedValue(mockMilestone);
      (prisma.product_program_milestones.update as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await expect(updateMilestone(mockMilestoneId, updateData, mockUserId)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('deleteMilestone', () => {
    it('should delete a milestone successfully', async () => {
      (prisma.product_program_milestones.findUnique as jest.Mock).mockResolvedValue(mockMilestone);
      (prisma.product_program_milestones.delete as jest.Mock).mockResolvedValue(mockMilestone);

      const result = await deleteMilestone(mockMilestoneId, mockUserId);

      expect(prisma.product_program_milestones.findUnique).toHaveBeenCalled();
      expect(prisma.product_program_milestones.delete).toHaveBeenCalledWith({
        where: { id: mockMilestoneId },
      });
      expect(result.message).toBe('Milestone deleted successfully');
    });

    it('should throw error if milestone not found', async () => {
      (prisma.product_program_milestones.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(deleteMilestone('invalid-id', mockUserId)).rejects.toThrow(
        'Milestone not found'
      );
    });

    it('should handle database errors', async () => {
      (prisma.product_program_milestones.findUnique as jest.Mock).mockResolvedValue(mockMilestone);
      (prisma.product_program_milestones.delete as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await expect(deleteMilestone(mockMilestoneId, mockUserId)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('markMilestoneAchieved', () => {
    it('should mark milestone as achieved successfully', async () => {
      const achievedMilestone = {
        ...mockMilestone,
        status: 'ACHIEVED',
        achieved_at: new Date(),
      };
      (prisma.product_program_milestones.findUnique as jest.Mock).mockResolvedValue(mockMilestone);
      (prisma.product_program_milestones.update as jest.Mock).mockResolvedValue(
        achievedMilestone
      );

      const result = await markMilestoneAchieved(mockMilestoneId, mockUserId);

      expect(prisma.product_program_milestones.update).toHaveBeenCalledWith({
        where: { id: mockMilestoneId },
        data: {
          status: 'ACHIEVED',
          achieved_at: expect.any(Date),
          updated_by: mockUserId,
        },
        include: expect.any(Object),
      });
      expect(result.status).toBe('ACHIEVED');
      expect(result.achievedAt).toBeDefined();
    });

    it('should throw error if milestone already achieved', async () => {
      const achievedMilestone = { ...mockMilestone, status: 'ACHIEVED' };
      (prisma.product_program_milestones.findUnique as jest.Mock).mockResolvedValue(
        achievedMilestone
      );

      await expect(markMilestoneAchieved(mockMilestoneId, mockUserId)).rejects.toThrow(
        'Milestone is already achieved'
      );
    });

    it('should throw error if milestone not found', async () => {
      (prisma.product_program_milestones.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(markMilestoneAchieved('invalid-id', mockUserId)).rejects.toThrow(
        'Milestone not found'
      );
    });

    it('should handle database errors', async () => {
      (prisma.product_program_milestones.findUnique as jest.Mock).mockResolvedValue(mockMilestone);
      (prisma.product_program_milestones.update as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await expect(markMilestoneAchieved(mockMilestoneId, mockUserId)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('Permission Functions', () => {
    describe('canModifyMilestone', () => {
      it('should return true for Admin role', () => {
        expect(canModifyMilestone(['Admin'])).toBe(true);
      });

      it('should return true for Gov Program Director role', () => {
        expect(canModifyMilestone(['Gov Program Director'])).toBe(true);
      });

      it('should return true for Gov Program Manager role', () => {
        expect(canModifyMilestone(['Gov Program Manager'])).toBe(true);
      });

      it('should be case-insensitive', () => {
        expect(canModifyMilestone(['admin'])).toBe(true);
        expect(canModifyMilestone(['GOV PROGRAM DIRECTOR'])).toBe(true);
        expect(canModifyMilestone(['gov program manager'])).toBe(true);
      });

      it('should return true if user has multiple roles with one authorized', () => {
        expect(canModifyMilestone(['User', 'Admin', 'Viewer'])).toBe(true);
      });

      it('should return false for unauthorized roles', () => {
        expect(canModifyMilestone(['User'])).toBe(false);
        expect(canModifyMilestone(['Viewer'])).toBe(false);
        expect(canModifyMilestone(['Guest'])).toBe(false);
      });

      it('should return false for empty roles array', () => {
        expect(canModifyMilestone([])).toBe(false);
      });
    });
  });
});

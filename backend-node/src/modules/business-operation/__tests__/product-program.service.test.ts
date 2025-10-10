import {
  createProductProgram,
  getProductProgramById,
  getAllProductPrograms,
  updateProductProgram,
  deleteProductProgram,
  createProductProgramSchema,
  updateProductProgramSchema,
  getProductProgramsQuerySchema,
} from '../product-program.service';
import { PrismaClient } from '@prisma/client';

// Mock Prisma Client
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    user: {
      findUnique: jest.fn(),
    },
    productProgram: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
    SecurityClassification: {
      UNCLASSIFIED: 'UNCLASSIFIED',
      CUI: 'CUI',
      SECRET: 'SECRET',
      TOP_SECRET: 'TOP_SECRET',
    },
  };
});

const prisma = new PrismaClient();

describe('ProductProgramService', () => {
  const mockUserId = 'test-user-id';
  const mockUser = {
    id: mockUserId,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
  };

  const mockProductProgram = {
    id: 'test-product-program-id',
    name: 'Test Product',
    description: 'Test description',
    objectives: 'Test objectives',
    deliverables: 'Test deliverables',
    dependencies: 'Test dependencies',
    securityClassification: 'CUI',
    criticalDates: [
      {
        date: '2025-12-01',
        description: 'Milestone 1',
        type: 'milestone',
      },
    ],
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: mockUserId,
    updatedBy: mockUserId,
    createdByUser: mockUser,
    updatedByUser: mockUser,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Validation Schemas', () => {
    describe('createProductProgramSchema', () => {
      it('should validate correct product program data', () => {
        const validData = {
          name: 'Valid Product',
          description: 'Valid description',
          objectives: 'Valid objectives',
          deliverables: 'Valid deliverables',
          securityClassification: 'CUI',
          criticalDates: [
            {
              date: '2025-12-01',
              description: 'Test milestone',
              type: 'milestone',
            },
          ],
        };

        const result = createProductProgramSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should reject product program with missing required fields', () => {
        const invalidData = {
          name: 'Valid Product',
          // missing description, objectives, deliverables, securityClassification
        };

        const result = createProductProgramSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it('should reject product program with name exceeding 200 characters', () => {
        const invalidData = {
          name: 'A'.repeat(201),
          description: 'Valid description',
          objectives: 'Valid objectives',
          deliverables: 'Valid deliverables',
          securityClassification: 'CUI',
        };

        const result = createProductProgramSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it('should reject invalid security classification', () => {
        const invalidData = {
          name: 'Valid Product',
          description: 'Valid description',
          objectives: 'Valid objectives',
          deliverables: 'Valid deliverables',
          securityClassification: 'INVALID',
        };

        const result = createProductProgramSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it('should reject invalid critical date format', () => {
        const invalidData = {
          name: 'Valid Product',
          description: 'Valid description',
          objectives: 'Valid objectives',
          deliverables: 'Valid deliverables',
          securityClassification: 'CUI',
          criticalDates: [
            {
              date: '12/01/2025', // Invalid format
              description: 'Test milestone',
            },
          ],
        };

        const result = createProductProgramSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });
    });

    describe('updateProductProgramSchema', () => {
      it('should validate partial updates', () => {
        const validData = {
          name: 'Updated Product',
        };

        const result = updateProductProgramSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should allow empty update object', () => {
        const result = updateProductProgramSchema.safeParse({});
        expect(result.success).toBe(true);
      });
    });

    describe('getProductProgramsQuerySchema', () => {
      it('should validate query parameters with defaults', () => {
        const result = getProductProgramsQuerySchema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.page).toBe(1);
          expect(result.data.limit).toBe(20);
          expect(result.data.sortBy).toBe('createdAt');
          expect(result.data.sortOrder).toBe('desc');
        }
      });

      it('should validate query parameters with custom values', () => {
        const query = {
          search: 'test',
          securityClassification: 'SECRET',
          page: 2,
          limit: 50,
          sortBy: 'name',
          sortOrder: 'asc',
        };

        const result = getProductProgramsQuerySchema.safeParse(query);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('createProductProgram', () => {
    const createData = {
      name: 'Test Product',
      description: 'Test description',
      objectives: 'Test objectives',
      deliverables: 'Test deliverables',
      dependencies: 'Test dependencies',
      securityClassification: 'CUI' as const,
      criticalDates: [
        {
          date: '2025-12-01',
          description: 'Milestone 1',
          type: 'milestone' as const,
        },
      ],
    };

    it('should create a product program successfully', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.productProgram.create as jest.Mock).mockResolvedValue(mockProductProgram);

      const result = await createProductProgram(createData, mockUserId);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: mockUserId } });
      expect(prisma.productProgram.create).toHaveBeenCalled();
      expect(result).toEqual(mockProductProgram);
    });

    it('should throw error if user does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(createProductProgram(createData, mockUserId)).rejects.toThrow(
        `User with ID "${mockUserId}" not found`
      );
    });

    it('should handle database errors', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.productProgram.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(createProductProgram(createData, mockUserId)).rejects.toThrow(
        'Failed to create product/program'
      );
    });
  });

  describe('getProductProgramById', () => {
    it('should fetch a product program by ID successfully', async () => {
      (prisma.productProgram.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);

      const result = await getProductProgramById(mockProductProgram.id, mockUserId);

      expect(prisma.productProgram.findUnique).toHaveBeenCalledWith({
        where: { id: mockProductProgram.id },
        include: expect.any(Object),
      });
      expect(result).toEqual(mockProductProgram);
    });

    it('should throw error if product program not found', async () => {
      (prisma.productProgram.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getProductProgramById('invalid-id', mockUserId)).rejects.toThrow(
        'Product/Program with ID "invalid-id" not found'
      );
    });

    it('should handle database errors', async () => {
      (prisma.productProgram.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(getProductProgramById(mockProductProgram.id, mockUserId)).rejects.toThrow(
        'Failed to fetch product/program'
      );
    });
  });

  describe('getAllProductPrograms', () => {
    const mockProductPrograms = [mockProductProgram];
    const query = {
      search: '',
      page: 1,
      limit: 20,
      sortBy: 'createdAt' as const,
      sortOrder: 'desc' as const,
    };

    it('should fetch all product programs successfully', async () => {
      (prisma.productProgram.findMany as jest.Mock).mockResolvedValue(mockProductPrograms);
      (prisma.productProgram.count as jest.Mock).mockResolvedValue(1);

      const result = await getAllProductPrograms(mockUserId, query);

      expect(prisma.productProgram.findMany).toHaveBeenCalled();
      expect(prisma.productProgram.count).toHaveBeenCalled();
      expect(result.data).toEqual(mockProductPrograms);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        pages: 1,
      });
    });

    it('should apply search filter', async () => {
      const searchQuery = { ...query, search: 'test' };
      (prisma.productProgram.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.productProgram.count as jest.Mock).mockResolvedValue(0);

      await getAllProductPrograms(mockUserId, searchQuery);

      expect(prisma.productProgram.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'test', mode: 'insensitive' } },
              { description: { contains: 'test', mode: 'insensitive' } },
              { objectives: { contains: 'test', mode: 'insensitive' } },
            ]),
          }),
        })
      );
    });

    it('should apply security classification filter', async () => {
      const filterQuery = { ...query, securityClassification: 'SECRET' as const };
      (prisma.productProgram.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.productProgram.count as jest.Mock).mockResolvedValue(0);

      await getAllProductPrograms(mockUserId, filterQuery);

      expect(prisma.productProgram.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            securityClassification: 'SECRET',
          }),
        })
      );
    });

    it('should handle pagination correctly', async () => {
      const paginatedQuery = { ...query, page: 2, limit: 10 };
      (prisma.productProgram.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.productProgram.count as jest.Mock).mockResolvedValue(25);

      const result = await getAllProductPrograms(mockUserId, paginatedQuery);

      expect(prisma.productProgram.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
      expect(result.pagination.pages).toBe(3);
    });

    it('should handle database errors', async () => {
      (prisma.productProgram.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(getAllProductPrograms(mockUserId, query)).rejects.toThrow(
        'Failed to fetch product/programs'
      );
    });
  });

  describe('updateProductProgram', () => {
    const updateData = {
      name: 'Updated Product',
      description: 'Updated description',
    };

    it('should update a product program successfully', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.productProgram.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
      (prisma.productProgram.update as jest.Mock).mockResolvedValue({
        ...mockProductProgram,
        ...updateData,
      });

      const result = await updateProductProgram(mockProductProgram.id, updateData, mockUserId);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: mockUserId } });
      expect(prisma.productProgram.findUnique).toHaveBeenCalledWith({
        where: { id: mockProductProgram.id },
      });
      expect(prisma.productProgram.update).toHaveBeenCalled();
      expect(result.name).toBe('Updated Product');
    });

    it('should throw error if user does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        updateProductProgram(mockProductProgram.id, updateData, mockUserId)
      ).rejects.toThrow(`User with ID "${mockUserId}" not found`);
    });

    it('should throw error if product program does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.productProgram.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        updateProductProgram('invalid-id', updateData, mockUserId)
      ).rejects.toThrow('Product/Program with ID "invalid-id" not found');
    });

    it('should handle database errors', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.productProgram.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
      (prisma.productProgram.update as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(
        updateProductProgram(mockProductProgram.id, updateData, mockUserId)
      ).rejects.toThrow('Failed to update product/program');
    });
  });

  describe('deleteProductProgram', () => {
    it('should delete a product program successfully', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.productProgram.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
      (prisma.productProgram.delete as jest.Mock).mockResolvedValue(mockProductProgram);

      const result = await deleteProductProgram(mockProductProgram.id, mockUserId);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: mockUserId } });
      expect(prisma.productProgram.findUnique).toHaveBeenCalledWith({
        where: { id: mockProductProgram.id },
      });
      expect(prisma.productProgram.delete).toHaveBeenCalledWith({
        where: { id: mockProductProgram.id },
      });
      expect(result.success).toBe(true);
    });

    it('should throw error if user does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(deleteProductProgram(mockProductProgram.id, mockUserId)).rejects.toThrow(
        `User with ID "${mockUserId}" not found`
      );
    });

    it('should throw error if product program does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.productProgram.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(deleteProductProgram('invalid-id', mockUserId)).rejects.toThrow(
        'Product/Program with ID "invalid-id" not found'
      );
    });

    it('should handle database errors', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.productProgram.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
      (prisma.productProgram.delete as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(deleteProductProgram(mockProductProgram.id, mockUserId)).rejects.toThrow(
        'Failed to delete product/program'
      );
    });
  });
});

import {
  createProductProgram,
  getProductProgramById,
  getAllProductPrograms,
  updateProductProgram,
  deleteProductProgram,
  createProductProgramSchema,
  updateProductProgramSchema,
  getProductProgramsQuerySchema,
  addStakeholder,
  removeStakeholder,
  getStakeholders,
  updateStakeholderRole,
  addStakeholderSchema,
} from '../product-program.service';
import { PrismaClient } from '@prisma/client';

// Mock Prisma Client
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    user: {
      findUnique: jest.fn(),
    },
    product_programs: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    product_program_stakeholders: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
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
          expect(result.data.sortBy).toBe('created_at');
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
      (prisma.product_programs.create as jest.Mock).mockResolvedValue(mockProductProgram);

      const result = await createProductProgram(createData, mockUserId);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: mockUserId } });
      expect(prisma.product_programs.create).toHaveBeenCalled();
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
      (prisma.product_programs.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(createProductProgram(createData, mockUserId)).rejects.toThrow(
        'Failed to create product/program'
      );
    });
  });

  describe('getProductProgramById', () => {
    it('should fetch a product program by ID successfully', async () => {
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);

      const result = await getProductProgramById(mockProductProgram.id, mockUserId);

      expect(prisma.product_programs.findUnique).toHaveBeenCalledWith({
        where: { id: mockProductProgram.id },
        include: expect.any(Object),
      });
      expect(result).toEqual(mockProductProgram);
    });

    it('should throw error if product program not found', async () => {
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getProductProgramById('invalid-id', mockUserId)).rejects.toThrow(
        'Product/Program with ID "invalid-id" not found'
      );
    });

    it('should handle database errors', async () => {
      (prisma.product_programs.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

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
      sortBy: 'created_at' as const,
      sortOrder: 'desc' as const,
    };

    it('should fetch all product programs successfully', async () => {
      (prisma.product_programs.findMany as jest.Mock).mockResolvedValue(mockProductPrograms);
      (prisma.product_programs.count as jest.Mock).mockResolvedValue(1);

      const result = await getAllProductPrograms(mockUserId, query);

      expect(prisma.product_programs.findMany).toHaveBeenCalled();
      expect(prisma.product_programs.count).toHaveBeenCalled();
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
      (prisma.product_programs.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.product_programs.count as jest.Mock).mockResolvedValue(0);

      await getAllProductPrograms(mockUserId, searchQuery);

      expect(prisma.product_programs.findMany).toHaveBeenCalledWith(
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
      (prisma.product_programs.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.product_programs.count as jest.Mock).mockResolvedValue(0);

      await getAllProductPrograms(mockUserId, filterQuery);

      expect(prisma.product_programs.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            security_classification: 'SECRET',
          }),
        })
      );
    });

    it('should handle pagination correctly', async () => {
      const paginatedQuery = { ...query, page: 2, limit: 10 };
      (prisma.product_programs.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.product_programs.count as jest.Mock).mockResolvedValue(25);

      const result = await getAllProductPrograms(mockUserId, paginatedQuery);

      expect(prisma.product_programs.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
      expect(result.pagination.pages).toBe(3);
    });

    it('should handle database errors', async () => {
      (prisma.product_programs.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

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
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
      (prisma.product_programs.update as jest.Mock).mockResolvedValue({
        ...mockProductProgram,
        ...updateData,
      });

      const result = await updateProductProgram(mockProductProgram.id, updateData, mockUserId);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: mockUserId } });
      expect(prisma.product_programs.findUnique).toHaveBeenCalledWith({
        where: { id: mockProductProgram.id },
      });
      expect(prisma.product_programs.update).toHaveBeenCalled();
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
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        updateProductProgram('invalid-id', updateData, mockUserId)
      ).rejects.toThrow('Product/Program with ID "invalid-id" not found');
    });

    it('should handle database errors', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
      (prisma.product_programs.update as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(
        updateProductProgram(mockProductProgram.id, updateData, mockUserId)
      ).rejects.toThrow('Failed to update product/program');
    });
  });

  describe('deleteProductProgram', () => {
    it('should delete a product program successfully', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
      (prisma.product_programs.delete as jest.Mock).mockResolvedValue(mockProductProgram);

      const result = await deleteProductProgram(mockProductProgram.id, mockUserId);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: mockUserId } });
      expect(prisma.product_programs.findUnique).toHaveBeenCalledWith({
        where: { id: mockProductProgram.id },
      });
      expect(prisma.product_programs.delete).toHaveBeenCalledWith({
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
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(deleteProductProgram('invalid-id', mockUserId)).rejects.toThrow(
        'Product/Program with ID "invalid-id" not found'
      );
    });

    it('should handle database errors', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
      (prisma.product_programs.delete as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(deleteProductProgram(mockProductProgram.id, mockUserId)).rejects.toThrow(
        'Failed to delete product/program'
      );
    });
  });

  describe('Stakeholder Management', () => {
    const mockStakeholderId = 'test-stakeholder-id';
    const mockStakeholderUserId = 'stakeholder-user-id';
    const mockAssigningUserId = 'assigning-user-id';

    const mockStakeholderUser = {
      id: mockStakeholderUserId,
      email: 'stakeholder@example.com',
      firstName: 'Stakeholder',
      lastName: 'User',
    };

    const mockAssigningUser = {
      id: mockAssigningUserId,
      email: 'assigner@example.com',
      firstName: 'Assigning',
      lastName: 'User',
    };

    const mockStakeholder = {
      id: mockStakeholderId,
      productProgramId: mockProductProgram.id,
      userId: mockStakeholderUserId,
      role: 'Project Lead',
      assignedAt: new Date('2025-01-01'),
      assignedBy: mockAssigningUserId,
      user: mockStakeholderUser,
      assignedByUser: mockAssigningUser,
    };

    describe('addStakeholderSchema', () => {
      it('should validate correct stakeholder data', () => {
        const validData = {
          userId: 'test-user-id',
          role: 'Project Lead',
        };

        const result = addStakeholderSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should validate stakeholder data without role', () => {
        const validData = {
          userId: 'test-user-id',
        };

        const result = addStakeholderSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should reject stakeholder with missing userId', () => {
        const invalidData = {
          role: 'Project Lead',
        };

        const result = addStakeholderSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it('should reject stakeholder with empty userId', () => {
        const invalidData = {
          userId: '',
          role: 'Project Lead',
        };

        const result = addStakeholderSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it('should reject role exceeding 100 characters', () => {
        const invalidData = {
          userId: 'test-user-id',
          role: 'A'.repeat(101),
        };

        const result = addStakeholderSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });
    });

    describe('addStakeholder', () => {
      const addStakeholderData = {
        userId: mockStakeholderUserId,
        role: 'Project Lead',
      };

      it('should add a stakeholder successfully', async () => {
        (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
        (prisma.user.findUnique as jest.Mock)
          .mockResolvedValueOnce(mockStakeholderUser) // First call for stakeholder user
          .mockResolvedValueOnce(mockAssigningUser); // Second call for assigning user
        (prisma.product_program_stakeholders.findUnique as jest.Mock).mockResolvedValue(null);
        (prisma.product_program_stakeholders.create as jest.Mock).mockResolvedValue(mockStakeholder);

        const result = await addStakeholder(
          mockProductProgram.id,
          addStakeholderData,
          mockAssigningUserId
        );

        expect(prisma.product_programs.findUnique).toHaveBeenCalledWith({
          where: { id: mockProductProgram.id },
        });
        expect(prisma.user.findUnique).toHaveBeenCalledWith({
          where: { id: mockStakeholderUserId },
        });
        expect(prisma.user.findUnique).toHaveBeenCalledWith({
          where: { id: mockAssigningUserId },
        });
        expect(prisma.product_program_stakeholders.findUnique).toHaveBeenCalledWith({
          where: {
            productProgramId_userId: {
              productProgramId: mockProductProgram.id,
              userId: mockStakeholderUserId,
            },
          },
        });
        expect(prisma.product_program_stakeholders.create).toHaveBeenCalledWith({
          data: {
            productProgramId: mockProductProgram.id,
            userId: mockStakeholderUserId,
            role: 'Project Lead',
            assignedBy: mockAssigningUserId,
          },
          include: expect.any(Object),
        });
        expect(result).toEqual(mockStakeholder);
      });

      it('should add stakeholder without role', async () => {
        const dataWithoutRole = { userId: mockStakeholderUserId };
        (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
        (prisma.user.findUnique as jest.Mock)
          .mockResolvedValueOnce(mockStakeholderUser)
          .mockResolvedValueOnce(mockAssigningUser);
        (prisma.product_program_stakeholders.findUnique as jest.Mock).mockResolvedValue(null);
        (prisma.product_program_stakeholders.create as jest.Mock).mockResolvedValue({
          ...mockStakeholder,
          role: null,
        });

        const result = await addStakeholder(
          mockProductProgram.id,
          dataWithoutRole,
          mockAssigningUserId
        );

        expect(prisma.product_program_stakeholders.create).toHaveBeenCalledWith({
          data: {
            productProgramId: mockProductProgram.id,
            userId: mockStakeholderUserId,
            role: null,
            assignedBy: mockAssigningUserId,
          },
          include: expect.any(Object),
        });
        expect(result.role).toBeNull();
      });

      it('should throw error if product/program not found', async () => {
        (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(null);

        await expect(
          addStakeholder(mockProductProgram.id, addStakeholderData, mockAssigningUserId)
        ).rejects.toThrow(`Product/Program with ID "${mockProductProgram.id}" not found`);
      });

      it('should throw error if stakeholder user not found', async () => {
        (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

        await expect(
          addStakeholder(mockProductProgram.id, addStakeholderData, mockAssigningUserId)
        ).rejects.toThrow(`User with ID "${mockStakeholderUserId}" not found`);
      });

      it('should throw error if assigning user not found', async () => {
        (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
        (prisma.user.findUnique as jest.Mock)
          .mockResolvedValueOnce(mockStakeholderUser)
          .mockResolvedValueOnce(null);

        await expect(
          addStakeholder(mockProductProgram.id, addStakeholderData, mockAssigningUserId)
        ).rejects.toThrow(`Assigning user with ID "${mockAssigningUserId}" not found`);
      });

      it('should throw error if stakeholder already exists', async () => {
        (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
        (prisma.user.findUnique as jest.Mock)
          .mockResolvedValueOnce(mockStakeholderUser)
          .mockResolvedValueOnce(mockAssigningUser);
        (prisma.product_program_stakeholders.findUnique as jest.Mock).mockResolvedValue(
          mockStakeholder
        );

        await expect(
          addStakeholder(mockProductProgram.id, addStakeholderData, mockAssigningUserId)
        ).rejects.toThrow('User is already a stakeholder for this Product/Program');
      });

      it('should handle database errors', async () => {
        (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
        (prisma.user.findUnique as jest.Mock)
          .mockResolvedValueOnce(mockStakeholderUser)
          .mockResolvedValueOnce(mockAssigningUser);
        (prisma.product_program_stakeholders.findUnique as jest.Mock).mockResolvedValue(null);
        (prisma.product_program_stakeholders.create as jest.Mock).mockRejectedValue(
          new Error('Database error')
        );

        await expect(
          addStakeholder(mockProductProgram.id, addStakeholderData, mockAssigningUserId)
        ).rejects.toThrow('Failed to add stakeholder');
      });
    });

    describe('removeStakeholder', () => {
      it('should remove a stakeholder successfully', async () => {
        (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
        (prisma.product_program_stakeholders.findUnique as jest.Mock).mockResolvedValue(
          mockStakeholder
        );
        (prisma.product_program_stakeholders.delete as jest.Mock).mockResolvedValue(mockStakeholder);

        const result = await removeStakeholder(
          mockProductProgram.id,
          mockStakeholderUserId,
          mockAssigningUserId
        );

        expect(prisma.product_programs.findUnique).toHaveBeenCalledWith({
          where: { id: mockProductProgram.id },
        });
        expect(prisma.product_program_stakeholders.findUnique).toHaveBeenCalledWith({
          where: {
            productProgramId_userId: {
              productProgramId: mockProductProgram.id,
              userId: mockStakeholderUserId,
            },
          },
        });
        expect(prisma.product_program_stakeholders.delete).toHaveBeenCalledWith({
          where: {
            productProgramId_userId: {
              productProgramId: mockProductProgram.id,
              userId: mockStakeholderUserId,
            },
          },
        });
        expect(result.success).toBe(true);
        expect(result.message).toBe('Stakeholder removed successfully');
      });

      it('should throw error if product/program not found', async () => {
        (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(null);

        await expect(
          removeStakeholder(mockProductProgram.id, mockStakeholderUserId, mockAssigningUserId)
        ).rejects.toThrow(`Product/Program with ID "${mockProductProgram.id}" not found`);
      });

      it('should throw error if stakeholder not found', async () => {
        (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
        (prisma.product_program_stakeholders.findUnique as jest.Mock).mockResolvedValue(null);

        await expect(
          removeStakeholder(mockProductProgram.id, mockStakeholderUserId, mockAssigningUserId)
        ).rejects.toThrow('Stakeholder not found for this Product/Program');
      });

      it('should handle database errors', async () => {
        (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
        (prisma.product_program_stakeholders.findUnique as jest.Mock).mockResolvedValue(
          mockStakeholder
        );
        (prisma.product_program_stakeholders.delete as jest.Mock).mockRejectedValue(
          new Error('Database error')
        );

        await expect(
          removeStakeholder(mockProductProgram.id, mockStakeholderUserId, mockAssigningUserId)
        ).rejects.toThrow('Failed to remove stakeholder');
      });
    });

    describe('getStakeholders', () => {
      const mockStakeholders = [mockStakeholder];

      it('should get all stakeholders for a product/program successfully', async () => {
        (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
        (prisma.product_program_stakeholders.findMany as jest.Mock).mockResolvedValue(
          mockStakeholders
        );

        const result = await getStakeholders(mockProductProgram.id);

        expect(prisma.product_programs.findUnique).toHaveBeenCalledWith({
          where: { id: mockProductProgram.id },
        });
        expect(prisma.product_program_stakeholders.findMany).toHaveBeenCalledWith({
          where: { product_program_id: mockProductProgram.id },
          include: expect.any(Object),
          orderBy: {
            assigned_at: 'desc',
          },
        });
        expect(result).toEqual(mockStakeholders);
      });

      it('should return empty array if no stakeholders found', async () => {
        (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
        (prisma.product_program_stakeholders.findMany as jest.Mock).mockResolvedValue([]);

        const result = await getStakeholders(mockProductProgram.id);

        expect(result).toEqual([]);
      });

      it('should throw error if product/program not found', async () => {
        (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(null);

        await expect(getStakeholders(mockProductProgram.id)).rejects.toThrow(
          `Product/Program with ID "${mockProductProgram.id}" not found`
        );
      });

      it('should handle database errors', async () => {
        (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
        (prisma.product_program_stakeholders.findMany as jest.Mock).mockRejectedValue(
          new Error('Database error')
        );

        await expect(getStakeholders(mockProductProgram.id)).rejects.toThrow(
          'Failed to fetch stakeholders'
        );
      });
    });

    describe('updateStakeholderRole', () => {
      const newRole = 'Technical Lead';

      it('should update stakeholder role successfully', async () => {
        (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
        (prisma.product_program_stakeholders.findUnique as jest.Mock).mockResolvedValue(
          mockStakeholder
        );
        (prisma.product_program_stakeholders.update as jest.Mock).mockResolvedValue({
          ...mockStakeholder,
          role: newRole,
        });

        const result = await updateStakeholderRole(
          mockProductProgram.id,
          mockStakeholderUserId,
          newRole,
          mockAssigningUserId
        );

        expect(prisma.product_programs.findUnique).toHaveBeenCalledWith({
          where: { id: mockProductProgram.id },
        });
        expect(prisma.product_program_stakeholders.findUnique).toHaveBeenCalledWith({
          where: {
            productProgramId_userId: {
              productProgramId: mockProductProgram.id,
              userId: mockStakeholderUserId,
            },
          },
        });
        expect(prisma.product_program_stakeholders.update).toHaveBeenCalledWith({
          where: {
            productProgramId_userId: {
              productProgramId: mockProductProgram.id,
              userId: mockStakeholderUserId,
            },
          },
          data: {
            role: newRole,
          },
          include: expect.any(Object),
        });
        expect(result.role).toBe(newRole);
      });

      it('should update stakeholder role to null', async () => {
        (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
        (prisma.product_program_stakeholders.findUnique as jest.Mock).mockResolvedValue(
          mockStakeholder
        );
        (prisma.product_program_stakeholders.update as jest.Mock).mockResolvedValue({
          ...mockStakeholder,
          role: null,
        });

        const result = await updateStakeholderRole(
          mockProductProgram.id,
          mockStakeholderUserId,
          null,
          mockAssigningUserId
        );

        expect(prisma.product_program_stakeholders.update).toHaveBeenCalledWith({
          where: {
            productProgramId_userId: {
              productProgramId: mockProductProgram.id,
              userId: mockStakeholderUserId,
            },
          },
          data: {
            role: null,
          },
          include: expect.any(Object),
        });
        expect(result.role).toBeNull();
      });

      it('should throw error if product/program not found', async () => {
        (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(null);

        await expect(
          updateStakeholderRole(
            mockProductProgram.id,
            mockStakeholderUserId,
            newRole,
            mockAssigningUserId
          )
        ).rejects.toThrow(`Product/Program with ID "${mockProductProgram.id}" not found`);
      });

      it('should throw error if stakeholder not found', async () => {
        (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
        (prisma.product_program_stakeholders.findUnique as jest.Mock).mockResolvedValue(null);

        await expect(
          updateStakeholderRole(
            mockProductProgram.id,
            mockStakeholderUserId,
            newRole,
            mockAssigningUserId
          )
        ).rejects.toThrow('Stakeholder not found for this Product/Program');
      });

      it('should handle database errors', async () => {
        (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
        (prisma.product_program_stakeholders.findUnique as jest.Mock).mockResolvedValue(
          mockStakeholder
        );
        (prisma.product_program_stakeholders.update as jest.Mock).mockRejectedValue(
          new Error('Database error')
        );

        await expect(
          updateStakeholderRole(
            mockProductProgram.id,
            mockStakeholderUserId,
            newRole,
            mockAssigningUserId
          )
        ).rejects.toThrow('Failed to update stakeholder role');
      });
    });
  });
});

import {
  linkToBusinessOperation,
  unlinkFromBusinessOperation,
  getProgramsAndProductsByOperation,
} from '../business-operation.service';
import { PrismaClient } from '@prisma/client';

// Mock Prisma Client
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    product_programs: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

const prisma = new PrismaClient();

describe('Business Operation Linking Service - Phase 3', () => {
  const mockOperationId = 'test-operation-id';
  const mockProgramId = 'test-program-id';
  const mockProductId = 'test-product-id';

  const mockOperation = {
    id: mockOperationId,
    name: 'Test Operation',
    business_operation_type: 'Operation',
    description: 'Test operation description',
  };

  const mockProgram = {
    id: mockProgramId,
    name: 'Test Program',
    business_operation_type: 'Program',
    business_operation_id: null,
  };

  const mockProduct = {
    id: mockProductId,
    name: 'Test Product',
    business_operation_type: 'Product',
    business_operation_id: null,
  };

  const mockLinkedProgram = {
    ...mockProgram,
    business_operation_id: mockOperationId,
    business_operation: mockOperation,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Also reset mock implementations to prevent pollution between tests
    (prisma.product_programs.findUnique as jest.Mock).mockReset();
    (prisma.product_programs.findMany as jest.Mock).mockReset();
    (prisma.product_programs.update as jest.Mock).mockReset();
  });

  describe('linkToBusinessOperation', () => {
    it('should link a Program to a Business Operation successfully', async () => {
      (prisma.product_programs.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockProgram) // First call - validate program
        .mockResolvedValueOnce(mockOperation); // Second call - validate operation
      (prisma.product_programs.update as jest.Mock).mockResolvedValue(mockLinkedProgram);

      const result = await linkToBusinessOperation(mockProgramId, mockOperationId);

      expect(prisma.product_programs.findUnique).toHaveBeenCalledTimes(2);
      expect(prisma.product_programs.findUnique).toHaveBeenNthCalledWith(1, {
        where: { id: mockProgramId },
        select: { id: true, name: true, business_operation_type: true }
      });
      expect(prisma.product_programs.findUnique).toHaveBeenNthCalledWith(2, {
        where: { id: mockOperationId },
        select: { id: true, name: true, business_operation_type: true }
      });
      expect(prisma.product_programs.update).toHaveBeenCalledWith({
        where: { id: mockProgramId },
        data: { business_operation_id: mockOperationId },
        include: {
          business_operation: {
            select: {
              id: true,
              name: true,
              description: true,
              business_operation_type: true
            }
          }
        }
      });
      expect(result).toEqual(mockLinkedProgram);
      expect(result.business_operation_id).toBe(mockOperationId);
    });

    it('should link a Product to a Business Operation successfully', async () => {
      const mockLinkedProduct = {
        ...mockProduct,
        business_operation_id: mockOperationId,
        business_operation: mockOperation,
      };

      (prisma.product_programs.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce(mockOperation);
      (prisma.product_programs.update as jest.Mock).mockResolvedValue(mockLinkedProduct);

      const result = await linkToBusinessOperation(mockProductId, mockOperationId);

      expect(prisma.product_programs.update).toHaveBeenCalledWith({
        where: { id: mockProductId },
        data: { business_operation_id: mockOperationId },
        include: expect.any(Object)
      });
      expect(result.business_operation_type).toBe('Product');
      expect(result.business_operation_id).toBe(mockOperationId);
    });

    it('should throw error if Program/Product not found', async () => {
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        linkToBusinessOperation('invalid-id', mockOperationId)
      ).rejects.toThrow('Program/Product not found');

      expect(prisma.product_programs.update).not.toHaveBeenCalled();
    });

    it('should throw error if Business Operation not found', async () => {
      (prisma.product_programs.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockProgram)
        .mockResolvedValueOnce(null);

      await expect(
        linkToBusinessOperation(mockProgramId, 'invalid-operation-id')
      ).rejects.toThrow('Business Operation not found');

      expect(prisma.product_programs.update).not.toHaveBeenCalled();
    });

    it('should throw error when trying to link an Operation to another Operation', async () => {
      const mockOperation2 = {
        id: 'operation-2-id',
        name: 'Operation 2',
        business_operation_type: 'Operation',
      };

      (prisma.product_programs.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockOperation)
        .mockResolvedValueOnce(mockOperation2);

      await expect(
        linkToBusinessOperation(mockOperationId, 'operation-2-id')
      ).rejects.toThrow('Cannot link an Operation to another Operation. Only Programs and Products can be linked to Operations.');

      expect(prisma.product_programs.update).not.toHaveBeenCalled();
    });

    it('should throw error when trying to link to a Program instead of Operation', async () => {
      // First call validates the product (should pass)
      // Second call validates the target should be an Operation (should fail)
      const programTarget = {
        id: 'program-target-id',
        name: 'Target Program',
        business_operation_type: 'Program' as const
      };

      (prisma.product_programs.findUnique as jest.Mock)
        .mockResolvedValueOnce({ ...mockProduct }) // First call: Product is valid to link
        .mockResolvedValueOnce(programTarget); // Second call: Target is Program, not Operation

      await expect(
        linkToBusinessOperation(mockProductId, 'program-target-id')
      ).rejects.toThrow('Can only link to a Business Operation (type = Operation)');

      expect(prisma.product_programs.update).not.toHaveBeenCalled();
    });

    it('should throw error when trying to link to a Product instead of Operation', async () => {
      const mockProduct2 = {
        id: 'product-2-id',
        name: 'Product 2',
        business_operation_type: 'Product',
      };

      (prisma.product_programs.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockProgram)
        .mockResolvedValueOnce(mockProduct2);

      await expect(
        linkToBusinessOperation(mockProgramId, 'product-2-id')
      ).rejects.toThrow('Can only link to a Business Operation (type = Operation)');

      expect(prisma.product_programs.update).not.toHaveBeenCalled();
    });

    it('should handle database errors during update', async () => {
      // Both validations pass, but update fails
      (prisma.product_programs.findUnique as jest.Mock)
        .mockResolvedValueOnce({ ...mockProgram }) // First call: Program validation passes
        .mockResolvedValueOnce({ ...mockOperation }); // Second call: Operation validation passes
      (prisma.product_programs.update as jest.Mock).mockRejectedValueOnce(
        new Error('Database error')
      );

      await expect(
        linkToBusinessOperation(mockProgramId, mockOperationId)
      ).rejects.toThrow('Database error');
    });
  });

  describe('unlinkFromBusinessOperation', () => {
    it('should unlink a Program from its Business Operation successfully', async () => {
      // Mock program that IS linked to an operation
      const linkedProgram = {
        id: mockProgramId,
        name: 'Test Program',
        business_operation_type: 'Program',
        business_operation_id: mockOperationId, // Key: this is NOT null
      };

      const unlinkedProgram = {
        ...linkedProgram,
        business_operation_id: null,
      };

      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValueOnce(linkedProgram);
      (prisma.product_programs.update as jest.Mock).mockResolvedValueOnce(unlinkedProgram);

      const result = await unlinkFromBusinessOperation(mockProgramId);

      expect(prisma.product_programs.findUnique).toHaveBeenCalledWith({
        where: { id: mockProgramId },
        select: { id: true, business_operation_id: true, business_operation_type: true }
      });
      expect(prisma.product_programs.update).toHaveBeenCalledWith({
        where: { id: mockProgramId },
        data: { business_operation_id: null }
      });
      expect(result.business_operation_id).toBeNull();
    });

    it('should unlink a Product from its Business Operation successfully', async () => {
      // Mock product that IS linked to an operation
      const linkedProduct = {
        id: mockProductId,
        name: 'Test Product',
        business_operation_type: 'Product',
        business_operation_id: mockOperationId, // Key: this is NOT null
      };

      const unlinkedProduct = {
        ...linkedProduct,
        business_operation_id: null,
      };

      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValueOnce(linkedProduct);
      (prisma.product_programs.update as jest.Mock).mockResolvedValueOnce(unlinkedProduct);

      const result = await unlinkFromBusinessOperation(mockProductId);

      expect(prisma.product_programs.update).toHaveBeenCalledWith({
        where: { id: mockProductId },
        data: { business_operation_id: null }
      });
      expect(result.business_operation_id).toBeNull();
    });

    it('should throw error if Program/Product not found', async () => {
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        unlinkFromBusinessOperation('invalid-id')
      ).rejects.toThrow('Program/Product not found');

      expect(prisma.product_programs.update).not.toHaveBeenCalled();
    });

    it('should throw error if Program/Product is not currently linked', async () => {
      // Mock program with no link (business_operation_id is null)
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValueOnce({ ...mockProgram });

      await expect(
        unlinkFromBusinessOperation(mockProgramId)
      ).rejects.toThrow('Program/Product is not currently linked to any Business Operation');

      expect(prisma.product_programs.update).not.toHaveBeenCalled();
    });

    it('should throw error when trying to unlink an Operation', async () => {
      const operationWithLink = {
        ...mockOperation,
        business_operation_id: 'some-parent-id',
      };

      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(operationWithLink);

      await expect(
        unlinkFromBusinessOperation(mockOperationId)
      ).rejects.toThrow('Cannot unlink an Operation. Only Programs and Products can be unlinked.');

      expect(prisma.product_programs.update).not.toHaveBeenCalled();
    });

    it('should handle database errors during update', async () => {
      const linkedProgram = {
        id: mockProgramId,
        name: 'Test Program',
        business_operation_type: 'Program',
        business_operation_id: mockOperationId, // IS linked
      };

      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValueOnce(linkedProgram);
      (prisma.product_programs.update as jest.Mock).mockRejectedValueOnce(
        new Error('Database error')
      );

      await expect(
        unlinkFromBusinessOperation(mockProgramId)
      ).rejects.toThrow('Database error');
    });
  });

  describe('getProgramsAndProductsByOperation', () => {
    const mockProgramsAndProducts = [
      {
        id: mockProgramId,
        name: 'Test Program',
        description: 'Program description',
        objectives: 'Program objectives',
        deliverables: 'Program deliverables',
        business_operation_type: 'Program',
        security_classification: 'CUI',
        created_at: new Date('2025-01-01'),
        updated_at: new Date('2025-01-10'),
        _count: {
          transitions: 5,
          product_program_stakeholders: 3,
        },
      },
      {
        id: mockProductId,
        name: 'Test Product',
        description: 'Product description',
        objectives: 'Product objectives',
        deliverables: 'Product deliverables',
        business_operation_type: 'Product',
        security_classification: 'SECRET',
        created_at: new Date('2025-01-05'),
        updated_at: new Date('2025-01-15'),
        _count: {
          transitions: 2,
          product_program_stakeholders: 4,
        },
      },
    ];

    it('should get all Programs and Products for a Business Operation successfully', async () => {
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockOperation);
      (prisma.product_programs.findMany as jest.Mock).mockResolvedValue(mockProgramsAndProducts);

      const result = await getProgramsAndProductsByOperation(mockOperationId);

      expect(prisma.product_programs.findUnique).toHaveBeenCalledWith({
        where: { id: mockOperationId },
        select: { id: true, business_operation_type: true }
      });
      expect(prisma.product_programs.findMany).toHaveBeenCalledWith({
        where: { business_operation_id: mockOperationId },
        select: {
          id: true,
          name: true,
          description: true,
          objectives: true,
          deliverables: true,
          business_operation_type: true,
          security_classification: true,
          created_at: true,
          updated_at: true,
          _count: {
            select: {
              transitions: true,
              product_program_stakeholders: true
            }
          }
        },
        orderBy: [
          { business_operation_type: 'asc' },
          { name: 'asc' }
        ]
      });
      expect(result).toEqual(mockProgramsAndProducts);
      expect(result).toHaveLength(2);
    });

    it('should return empty array if no Programs/Products are linked', async () => {
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockOperation);
      (prisma.product_programs.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getProgramsAndProductsByOperation(mockOperationId);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should throw error if Business Operation not found', async () => {
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        getProgramsAndProductsByOperation('invalid-operation-id')
      ).rejects.toThrow('Business Operation not found');

      expect(prisma.product_programs.findMany).not.toHaveBeenCalled();
    });

    it('should throw error when querying for a Program instead of Operation', async () => {
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProgram);

      await expect(
        getProgramsAndProductsByOperation(mockProgramId)
      ).rejects.toThrow('Can only query Programs/Products for a Business Operation (type = Operation)');

      expect(prisma.product_programs.findMany).not.toHaveBeenCalled();
    });

    it('should throw error when querying for a Product instead of Operation', async () => {
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProduct);

      await expect(
        getProgramsAndProductsByOperation(mockProductId)
      ).rejects.toThrow('Can only query Programs/Products for a Business Operation (type = Operation)');

      expect(prisma.product_programs.findMany).not.toHaveBeenCalled();
    });

    it('should handle database errors during query', async () => {
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockOperation);
      (prisma.product_programs.findMany as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        getProgramsAndProductsByOperation(mockOperationId)
      ).rejects.toThrow('Database error');
    });

    it('should include counts for transitions and stakeholders', async () => {
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockOperation);
      (prisma.product_programs.findMany as jest.Mock).mockResolvedValue(mockProgramsAndProducts);

      const result = await getProgramsAndProductsByOperation(mockOperationId);

      expect(result[0]._count.transitions).toBe(5);
      expect(result[0]._count.product_program_stakeholders).toBe(3);
      expect(result[1]._count.transitions).toBe(2);
      expect(result[1]._count.product_program_stakeholders).toBe(4);
    });

    it('should sort results by business_operation_type then name', async () => {
      const unsortedData = [
        {
          ...mockProgramsAndProducts[1], // Product (comes second)
          name: 'ZZZ Product',
        },
        {
          ...mockProgramsAndProducts[0], // Program (comes first)
          name: 'AAA Program',
        },
      ];

      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockOperation);
      (prisma.product_programs.findMany as jest.Mock).mockResolvedValue(unsortedData);

      const result = await getProgramsAndProductsByOperation(mockOperationId);

      // Verify orderBy was called correctly
      expect(prisma.product_programs.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [
            { business_operation_type: 'asc' },
            { name: 'asc' }
          ]
        })
      );
    });
  });
});

import {
  createKnowledgeLink,
  getKnowledgeLinkById,
  getKnowledgeLinksByProductProgram,
  updateKnowledgeLink,
  deleteKnowledgeLink,
  searchKnowledgeLinksByItemId,
  canModifyKnowledgeLink,
  createKnowledgeLinkSchema,
  updateKnowledgeLinkSchema,
} from '../product-program-knowledge-link.service';
import { PrismaClient } from '@prisma/client';

// Mock Prisma Client
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    product_programs: {
      findUnique: jest.fn(),
    },
    product_program_knowledge_links: {
      create: jest.fn(),
      findFirst: jest.fn(),
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

describe('ProductProgramKnowledgeLinkService', () => {
  const mockUserId = 'test-user-id';
  const mockProductProgramId = 'test-product-program-id';
  const mockLinkId = 'test-link-id';
  const mockKnowledgeItemId = 'test-knowledge-item-id';

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

  const mockKnowledgeLink = {
    id: mockLinkId,
    product_program_id: mockProductProgramId,
    knowledge_item_id: mockKnowledgeItemId,
    link_type: 'Reference',
    linked_at: new Date('2025-01-01'),
    linked_by: mockUserId,
    users_product_program_knowledge_links_linked_byTousers: mockUser,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Validation Schemas', () => {
    describe('createKnowledgeLinkSchema', () => {
      it('should validate correct knowledge link data', () => {
        const validData = {
          knowledgeItemId: 'test-knowledge-item-id',
          linkType: 'Reference',
        };

        const result = createKnowledgeLinkSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should validate knowledge link data without linkType', () => {
        const validData = {
          knowledgeItemId: 'test-knowledge-item-id',
        };

        const result = createKnowledgeLinkSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should reject knowledge link with missing knowledgeItemId', () => {
        const invalidData = {
          linkType: 'Reference',
        };

        const result = createKnowledgeLinkSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it('should reject knowledge link with empty knowledgeItemId', () => {
        const invalidData = {
          knowledgeItemId: '',
        };

        const result = createKnowledgeLinkSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it('should reject knowledgeItemId exceeding 255 characters', () => {
        const invalidData = {
          knowledgeItemId: 'A'.repeat(256),
        };

        const result = createKnowledgeLinkSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it('should reject linkType exceeding 50 characters', () => {
        const invalidData = {
          knowledgeItemId: 'test-knowledge-item-id',
          linkType: 'A'.repeat(51),
        };

        const result = createKnowledgeLinkSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });
    });

    describe('updateKnowledgeLinkSchema', () => {
      it('should validate linkType update', () => {
        const validData = {
          linkType: 'Dependency',
        };

        const result = updateKnowledgeLinkSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should allow empty update object', () => {
        const result = updateKnowledgeLinkSchema.safeParse({});
        expect(result.success).toBe(true);
      });
    });
  });

  describe('createKnowledgeLink', () => {
    const createData = {
      knowledgeItemId: mockKnowledgeItemId,
      linkType: 'Reference',
    };

    it('should create a knowledge link successfully', async () => {
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
      (prisma.product_program_knowledge_links.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.product_program_knowledge_links.create as jest.Mock).mockResolvedValue(
        mockKnowledgeLink
      );

      const result = await createKnowledgeLink(mockProductProgramId, createData, mockUserId);

      expect(prisma.product_programs.findUnique).toHaveBeenCalledWith({
        where: { id: mockProductProgramId },
        select: { id: true, name: true },
      });
      expect(prisma.product_program_knowledge_links.findFirst).toHaveBeenCalledWith({
        where: {
          product_program_id: mockProductProgramId,
          knowledge_item_id: mockKnowledgeItemId,
        },
      });
      expect(prisma.product_program_knowledge_links.create).toHaveBeenCalled();
      expect(result.id).toBe(mockLinkId);
      expect(result.knowledgeItemId).toBe(mockKnowledgeItemId);
    });

    it('should create knowledge link without linkType', async () => {
      const minimalData = { knowledgeItemId: mockKnowledgeItemId };
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
      (prisma.product_program_knowledge_links.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.product_program_knowledge_links.create as jest.Mock).mockResolvedValue({
        ...mockKnowledgeLink,
        link_type: null,
      });

      const result = await createKnowledgeLink(mockProductProgramId, minimalData, mockUserId);

      expect(result.linkType).toBeNull();
    });

    it('should throw error if product/program not found', async () => {
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        createKnowledgeLink(mockProductProgramId, createData, mockUserId)
      ).rejects.toThrow('Product/Program not found');
    });

    it('should throw error if knowledge link already exists', async () => {
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
      (prisma.product_program_knowledge_links.findFirst as jest.Mock).mockResolvedValue(
        mockKnowledgeLink
      );

      await expect(
        createKnowledgeLink(mockProductProgramId, createData, mockUserId)
      ).rejects.toThrow('This knowledge item is already linked to this Product/Program');
    });

    it('should handle database errors', async () => {
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
      (prisma.product_program_knowledge_links.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.product_program_knowledge_links.create as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        createKnowledgeLink(mockProductProgramId, createData, mockUserId)
      ).rejects.toThrow('Database error');
    });
  });

  describe('getKnowledgeLinkById', () => {
    it('should fetch a knowledge link by ID successfully', async () => {
      (prisma.product_program_knowledge_links.findUnique as jest.Mock).mockResolvedValue(
        mockKnowledgeLink
      );

      const result = await getKnowledgeLinkById(mockLinkId);

      expect(prisma.product_program_knowledge_links.findUnique).toHaveBeenCalledWith({
        where: { id: mockLinkId },
        include: expect.any(Object),
      });
      expect(result.id).toBe(mockLinkId);
      expect(result.knowledgeItemId).toBe(mockKnowledgeItemId);
    });

    it('should throw error if knowledge link not found', async () => {
      (prisma.product_program_knowledge_links.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getKnowledgeLinkById('invalid-id')).rejects.toThrow(
        'Knowledge link not found'
      );
    });
  });

  describe('getKnowledgeLinksByProductProgram', () => {
    const mockKnowledgeLinks = [mockKnowledgeLink];

    it('should fetch all knowledge links for a product/program successfully', async () => {
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
      (prisma.product_program_knowledge_links.findMany as jest.Mock).mockResolvedValue(
        mockKnowledgeLinks
      );

      const result = await getKnowledgeLinksByProductProgram(mockProductProgramId);

      expect(prisma.product_programs.findUnique).toHaveBeenCalledWith({
        where: { id: mockProductProgramId },
        select: { id: true },
      });
      expect(prisma.product_program_knowledge_links.findMany).toHaveBeenCalledWith({
        where: { product_program_id: mockProductProgramId },
        include: expect.any(Object),
        orderBy: [{ linked_at: 'desc' }],
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockLinkId);
    });

    it('should return empty array if no knowledge links found', async () => {
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
      (prisma.product_program_knowledge_links.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getKnowledgeLinksByProductProgram(mockProductProgramId);

      expect(result).toEqual([]);
    });

    it('should throw error if product/program not found', async () => {
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getKnowledgeLinksByProductProgram(mockProductProgramId)).rejects.toThrow(
        'Product/Program not found'
      );
    });

    it('should handle database errors', async () => {
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
      (prisma.product_program_knowledge_links.findMany as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await expect(getKnowledgeLinksByProductProgram(mockProductProgramId)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('updateKnowledgeLink', () => {
    const updateData = {
      linkType: 'Dependency',
    };

    it('should update a knowledge link successfully', async () => {
      (prisma.product_program_knowledge_links.findUnique as jest.Mock).mockResolvedValue(
        mockKnowledgeLink
      );
      (prisma.product_program_knowledge_links.update as jest.Mock).mockResolvedValue({
        ...mockKnowledgeLink,
        link_type: 'Dependency',
      });

      const result = await updateKnowledgeLink(mockLinkId, updateData, mockUserId);

      expect(prisma.product_program_knowledge_links.findUnique).toHaveBeenCalled();
      expect(prisma.product_program_knowledge_links.update).toHaveBeenCalledWith({
        where: { id: mockLinkId },
        data: {
          link_type: 'Dependency',
        },
        include: expect.any(Object),
      });
      expect(result.linkType).toBe('Dependency');
    });

    it('should update link type to null', async () => {
      const nullData = { linkType: undefined };
      (prisma.product_program_knowledge_links.findUnique as jest.Mock).mockResolvedValue(
        mockKnowledgeLink
      );
      (prisma.product_program_knowledge_links.update as jest.Mock).mockResolvedValue({
        ...mockKnowledgeLink,
        link_type: null,
      });

      const result = await updateKnowledgeLink(mockLinkId, nullData, mockUserId);

      expect(result.linkType).toBeNull();
    });

    it('should throw error if knowledge link not found', async () => {
      (prisma.product_program_knowledge_links.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(updateKnowledgeLink('invalid-id', updateData, mockUserId)).rejects.toThrow(
        'Knowledge link not found'
      );
    });

    it('should handle database errors', async () => {
      (prisma.product_program_knowledge_links.findUnique as jest.Mock).mockResolvedValue(
        mockKnowledgeLink
      );
      (prisma.product_program_knowledge_links.update as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await expect(updateKnowledgeLink(mockLinkId, updateData, mockUserId)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('deleteKnowledgeLink', () => {
    it('should delete a knowledge link successfully', async () => {
      (prisma.product_program_knowledge_links.findUnique as jest.Mock).mockResolvedValue(
        mockKnowledgeLink
      );
      (prisma.product_program_knowledge_links.delete as jest.Mock).mockResolvedValue(
        mockKnowledgeLink
      );

      const result = await deleteKnowledgeLink(mockLinkId, mockUserId);

      expect(prisma.product_program_knowledge_links.findUnique).toHaveBeenCalled();
      expect(prisma.product_program_knowledge_links.delete).toHaveBeenCalledWith({
        where: { id: mockLinkId },
      });
      expect(result.message).toBe('Knowledge link deleted successfully');
    });

    it('should throw error if knowledge link not found', async () => {
      (prisma.product_program_knowledge_links.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(deleteKnowledgeLink('invalid-id', mockUserId)).rejects.toThrow(
        'Knowledge link not found'
      );
    });

    it('should handle database errors', async () => {
      (prisma.product_program_knowledge_links.findUnique as jest.Mock).mockResolvedValue(
        mockKnowledgeLink
      );
      (prisma.product_program_knowledge_links.delete as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await expect(deleteKnowledgeLink(mockLinkId, mockUserId)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('searchKnowledgeLinksByItemId', () => {
    const mockLinksWithProgram = [
      {
        ...mockKnowledgeLink,
        product_programs: mockProductProgram,
      },
    ];

    it('should search knowledge links by knowledge item ID successfully', async () => {
      (prisma.product_program_knowledge_links.findMany as jest.Mock).mockResolvedValue(
        mockLinksWithProgram
      );

      const result = await searchKnowledgeLinksByItemId(mockKnowledgeItemId);

      expect(prisma.product_program_knowledge_links.findMany).toHaveBeenCalledWith({
        where: { knowledge_item_id: mockKnowledgeItemId },
        include: expect.objectContaining({
          product_programs: {
            select: {
              id: true,
              name: true,
              description: true,
              business_operation_type: true,
            },
          },
        }),
        orderBy: [{ linked_at: 'desc' }],
      });
      expect(result).toHaveLength(1);
      expect(result[0].productProgram).toBeDefined();
      expect(result[0].productProgram.id).toBe(mockProductProgramId);
    });

    it('should return empty array if no links found for knowledge item', async () => {
      (prisma.product_program_knowledge_links.findMany as jest.Mock).mockResolvedValue([]);

      const result = await searchKnowledgeLinksByItemId(mockKnowledgeItemId);

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      (prisma.product_program_knowledge_links.findMany as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await expect(searchKnowledgeLinksByItemId(mockKnowledgeItemId)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('Permission Functions', () => {
    describe('canModifyKnowledgeLink', () => {
      it('should return true for Admin role', () => {
        expect(canModifyKnowledgeLink(['Admin'])).toBe(true);
      });

      it('should return true for Gov Program Director role', () => {
        expect(canModifyKnowledgeLink(['Gov Program Director'])).toBe(true);
      });

      it('should return true for Gov Program Manager role', () => {
        expect(canModifyKnowledgeLink(['Gov Program Manager'])).toBe(true);
      });

      it('should be case-insensitive', () => {
        expect(canModifyKnowledgeLink(['admin'])).toBe(true);
        expect(canModifyKnowledgeLink(['GOV PROGRAM DIRECTOR'])).toBe(true);
        expect(canModifyKnowledgeLink(['gov program manager'])).toBe(true);
      });

      it('should return true if user has multiple roles with one authorized', () => {
        expect(canModifyKnowledgeLink(['User', 'Admin', 'Viewer'])).toBe(true);
      });

      it('should return false for unauthorized roles', () => {
        expect(canModifyKnowledgeLink(['User'])).toBe(false);
        expect(canModifyKnowledgeLink(['Viewer'])).toBe(false);
        expect(canModifyKnowledgeLink(['Guest'])).toBe(false);
      });

      it('should return false for empty roles array', () => {
        expect(canModifyKnowledgeLink([])).toBe(false);
      });
    });
  });
});

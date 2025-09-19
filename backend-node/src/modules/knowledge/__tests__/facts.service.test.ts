import { FactsService } from '../facts.service';
import { KnowledgeService } from '../../../services/KnowledgeService';

// Mock Prisma client
const mockPrisma = {
  km_facts: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  km_documents: {
    findUnique: jest.fn(),
  },
  km_communications: {
    findUnique: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

// Mock the PrismaClient import
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

describe('FactsService', () => {
  let service: FactsService;
  let mockUserContext: any;
  let mockFactData: any;

  beforeEach(() => {
    service = new FactsService();
    mockUserContext = {
      userId: 'user-123',
      roles: ['user', 'reviewer'],
      clearanceLevel: 'UNCLASSIFIED',
    };

    mockFactData = {
      factType: 'ENTITY',
      content: 'Test fact content',
      summary: 'Test fact summary',
      confidence: 0.85,
      source: 'Test source',
      sourceEntityId: 'doc-123',
      sourceEntityType: 'DOCUMENT',
      metadata: { verified: true },
      approvalStatus: 'PENDING',
      securityClassification: 'UNCLASSIFIED',
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('createFact', () => {
    it('should create a fact with valid data', async () => {
      const mockCreatedFact = {
        id: 'fact-123',
        ...mockFactData,
        confidence: 0.935, // Adjusted confidence
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        users_extracted: [],
        users_approved: [],
        km_documents: [],
        km_communications: [],
      };

      mockPrisma.km_facts.create.mockResolvedValue(mockCreatedFact);

      const result = await service.createFact(mockFactData, mockUserContext.userId);

      expect(mockPrisma.km_facts.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          factType: 'Entity',
          content: 'Test fact content',
          confidence: expect.any(Number), // Adjusted confidence
          approvalStatus: 'Pending',
          securityClassification: 'Unclassified',
          isActive: true,
          extractedBy: 'user-123',
        }),
        include: expect.any(Object),
      });

      expect(result).toEqual(mockCreatedFact);
    });

    it('should adjust confidence based on metadata and source type', async () => {
      const factWithVerification = {
        ...mockFactData,
        confidence: 0.7,
        metadata: { verified: true },
        sourceEntityType: 'DOCUMENT',
      };

      mockPrisma.km_facts.create.mockResolvedValue({ id: 'fact-123' });

      await service.createFact(factWithVerification, mockUserContext.userId);

      // Expect confidence to be adjusted upward due to verification and document source
      // 0.7 * 1.1 (document) * 1.2 (verified) = 0.924
      expect(mockPrisma.km_facts.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          confidence: expect.closeTo(0.924, 2),
        }),
        include: expect.any(Object),
      });
    });

    it('should handle confidence bounds correctly', async () => {
      const highConfidenceFact = {
        ...mockFactData,
        confidence: 0.9,
        metadata: { verified: true },
        sourceEntityType: 'DOCUMENT',
      };

      mockPrisma.km_facts.create.mockResolvedValue({ id: 'fact-123' });

      await service.createFact(highConfidenceFact, mockUserContext.userId);

      // Should cap at 1.0
      expect(mockPrisma.km_facts.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          confidence: 1.0,
        }),
        include: expect.any(Object),
      });
    });
  });

  describe('validateSourceReference', () => {
    it('should validate document source reference', async () => {
      mockPrisma.km_documents.findUnique.mockResolvedValue({ id: 'doc-123' });

      const result = await service.validateSourceReference('doc-123', 'DOCUMENT');

      expect(result.valid).toBe(true);
      expect(mockPrisma.km_documents.findUnique).toHaveBeenCalledWith({
        where: { id: 'doc-123', isActive: true },
        select: { id: true },
      });
    });

    it('should validate communication source reference', async () => {
      mockPrisma.km_communications.findUnique.mockResolvedValue({ id: 'comm-123' });

      const result = await service.validateSourceReference('comm-123', 'COMMUNICATION');

      expect(result.valid).toBe(true);
      expect(mockPrisma.km_communications.findUnique).toHaveBeenCalledWith({
        where: { id: 'comm-123', isActive: true },
        select: { id: true },
      });
    });

    it('should return error for non-existent document', async () => {
      mockPrisma.km_documents.findUnique.mockResolvedValue(null);

      const result = await service.validateSourceReference('invalid-doc', 'DOCUMENT');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Source document with ID invalid-doc not found');
    });

    it('should allow other types without validation', async () => {
      const result = await service.validateSourceReference('other-123', 'OTHER');

      expect(result.valid).toBe(true);
      expect(mockPrisma.km_documents.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.km_communications.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('validateApprovalStatusTransition', () => {
    it('should allow valid transitions', async () => {
      const validTransitions = [
        { from: 'PENDING', to: 'UNDER_REVIEW' },
        { from: 'PENDING', to: 'APPROVED' },
        { from: 'UNDER_REVIEW', to: 'APPROVED' },
        { from: 'UNDER_REVIEW', to: 'REJECTED' },
        { from: 'REJECTED', to: 'PENDING' },
      ];

      validTransitions.forEach(({ from, to }) => {
        const result = service.validateApprovalStatusTransition(from, to, ['user']);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject invalid transitions', async () => {
      const result = service.validateApprovalStatusTransition('APPROVED', 'PENDING', ['user']);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid approval status transition');
    });

    it('should enforce role-based permissions for approval', async () => {
      const result = service.validateApprovalStatusTransition('PENDING', 'APPROVED', ['user']);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Insufficient permissions to approve facts');
    });

    it('should allow approval with proper role', async () => {
      const result = service.validateApprovalStatusTransition('PENDING', 'APPROVED', ['approver']);

      expect(result.valid).toBe(true);
    });

    it('should enforce role-based permissions for escalation', async () => {
      const result = service.validateApprovalStatusTransition('UNDER_REVIEW', 'ESCALATED', ['user']);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Insufficient permissions to escalate facts');
    });
  });

  describe('getFacts', () => {
    const mockQueryParams = {
      search: 'test',
      factType: 'ENTITY',
      approvalStatus: 'APPROVED',
      minConfidence: 0.7,
      maxConfidence: 1.0,
      limit: 20,
      offset: 0,
    };

    it('should retrieve facts with filters', async () => {
      const mockFacts = [
        {
          id: 'fact-1',
          factType: 'Entity',
          content: 'Test fact 1',
          confidence: 0.85,
          approvalStatus: 'Approved',
          securityClassification: 'Unclassified',
          users_extracted: [],
          users_approved: [],
          km_documents: [],
          km_communications: [],
        },
        {
          id: 'fact-2',
          factType: 'Entity',
          content: 'Test fact 2',
          confidence: 0.92,
          approvalStatus: 'Approved',
          securityClassification: 'Unclassified',
          users_extracted: [],
          users_approved: [],
          km_documents: [],
          km_communications: [],
        },
      ];

      mockPrisma.km_facts.count.mockResolvedValue(2);
      mockPrisma.km_facts.findMany.mockResolvedValue(mockFacts);

      // Mock security filtering
      jest.spyOn(service, 'applySecurityFilter').mockReturnValue(mockFacts);

      const result = await service.getFacts(mockQueryParams, mockUserContext);

      expect(mockPrisma.km_facts.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          isActive: true,
          factType: 'Entity',
          approvalStatus: 'Approved',
          confidence: {
            gte: 0.7,
            lte: 1.0,
          },
          OR: expect.arrayContaining([
            { content: { contains: 'test', mode: 'insensitive' } },
            { summary: { contains: 'test', mode: 'insensitive' } },
            { source: { contains: 'test', mode: 'insensitive' } },
          ]),
        }),
        include: expect.any(Object),
        orderBy: expect.any(Array),
        take: 20,
        skip: 0,
      });

      expect(result.facts).toEqual(mockFacts);
      expect(result.approvalStatistics).toEqual(
        expect.objectContaining({
          total: 2,
          byStatus: { Approved: 2 },
          byConfidenceRange: { high: 2, medium: 0, low: 0 },
          averageConfidence: 0.885,
        })
      );
    });

    it('should handle confidence range filtering', async () => {
      const queryWithConfidence = {
        ...mockQueryParams,
        minConfidence: 0.5,
        maxConfidence: 0.8,
      };

      mockPrisma.km_facts.count.mockResolvedValue(0);
      mockPrisma.km_facts.findMany.mockResolvedValue([]);
      jest.spyOn(service, 'applySecurityFilter').mockReturnValue([]);

      await service.getFacts(queryWithConfidence, mockUserContext);

      expect(mockPrisma.km_facts.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          confidence: {
            gte: 0.5,
            lte: 0.8,
          },
        }),
        include: expect.any(Object),
        orderBy: expect.any(Array),
        take: 20,
        skip: 0,
      });
    });
  });

  describe('getFactById', () => {
    it('should retrieve fact by ID with source context', async () => {
      const mockFact = {
        id: 'fact-123',
        factType: 'Entity',
        content: 'Test fact',
        confidence: 0.85,
        securityClassification: 'Unclassified',
        users_extracted: [],
        users_approved: [],
        km_documents: [{ id: 'doc-1', name: 'Test Document' }],
        km_communications: [],
      };

      mockPrisma.km_facts.findUnique.mockResolvedValue(mockFact);
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      jest.spyOn(service, 'applySecurityFilter').mockReturnValue([mockFact]);

      const result = await service.getFactById('fact-123', mockUserContext);

      expect(mockPrisma.km_facts.findUnique).toHaveBeenCalledWith({
        where: { id: 'fact-123', isActive: true },
        include: expect.any(Object),
      });

      expect(result).toEqual(
        expect.objectContaining({
          id: 'fact-123',
          approvalHistory: expect.any(Array),
        })
      );
    });

    it('should return null for non-existent fact', async () => {
      mockPrisma.km_facts.findUnique.mockResolvedValue(null);

      const result = await service.getFactById('non-existent', mockUserContext);

      expect(result).toBeNull();
    });

    it('should throw error for insufficient permissions', async () => {
      const mockFact = {
        id: 'fact-123',
        securityClassification: 'Secret',
      };

      mockPrisma.km_facts.findUnique.mockResolvedValue(mockFact);
      jest.spyOn(service, 'applySecurityFilter').mockReturnValue([]);

      await expect(
        service.getFactById('fact-123', mockUserContext)
      ).rejects.toThrow('User has insufficient permissions to access this fact');
    });
  });

  describe('updateFact', () => {
    const updateData = {
      content: 'Updated content',
      confidence: 0.9,
      approvalStatus: 'APPROVED',
    };

    it('should update fact successfully', async () => {
      const existingFact = {
        id: 'fact-123',
        content: 'Original content',
        confidence: 0.8,
        approvalStatus: 'Pending',
        metadata: {},
        sourceEntityType: 'Document',
      };

      const updatedFact = {
        ...existingFact,
        ...updateData,
        approvalStatus: 'Approved',
        approvedBy: 'user-123',
        approvedAt: expect.any(Date),
        updatedAt: new Date(),
      };

      mockPrisma.km_facts.findUnique.mockResolvedValue(existingFact);
      mockPrisma.km_facts.update.mockResolvedValue(updatedFact);

      const result = await service.updateFact('fact-123', updateData, mockUserContext.userId);

      expect(mockPrisma.km_facts.update).toHaveBeenCalledWith({
        where: { id: 'fact-123' },
        data: expect.objectContaining({
          content: 'Updated content',
          confidence: expect.any(Number),
          approvalStatus: 'Approved',
          approvedBy: 'user-123',
          approvedAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
        include: expect.any(Object),
      });

      expect(result).toEqual(updatedFact);
    });

    it('should recalculate confidence when updating', async () => {
      const existingFact = {
        id: 'fact-123',
        metadata: { verified: true },
        sourceEntityType: 'Document',
      };

      const updateWithConfidence = {
        confidence: 0.8,
      };

      mockPrisma.km_facts.findUnique.mockResolvedValue(existingFact);
      mockPrisma.km_facts.update.mockResolvedValue({});

      await service.updateFact('fact-123', updateWithConfidence, mockUserContext.userId);

      // Confidence should be adjusted: 0.8 * 1.1 (document) * 1.2 (verified) = 1.056 -> 1.0 (capped)
      expect(mockPrisma.km_facts.update).toHaveBeenCalledWith({
        where: { id: 'fact-123' },
        data: expect.objectContaining({
          confidence: 1.0,
        }),
        include: expect.any(Object),
      });
    });

    it('should clear approval metadata when changing from approved', async () => {
      const existingFact = {
        id: 'fact-123',
        approvalStatus: 'Approved',
        approvedBy: 'user-456',
        approvedAt: new Date(),
      };

      const updateToReview = {
        approvalStatus: 'UNDER_REVIEW',
      };

      mockPrisma.km_facts.findUnique.mockResolvedValue(existingFact);
      mockPrisma.km_facts.update.mockResolvedValue({});

      await service.updateFact('fact-123', updateToReview, mockUserContext.userId);

      expect(mockPrisma.km_facts.update).toHaveBeenCalledWith({
        where: { id: 'fact-123' },
        data: expect.objectContaining({
          approvalStatus: 'Under_Review',
          approvedBy: null,
          approvedAt: null,
        }),
        include: expect.any(Object),
      });
    });

    it('should throw error for non-existent fact', async () => {
      mockPrisma.km_facts.findUnique.mockResolvedValue(null);

      await expect(
        service.updateFact('non-existent', updateData, mockUserContext.userId)
      ).rejects.toThrow('Fact not found');
    });
  });

  describe('deleteFact', () => {
    it('should soft delete fact successfully', async () => {
      const existingFact = {
        id: 'fact-123',
        isActive: true,
      };

      mockPrisma.km_facts.findUnique.mockResolvedValue(existingFact);
      mockPrisma.km_facts.update.mockResolvedValue({ success: true });

      const result = await service.deleteFact('fact-123', mockUserContext.userId);

      expect(mockPrisma.km_facts.update).toHaveBeenCalledWith({
        where: { id: 'fact-123' },
        data: {
          isActive: false,
          updatedAt: expect.any(Date),
        },
      });

      expect(result).toEqual({ success: true });
    });

    it('should throw error for non-existent fact', async () => {
      mockPrisma.km_facts.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteFact('non-existent', mockUserContext.userId)
      ).rejects.toThrow('Fact not found');
    });
  });

  describe('bulkApproveFacts', () => {
    it('should approve multiple facts successfully', async () => {
      const factIds = ['fact-1', 'fact-2', 'fact-3'];
      const adminContext = {
        ...mockUserContext,
        roles: ['admin'],
      };

      // Mock successful updates
      mockPrisma.km_facts.findUnique.mockResolvedValue({ id: 'fact-1' });
      mockPrisma.km_facts.update.mockResolvedValue({ id: 'fact-1', approvalStatus: 'Approved' });

      const result = await service.bulkApproveFacts(factIds, mockUserContext.userId, adminContext);

      expect(result).toHaveLength(3);
      result.forEach((res, index) => {
        expect(res).toEqual({
          factId: factIds[index],
          success: true,
          fact: expect.any(Object),
        });
      });
    });

    it('should handle partial failures in bulk approval', async () => {
      const factIds = ['fact-1', 'invalid-fact'];
      const adminContext = {
        ...mockUserContext,
        roles: ['admin'],
      };

      // Mock one success, one failure
      mockPrisma.km_facts.findUnique
        .mockResolvedValueOnce({ id: 'fact-1' })
        .mockResolvedValueOnce(null);
      mockPrisma.km_facts.update.mockResolvedValue({ id: 'fact-1' });

      const result = await service.bulkApproveFacts(factIds, mockUserContext.userId, adminContext);

      expect(result).toEqual([
        {
          factId: 'fact-1',
          success: true,
          fact: expect.any(Object),
        },
        {
          factId: 'invalid-fact',
          success: false,
          error: 'Fact not found',
        },
      ]);
    });

    it('should reject bulk approval for insufficient permissions', async () => {
      const factIds = ['fact-1'];
      const unauthorizedContext = {
        ...mockUserContext,
        roles: ['user'],
      };

      await expect(
        service.bulkApproveFacts(factIds, mockUserContext.userId, unauthorizedContext)
      ).rejects.toThrow('Insufficient permissions to approve facts');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty search results', async () => {
      mockPrisma.km_facts.count.mockResolvedValue(0);
      mockPrisma.km_facts.findMany.mockResolvedValue([]);
      jest.spyOn(service, 'applySecurityFilter').mockReturnValue([]);

      const result = await service.getFacts(
        { limit: 20, offset: 0 },
        mockUserContext
      );

      expect(result.facts).toEqual([]);
      expect(result.approvalStatistics.total).toBe(0);
    });

    it('should handle confidence score edge cases', async () => {
      const edgeCases = [
        { confidence: 0.0 },
        { confidence: 1.0 },
        { confidence: 0.5 },
      ];

      edgeCases.forEach(async (testCase) => {
        mockPrisma.km_facts.create.mockResolvedValue({ id: 'fact-123' });

        await service.createFact(
          { ...mockFactData, ...testCase },
          mockUserContext.userId
        );

        expect(mockPrisma.km_facts.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            confidence: expect.any(Number),
          }),
          include: expect.any(Object),
        });
      });
    });

    it('should handle malformed enum mappings gracefully', async () => {
      const malformedData = {
        factType: 'INVALID_TYPE',
        content: 'Test content',
        confidence: 0.8,
        approvalStatus: 'INVALID_STATUS',
        securityClassification: 'INVALID_CLASSIFICATION',
      };

      mockPrisma.km_facts.create.mockResolvedValue({
        id: 'fact-123',
        factType: 'Other',
        approvalStatus: 'Pending',
        securityClassification: 'Unclassified',
      });

      await service.createFact(malformedData as any, mockUserContext.userId);

      expect(mockPrisma.km_facts.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          factType: 'Other',
          approvalStatus: 'Pending',
          securityClassification: 'Unclassified',
        }),
        include: expect.any(Object),
      });
    });
  });
});
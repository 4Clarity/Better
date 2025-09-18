import { ApprovalQueueService } from '../ApprovalQueueService';

// Mock the entire Prisma module
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    km_facts: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  })),
}));

// Get reference to the mock functions after mocking
const mockPrismaKmFacts = {
  findMany: jest.fn(),
  findUnique: jest.fn(),
  update: jest.fn(),
  count: jest.fn(),
  aggregate: jest.fn(),
};

const mockPrismaAuditLog = {
  create: jest.fn(),
  findMany: jest.fn(),
};

describe('ApprovalQueueService', () => {
  let approvalQueueService: ApprovalQueueService;
  let userContext: any;

  beforeEach(() => {
    approvalQueueService = new ApprovalQueueService();
    userContext = {
      userId: 'user-1',
      roles: ['Knowledge_Manager'],
      clearanceLevel: 'SECRET',
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getApprovalQueue', () => {
    it('should return facts pending approval with pagination', async () => {
      // Arrange
      const mockFacts = [
        {
          id: 'fact-1',
          title: 'Test Fact 1',
          content: 'Test content 1',
          factType: 'Technical_Specification',
          confidence: 0.85,
          approvalStatus: 'Pending',
          securityClassification: 'Unclassified',
          extractedAt: new Date(),
          source_document: { id: 'doc-1', name: 'Test Doc' },
          users_extracted: { id: 'user-1', firstName: 'John', lastName: 'Doe' },
        },
        {
          id: 'fact-2',
          title: 'Test Fact 2',
          content: 'Test content 2',
          factType: 'Process_Description',
          confidence: 0.92,
          approvalStatus: 'Under_Review',
          securityClassification: 'Confidential',
          extractedAt: new Date(),
          source_communication: { id: 'comm-1', subject: 'Test Email' },
          users_extracted: { id: 'user-2', firstName: 'Jane', lastName: 'Smith' },
        },
      ];

      mockPrismaKmFacts.count.mockResolvedValue(25);
      mockPrismaKmFacts.findMany.mockResolvedValue(mockFacts);
      mockPrismaKmFacts.count
        .mockResolvedValueOnce(10) // totalPending
        .mockResolvedValueOnce(8)  // totalUnderReview
        .mockResolvedValueOnce(5); // totalNeedsReview
      mockPrismaKmFacts.aggregate.mockResolvedValue({ _avg: { confidence: 0.85 } });

      // Act
      const result = await approvalQueueService.getApprovalQueue(
        { status: ['Pending', 'Under_Review'] },
        { limit: 20, offset: 0 },
        userContext
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.facts).toHaveLength(2);
      expect(result.facts[0].id).toBe('fact-1');
      expect(result.facts[1].id).toBe('fact-2');
      expect(result.pagination.total).toBe(2);
      expect(result.summary.totalPending).toBe(10);
      expect(result.summary.avgConfidence).toBe(0.85);

      // Verify correct query was built
      expect(mockPrismaKmFacts.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          approvalStatus: ['Pending', 'Under_Review'],
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
      });
    });

    it('should apply confidence filtering', async () => {
      // Arrange
      mockPrismaKmFacts.count.mockResolvedValue(5);
      mockPrismaKmFacts.findMany.mockResolvedValue([]);
      mockPrismaKmFacts.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockPrismaKmFacts.aggregate.mockResolvedValue({ _avg: { confidence: 0 } });

      const filters = {
        confidence: { min: 0.8, max: 0.95 },
      };

      // Act
      await approvalQueueService.getApprovalQueue(filters, {}, userContext);

      // Assert
      expect(mockPrismaKmFacts.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          approvalStatus: ['Pending', 'Under_Review', 'Needs_Review'],
          confidence: {
            gte: 0.8,
            lte: 0.95,
          },
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
      });
    });

    it('should apply search filtering', async () => {
      // Arrange
      mockPrismaKmFacts.count.mockResolvedValue(3);
      mockPrismaKmFacts.findMany.mockResolvedValue([]);
      mockPrismaKmFacts.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockPrismaKmFacts.aggregate.mockResolvedValue({ _avg: { confidence: 0 } });

      const filters = { search: 'technical specification' };

      // Act
      await approvalQueueService.getApprovalQueue(filters, {}, userContext);

      // Assert
      expect(mockPrismaKmFacts.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          approvalStatus: ['Pending', 'Under_Review', 'Needs_Review'],
          OR: [
            { title: { contains: 'technical specification', mode: 'insensitive' } },
            { content: { contains: 'technical specification', mode: 'insensitive' } },
            { summary: { contains: 'technical specification', mode: 'insensitive' } },
          ],
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
      });
    });
  });

  describe('getFactForReview', () => {
    it('should return fact with full context for review', async () => {
      // Arrange
      const mockFact = {
        id: 'fact-1',
        title: 'Test Fact',
        content: 'Test content',
        approvalStatus: 'Pending',
        securityClassification: 'Unclassified',
        source_document: { id: 'doc-1', name: 'Test Doc' },
        km_fact_tags: [{ tag: { name: 'technical' } }],
      };

      const mockRelatedFacts = [
        {
          id: 'fact-2',
          title: 'Related Fact',
          factType: 'Technical_Specification',
          securityClassification: 'Unclassified',
        },
      ];

      const mockAuditHistory = [
        { id: 'audit-1', action: 'EXTRACT_FACT', timestamp: new Date() },
      ];

      mockPrismaKmFacts.findUnique.mockResolvedValue(mockFact);
      mockPrismaKmFacts.findMany.mockResolvedValue(mockRelatedFacts);
      mockPrismaAuditLog.findMany.mockResolvedValue(mockAuditHistory);

      // Act
      const result = await approvalQueueService.getFactForReview('fact-1', userContext);

      // Assert
      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      if (result) {
        expect(result.id).toBe('fact-1');
        expect(result.relatedFacts).toHaveLength(1);
        expect(result.approvalHistory).toHaveLength(1);
        expect(result.allowedTransitions).toBeDefined();
        expect(Array.isArray(result.allowedTransitions)).toBe(true);
      }

      expect(mockPrismaKmFacts.findUnique).toHaveBeenCalledWith({
        where: { id: 'fact-1', isActive: true },
        include: expect.any(Object),
      });
    });

    it('should return null if fact not found', async () => {
      // Arrange
      mockPrismaKmFacts.findUnique.mockResolvedValue(null);

      // Act
      const result = await approvalQueueService.getFactForReview('nonexistent', userContext);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('approveFact', () => {
    it('should approve a fact successfully', async () => {
      // Arrange
      const mockFact = {
        id: 'fact-1',
        approvalStatus: 'Pending',
      };

      const mockUpdatedFact = {
        ...mockFact,
        approvalStatus: 'Approved',
        approvedBy: 'user-1',
        approvedAt: new Date(),
      };

      mockPrismaKmFacts.findUnique.mockResolvedValue(mockFact);
      mockPrismaKmFacts.update.mockResolvedValue(mockUpdatedFact);
      mockPrismaAuditLog.create.mockResolvedValue({});

      const decision = {
        factId: 'fact-1',
        action: 'approve' as const,
        comments: 'Looks good to approve',
      };

      // Act
      const result = await approvalQueueService.approveFact(
        'fact-1',
        decision,
        'user-1',
        ['Knowledge_Manager']
      );

      // Assert
      expect(result.approvalStatus).toBe('Approved');
      expect(mockPrismaKmFacts.update).toHaveBeenCalledWith({
        where: { id: 'fact-1' },
        data: {
          approvalStatus: 'Approved',
          approvedBy: 'user-1',
          approvedAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
        include: expect.any(Object),
      });
    });

    it('should throw error for insufficient permissions', async () => {
      // Arrange
      const mockFact = {
        id: 'fact-1',
        approvalStatus: 'Pending',
      };

      mockPrismaKmFacts.findUnique.mockResolvedValue(mockFact);

      const decision = {
        factId: 'fact-1',
        action: 'approve' as const,
      };

      // Act & Assert
      await expect(
        approvalQueueService.approveFact(
          'fact-1',
          decision,
          'user-1',
          ['Basic_User'] // Insufficient role
        )
      ).rejects.toThrow('User does not have required role');
    });
  });

  describe('bulkApproval', () => {
    it('should process bulk approval successfully', async () => {
      // Arrange
      const bulkRequest = {
        factIds: ['fact-1', 'fact-2'],
        action: 'approve' as const,
        comments: 'Bulk approval test',
      };

      // Mock successful approvals
      jest.spyOn(approvalQueueService, 'approveFact')
        .mockResolvedValueOnce({ id: 'fact-1', approvalStatus: 'Approved' } as any)
        .mockResolvedValueOnce({ id: 'fact-2', approvalStatus: 'Approved' } as any);

      // Act
      const result = await approvalQueueService.bulkApproval(
        bulkRequest,
        'user-1',
        ['Knowledge_Manager']
      );

      // Assert
      expect(result.summary.total).toBe(2);
      expect(result.summary.successful).toBe(2);
      expect(result.summary.failed).toBe(0);
      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
    });

    it('should handle partial failures in bulk operations', async () => {
      // Arrange
      const bulkRequest = {
        factIds: ['fact-1', 'fact-2', 'fact-3'],
        action: 'approve' as const,
        comments: 'Bulk approval test',
      };

      // Mock mixed results
      jest.spyOn(approvalQueueService, 'approveFact')
        .mockResolvedValueOnce({ id: 'fact-1', approvalStatus: 'Approved' } as any)
        .mockRejectedValueOnce(new Error('Invalid transition'))
        .mockResolvedValueOnce({ id: 'fact-3', approvalStatus: 'Approved' } as any);

      // Act
      const result = await approvalQueueService.bulkApproval(
        bulkRequest,
        'user-1',
        ['Knowledge_Manager']
      );

      // Assert
      expect(result.summary.total).toBe(3);
      expect(result.summary.successful).toBe(2);
      expect(result.summary.failed).toBe(1);
      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toBe('Invalid transition');
    });
  });

  describe('checkAutoApproval', () => {
    it('should return true for high-confidence technical specifications', async () => {
      // Arrange
      const mockFact = {
        id: 'fact-1',
        factType: 'Technical_Specification',
        confidence: 0.95,
        approvalStatus: 'Pending',
      } as any;

      // Act
      const result = await approvalQueueService.checkAutoApproval(
        mockFact,
        ['Program_Manager']
      );

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for low-confidence facts', async () => {
      // Arrange
      const mockFact = {
        id: 'fact-1',
        factType: 'Technical_Specification',
        confidence: 0.6, // Below threshold
        approvalStatus: 'Pending',
      } as any;

      // Act
      const result = await approvalQueueService.checkAutoApproval(
        mockFact,
        ['Program_Manager']
      );

      // Assert
      expect(result).toBe(false);
    });
  });
});
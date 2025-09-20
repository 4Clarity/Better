import { FastifyRequest, FastifyReply } from 'fastify';
import {
  getApprovalQueueHandler,
  getFactForReviewHandler,
  approveFactHandler,
  rejectFactHandler,
  updateApprovalStatusHandler,
  bulkApprovalHandler,
  getApprovalStatsHandler,
} from '../approval-queue.controller';
import { ApprovalQueueService } from '../../../services/ApprovalQueueService';

// Mock the ApprovalQueueService
jest.mock('../../../services/ApprovalQueueService');

const MockedApprovalQueueService = ApprovalQueueService as jest.MockedClass<typeof ApprovalQueueService>;

describe('ApprovalQueue Controller', () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  let mockService: any;

  beforeEach(() => {
    mockRequest = {
      log: {
        error: jest.fn(),
        info: jest.fn(),
      } as any,
      user: {
        id: 'user-1',
        roles: ['Knowledge_Manager'],
        clearanceLevel: 'SECRET',
      },
    };

    mockReply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    mockService = {
      extractUserContext: jest.fn().mockReturnValue({
        userId: 'user-1',
        roles: ['Knowledge_Manager'],
        clearanceLevel: 'SECRET',
      }),
      validateUserAccess: jest.fn().mockReturnValue(true),
      getApprovalQueue: jest.fn(),
      getFactForReview: jest.fn(),
      approveFact: jest.fn(),
      updateApprovalStatus: jest.fn(),
      bulkApproval: jest.fn(),
      createAuditLog: jest.fn(),
    };

    MockedApprovalQueueService.mockImplementation(() => mockService);

    jest.clearAllMocks();
  });

  describe('getApprovalQueueHandler', () => {
    it('should return approval queue successfully', async () => {
      // Arrange
      const mockQuery = {
        status: ['Pending'],
        limit: 20,
        offset: 0,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      const mockResult = {
        facts: [
          {
            id: 'fact-1',
            title: 'Test Fact',
            confidence: 0.85,
            approvalStatus: 'Pending',
          },
        ],
        pagination: { total: 1, limit: 20, offset: 0, hasMore: false },
        summary: { totalPending: 1, totalUnderReview: 0, avgConfidence: 0.85 },
      };

      mockRequest.query = mockQuery;
      mockService.getApprovalQueue.mockResolvedValue(mockResult);

      // Act
      await getApprovalQueueHandler(mockRequest as any, mockReply as any);

      // Assert
      expect(mockService.extractUserContext).toHaveBeenCalledWith(mockRequest);
      expect(mockService.validateUserAccess).toHaveBeenCalledWith(
        ['Knowledge_Manager'],
        'READ',
        'READ'
      );
      expect(mockService.getApprovalQueue).toHaveBeenCalledWith(
        {
          status: ['Pending'],
          confidence: undefined,
          factType: undefined,
          sourceType: undefined,
          dateRange: undefined,
          reviewer: undefined,
          submitter: undefined,
          securityClassification: undefined,
          search: undefined,
        },
        {
          sortBy: 'createdAt',
          sortOrder: 'desc',
          limit: 20,
          offset: 0,
        },
        mockService.extractUserContext()
      );
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith(mockResult);
    });

    it('should return 403 for insufficient permissions', async () => {
      // Arrange
      mockRequest.query = {};
      mockService.validateUserAccess.mockReturnValue(false);

      // Act
      await getApprovalQueueHandler(mockRequest as any, mockReply as any);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions to access approval queue',
      });
    });

    it('should apply confidence filters correctly', async () => {
      // Arrange
      const mockQuery = {
        minConfidence: 0.8,
        maxConfidence: 0.95,
      };

      mockRequest.query = mockQuery;
      mockService.getApprovalQueue.mockResolvedValue({
        facts: [],
        pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
        summary: {},
      });

      // Act
      await getApprovalQueueHandler(mockRequest as any, mockReply as any);

      // Assert
      expect(mockService.getApprovalQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          confidence: { min: 0.8, max: 0.95 },
        }),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should handle service errors', async () => {
      // Arrange
      mockRequest.query = {};
      mockService.getApprovalQueue.mockRejectedValue(new Error('Database error'));

      // Act
      await getApprovalQueueHandler(mockRequest as any, mockReply as any);

      // Assert
      expect(mockRequest.log.error).toHaveBeenCalledWith('GetApprovalQueue error:', expect.any(Error));
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Database error',
      });
    });
  });

  describe('getFactForReviewHandler', () => {
    it('should return fact for review successfully', async () => {
      // Arrange
      const mockFact = {
        id: 'fact-1',
        title: 'Test Fact',
        content: 'Test content',
        relatedFacts: [],
        approvalHistory: [],
        allowedTransitions: [],
      };

      mockRequest.params = { id: 'fact-1' };
      mockService.getFactForReview.mockResolvedValue(mockFact);

      // Act
      await getFactForReviewHandler(mockRequest as any, mockReply as any);

      // Assert
      expect(mockService.getFactForReview).toHaveBeenCalledWith(
        'fact-1',
        mockService.extractUserContext()
      );
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith(mockFact);
    });

    it('should return 404 if fact not found', async () => {
      // Arrange
      mockRequest.params = { id: 'nonexistent' };
      mockService.getFactForReview.mockResolvedValue(null);

      // Act
      await getFactForReviewHandler(mockRequest as any, mockReply as any);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({
        statusCode: 404,
        error: 'Not Found',
        message: 'Fact not found or access denied',
      });
    });

    it('should return 403 for insufficient permissions', async () => {
      // Arrange
      mockRequest.params = { id: 'fact-1' };
      mockService.validateUserAccess.mockReturnValue(false);

      // Act
      await getFactForReviewHandler(mockRequest as any, mockReply as any);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions to access this fact',
      });
    });
  });

  describe('approveFactHandler', () => {
    it('should approve fact successfully', async () => {
      // Arrange
      const mockUpdatedFact = {
        id: 'fact-1',
        approvalStatus: 'Approved',
        approvedBy: 'user-1',
      };

      mockRequest.params = { id: 'fact-1' };
      mockRequest.body = { comments: 'Approved for accuracy' };
      mockService.approveFact.mockResolvedValue(mockUpdatedFact);

      // Act
      await approveFactHandler(mockRequest as any, mockReply as any);

      // Assert
      expect(mockService.approveFact).toHaveBeenCalledWith(
        'fact-1',
        {
          factId: 'fact-1',
          action: 'approve',
          comments: 'Approved for accuracy',
          metadata: undefined,
        },
        'user-1',
        ['Knowledge_Manager']
      );
      expect(mockService.createAuditLog).toHaveBeenCalledWith(
        'user-1',
        'APPROVE_FACT',
        'km_facts',
        'fact-1',
        undefined,
        { comments: 'Approved for accuracy', metadata: undefined }
      );
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'Fact approved successfully',
        fact: mockUpdatedFact,
      });
    });

    it('should return 403 for insufficient permissions', async () => {
      // Arrange
      mockRequest.params = { id: 'fact-1' };
      mockRequest.body = {};
      mockService.validateUserAccess.mockReturnValue(false);

      // Act
      await approveFactHandler(mockRequest as any, mockReply as any);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions to approve facts',
      });
    });

    it('should handle approval errors', async () => {
      // Arrange
      mockRequest.params = { id: 'fact-1' };
      mockRequest.body = {};
      mockService.approveFact.mockRejectedValue(new Error('Invalid transition'));

      // Act
      await approveFactHandler(mockRequest as any, mockReply as any);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid transition',
      });
    });
  });

  describe('rejectFactHandler', () => {
    it('should reject fact successfully', async () => {
      // Arrange
      const mockUpdatedFact = {
        id: 'fact-1',
        approvalStatus: 'Rejected',
        rejectionReason: 'Inaccurate data',
      };

      mockRequest.params = { id: 'fact-1' };
      mockRequest.body = {
        reason: 'Inaccurate data',
        comments: 'Source verification failed',
        feedback: { category: 'accuracy' },
      };
      mockService.approveFact.mockResolvedValue(mockUpdatedFact);

      // Act
      await rejectFactHandler(mockRequest as any, mockReply as any);

      // Assert
      expect(mockService.approveFact).toHaveBeenCalledWith(
        'fact-1',
        {
          factId: 'fact-1',
          action: 'reject',
          reason: 'Inaccurate data',
          comments: 'Source verification failed',
          metadata: { feedback: { category: 'accuracy' } },
        },
        'user-1',
        ['Knowledge_Manager']
      );
      expect(mockReply.status).toHaveBeenCalledWith(200);
    });

    it('should return 403 for insufficient permissions', async () => {
      // Arrange
      mockRequest.params = { id: 'fact-1' };
      mockRequest.body = { reason: 'Test' };
      mockService.validateUserAccess.mockReturnValue(false);

      // Act
      await rejectFactHandler(mockRequest as any, mockReply as any);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions to reject facts',
      });
    });
  });

  describe('updateApprovalStatusHandler', () => {
    it('should update approval status successfully', async () => {
      // Arrange
      const mockUpdatedFact = {
        id: 'fact-1',
        approvalStatus: 'Under_Review',
        reviewedBy: 'user-1',
      };

      mockRequest.params = { id: 'fact-1' };
      mockRequest.body = { status: 'Under_Review', comments: 'Taking for review' };
      mockService.updateApprovalStatus.mockResolvedValue(mockUpdatedFact);

      // Act
      await updateApprovalStatusHandler(mockRequest as any, mockReply as any);

      // Assert
      expect(mockService.updateApprovalStatus).toHaveBeenCalledWith(
        'fact-1',
        'Under_Review',
        'user-1',
        ['Knowledge_Manager'],
        'Taking for review'
      );
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'Approval status updated successfully',
        fact: mockUpdatedFact,
      });
    });
  });

  describe('bulkApprovalHandler', () => {
    it('should process bulk approval successfully', async () => {
      // Arrange
      const mockResult = {
        successful: [
          { factId: 'fact-1', success: true, result: { id: 'fact-1' } },
          { factId: 'fact-2', success: true, result: { id: 'fact-2' } },
        ],
        failed: [],
        summary: { total: 2, successful: 2, failed: 0 },
      };

      mockRequest.body = {
        factIds: ['fact-1', 'fact-2'],
        action: 'approve',
        comments: 'Bulk approval',
      };
      mockService.bulkApproval.mockResolvedValue(mockResult);

      // Act
      await bulkApprovalHandler(mockRequest as any, mockReply as any);

      // Assert
      expect(mockService.bulkApproval).toHaveBeenCalledWith(
        mockRequest.body,
        'user-1',
        ['Knowledge_Manager']
      );
      expect(mockService.createAuditLog).toHaveBeenCalledWith(
        'user-1',
        'BULK_APPROVE_FACTS',
        'km_facts',
        'bulk_operation',
        undefined,
        expect.objectContaining({
          action: 'approve',
          factIds: ['fact-1', 'fact-2'],
          summary: mockResult.summary,
        })
      );
      expect(mockReply.status).toHaveBeenCalledWith(200);
    });

    it('should reject bulk operations exceeding limit', async () => {
      // Arrange
      const factIds = Array.from({ length: 51 }, (_, i) => `fact-${i + 1}`);
      mockRequest.body = {
        factIds,
        action: 'approve',
      };

      // Act
      await bulkApprovalHandler(mockRequest as any, mockReply as any);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Bulk operations are limited to 50 facts at a time',
      });
    });

    it('should return 403 for insufficient permissions', async () => {
      // Arrange
      mockRequest.body = {
        factIds: ['fact-1'],
        action: 'approve',
      };
      mockService.validateUserAccess.mockReturnValue(false);

      // Act
      await bulkApprovalHandler(mockRequest as any, mockReply as any);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions to approve facts in bulk',
      });
    });
  });

  describe('getApprovalStatsHandler', () => {
    it('should return approval statistics successfully', async () => {
      // Arrange
      const mockStats = {
        summary: {
          totalPending: 15,
          totalUnderReview: 8,
          totalNeedsReview: 5,
          avgConfidence: 0.82,
        },
      };

      mockService.getApprovalQueue.mockResolvedValue(mockStats);

      // Act
      await getApprovalStatsHandler(mockRequest as any, mockReply as any);

      // Assert
      expect(mockService.getApprovalQueue).toHaveBeenCalledWith(
        {}, // No filters for all stats
        { limit: 1, offset: 0 }, // Just get summary
        mockService.extractUserContext()
      );
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          totalPending: 15,
          totalUnderReview: 8,
          avgConfidence: 0.82,
        })
      );
    });

    it('should return 403 for insufficient permissions', async () => {
      // Arrange
      mockService.validateUserAccess.mockReturnValue(false);

      // Act
      await getApprovalStatsHandler(mockRequest as any, mockReply as any);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions to view approval statistics',
      });
    });

    it('should handle service errors', async () => {
      // Arrange
      mockService.getApprovalQueue.mockRejectedValue(new Error('Database error'));

      // Act
      await getApprovalStatsHandler(mockRequest as any, mockReply as any);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Database error',
      });
    });
  });

  describe('Input Validation', () => {
    it('should handle missing required parameters', async () => {
      // Arrange
      mockRequest.params = {}; // Missing id
      mockRequest.body = {};

      // Act
      await getFactForReviewHandler(mockRequest as any, mockReply as any);

      // Assert - The validation would happen at the route level in real scenarios
      // Here we test that the handler can cope with undefined params
      expect(mockService.getFactForReview).toHaveBeenCalledWith(
        undefined,
        expect.any(Object)
      );
    });

    it('should handle empty bulk request', async () => {
      // Arrange
      mockRequest.body = {
        factIds: [],
        action: 'approve',
      };

      // Act
      await bulkApprovalHandler(mockRequest as any, mockReply as any);

      // Assert - Would be caught by Zod validation at route level
      expect(mockService.bulkApproval).toHaveBeenCalledWith(
        mockRequest.body,
        'user-1',
        ['Knowledge_Manager']
      );
    });
  });

  describe('Authentication Context', () => {
    it('should extract user context correctly', async () => {
      // Arrange
      mockRequest.query = {};
      mockService.getApprovalQueue.mockResolvedValue({
        facts: [],
        pagination: { total: 0 },
        summary: {},
      });

      // Act
      await getApprovalQueueHandler(mockRequest as any, mockReply as any);

      // Assert
      expect(mockService.extractUserContext).toHaveBeenCalledWith(mockRequest);
      expect(mockService.getApprovalQueue).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        {
          userId: 'user-1',
          roles: ['Knowledge_Manager'],
          clearanceLevel: 'SECRET',
        }
      );
    });

    it('should validate user permissions for each operation', async () => {
      // Arrange
      const testCases = [
        { handler: getApprovalQueueHandler, permission: 'READ' },
        { handler: approveFactHandler, permission: 'APPROVE' },
        { handler: rejectFactHandler, permission: 'REJECT' },
        { handler: updateApprovalStatusHandler, permission: 'Pending' },
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();
        mockRequest.query = {};
        mockRequest.params = { id: 'fact-1' };
        mockRequest.body = { status: 'Pending', reason: 'test' };

        // Act
        await testCase.handler(mockRequest as any, mockReply as any);

        // Assert
        expect(mockService.validateUserAccess).toHaveBeenCalled();
      }
    });
  });
});
import { CommunicationsService } from '../communications.service';
import { KnowledgeService } from '../../../services/KnowledgeService';

// Mock Prisma client
const mockPrisma = {
  km_communications: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
};

// Mock the PrismaClient import
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

describe('CommunicationsService', () => {
  let service: CommunicationsService;
  let mockUserContext: any;
  let mockCommunicationData: any;

  beforeEach(() => {
    service = new CommunicationsService();
    mockUserContext = {
      userId: 'user-123',
      roles: ['user'],
      clearanceLevel: 'UNCLASSIFIED',
    };

    mockCommunicationData = {
      platform: 'EMAIL',
      direction: 'INBOUND',
      content: 'Test communication content',
      contentType: 'TEXT',
      securityClassification: 'UNCLASSIFIED',
      processingStatus: 'PENDING',
      participants: ['user1', 'user2'],
      externalParticipants: ['external@example.com'],
      recipientEmails: ['recipient@example.com'],
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('createCommunication', () => {
    it('should create a communication with valid data', async () => {
      const mockCreatedCommunication = {
        id: 'comm-123',
        ...mockCommunicationData,
        threadId: 'ema_1234567890',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        km_facts: [],
      };

      mockPrisma.km_communications.create.mockResolvedValue(mockCreatedCommunication);

      const result = await service.createCommunication(mockCommunicationData, mockUserContext.userId);

      expect(mockPrisma.km_communications.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          platform: 'Email',
          direction: 'Inbound',
          content: 'Test communication content',
          contentType: 'Text',
          securityClassification: 'Unclassified',
          processingStatus: 'Pending',
          isActive: true,
        }),
        include: expect.any(Object),
      });

      expect(result).toEqual(mockCreatedCommunication);
    });

    it('should generate thread ID when not provided', async () => {
      const mockCreatedCommunication = {
        id: 'comm-123',
        threadId: expect.stringMatching(/^ema_/),
        km_facts: [],
      };

      mockPrisma.km_communications.create.mockResolvedValue(mockCreatedCommunication);

      await service.createCommunication(mockCommunicationData, mockUserContext.userId);

      expect(mockPrisma.km_communications.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          threadId: expect.stringMatching(/^ema_/),
        }),
        include: expect.any(Object),
      });
    });

    it('should validate EMAIL platform requires external participants', async () => {
      const emailDataWithoutExternal = {
        ...mockCommunicationData,
        platform: 'EMAIL',
        externalParticipants: [],
      };

      await expect(
        service.createCommunication(emailDataWithoutExternal, mockUserContext.userId)
      ).rejects.toThrow('Email communications require at least one external participant');
    });

    it('should validate INTERNAL platform cannot have external participants', async () => {
      const internalDataWithExternal = {
        ...mockCommunicationData,
        platform: 'OTHER',
        direction: 'INTERNAL',
        externalParticipants: ['external@example.com'],
      };

      await expect(
        service.createCommunication(internalDataWithExternal, mockUserContext.userId)
      ).rejects.toThrow('Internal communications should not have external participants');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.km_communications.create.mockRejectedValue(new Error('Database error'));

      await expect(
        service.createCommunication(mockCommunicationData, mockUserContext.userId)
      ).rejects.toThrow('Database error');
    });
  });

  describe('getCommunications', () => {
    const mockQueryParams = {
      search: 'test',
      platform: 'EMAIL',
      direction: 'INBOUND',
      limit: 20,
      offset: 0,
    };

    it('should retrieve communications with filters', async () => {
      const mockCommunications = [
        {
          id: 'comm-1',
          platform: 'Email',
          direction: 'Inbound',
          content: 'Test content 1',
          securityClassification: 'Unclassified',
          threadId: 'thread-1',
          km_facts: [],
        },
        {
          id: 'comm-2',
          platform: 'Email',
          direction: 'Inbound',
          content: 'Test content 2',
          securityClassification: 'Unclassified',
          threadId: 'thread-2',
          km_facts: [],
        },
      ];

      mockPrisma.km_communications.count.mockResolvedValue(2);
      mockPrisma.km_communications.findMany.mockResolvedValue(mockCommunications);

      // Mock security filtering
      jest.spyOn(service, 'applySecurityFilter').mockReturnValue(mockCommunications);

      const result = await service.getCommunications(mockQueryParams, mockUserContext);

      expect(mockPrisma.km_communications.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          isActive: true,
          platform: 'Email',
          direction: 'Inbound',
          OR: expect.arrayContaining([
            { subject: { contains: 'test', mode: 'insensitive' } },
            { content: { contains: 'test', mode: 'insensitive' } },
            { senderEmail: { contains: 'test', mode: 'insensitive' } },
          ]),
        }),
        include: expect.any(Object),
        orderBy: expect.any(Array),
        take: 20,
        skip: 0,
      });

      expect(result.communications).toEqual(mockCommunications);
      expect(result.pagination).toEqual({
        total: 2,
        limit: 20,
        offset: 0,
        hasMore: false,
      });
    });

    it('should handle participant filtering', async () => {
      const queryWithParticipant = {
        ...mockQueryParams,
        participants: 'user1',
      };

      mockPrisma.km_communications.count.mockResolvedValue(1);
      mockPrisma.km_communications.findMany.mockResolvedValue([]);
      jest.spyOn(service, 'applySecurityFilter').mockReturnValue([]);

      await service.getCommunications(queryWithParticipant, mockUserContext);

      expect(mockPrisma.km_communications.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { participants: { has: 'user1' } },
            { externalParticipants: { has: 'user1' } },
          ]),
        }),
        include: expect.any(Object),
        orderBy: expect.any(Array),
        take: 20,
        skip: 0,
      });
    });

    it('should apply security filtering', async () => {
      const mockCommunications = [
        { id: 'comm-1', securityClassification: 'Unclassified' },
        { id: 'comm-2', securityClassification: 'Secret' },
      ];

      mockPrisma.km_communications.count.mockResolvedValue(2);
      mockPrisma.km_communications.findMany.mockResolvedValue(mockCommunications);

      // Mock security filter to return only unclassified
      jest.spyOn(service, 'applySecurityFilter').mockReturnValue([mockCommunications[0]]);

      const result = await service.getCommunications(mockQueryParams, mockUserContext);

      expect(service.applySecurityFilter).toHaveBeenCalledWith(
        mockCommunications,
        mockUserContext.clearanceLevel
      );
      expect(result.communications).toHaveLength(1);
    });
  });

  describe('getCommunicationById', () => {
    it('should retrieve communication by ID with thread context', async () => {
      const mockCommunication = {
        id: 'comm-123',
        threadId: 'thread-1',
        content: 'Test content',
        securityClassification: 'Unclassified',
        km_facts: [],
      };

      const mockThreadCommunications = [
        {
          id: 'comm-124',
          direction: 'Outbound',
          subject: 'Re: Test',
          senderEmail: 'sender@example.com',
          participants: ['user1'],
          sentAt: new Date(),
          createdAt: new Date(),
        },
      ];

      mockPrisma.km_communications.findUnique.mockResolvedValue(mockCommunication);
      mockPrisma.km_communications.findMany.mockResolvedValue(mockThreadCommunications);
      jest.spyOn(service, 'applySecurityFilter').mockReturnValue([mockCommunication]);

      const result = await service.getCommunicationById('comm-123', mockUserContext);

      expect(mockPrisma.km_communications.findUnique).toHaveBeenCalledWith({
        where: { id: 'comm-123', isActive: true },
        include: expect.any(Object),
      });

      expect(mockPrisma.km_communications.findMany).toHaveBeenCalledWith({
        where: {
          threadId: 'thread-1',
          isActive: true,
          id: { not: 'comm-123' },
        },
        select: expect.any(Object),
        orderBy: { sentAt: 'asc' },
      });

      expect(result).toEqual(
        expect.objectContaining({
          id: 'comm-123',
          threadContext: mockThreadCommunications,
        })
      );
    });

    it('should return null for non-existent communication', async () => {
      mockPrisma.km_communications.findUnique.mockResolvedValue(null);

      const result = await service.getCommunicationById('non-existent', mockUserContext);

      expect(result).toBeNull();
    });

    it('should throw error for insufficient permissions', async () => {
      const mockCommunication = {
        id: 'comm-123',
        securityClassification: 'Secret',
      };

      mockPrisma.km_communications.findUnique.mockResolvedValue(mockCommunication);
      jest.spyOn(service, 'applySecurityFilter').mockReturnValue([]);

      await expect(
        service.getCommunicationById('comm-123', mockUserContext)
      ).rejects.toThrow('User has insufficient permissions to access this communication');
    });
  });

  describe('updateCommunication', () => {
    const updateData = {
      subject: 'Updated subject',
      content: 'Updated content',
      processingStatus: 'PROCESSED',
    };

    it('should update communication successfully', async () => {
      const existingCommunication = {
        id: 'comm-123',
        subject: 'Original subject',
        content: 'Original content',
      };

      const updatedCommunication = {
        ...existingCommunication,
        ...updateData,
        processingStatus: 'Processed',
        updatedAt: new Date(),
      };

      mockPrisma.km_communications.findUnique.mockResolvedValue(existingCommunication);
      mockPrisma.km_communications.update.mockResolvedValue(updatedCommunication);

      const result = await service.updateCommunication('comm-123', updateData, mockUserContext.userId);

      expect(mockPrisma.km_communications.update).toHaveBeenCalledWith({
        where: { id: 'comm-123' },
        data: expect.objectContaining({
          subject: 'Updated subject',
          content: 'Updated content',
          processingStatus: 'Processed',
          updatedAt: expect.any(Date),
        }),
        include: expect.any(Object),
      });

      expect(result).toEqual(updatedCommunication);
    });

    it('should throw error for non-existent communication', async () => {
      mockPrisma.km_communications.findUnique.mockResolvedValue(null);

      await expect(
        service.updateCommunication('non-existent', updateData, mockUserContext.userId)
      ).rejects.toThrow('Communication not found');
    });
  });

  describe('deleteCommunication', () => {
    it('should soft delete communication successfully', async () => {
      const existingCommunication = {
        id: 'comm-123',
        isActive: true,
      };

      mockPrisma.km_communications.findUnique.mockResolvedValue(existingCommunication);
      mockPrisma.km_communications.update.mockResolvedValue({ success: true });

      const result = await service.deleteCommunication('comm-123', mockUserContext.userId);

      expect(mockPrisma.km_communications.update).toHaveBeenCalledWith({
        where: { id: 'comm-123' },
        data: {
          isActive: false,
          updatedAt: expect.any(Date),
        },
      });

      expect(result).toEqual({ success: true });
    });

    it('should throw error for non-existent communication', async () => {
      mockPrisma.km_communications.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteCommunication('non-existent', mockUserContext.userId)
      ).rejects.toThrow('Communication not found');
    });
  });

  describe('getThreadSummary', () => {
    it('should provide comprehensive thread summary', async () => {
      const mockThreadCommunications = [
        {
          id: 'comm-1',
          direction: 'Inbound',
          content: 'First message',
          participants: ['user1'],
          externalParticipants: ['external1@example.com'],
          senderEmail: 'sender@example.com',
          sentAt: new Date('2024-01-01'),
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'comm-2',
          direction: 'Outbound',
          content: 'Second message',
          participants: ['user2'],
          externalParticipants: [],
          senderEmail: 'internal@example.com',
          sentAt: new Date('2024-01-02'),
          createdAt: new Date('2024-01-02'),
        },
      ];

      mockPrisma.km_communications.findMany.mockResolvedValue(mockThreadCommunications);
      jest.spyOn(service, 'applySecurityFilter').mockReturnValue(mockThreadCommunications);

      const result = await service.getThreadSummary('thread-1', mockUserContext);

      expect(result).toEqual({
        threadId: 'thread-1',
        communicationCount: 2,
        participants: expect.arrayContaining([
          'user1',
          'user2',
          'external1@example.com',
          'sender@example.com',
          'internal@example.com',
        ]),
        dateRange: expect.objectContaining({
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-02'),
          duration: expect.any(Number),
        }),
        communications: mockThreadCommunications,
      });
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty search results', async () => {
      mockPrisma.km_communications.count.mockResolvedValue(0);
      mockPrisma.km_communications.findMany.mockResolvedValue([]);
      jest.spyOn(service, 'applySecurityFilter').mockReturnValue([]);

      const result = await service.getCommunications(
        { limit: 20, offset: 0 },
        mockUserContext
      );

      expect(result.communications).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('should handle malformed data gracefully', async () => {
      const malformedData = {
        platform: 'INVALID_PLATFORM',
        direction: 'INVALID_DIRECTION',
        content: '',
      };

      // The service should map unknown enums to defaults
      mockPrisma.km_communications.create.mockResolvedValue({
        id: 'comm-123',
        platform: 'Other',
        direction: 'Internal',
      });

      await service.createCommunication(malformedData as any, mockUserContext.userId);

      expect(mockPrisma.km_communications.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          platform: 'Other',
          direction: 'Internal',
        }),
        include: expect.any(Object),
      });
    });
  });
});
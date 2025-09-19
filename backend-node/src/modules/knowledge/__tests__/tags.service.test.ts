import { TagsService } from '../tags.service';
import { KnowledgeService } from '../../../services/KnowledgeService';

// Mock Prisma client
const mockPrisma = {
  km_tags: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  km_documents: {
    findUnique: jest.fn(),
  },
  km_communications: {
    findUnique: jest.fn(),
  },
  km_facts: {
    findUnique: jest.fn(),
  },
};

// Mock the PrismaClient import
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

describe('TagsService', () => {
  let service: TagsService;
  let mockUserContext: any;
  let mockTagData: any;

  beforeEach(() => {
    service = new TagsService();
    mockUserContext = {
      userId: 'user-123',
      roles: ['user'],
      clearanceLevel: 'UNCLASSIFIED',
    };

    mockTagData = {
      name: 'Test Tag',
      description: 'Test tag description',
      type: 'CONTENT',
      color: '#FF5733',
      icon: 'test-icon',
      metadata: { category: 'testing' },
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('createTag', () => {
    it('should create a tag with valid data', async () => {
      const mockCreatedTag = {
        id: 'tag-123',
        ...mockTagData,
        type: 'Content',
        usageCount: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.km_tags.create.mockResolvedValue(mockCreatedTag);

      const result = await service.createTag(mockTagData, mockUserContext.userId);

      expect(mockPrisma.km_tags.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test Tag',
          description: 'Test tag description',
          type: 'Content',
          color: '#FF5733',
          icon: 'test-icon',
          metadata: { category: 'testing' },
          usageCount: 0,
          isActive: true,
          createdBy: 'user-123',
        }),
      });

      expect(result).toEqual(
        expect.objectContaining({
          id: 'tag-123',
          name: 'Test Tag',
          relatedEntities: expect.objectContaining({
            total: 0,
            documents: 0,
            communications: 0,
            facts: 0,
          }),
        })
      );
    });

    it('should generate default color when not provided', async () => {
      const tagWithoutColor = {
        name: 'Test Tag',
        type: 'TOPIC',
      };

      const mockCreatedTag = {
        id: 'tag-123',
        ...tagWithoutColor,
        color: '#059669', // Expected green for TOPIC
      };

      mockPrisma.km_tags.create.mockResolvedValue(mockCreatedTag);

      await service.createTag(tagWithoutColor, mockUserContext.userId);

      expect(mockPrisma.km_tags.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          color: '#059669', // Green for TOPIC type
        }),
      });
    });

    it('should handle different tag types with appropriate colors', async () => {
      const tagTypes = [
        { type: 'CONTENT', expectedColor: '#2563EB' },
        { type: 'PRIORITY', expectedColor: '#DC2626' },
        { type: 'STATUS', expectedColor: '#7C3AED' },
        { type: 'CUSTOM', expectedColor: '#6B7280' },
      ];

      for (const { type, expectedColor } of tagTypes) {
        mockPrisma.km_tags.create.mockResolvedValue({ id: 'tag-123' });

        await service.createTag({ name: 'Test', type }, mockUserContext.userId);

        expect(mockPrisma.km_tags.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            color: expectedColor,
          }),
        });

        jest.clearAllMocks();
      }
    });
  });

  describe('validateTagUniqueness', () => {
    it('should allow unique tag names', async () => {
      mockPrisma.km_tags.findFirst.mockResolvedValue(null);

      const result = await service.validateTagUniqueness('Unique Tag');

      expect(result.valid).toBe(true);
      expect(mockPrisma.km_tags.findFirst).toHaveBeenCalledWith({
        where: {
          name: { equals: 'Unique Tag', mode: 'insensitive' },
          isActive: true,
        },
        select: { id: true },
      });
    });

    it('should reject duplicate tag names', async () => {
      mockPrisma.km_tags.findFirst.mockResolvedValue({ id: 'existing-tag' });

      const result = await service.validateTagUniqueness('Duplicate Tag');

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Tag name 'Duplicate Tag' already exists");
    });

    it('should exclude current tag when updating', async () => {
      mockPrisma.km_tags.findFirst.mockResolvedValue(null);

      const result = await service.validateTagUniqueness('Tag Name', 'tag-123');

      expect(mockPrisma.km_tags.findFirst).toHaveBeenCalledWith({
        where: {
          name: { equals: 'Tag Name', mode: 'insensitive' },
          isActive: true,
          id: { not: 'tag-123' },
        },
        select: { id: true },
      });
    });
  });

  describe('validateTagTypeConsistency', () => {
    it('should allow tags without specific requirements', async () => {
      const result = service.validateTagTypeConsistency('CONTENT', { any: 'metadata' });

      expect(result.valid).toBe(true);
    });

    it('should validate PRIORITY tag metadata requirements', async () => {
      const resultValid = service.validateTagTypeConsistency('PRIORITY', {
        level: 'high',
        order: 1,
      });

      expect(resultValid.valid).toBe(true);

      const resultInvalid = service.validateTagTypeConsistency('PRIORITY', {
        level: 'high',
        // missing 'order'
      });

      expect(resultInvalid.valid).toBe(false);
      expect(resultInvalid.error).toContain('requires metadata fields: order');
    });

    it('should validate STATUS tag metadata requirements', async () => {
      const resultValid = service.validateTagTypeConsistency('STATUS', {
        state: 'active',
        category: 'workflow',
      });

      expect(resultValid.valid).toBe(true);

      const resultInvalid = service.validateTagTypeConsistency('STATUS', {
        state: 'active',
        // missing 'category'
      });

      expect(resultInvalid.valid).toBe(false);
      expect(resultInvalid.error).toContain('requires metadata fields: category');
    });

    it('should require metadata for specific tag types', async () => {
      const result = service.validateTagTypeConsistency('PRIORITY', undefined);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Tag type 'PRIORITY' requires metadata");
    });
  });

  describe('getTags', () => {
    const mockQueryParams = {
      search: 'test',
      type: 'CONTENT',
      includeUsageStats: true,
      includeTagCloud: true,
      minUsageCount: 1,
      limit: 20,
      offset: 0,
    };

    it('should retrieve tags with filters and tag cloud', async () => {
      const mockTags = [
        {
          id: 'tag-1',
          name: 'Content Tag',
          type: 'Content',
          usageCount: 15,
          color: '#2563EB',
        },
        {
          id: 'tag-2',
          name: 'Test Tag',
          type: 'Content',
          usageCount: 8,
          color: '#059669',
        },
      ];

      mockPrisma.km_tags.count.mockResolvedValue(2);
      mockPrisma.km_tags.findMany.mockResolvedValue(mockTags);

      const result = await service.getTags(mockQueryParams, mockUserContext);

      expect(mockPrisma.km_tags.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          isActive: true,
          type: 'Content',
          usageCount: { gte: 1 },
          OR: expect.arrayContaining([
            { name: { contains: 'test', mode: 'insensitive' } },
            { description: { contains: 'test', mode: 'insensitive' } },
          ]),
        }),
        orderBy: expect.any(Array),
        take: 20,
        skip: 0,
      });

      expect(result.tags).toEqual(mockTags);
      expect(result.tagCloud).toBeDefined();
      expect(result.pagination).toEqual({
        total: 2,
        limit: 20,
        offset: 0,
        hasMore: false,
      });
    });

    it('should build tag cloud with weighted usage', async () => {
      const mockTags = [
        { id: 'tag-1', name: 'High Usage', type: 'Content', usageCount: 100 },
        { id: 'tag-2', name: 'Medium Usage', type: 'Topic', usageCount: 50 },
        { id: 'tag-3', name: 'Low Usage', type: 'Custom', usageCount: 10 },
        { id: 'tag-4', name: 'No Usage', type: 'Status', usageCount: 0 },
      ];

      mockPrisma.km_tags.count.mockResolvedValue(4);
      mockPrisma.km_tags.findMany.mockResolvedValue(mockTags);

      const result = await service.getTags(
        { ...mockQueryParams, includeTagCloud: true },
        mockUserContext
      );

      const tagCloud = result.tagCloud;

      // Should exclude tags with 0 usage
      expect(tagCloud).toHaveLength(3);

      // Should be sorted by weight (highest first)
      expect(tagCloud[0].name).toBe('High Usage');
      expect(tagCloud[0].weight).toBe(1.0); // Highest weight

      expect(tagCloud[2].name).toBe('Low Usage');
      expect(tagCloud[2].weight).toBe(0.2); // Lowest weight
    });
  });

  describe('getTagById', () => {
    it('should retrieve tag by ID with related information', async () => {
      const mockTag = {
        id: 'tag-123',
        name: 'Test Tag',
        type: 'Content',
        usageCount: 25,
        description: 'Test description',
      };

      const mockRelatedTags = [
        { id: 'related-1', name: 'Related Tag 1', type: 'Content', usageCount: 20 },
        { id: 'related-2', name: 'Related Tag 2', type: 'Content', usageCount: 15 },
      ];

      mockPrisma.km_tags.findUnique
        .mockResolvedValueOnce(mockTag) // Main query
        .mockResolvedValueOnce({ type: 'Content' }); // For related tags query

      mockPrisma.km_tags.findMany.mockResolvedValue(mockRelatedTags);

      const result = await service.getTagById('tag-123', mockUserContext);

      expect(result).toEqual(
        expect.objectContaining({
          id: 'tag-123',
          name: 'Test Tag',
          relatedEntities: expect.objectContaining({
            total: expect.any(Number),
          }),
          relatedTags: mockRelatedTags,
        })
      );
    });

    it('should return null for non-existent tag', async () => {
      mockPrisma.km_tags.findUnique.mockResolvedValue(null);

      const result = await service.getTagById('non-existent', mockUserContext);

      expect(result).toBeNull();
    });
  });

  describe('updateTag', () => {
    const updateData = {
      name: 'Updated Tag',
      description: 'Updated description',
      type: 'TOPIC',
      color: '#00FF00',
      metadata: { updated: true },
    };

    it('should update tag successfully', async () => {
      const existingTag = {
        id: 'tag-123',
        name: 'Original Tag',
        type: 'Content',
        usageCount: 5,
      };

      const updatedTag = {
        ...existingTag,
        ...updateData,
        type: 'Topic',
        updatedAt: new Date(),
      };

      mockPrisma.km_tags.findUnique.mockResolvedValue(existingTag);
      mockPrisma.km_tags.update.mockResolvedValue(updatedTag);

      const result = await service.updateTag('tag-123', updateData, mockUserContext.userId);

      expect(mockPrisma.km_tags.update).toHaveBeenCalledWith({
        where: { id: 'tag-123' },
        data: expect.objectContaining({
          name: 'Updated Tag',
          description: 'Updated description',
          type: 'Topic',
          color: '#00FF00',
          metadata: { updated: true },
          updatedAt: expect.any(Date),
        }),
      });

      expect(result).toEqual(
        expect.objectContaining({
          name: 'Updated Tag',
          relatedEntities: expect.any(Object),
        })
      );
    });

    it('should throw error for non-existent tag', async () => {
      mockPrisma.km_tags.findUnique.mockResolvedValue(null);

      await expect(
        service.updateTag('non-existent', updateData, mockUserContext.userId)
      ).rejects.toThrow('Tag not found');
    });
  });

  describe('deleteTag', () => {
    it('should soft delete tag successfully', async () => {
      const existingTag = {
        id: 'tag-123',
        isActive: true,
      };

      mockPrisma.km_tags.findUnique.mockResolvedValue(existingTag);
      mockPrisma.km_tags.update.mockResolvedValue({ success: true });

      const result = await service.deleteTag('tag-123', mockUserContext.userId);

      expect(mockPrisma.km_tags.update).toHaveBeenCalledWith({
        where: { id: 'tag-123' },
        data: {
          isActive: false,
          updatedAt: expect.any(Date),
        },
      });

      expect(result).toEqual({
        success: true,
        removedRelationships: expect.any(Number),
      });
    });

    it('should throw error for non-existent tag', async () => {
      mockPrisma.km_tags.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteTag('non-existent', mockUserContext.userId)
      ).rejects.toThrow('Tag not found');
    });
  });

  describe('checkTagUsage', () => {
    it('should return usage statistics', async () => {
      // Mock usage statistics calculation would return these values
      const result = await service.checkTagUsage('tag-123');

      expect(result).toEqual({
        inUse: expect.any(Boolean),
        usageCount: expect.any(Number),
      });
    });
  });

  describe('suggestTags', () => {
    it('should suggest tags based on content keywords', async () => {
      const content = 'This is about technology and software development projects';

      const mockSuggestions = [
        {
          id: 'tag-1',
          name: 'Technology',
          type: 'Content',
          usageCount: 25,
        },
        {
          id: 'tag-2',
          name: 'Software Development',
          type: 'Topic',
          usageCount: 20,
        },
        {
          id: 'tag-3',
          name: 'Projects',
          type: 'Custom',
          usageCount: 15,
        },
      ];

      mockPrisma.km_tags.findMany.mockResolvedValue(mockSuggestions);

      const result = await service.suggestTags(content, 'DOCUMENT', 3);

      expect(mockPrisma.km_tags.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          OR: expect.arrayContaining([
            {
              OR: [
                { name: { contains: 'technology', mode: 'insensitive' } },
                { description: { contains: 'technology', mode: 'insensitive' } },
              ],
            },
            {
              OR: [
                { name: { contains: 'software', mode: 'insensitive' } },
                { description: { contains: 'software', mode: 'insensitive' } },
              ],
            },
          ]),
        },
        select: expect.any(Object),
        orderBy: { usageCount: 'desc' },
        take: 6, // limit * 2
      });

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            type: expect.any(String),
            relevanceScore: expect.any(Number),
            usageCount: expect.any(Number),
          }),
        ])
      );
    });

    it('should return empty array for content without keywords', async () => {
      const result = await service.suggestTags('a b c', 'DOCUMENT', 5);

      expect(result).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.km_tags.findMany.mockRejectedValue(new Error('Database error'));

      const result = await service.suggestTags('test content');

      expect(result).toEqual([]);
    });
  });

  describe('addTagRelationships', () => {
    it('should add tag relationships to entity', async () => {
      const entityType = 'DOCUMENT';
      const entityId = 'doc-123';
      const tagIds = ['tag-1', 'tag-2', 'tag-3'];

      // Mock entity validation
      mockPrisma.km_documents.findUnique.mockResolvedValue({ id: 'doc-123' });

      // Mock tag validation
      mockPrisma.km_tags.findMany.mockResolvedValue([
        { id: 'tag-1' },
        { id: 'tag-2' },
        { id: 'tag-3' },
      ]);

      // Mock tag usage count updates
      mockPrisma.km_tags.update.mockResolvedValue({});

      const result = await service.addTagRelationships(
        entityType,
        entityId,
        tagIds,
        mockUserContext.userId
      );

      expect(result).toEqual({
        addedRelationships: 3,
        skippedDuplicates: 0,
      });

      // Should update usage count for each tag
      expect(mockPrisma.km_tags.update).toHaveBeenCalledTimes(3);
    });

    it('should validate entity exists', async () => {
      mockPrisma.km_documents.findUnique.mockResolvedValue(null);

      await expect(
        service.addTagRelationships('DOCUMENT', 'invalid-doc', ['tag-1'], mockUserContext.userId)
      ).rejects.toThrow('document with ID invalid-doc not found');
    });

    it('should validate all tags exist', async () => {
      mockPrisma.km_documents.findUnique.mockResolvedValue({ id: 'doc-123' });
      mockPrisma.km_tags.findMany.mockResolvedValue([
        { id: 'tag-1' },
        // tag-2 missing
      ]);

      await expect(
        service.addTagRelationships('DOCUMENT', 'doc-123', ['tag-1', 'tag-2'], mockUserContext.userId)
      ).rejects.toThrow('Invalid or inactive tag IDs: tag-2');
    });
  });

  describe('removeTagRelationships', () => {
    it('should remove tag relationships from entity', async () => {
      const entityType = 'COMMUNICATION';
      const entityId = 'comm-123';
      const tagIds = ['tag-1', 'tag-2'];

      mockPrisma.km_communications.findUnique.mockResolvedValue({ id: 'comm-123' });
      mockPrisma.km_tags.update.mockResolvedValue({});

      const result = await service.removeTagRelationships(
        entityType,
        entityId,
        tagIds,
        mockUserContext.userId
      );

      expect(result).toEqual({
        removedRelationships: 2,
      });

      // Should decrement usage count for each tag
      expect(mockPrisma.km_tags.update).toHaveBeenCalledTimes(2);
      expect(mockPrisma.km_tags.update).toHaveBeenCalledWith({
        where: { id: expect.any(String), isActive: true },
        data: {
          usageCount: { decrement: 1 },
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should handle non-existent entities', async () => {
      mockPrisma.km_facts.findUnique.mockResolvedValue(null);

      await expect(
        service.removeTagRelationships('FACT', 'invalid-fact', ['tag-1'], mockUserContext.userId)
      ).rejects.toThrow('fact with ID invalid-fact not found');
    });
  });

  describe('getTagUsageTrends', () => {
    it('should return usage trends over time', async () => {
      const result = await service.getTagUsageTrends('tag-123', 7);

      expect(result).toHaveLength(7);
      result.forEach(trend => {
        expect(trend).toEqual({
          date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          usageCount: expect.any(Number),
          newRelationships: expect.any(Number),
        });
      });
    });

    it('should handle different time periods', async () => {
      const result30Days = await service.getTagUsageTrends('tag-123', 30);
      const result7Days = await service.getTagUsageTrends('tag-123', 7);

      expect(result30Days).toHaveLength(30);
      expect(result7Days).toHaveLength(7);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty tag results', async () => {
      mockPrisma.km_tags.count.mockResolvedValue(0);
      mockPrisma.km_tags.findMany.mockResolvedValue([]);

      const result = await service.getTags(
        { includeUsageStats: false, includeTagCloud: false, limit: 20, offset: 0 },
        mockUserContext
      );

      expect(result.tags).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('should handle single tag in tag cloud', async () => {
      const singleTag = [{ id: 'tag-1', name: 'Single Tag', usageCount: 5 }];

      mockPrisma.km_tags.count.mockResolvedValue(1);
      mockPrisma.km_tags.findMany.mockResolvedValue(singleTag);

      const result = await service.getTags(
        { includeTagCloud: true, includeUsageStats: false, limit: 20, offset: 0 },
        mockUserContext
      );

      expect(result.tagCloud).toHaveLength(1);
      expect(result.tagCloud[0].weight).toBe(1.0); // Single tag gets max weight
    });

    it('should handle malformed enum mappings gracefully', async () => {
      const malformedData = {
        name: 'Test Tag',
        type: 'INVALID_TYPE',
      };

      mockPrisma.km_tags.create.mockResolvedValue({
        id: 'tag-123',
        type: 'Custom', // Should default to Custom
      });

      await service.createTag(malformedData as any, mockUserContext.userId);

      expect(mockPrisma.km_tags.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'Custom', // Should map invalid type to Custom
        }),
      });
    });

    it('should handle color validation', async () => {
      const validColors = ['#FF5733', '#00FF00', '#123ABC'];
      const invalidColors = ['FF5733', '#GG5733', 'red'];

      // Valid colors should be preserved
      for (const color of validColors) {
        mockPrisma.km_tags.create.mockResolvedValue({ id: 'tag-123' });

        await service.createTag({ name: 'Test', color }, mockUserContext.userId);

        expect(mockPrisma.km_tags.create).toHaveBeenCalledWith({
          data: expect.objectContaining({ color }),
        });

        jest.clearAllMocks();
      }
    });

    it('should handle tag suggestions with no matches', async () => {
      mockPrisma.km_tags.findMany.mockResolvedValue([]);

      const result = await service.suggestTags('xyz abc def');

      expect(result).toEqual([]);
    });
  });
});
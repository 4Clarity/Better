import { CategoriesService } from '../categories.service';
import { KnowledgeService } from '../../../services/KnowledgeService';

// Mock Prisma client
const mockPrisma = {
  km_categories: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  km_facts: {
    count: jest.fn(),
  },
  km_documents: {
    count: jest.fn(),
  },
  km_communications: {
    count: jest.fn(),
  },
};

// Mock the PrismaClient import
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

describe('CategoriesService', () => {
  let service: CategoriesService;
  let mockUserContext: any;
  let mockCategoryData: any;

  beforeEach(() => {
    service = new CategoriesService();
    mockUserContext = {
      userId: 'user-123',
      roles: ['user'],
      clearanceLevel: 'UNCLASSIFIED',
    };

    mockCategoryData = {
      name: 'Test Category',
      description: 'Test category description',
      parentId: 'parent-123',
      displayOrder: 1,
      color: '#FF5733',
      icon: 'test-icon',
      metadata: { type: 'test' },
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('createCategory', () => {
    it('should create a category with valid data', async () => {
      const mockParent = { id: 'parent-123', level: 1, path: 'Parent' };
      const mockCreatedCategory = {
        id: 'cat-123',
        ...mockCategoryData,
        level: 2,
        path: 'Parent / Test Category',
        usageCount: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        parent_category: mockParent,
        child_categories: [],
      };

      mockPrisma.km_categories.findUnique.mockResolvedValue(mockParent);
      mockPrisma.km_categories.create.mockResolvedValue(mockCreatedCategory);

      const result = await service.createCategory(mockCategoryData, mockUserContext.userId);

      expect(mockPrisma.km_categories.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test Category',
          description: 'Test category description',
          parentId: 'parent-123',
          level: 2,
          path: 'Parent / Test Category',
          displayOrder: 1,
          color: '#FF5733',
          icon: 'test-icon',
          usageCount: 0,
          isActive: true,
          createdBy: 'user-123',
        }),
        include: expect.any(Object),
      });

      expect(result).toEqual(mockCreatedCategory);
    });

    it('should create root level category when no parent specified', async () => {
      const rootCategoryData = {
        name: 'Root Category',
        description: 'Root level category',
        displayOrder: 0,
      };

      const mockCreatedCategory = {
        id: 'cat-123',
        ...rootCategoryData,
        parentId: null,
        level: 0,
        path: 'Root Category',
        isActive: true,
      };

      mockPrisma.km_categories.create.mockResolvedValue(mockCreatedCategory);

      const result = await service.createCategory(rootCategoryData, mockUserContext.userId);

      expect(mockPrisma.km_categories.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          parentId: null,
          level: 0,
          path: 'Root Category',
        }),
        include: expect.any(Object),
      });
    });
  });

  describe('validateParentCategory', () => {
    it('should validate existing active parent category', async () => {
      mockPrisma.km_categories.findUnique.mockResolvedValue({
        id: 'parent-123',
        level: 2,
      });

      const result = await service.validateParentCategory('parent-123');

      expect(result.valid).toBe(true);
      expect(mockPrisma.km_categories.findUnique).toHaveBeenCalledWith({
        where: { id: 'parent-123', isActive: true },
        select: { id: true, level: true },
      });
    });

    it('should reject non-existent parent category', async () => {
      mockPrisma.km_categories.findUnique.mockResolvedValue(null);

      const result = await service.validateParentCategory('invalid-parent');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Parent category with ID invalid-parent not found');
    });

    it('should reject parent at maximum nesting level', async () => {
      mockPrisma.km_categories.findUnique.mockResolvedValue({
        id: 'parent-123',
        level: 5,
      });

      const result = await service.validateParentCategory('parent-123');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Maximum category nesting level (5) exceeded');
    });
  });

  describe('checkCircularReference', () => {
    it('should detect direct circular reference', async () => {
      const result = await service.checkCircularReference('cat-123', 'cat-123');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Circular reference detected');
    });

    it('should detect indirect circular reference', async () => {
      // Setup: cat-123 -> parent-456 -> grandparent-789 -> cat-123 (circular)
      mockPrisma.km_categories.findUnique
        .mockResolvedValueOnce({ parentId: 'grandparent-789' }) // parent-456
        .mockResolvedValueOnce({ parentId: 'cat-123' }); // grandparent-789

      const result = await service.checkCircularReference('parent-456', 'cat-123');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Circular reference detected');
    });

    it('should allow valid hierarchy', async () => {
      mockPrisma.km_categories.findUnique
        .mockResolvedValueOnce({ parentId: 'grandparent-789' })
        .mockResolvedValueOnce({ parentId: null });

      const result = await service.checkCircularReference('parent-456', 'cat-123');

      expect(result.valid).toBe(true);
    });

    it('should allow new categories without existing ID', async () => {
      const result = await service.checkCircularReference('parent-456', undefined);

      expect(result.valid).toBe(true);
    });
  });

  describe('validateCategoryUniqueness', () => {
    it('should allow unique category names within parent scope', async () => {
      mockPrisma.km_categories.findFirst.mockResolvedValue(null);

      const result = await service.validateCategoryUniqueness('Unique Name', 'parent-123');

      expect(result.valid).toBe(true);
      expect(mockPrisma.km_categories.findFirst).toHaveBeenCalledWith({
        where: {
          name: { equals: 'Unique Name', mode: 'insensitive' },
          parentId: 'parent-123',
          isActive: true,
        },
        select: { id: true },
      });
    });

    it('should reject duplicate category names within same parent', async () => {
      mockPrisma.km_categories.findFirst.mockResolvedValue({ id: 'existing-cat' });

      const result = await service.validateCategoryUniqueness('Duplicate Name', 'parent-123');

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Category name 'Duplicate Name' already exists within the same parent category");
    });

    it('should allow same name in different parent scopes', async () => {
      mockPrisma.km_categories.findFirst.mockResolvedValue(null);

      const result1 = await service.validateCategoryUniqueness('Same Name', 'parent-1');
      const result2 = await service.validateCategoryUniqueness('Same Name', 'parent-2');

      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(true);
    });

    it('should exclude current category when updating', async () => {
      mockPrisma.km_categories.findFirst.mockResolvedValue(null);

      const result = await service.validateCategoryUniqueness('Name', 'parent-123', 'cat-123');

      expect(mockPrisma.km_categories.findFirst).toHaveBeenCalledWith({
        where: {
          name: { equals: 'Name', mode: 'insensitive' },
          parentId: 'parent-123',
          isActive: true,
          id: { not: 'cat-123' },
        },
        select: { id: true },
      });
    });
  });

  describe('getCategories', () => {
    const mockQueryParams = {
      search: 'test',
      parentId: 'parent-123',
      level: 1,
      includeUsageStats: true,
      includeTree: true,
      limit: 20,
      offset: 0,
    };

    it('should retrieve categories with filters and tree structure', async () => {
      const mockCategories = [
        {
          id: 'cat-1',
          name: 'Category 1',
          level: 1,
          parentId: null,
          usageCount: 5,
          parent_category: null,
          child_categories: [
            {
              id: 'cat-2',
              name: 'Category 2',
              level: 2,
              usageCount: 3,
            },
          ],
        },
        {
          id: 'cat-2',
          name: 'Category 2',
          level: 2,
          parentId: 'cat-1',
          usageCount: 3,
          parent_category: { id: 'cat-1', name: 'Category 1' },
          child_categories: [],
        },
      ];

      mockPrisma.km_categories.count.mockResolvedValue(2);
      mockPrisma.km_categories.findMany.mockResolvedValue(mockCategories);

      // Mock usage statistics calculation
      mockPrisma.km_facts.count.mockResolvedValue(2);
      mockPrisma.km_documents.count.mockResolvedValue(2);
      mockPrisma.km_communications.count.mockResolvedValue(1);

      const result = await service.getCategories(mockQueryParams, mockUserContext);

      expect(mockPrisma.km_categories.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          isActive: true,
          parentId: 'parent-123',
          level: 1,
          OR: expect.arrayContaining([
            { name: { contains: 'test', mode: 'insensitive' } },
            { description: { contains: 'test', mode: 'insensitive' } },
            { path: { contains: 'test', mode: 'insensitive' } },
          ]),
        }),
        include: expect.any(Object),
        orderBy: expect.any(Array),
        take: 20,
        skip: 0,
      });

      expect(result.categories).toEqual(mockCategories);
      expect(result.tree).toBeDefined();
      expect(result.pagination).toEqual({
        total: 2,
        limit: 20,
        offset: 0,
        hasMore: false,
      });
    });

    it('should handle root level categories when parentId is null', async () => {
      const queryWithNullParent = {
        ...mockQueryParams,
        parentId: undefined,
      };

      mockPrisma.km_categories.count.mockResolvedValue(0);
      mockPrisma.km_categories.findMany.mockResolvedValue([]);

      await service.getCategories(queryWithNullParent, mockUserContext);

      expect(mockPrisma.km_categories.findMany).toHaveBeenCalledWith({
        where: expect.not.objectContaining({
          parentId: expect.anything(),
        }),
        include: expect.any(Object),
        orderBy: expect.any(Array),
        take: 20,
        skip: 0,
      });
    });
  });

  describe('getCategoryById', () => {
    it('should retrieve category by ID with hierarchy context', async () => {
      const mockCategory = {
        id: 'cat-123',
        name: 'Test Category',
        level: 2,
        path: 'Root / Parent / Test Category',
        parent_category: {
          id: 'parent-123',
          name: 'Parent Category',
          path: 'Root / Parent',
          level: 1,
        },
        child_categories: [
          {
            id: 'child-1',
            name: 'Child Category',
            level: 3,
            usageCount: 2,
          },
        ],
      };

      mockPrisma.km_categories.findUnique.mockResolvedValue(mockCategory);

      // Mock usage statistics
      mockPrisma.km_facts.count.mockResolvedValue(3);
      mockPrisma.km_documents.count.mockResolvedValue(2);
      mockPrisma.km_communications.count.mockResolvedValue(1);

      // Mock hierarchy path calculation
      mockPrisma.km_categories.findUnique
        .mockResolvedValueOnce(mockCategory) // Main query
        .mockResolvedValueOnce({ name: 'Test Category', parentId: 'parent-123' })
        .mockResolvedValueOnce({ name: 'Parent Category', parentId: 'root-123' })
        .mockResolvedValueOnce({ name: 'Root Category', parentId: null });

      const result = await service.getCategoryById('cat-123', mockUserContext);

      expect(result).toEqual(
        expect.objectContaining({
          id: 'cat-123',
          name: 'Test Category',
          usageCount: 6, // 3 + 2 + 1
          hierarchyPath: ['Root Category', 'Parent Category', 'Test Category'],
        })
      );
    });

    it('should return null for non-existent category', async () => {
      mockPrisma.km_categories.findUnique.mockResolvedValue(null);

      const result = await service.getCategoryById('non-existent', mockUserContext);

      expect(result).toBeNull();
    });
  });

  describe('updateCategory', () => {
    const updateData = {
      name: 'Updated Category',
      description: 'Updated description',
      parentId: 'new-parent-123',
      displayOrder: 5,
      color: '#00FF00',
    };

    it('should update category successfully', async () => {
      const existingCategory = {
        id: 'cat-123',
        name: 'Original Category',
        parentId: 'old-parent-123',
        level: 2,
        path: 'Old Path',
      };

      const newParent = { level: 1, path: 'New Parent' };

      const updatedCategory = {
        ...existingCategory,
        ...updateData,
        level: 2,
        path: 'New Parent / Updated Category',
        updatedAt: new Date(),
      };

      mockPrisma.km_categories.findUnique
        .mockResolvedValueOnce(existingCategory) // Check existing
        .mockResolvedValueOnce(newParent); // Calculate level for new parent

      mockPrisma.km_categories.update.mockResolvedValue(updatedCategory);
      mockPrisma.km_categories.findMany.mockResolvedValue([]); // No descendants to update

      const result = await service.updateCategory('cat-123', updateData, mockUserContext.userId);

      expect(mockPrisma.km_categories.update).toHaveBeenCalledWith({
        where: { id: 'cat-123' },
        data: expect.objectContaining({
          name: 'Updated Category',
          description: 'Updated description',
          parentId: 'new-parent-123',
          level: 2,
          path: 'New Parent / Updated Category',
          displayOrder: 5,
          color: '#00FF00',
          updatedAt: expect.any(Date),
        }),
        include: expect.any(Object),
      });

      expect(result).toEqual(updatedCategory);
    });

    it('should update paths of descendant categories when hierarchy changes', async () => {
      const existingCategory = {
        id: 'cat-123',
        name: 'Parent Category',
        parentId: 'old-parent',
      };

      const descendants = [
        { id: 'child-1', name: 'Child 1', parentId: 'cat-123' },
        { id: 'child-2', name: 'Child 2', parentId: 'child-1' },
      ];

      mockPrisma.km_categories.findUnique.mockResolvedValue(existingCategory);
      mockPrisma.km_categories.update.mockResolvedValue({});
      mockPrisma.km_categories.findMany.mockResolvedValue(descendants);

      await service.updateCategory('cat-123', { name: 'New Name' }, mockUserContext.userId);

      // Should update paths for descendants
      expect(mockPrisma.km_categories.findMany).toHaveBeenCalledWith({
        where: {
          path: { contains: 'cat-123' },
          isActive: true,
        },
      });
    });

    it('should throw error for non-existent category', async () => {
      mockPrisma.km_categories.findUnique.mockResolvedValue(null);

      await expect(
        service.updateCategory('non-existent', updateData, mockUserContext.userId)
      ).rejects.toThrow('Category not found');
    });
  });

  describe('deleteCategory', () => {
    it('should soft delete category and handle children', async () => {
      const existingCategory = {
        id: 'cat-123',
        parentId: 'grandparent-123',
        level: 2,
        isActive: true,
      };

      mockPrisma.km_categories.findUnique.mockResolvedValue(existingCategory);
      mockPrisma.km_categories.count.mockResolvedValue(2); // Has 2 children
      mockPrisma.km_categories.update.mockResolvedValue({ success: true });
      mockPrisma.km_categories.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.km_categories.findMany.mockResolvedValue([
        { id: 'child-1', name: 'Child 1' },
        { id: 'child-2', name: 'Child 2' },
      ]);

      const result = await service.deleteCategory('cat-123', mockUserContext.userId);

      expect(mockPrisma.km_categories.update).toHaveBeenCalledWith({
        where: { id: 'cat-123' },
        data: {
          isActive: false,
          updatedAt: expect.any(Date),
        },
      });

      expect(mockPrisma.km_categories.updateMany).toHaveBeenCalledWith({
        where: {
          parentId: 'cat-123',
          isActive: true,
        },
        data: {
          parentId: 'grandparent-123',
          level: 2,
          updatedAt: expect.any(Date),
        },
      });

      expect(result).toEqual({
        success: true,
        affectedChildren: 2,
      });
    });

    it('should throw error for non-existent category', async () => {
      mockPrisma.km_categories.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteCategory('non-existent', mockUserContext.userId)
      ).rejects.toThrow('Category not found');
    });
  });

  describe('hasChildCategories', () => {
    it('should return true when category has children', async () => {
      mockPrisma.km_categories.count.mockResolvedValue(3);

      const result = await service.hasChildCategories('cat-123');

      expect(result).toBe(true);
      expect(mockPrisma.km_categories.count).toHaveBeenCalledWith({
        where: {
          parentId: 'cat-123',
          isActive: true,
        },
      });
    });

    it('should return false when category has no children', async () => {
      mockPrisma.km_categories.count.mockResolvedValue(0);

      const result = await service.hasChildCategories('cat-123');

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockPrisma.km_categories.count.mockRejectedValue(new Error('Database error'));

      const result = await service.hasChildCategories('cat-123');

      expect(result).toBe(false);
    });
  });

  describe('checkCategoryUsage', () => {
    it('should return usage statistics', async () => {
      // Mock usage counts
      mockPrisma.km_facts.count.mockResolvedValue(5);
      mockPrisma.km_documents.count.mockResolvedValue(3);
      mockPrisma.km_communications.count.mockResolvedValue(2);

      const result = await service.checkCategoryUsage('cat-123');

      expect(result).toEqual({
        inUse: true,
        usageCount: 10, // 5 + 3 + 2
      });
    });

    it('should return false for unused category', async () => {
      mockPrisma.km_facts.count.mockResolvedValue(0);
      mockPrisma.km_documents.count.mockResolvedValue(0);
      mockPrisma.km_communications.count.mockResolvedValue(0);

      const result = await service.checkCategoryUsage('cat-123');

      expect(result).toEqual({
        inUse: false,
        usageCount: 0,
      });
    });
  });

  describe('suggestCategories', () => {
    it('should suggest categories based on content keywords', async () => {
      const content = 'This is about technology and software development projects';

      const mockSuggestions = [
        {
          id: 'cat-1',
          name: 'Technology',
          path: 'Technology',
          usageCount: 15,
        },
        {
          id: 'cat-2',
          name: 'Software Development',
          path: 'Technology / Software Development',
          usageCount: 12,
        },
        {
          id: 'cat-3',
          name: 'Projects',
          path: 'Business / Projects',
          usageCount: 8,
        },
      ];

      mockPrisma.km_categories.findMany.mockResolvedValue(mockSuggestions);

      const result = await service.suggestCategories(content, 3);

      expect(mockPrisma.km_categories.findMany).toHaveBeenCalledWith({
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
        take: 3,
      });

      expect(result).toEqual(mockSuggestions);
    });

    it('should return empty array on error', async () => {
      mockPrisma.km_categories.findMany.mockRejectedValue(new Error('Database error'));

      const result = await service.suggestCategories('test content');

      expect(result).toEqual([]);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty category results', async () => {
      mockPrisma.km_categories.count.mockResolvedValue(0);
      mockPrisma.km_categories.findMany.mockResolvedValue([]);

      const result = await service.getCategories(
        { includeUsageStats: false, includeTree: false, limit: 20, offset: 0 },
        mockUserContext
      );

      expect(result.categories).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('should handle color validation in updates', async () => {
      const existingCategory = { id: 'cat-123', name: 'Test' };
      mockPrisma.km_categories.findUnique.mockResolvedValue(existingCategory);
      mockPrisma.km_categories.update.mockResolvedValue(existingCategory);

      // Valid color format
      await service.updateCategory('cat-123', { color: '#FF5733' }, mockUserContext.userId);

      expect(mockPrisma.km_categories.update).toHaveBeenCalledWith({
        where: { id: 'cat-123' },
        data: expect.objectContaining({
          color: '#FF5733',
        }),
        include: expect.any(Object),
      });
    });

    it('should handle complex hierarchy operations', async () => {
      // Test moving a category with deep nesting
      const existingCategory = { id: 'cat-123', name: 'Test', parentId: 'old-parent' };
      const newParent = { level: 0 };

      mockPrisma.km_categories.findUnique
        .mockResolvedValueOnce(existingCategory)
        .mockResolvedValueOnce(newParent);

      mockPrisma.km_categories.update.mockResolvedValue({});
      mockPrisma.km_categories.findMany.mockResolvedValue([]);

      await service.updateCategory('cat-123', { parentId: 'new-parent' }, mockUserContext.userId);

      expect(mockPrisma.km_categories.update).toHaveBeenCalledWith({
        where: { id: 'cat-123' },
        data: expect.objectContaining({
          parentId: 'new-parent',
          level: 1, // 0 + 1
        }),
        include: expect.any(Object),
      });
    });
  });
});
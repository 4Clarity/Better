import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { KnowledgeService } from '../../services/KnowledgeService';
import { getPrismaClient } from '../../utils/database';
import {
  createCategorySchema,
  updateCategorySchema,
  getCategoriesQuerySchema,
} from './categories.route';

export interface CategoriesQueryParams {
  search?: string;
  parentId?: string;
  level?: number;
  includeUsageStats: boolean;
  includeTree: boolean;
  isActive?: boolean;
  limit: number;
  offset: number;
}

export interface UserContext {
  userId: string;
  roles: string[];
  clearanceLevel: string;
}

export interface CategoryTree {
  id: string;
  name: string;
  level: number;
  usageCount?: number; // Calculated field, not stored in DB
  children: CategoryTree[];
}

export class CategoriesService extends KnowledgeService {
  private readonly prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    super();
    this.prisma = prismaClient || getPrismaClient();
  }

  /**
   * Calculate category level based on parent hierarchy
   */
  private async calculateLevel(parentId?: string): Promise<number> {
    if (!parentId) return 0;

    const parent = await this.prisma.km_categories.findUnique({
      where: { id: parentId, isActive: true },
      select: { level: true },
    });

    return parent ? parent.level + 1 : 0;
  }

  /**
   * Generate category path for hierarchical display
   */
  private async generatePath(categoryName: string, parentId?: string): Promise<string> {
    if (!parentId) return categoryName;

    const parent = await this.prisma.km_categories.findUnique({
      where: { id: parentId, isActive: true },
      select: { path: true },
    });

    return parent ? `${parent.path} / ${categoryName}` : categoryName;
  }

  /**
   * Validate parent category exists and is active
   */
  async validateParentCategory(parentId: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const parent = await this.prisma.km_categories.findUnique({
        where: { id: parentId, isActive: true },
        select: { id: true, level: true },
      });

      if (!parent) {
        return {
          valid: false,
          error: `Parent category with ID ${parentId} not found or inactive`
        };
      }

      // Check maximum nesting level (prevent overly deep hierarchies)
      if (parent.level >= 5) {
        return {
          valid: false,
          error: 'Maximum category nesting level (5) exceeded'
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Failed to validate parent category: ${error}`
      };
    }
  }

  /**
   * Check for circular references in category hierarchy
   */
  async checkCircularReference(parentId: string, categoryId?: string): Promise<{ valid: boolean; error?: string }> {
    if (!categoryId) return { valid: true };

    try {
      // Traverse up the parent hierarchy to check for cycles
      let currentParentId = parentId;
      const visited = new Set<string>();

      while (currentParentId) {
        if (currentParentId === categoryId) {
          return {
            valid: false,
            error: 'Circular reference detected: category cannot be a descendant of itself'
          };
        }

        if (visited.has(currentParentId)) {
          return {
            valid: false,
            error: 'Circular reference detected in category hierarchy'
          };
        }

        visited.add(currentParentId);

        const parent = await this.prisma.km_categories.findUnique({
          where: { id: currentParentId, isActive: true },
          select: { parentId: true },
        });

        currentParentId = parent?.parentId || null;
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Failed to check circular reference: ${error}`
      };
    }
  }

  /**
   * Validate category name uniqueness within parent scope
   */
  async validateCategoryUniqueness(
    name: string,
    parentId?: string,
    excludeId?: string
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      const whereConditions: any = {
        name: { equals: name, mode: 'insensitive' },
        parentId: parentId || null,
        isActive: true,
      };

      if (excludeId) {
        whereConditions.id = { not: excludeId };
      }

      const existing = await this.prisma.km_categories.findFirst({
        where: whereConditions,
        select: { id: true },
      });

      if (existing) {
        const parentScope = parentId ? 'within the same parent category' : 'at the root level';
        return {
          valid: false,
          error: `Category name '${name}' already exists ${parentScope}`
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Failed to validate category uniqueness: ${error}`
      };
    }
  }

  /**
   * Calculate usage statistics for categories
   */
  private async calculateUsageStatistics(categoryId: string): Promise<number> {
    try {
      // Count usage across facts, documents, and communications
      const [factsCount, documentsCount, communicationsCount] = await Promise.all([
        this.prisma.km_facts.count({
          where: {
            isActive: true,
            // Note: This assumes a category relationship exists - adjust based on actual schema
          },
        }),
        this.prisma.km_documents.count({
          where: {
            isActive: true,
            // Note: This assumes a category relationship exists - adjust based on actual schema
          },
        }),
        this.prisma.km_communications.count({
          where: {
            isActive: true,
            // Note: This assumes a category relationship exists - adjust based on actual schema
          },
        }),
      ]);

      // For now, return a calculated usage count
      // In a real implementation, this would use junction tables or direct relationships
      return factsCount + documentsCount + communicationsCount;
    } catch (error) {
      console.error(`Failed to calculate usage statistics for category ${categoryId}:`, error);
      return 0;
    }
  }

  /**
   * Create a new category record
   */
  async createCategory(
    categoryData: z.infer<typeof createCategorySchema>,
    userId: string
  ) {
    try {
      // Calculate level and path
      const level = await this.calculateLevel(categoryData.parentId);
      const path = await this.generatePath(categoryData.name, categoryData.parentId);

      const category = await this.prisma.km_categories.create({
        data: {
          name: categoryData.name,
          description: categoryData.description || null,
          parentId: categoryData.parentId || null,
          level,
          path,
          displayOrder: categoryData.displayOrder,
          color: categoryData.color || null,
          icon: categoryData.icon || null,
          metadata: categoryData.metadata || undefined,
          // usageCount is calculated dynamically, not stored in DB
          isActive: true,
          createdBy: userId,
        },
        include: {
          parent_category: {
            select: {
              id: true,
              name: true,
              path: true,
            },
          },
          child_categories: {
            select: {
              id: true,
              name: true,
              description: true,
              level: true,
              // usageCount: true, // Calculated field, not in schema
            },
            where: {
              isActive: true,
            },
            orderBy: {
              displayOrder: 'asc',
            },
          },
        },
      });

      return category;
    } catch (error: any) {
      this.handleError(error, 'createCategory');
    }
  }

  /**
   * Get categories with filtering, pagination, and optional tree structure
   */
  async getCategories(
    queryParams: z.infer<typeof getCategoriesQuerySchema>,
    userContext: UserContext
  ) {
    try {
      // Build filter conditions
      const whereConditions: any = {
        isActive: queryParams.isActive !== undefined ? queryParams.isActive : true,
      };

      // Add search filter
      if (queryParams.search) {
        whereConditions.OR = [
          { name: { contains: queryParams.search, mode: 'insensitive' } },
          { description: { contains: queryParams.search, mode: 'insensitive' } },
          { path: { contains: queryParams.search, mode: 'insensitive' } },
        ];
      }

      // Add parent filter
      if (queryParams.parentId !== undefined) {
        whereConditions.parentId = queryParams.parentId || null;
      }

      // Add level filter
      if (queryParams.level !== undefined) {
        whereConditions.level = queryParams.level;
      }

      // Get total count
      const total = await this.prisma.km_categories.count({
        where: whereConditions,
      });

      // Get categories
      const categories = await this.prisma.km_categories.findMany({
        where: whereConditions,
        include: {
          parent_category: {
            select: {
              id: true,
              name: true,
              path: true,
            },
          },
          child_categories: {
            select: {
              id: true,
              name: true,
              description: true,
              level: true,
              // usageCount: true, // Calculated field, not in schema
            },
            where: {
              isActive: true,
            },
            orderBy: {
              displayOrder: 'asc',
            },
          },
        },
        orderBy: [
          { level: 'asc' },
          { displayOrder: 'asc' },
          { name: 'asc' },
        ],
        take: queryParams.limit,
        skip: queryParams.offset,
      });

      // Update usage statistics if requested
      if (queryParams.includeUsageStats) {
        for (const category of categories) {
          (category as any).usageCount = await this.calculateUsageStatistics(category.id);
        }
      }

      const result: any = {
        categories,
        pagination: {
          total,
          limit: queryParams.limit,
          offset: queryParams.offset,
          hasMore: queryParams.offset + queryParams.limit < total,
        },
      };

      // Build tree structure if requested
      if (queryParams.includeTree) {
        result.tree = this.buildCategoryTree(categories);
      }

      return result;
    } catch (error: any) {
      this.handleError(error, 'getCategories');
    }
  }

  /**
   * Get category by ID with hierarchy context
   */
  async getCategoryById(categoryId: string, userContext: UserContext) {
    try {
      const category = await this.prisma.km_categories.findUnique({
        where: {
          id: categoryId,
          isActive: true,
        },
        include: {
          parent_category: {
            select: {
              id: true,
              name: true,
              path: true,
              level: true,
            },
          },
          child_categories: {
            select: {
              id: true,
              name: true,
              description: true,
              level: true,
              // usageCount: true, // Calculated field, not in schema
              displayOrder: true,
            },
            where: {
              isActive: true,
            },
            orderBy: {
              displayOrder: 'asc',
            },
          },
        },
      });

      if (!category) {
        return null;
      }

      // Calculate current usage statistics
      (category as any).usageCount = await this.calculateUsageStatistics(categoryId);

      // Get full hierarchy path
      (category as any).hierarchyPath = await this.getHierarchyPath(categoryId);

      return category;
    } catch (error: any) {
      this.handleError(error, 'getCategoryById');
    }
  }

  /**
   * Update category metadata and hierarchy
   */
  async updateCategory(
    categoryId: string,
    updateData: z.infer<typeof updateCategorySchema>,
    userId: string
  ) {
    try {
      // Check if category exists
      const existingCategory = await this.prisma.km_categories.findUnique({
        where: { id: categoryId, isActive: true },
      });

      if (!existingCategory) {
        throw new Error('Category not found');
      }

      // Prepare update data
      const updatePayload: any = {
        updatedAt: new Date(),
      };

      let needsPathUpdate = false;

      if (updateData.name !== undefined) {
        updatePayload.name = updateData.name;
        needsPathUpdate = true;
      }

      if (updateData.description !== undefined) {
        updatePayload.description = updateData.description;
      }

      if (updateData.parentId !== undefined) {
        updatePayload.parentId = updateData.parentId || null;
        updatePayload.level = await this.calculateLevel(updateData.parentId);
        needsPathUpdate = true;
      }

      if (updateData.displayOrder !== undefined) {
        updatePayload.displayOrder = updateData.displayOrder;
      }

      if (updateData.color !== undefined) {
        updatePayload.color = updateData.color;
      }

      if (updateData.icon !== undefined) {
        updatePayload.icon = updateData.icon;
      }

      if (updateData.metadata !== undefined) {
        updatePayload.metadata = updateData.metadata;
      }

      if (updateData.isActive !== undefined) {
        updatePayload.isActive = updateData.isActive;
      }

      // Update path if name or parent changed
      if (needsPathUpdate) {
        const newName = updateData.name || existingCategory.name;
        const newParentId = updateData.parentId !== undefined ? updateData.parentId : existingCategory.parentId;
        updatePayload.path = await this.generatePath(newName, newParentId);
      }

      const updatedCategory = await this.prisma.km_categories.update({
        where: { id: categoryId },
        data: updatePayload,
        include: {
          parent_category: {
            select: {
              id: true,
              name: true,
              path: true,
            },
          },
          child_categories: {
            select: {
              id: true,
              name: true,
              description: true,
              level: true,
              // usageCount: true, // Calculated field, not in schema
            },
            where: {
              isActive: true,
            },
            orderBy: {
              displayOrder: 'asc',
            },
          },
        },
      });

      // Update paths of all descendant categories if hierarchy changed
      if (needsPathUpdate) {
        await this.updateDescendantPaths(categoryId);
      }

      return updatedCategory;
    } catch (error: any) {
      this.handleError(error, 'updateCategory');
    }
  }

  /**
   * Soft delete category with cascade handling
   */
  async deleteCategory(categoryId: string, userId: string) {
    try {
      const existingCategory = await this.prisma.km_categories.findUnique({
        where: { id: categoryId, isActive: true },
      });

      if (!existingCategory) {
        throw new Error('Category not found');
      }

      // Get count of child categories that will be affected
      const childCount = await this.prisma.km_categories.count({
        where: {
          parentId: categoryId,
          isActive: true,
        },
      });

      // Soft delete the category
      await this.prisma.km_categories.update({
        where: { id: categoryId },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      // Handle child categories - move them to parent's parent or make them root level
      if (childCount > 0) {
        await this.prisma.km_categories.updateMany({
          where: {
            parentId: categoryId,
            isActive: true,
          },
          data: {
            parentId: existingCategory.parentId,
            level: existingCategory.level,
            updatedAt: new Date(),
          },
        });

        // Update paths for moved children
        const movedChildren = await this.prisma.km_categories.findMany({
          where: {
            parentId: existingCategory.parentId,
            isActive: true,
            level: existingCategory.level,
          },
        });

        for (const child of movedChildren) {
          await this.updateDescendantPaths(child.id);
        }
      }

      return { success: true, affectedChildren: childCount };
    } catch (error: any) {
      this.handleError(error, 'deleteCategory');
    }
  }

  /**
   * Check if category has child categories
   */
  async hasChildCategories(categoryId: string): Promise<boolean> {
    try {
      const childCount = await this.prisma.km_categories.count({
        where: {
          parentId: categoryId,
          isActive: true,
        },
      });

      return childCount > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check category usage across the system
   */
  async checkCategoryUsage(categoryId: string): Promise<{ inUse: boolean; usageCount: number }> {
    try {
      const usageCount = await this.calculateUsageStatistics(categoryId);
      return {
        inUse: usageCount > 0,
        usageCount,
      };
    } catch (error) {
      return { inUse: false, usageCount: 0 };
    }
  }

  /**
   * Build hierarchical tree structure from flat category list
   */
  private buildCategoryTree(categories: any[]): CategoryTree[] {
    const categoryMap = new Map<string, CategoryTree>();
    const rootCategories: CategoryTree[] = [];

    // Create category nodes
    categories.forEach(cat => {
      categoryMap.set(cat.id, {
        id: cat.id,
        name: cat.name,
        level: cat.level,
        usageCount: (cat as any).usageCount || 0, // Use calculated value if available
        children: [],
      });
    });

    // Build tree structure
    categories.forEach(cat => {
      const node = categoryMap.get(cat.id)!;

      if (cat.parentId && categoryMap.has(cat.parentId)) {
        const parent = categoryMap.get(cat.parentId)!;
        parent.children.push(node);
      } else {
        rootCategories.push(node);
      }
    });

    return rootCategories;
  }

  /**
   * Get full hierarchy path for a category
   */
  private async getHierarchyPath(categoryId: string): Promise<string[]> {
    const path: string[] = [];
    let currentId = categoryId;

    while (currentId) {
      const category = await this.prisma.km_categories.findUnique({
        where: { id: currentId, isActive: true },
        select: { name: true, parentId: true },
      });

      if (!category) break;

      path.unshift(category.name);
      currentId = category.parentId;
    }

    return path;
  }

  /**
   * Update paths for all descendant categories
   */
  private async updateDescendantPaths(categoryId: string): Promise<void> {
    const descendants = await this.prisma.km_categories.findMany({
      where: {
        path: { contains: `${categoryId}` },
        isActive: true,
      },
    });

    for (const descendant of descendants) {
      const newPath = await this.generatePath(descendant.name, descendant.parentId);
      const newLevel = await this.calculateLevel(descendant.parentId);

      await this.prisma.km_categories.update({
        where: { id: descendant.id },
        data: {
          path: newPath,
          level: newLevel,
          updatedAt: new Date(),
        },
      });
    }
  }

  /**
   * Get category suggestions based on content analysis
   */
  async suggestCategories(content: string, limit: number = 5): Promise<any[]> {
    try {
      // Simple keyword-based suggestion
      // In a real implementation, this could use NLP or ML for better suggestions
      const keywords = content.toLowerCase().split(/\s+/).filter(word => word.length > 3);

      const suggestions = await this.prisma.km_categories.findMany({
        where: {
          isActive: true,
          OR: keywords.map(keyword => ({
            OR: [
              { name: { contains: keyword, mode: 'insensitive' } },
              { description: { contains: keyword, mode: 'insensitive' } },
            ],
          })),
        },
        select: {
          id: true,
          name: true,
          path: true,
          // usageCount: true, // Calculated field, not in schema
        },
        orderBy: {
          displayOrder: 'asc', // Use displayOrder instead of usageCount for ordering
        },
        take: limit,
      });

      return suggestions;
    } catch (error) {
      console.error('Failed to suggest categories:', error);
      return [];
    }
  }
}
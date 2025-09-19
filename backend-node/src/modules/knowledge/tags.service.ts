import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { KnowledgeService } from '../../services/KnowledgeService';
import { getPrismaClient } from '../../utils/database';
import {
  createTagSchema,
  updateTagSchema,
  getTagsQuerySchema,
} from './tags.route';

export interface TagsQueryParams {
  search?: string;
  type?: string;
  entityType?: string;
  entityId?: string;
  includeUsageStats: boolean;
  includeTagCloud: boolean;
  minUsageCount?: number;
  isActive?: boolean;
  limit: number;
  offset: number;
}

export interface UserContext {
  userId: string;
  roles: string[];
  clearanceLevel: string;
}

export interface TagCloudItem {
  id: string;
  name: string;
  type: string;
  usageCount: number;
  weight: number;
}

export interface TagSuggestion {
  id: string;
  name: string;
  type: string;
  relevanceScore: number;
  usageCount: number;
}

export class TagsService extends KnowledgeService {
  private readonly prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    super();
    this.prisma = prismaClient || getPrismaClient();
  }

  /**
   * Map API tag type to Prisma enum format
   */
  private mapTagType(apiType: string): string {
    const mapping: Record<string, string> = {
      'CONTENT': 'Content',
      'TOPIC': 'Topic',
      'PRIORITY': 'Priority',
      'STATUS': 'Status',
      'CUSTOM': 'Custom'
    };
    return mapping[apiType] || 'Custom';
  }

  /**
   * Map API entity type to Prisma enum format
   */
  private mapEntityType(apiType: string): string {
    const mapping: Record<string, string> = {
      'DOCUMENT': 'Document',
      'COMMUNICATION': 'Communication',
      'FACT': 'Fact'
    };
    return mapping[apiType] || 'Document';
  }

  /**
   * Validate tag name uniqueness
   */
  async validateTagUniqueness(name: string, excludeId?: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const whereConditions: any = {
        name: { equals: name, mode: 'insensitive' },
        isActive: true,
      };

      if (excludeId) {
        whereConditions.id = { not: excludeId };
      }

      const existing = await this.prisma.km_tags.findFirst({
        where: whereConditions,
        select: { id: true },
      });

      if (existing) {
        return {
          valid: false,
          error: `Tag name '${name}' already exists`
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Failed to validate tag uniqueness: ${error}`
      };
    }
  }

  /**
   * Validate tag type and metadata consistency
   */
  validateTagTypeConsistency(type: string, metadata?: any): { valid: boolean; error?: string } {
    // Define required metadata fields for specific tag types
    const typeRequirements: Record<string, string[]> = {
      'PRIORITY': ['level', 'order'],
      'STATUS': ['state', 'category'],
    };

    const requiredFields = typeRequirements[type];
    if (!requiredFields) {
      return { valid: true }; // No specific requirements
    }

    if (!metadata) {
      return {
        valid: false,
        error: `Tag type '${type}' requires metadata with fields: ${requiredFields.join(', ')}`
      };
    }

    const missingFields = requiredFields.filter(field => !(field in metadata));
    if (missingFields.length > 0) {
      return {
        valid: false,
        error: `Tag type '${type}' requires metadata fields: ${missingFields.join(', ')}`
      };
    }

    return { valid: true };
  }

  /**
   * Calculate tag usage statistics across all entities
   */
  private async calculateTagUsageStatistics(tagId: string) {
    try {
      // Note: This assumes junction tables exist for tag relationships
      // Adjust the queries based on actual schema implementation
      const [documentsCount, communicationsCount, factsCount] = await Promise.all([
        // These would use actual junction tables in a real implementation
        // For now, we'll return mock counts
        Promise.resolve(0), // Document-Tag relationships
        Promise.resolve(0), // Communication-Tag relationships
        Promise.resolve(0), // Fact-Tag relationships
      ]);

      const totalUsage = documentsCount + communicationsCount + factsCount;

      return {
        total: totalUsage,
        documents: documentsCount,
        communications: communicationsCount,
        facts: factsCount,
      };
    } catch (error) {
      console.error(`Failed to calculate usage statistics for tag ${tagId}:`, error);
      return {
        total: 0,
        documents: 0,
        communications: 0,
        facts: 0,
      };
    }
  }

  /**
   * Generate tag color based on type if not specified
   */
  private generateTagColor(type: string): string {
    const typeColors: Record<string, string> = {
      'CONTENT': '#2563EB',    // Blue
      'TOPIC': '#059669',      // Green
      'PRIORITY': '#DC2626',   // Red
      'STATUS': '#7C3AED',     // Purple
      'CUSTOM': '#6B7280',     // Gray
    };

    return typeColors[type] || typeColors['CUSTOM'];
  }

  /**
   * Create a new tag record
   */
  async createTag(
    tagData: z.infer<typeof createTagSchema>,
    userId: string
  ) {
    try {
      // Generate color if not provided
      const color = tagData.color || this.generateTagColor(tagData.type);

      const tag = await this.prisma.km_tags.create({
        data: {
          name: tagData.name,
          description: tagData.description || null,
          tagType: this.mapTagType(tagData.type) as any,
          color,
          // icon: tagData.icon || null, // Field not in schema
          metadata: tagData.metadata || undefined,
          usageCount: 0, // Initialize to 0
          isActive: true,
          createdBy: userId,
        },
      });

      // Add initial usage statistics
      const usageStats = await this.calculateTagUsageStatistics(tag.id);
      (tag as any).relatedEntities = usageStats;

      return tag;
    } catch (error: any) {
      this.handleError(error, 'createTag');
    }
  }

  /**
   * Get tags with filtering, pagination, and usage statistics
   */
  async getTags(
    queryParams: z.infer<typeof getTagsQuerySchema>,
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
        ];
      }

      // Add type filter
      if (queryParams.type) {
        whereConditions.tagType = this.mapTagType(queryParams.type);
      }

      // Add usage count filter
      if (queryParams.minUsageCount !== undefined) {
        whereConditions.usageCount = { gte: queryParams.minUsageCount };
      }

      // Add entity relationship filter
      if (queryParams.entityId && queryParams.entityType) {
        // This would filter tags associated with a specific entity
        // Implementation depends on junction table structure
        // For now, we'll skip this filter
      }

      // Get total count
      const total = await this.prisma.km_tags.count({
        where: whereConditions,
      });

      // Get tags
      const tags = await this.prisma.km_tags.findMany({
        where: whereConditions,
        orderBy: [
          { usageCount: 'desc' },
          { name: 'asc' },
        ],
        take: queryParams.limit,
        skip: queryParams.offset,
      });

      // Update usage statistics if requested
      if (queryParams.includeUsageStats) {
        for (const tag of tags) {
          const usageStats = await this.calculateTagUsageStatistics(tag.id);
          tag.usageCount = usageStats.total;
          (tag as any).relatedEntities = usageStats;
        }
      }

      const result: any = {
        tags,
        pagination: {
          total,
          limit: queryParams.limit,
          offset: queryParams.offset,
          hasMore: queryParams.offset + queryParams.limit < total,
        },
      };

      // Build tag cloud if requested
      if (queryParams.includeTagCloud) {
        result.tagCloud = this.buildTagCloud(tags);
      }

      return result;
    } catch (error: any) {
      this.handleError(error, 'getTags');
    }
  }

  /**
   * Get tag by ID with detailed usage statistics
   */
  async getTagById(tagId: string, userContext: UserContext) {
    try {
      const tag = await this.prisma.km_tags.findUnique({
        where: {
          id: tagId,
          isActive: true,
        },
      });

      if (!tag) {
        return null;
      }

      // Calculate current usage statistics
      const usageStats = await this.calculateTagUsageStatistics(tagId);
      tag.usageCount = usageStats.total;
      (tag as any).relatedEntities = usageStats;

      // Get related tags (tags commonly used together)
      (tag as any).relatedTags = await this.getRelatedTags(tagId);

      return tag;
    } catch (error: any) {
      this.handleError(error, 'getTagById');
    }
  }

  /**
   * Update tag metadata and properties
   */
  async updateTag(
    tagId: string,
    updateData: z.infer<typeof updateTagSchema>,
    userId: string
  ) {
    try {
      // Check if tag exists
      const existingTag = await this.prisma.km_tags.findUnique({
        where: { id: tagId, isActive: true },
      });

      if (!existingTag) {
        throw new Error('Tag not found');
      }

      // Prepare update data
      const updatePayload: any = {
        updatedAt: new Date(),
      };

      if (updateData.name !== undefined) {
        updatePayload.name = updateData.name;
      }

      if (updateData.description !== undefined) {
        updatePayload.description = updateData.description;
      }

      if (updateData.type !== undefined) {
        updatePayload.tagType = this.mapTagType(updateData.type);
      }

      if (updateData.color !== undefined) {
        updatePayload.color = updateData.color;
      }

      // if (updateData.icon !== undefined) {
      //   updatePayload.icon = updateData.icon; // Field not in schema
      // }

      if (updateData.metadata !== undefined) {
        updatePayload.metadata = updateData.metadata;
      }

      if (updateData.isActive !== undefined) {
        updatePayload.isActive = updateData.isActive;
      }

      const updatedTag = await this.prisma.km_tags.update({
        where: { id: tagId },
        data: updatePayload,
      });

      // Recalculate usage statistics
      const usageStats = await this.calculateTagUsageStatistics(tagId);
      updatedTag.usageCount = usageStats.total;
      (updatedTag as any).relatedEntities = usageStats;

      return updatedTag;
    } catch (error: any) {
      this.handleError(error, 'updateTag');
    }
  }

  /**
   * Soft delete tag with relationship cleanup
   */
  async deleteTag(tagId: string, userId: string) {
    try {
      const existingTag = await this.prisma.km_tags.findUnique({
        where: { id: tagId, isActive: true },
      });

      if (!existingTag) {
        throw new Error('Tag not found');
      }

      // Count relationships that will be removed
      const usageStats = await this.calculateTagUsageStatistics(tagId);
      const totalRelationships = usageStats.total;

      // Soft delete the tag
      await this.prisma.km_tags.update({
        where: { id: tagId },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      // In a real implementation, this would also clean up junction table relationships
      // For now, we'll just return the count
      return {
        success: true,
        removedRelationships: totalRelationships
      };
    } catch (error: any) {
      this.handleError(error, 'deleteTag');
    }
  }

  /**
   * Check tag usage across the system
   */
  async checkTagUsage(tagId: string): Promise<{ inUse: boolean; usageCount: number }> {
    try {
      const usageStats = await this.calculateTagUsageStatistics(tagId);
      return {
        inUse: usageStats.total > 0,
        usageCount: usageStats.total,
      };
    } catch (error) {
      return { inUse: false, usageCount: 0 };
    }
  }

  /**
   * Build tag cloud data with weighted usage
   */
  private buildTagCloud(tags: any[]): TagCloudItem[] {
    if (tags.length === 0) return [];

    // Calculate weight based on usage statistics
    const maxUsage = Math.max(...tags.map(tag => tag.usageCount));
    const minUsage = Math.min(...tags.map(tag => tag.usageCount));
    const usageRange = maxUsage - minUsage || 1;

    return tags
      .filter(tag => tag.usageCount > 0)
      .map(tag => ({
        id: tag.id,
        name: tag.name,
        type: tag.tagType, // Map tagType back to type for API response
        usageCount: tag.usageCount,
        weight: minUsage === maxUsage ? 1.0 :
                (tag.usageCount - minUsage) / usageRange * 0.8 + 0.2, // Scale 0.2-1.0
      }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 50); // Limit tag cloud size
  }

  /**
   * Get related tags (commonly used together)
   */
  private async getRelatedTags(tagId: string, limit: number = 10): Promise<any[]> {
    try {
      // This would analyze co-occurrence patterns in tag usage
      // For now, return similar type tags with high usage
      const currentTag = await this.prisma.km_tags.findUnique({
        where: { id: tagId },
        select: { tagType: true },
      });

      if (!currentTag) return [];

      const relatedTags = await this.prisma.km_tags.findMany({
        where: {
          tagType: currentTag.tagType,
          id: { not: tagId },
          isActive: true,
          usageCount: { gt: 0 },
        },
        select: {
          id: true,
          name: true,
          tagType: true,
          usageCount: true,
        },
        orderBy: {
          usageCount: 'desc',
        },
        take: limit,
      });

      return relatedTags;
    } catch (error) {
      console.error('Failed to get related tags:', error);
      return [];
    }
  }

  /**
   * Suggest tags based on content analysis
   */
  async suggestTags(content: string, entityType?: string, limit: number = 10): Promise<TagSuggestion[]> {
    try {
      // Simple keyword-based suggestion
      // In a real implementation, this could use NLP or ML for better suggestions
      const keywords = content.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3)
        .slice(0, 20); // Limit keywords to analyze

      if (keywords.length === 0) return [];

      const suggestions = await this.prisma.km_tags.findMany({
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
          tagType: true,
          usageCount: true,
        },
        orderBy: {
          usageCount: 'desc',
        },
        take: limit * 2, // Get more to allow for relevance scoring
      });

      // Calculate relevance scores based on keyword matches
      const scoredSuggestions = suggestions.map(tag => {
        const nameMatches = keywords.filter(keyword =>
          tag.name.toLowerCase().includes(keyword)
        ).length;

        const relevanceScore = nameMatches / keywords.length;

        return {
          id: tag.id,
          name: tag.name,
          type: tag.tagType, // Map tagType back to type for API response
          relevanceScore,
          usageCount: tag.usageCount,
        };
      });

      // Sort by relevance score and usage count
      return scoredSuggestions
        .filter(suggestion => suggestion.relevanceScore > 0)
        .sort((a, b) => {
          if (a.relevanceScore !== b.relevanceScore) {
            return b.relevanceScore - a.relevanceScore;
          }
          return b.usageCount - a.usageCount;
        })
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to suggest tags:', error);
      return [];
    }
  }

  /**
   * Add tag relationships to entities
   */
  async addTagRelationships(
    entityType: string,
    entityId: string,
    tagIds: string[],
    userId: string
  ): Promise<{ addedRelationships: number; skippedDuplicates: number }> {
    try {
      // Validate entity exists
      const entityValidation = await this.validateEntityExists(entityType, entityId);
      if (!entityValidation.valid) {
        throw new Error(entityValidation.error);
      }

      // Validate all tags exist
      const validTags = await this.prisma.km_tags.findMany({
        where: {
          id: { in: tagIds },
          isActive: true,
        },
        select: { id: true },
      });

      const validTagIds = validTags.map(tag => tag.id);
      const invalidTagIds = tagIds.filter(id => !validTagIds.includes(id));

      if (invalidTagIds.length > 0) {
        throw new Error(`Invalid or inactive tag IDs: ${invalidTagIds.join(', ')}`);
      }

      // In a real implementation, this would use junction tables
      // For now, we'll simulate the operation
      let addedCount = 0;
      let skippedCount = 0;

      for (const tagId of validTagIds) {
        // Check if relationship already exists (would use junction table)
        const exists = false; // Placeholder for actual check

        if (!exists) {
          // Add relationship (would insert into junction table)
          addedCount++;

          // Update tag usage count
          await this.prisma.km_tags.update({
            where: { id: tagId },
            data: {
              usageCount: { increment: 1 },
              updatedAt: new Date(),
            },
          });
        } else {
          skippedCount++;
        }
      }

      return {
        addedRelationships: addedCount,
        skippedDuplicates: skippedCount,
      };
    } catch (error: any) {
      this.handleError(error, 'addTagRelationships');
    }
  }

  /**
   * Remove tag relationships from entities
   */
  async removeTagRelationships(
    entityType: string,
    entityId: string,
    tagIds: string[],
    userId: string
  ): Promise<{ removedRelationships: number }> {
    try {
      // Validate entity exists
      const entityValidation = await this.validateEntityExists(entityType, entityId);
      if (!entityValidation.valid) {
        throw new Error(entityValidation.error);
      }

      // In a real implementation, this would use junction tables
      // For now, we'll simulate the operation
      let removedCount = 0;

      for (const tagId of tagIds) {
        // Check if relationship exists (would use junction table)
        const exists = true; // Placeholder for actual check

        if (exists) {
          // Remove relationship (would delete from junction table)
          removedCount++;

          // Update tag usage count
          await this.prisma.km_tags.update({
            where: { id: tagId, isActive: true },
            data: {
              usageCount: { decrement: 1 },
              updatedAt: new Date(),
            },
          }).catch(() => {
            // Handle case where tag doesn't exist or usageCount is already 0
          });
        }
      }

      return { removedRelationships: removedCount };
    } catch (error: any) {
      this.handleError(error, 'removeTagRelationships');
    }
  }

  /**
   * Validate that an entity exists
   */
  private async validateEntityExists(entityType: string, entityId: string): Promise<{ valid: boolean; error?: string }> {
    try {
      let exists = false;

      switch (entityType) {
        case 'DOCUMENT':
          const document = await this.prisma.km_documents.findUnique({
            where: { id: entityId, isActive: true },
            select: { id: true },
          });
          exists = !!document;
          break;

        case 'COMMUNICATION':
          const communication = await this.prisma.km_communications.findUnique({
            where: { id: entityId, isActive: true },
            select: { id: true },
          });
          exists = !!communication;
          break;

        case 'FACT':
          const fact = await this.prisma.km_facts.findUnique({
            where: { id: entityId, isActive: true },
            select: { id: true },
          });
          exists = !!fact;
          break;

        default:
          return {
            valid: false,
            error: `Unsupported entity type: ${entityType}`
          };
      }

      if (!exists) {
        return {
          valid: false,
          error: `${entityType.toLowerCase()} with ID ${entityId} not found or inactive`
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Failed to validate entity: ${error}`
      };
    }
  }

  /**
   * Get tag usage trends over time
   */
  async getTagUsageTrends(tagId: string, days: number = 30): Promise<any[]> {
    try {
      // This would analyze tag usage patterns over time
      // For now, return mock trend data
      const trends = [];
      const now = new Date();

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);

        trends.push({
          date: date.toISOString().split('T')[0],
          usageCount: Math.floor(Math.random() * 10) + 1,
          newRelationships: Math.floor(Math.random() * 5),
        });
      }

      return trends;
    } catch (error) {
      console.error('Failed to get tag usage trends:', error);
      return [];
    }
  }
}
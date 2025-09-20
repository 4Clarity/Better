import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { KnowledgeService } from '../../services/KnowledgeService';
import { getPrismaClient } from '../../utils/database';
import {
  createFactSchema,
  updateFactSchema,
  getFactsQuerySchema,
} from './facts.route';

export interface FactsQueryParams {
  search?: string;
  factType?: string;
  sourceEntityId?: string;
  sourceEntityType?: string;
  approvalStatus?: string;
  securityClassification?: string;
  minConfidence?: number;
  maxConfidence?: number;
  isActive?: boolean;
  limit: number;
  offset: number;
}

export interface UserContext {
  userId: string;
  roles: string[];
  clearanceLevel: string;
}

export class FactsService extends KnowledgeService {
  private readonly prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    super();
    this.prisma = prismaClient || getPrismaClient();
  }

  /**
   * Map API fact type to Prisma enum format
   */
  private mapFactType(apiFactType: string): string {
    const mapping: Record<string, string> = {
      'ENTITY': 'Entity',
      'RELATIONSHIP': 'Relationship',
      'EVENT': 'Event',
      'METRIC': 'Metric',
      'CLASSIFICATION': 'Classification',
      'OTHER': 'Other'
    };
    return mapping[apiFactType] || 'Other';
  }

  /**
   * Map API approval status to Prisma enum format
   */
  private mapApprovalStatus(apiStatus: string): string {
    const mapping: Record<string, string> = {
      'PENDING': 'Pending',
      'UNDER_REVIEW': 'Under_Review',
      'APPROVED': 'Approved',
      'REJECTED': 'Rejected',
      'ESCALATED': 'Escalated'
    };
    return mapping[apiStatus] || 'Pending';
  }

  /**
   * Map API source entity type to Prisma enum format
   */
  private mapSourceEntityType(apiType: string): string {
    const mapping: Record<string, string> = {
      'DOCUMENT': 'Document',
      'COMMUNICATION': 'Communication',
      'OTHER': 'Other'
    };
    return mapping[apiType] || 'Other';
  }

  /**
   * Map API security classification to Prisma enum format
   */
  private mapSecurityClassification(apiClassification: string): string {
    const mapping: Record<string, string> = {
      'UNCLASSIFIED': 'Unclassified',
      'CONFIDENTIAL': 'Confidential',
      'SECRET': 'Secret',
      'TOP_SECRET': 'Top_Secret'
    };
    return mapping[apiClassification] || 'Unclassified';
  }

  /**
   * Validate source reference integrity
   */
  async validateSourceReference(sourceEntityId: string, sourceEntityType: string): Promise<{ valid: boolean; error?: string }> {
    try {
      let exists = false;

      switch (sourceEntityType) {
        case 'DOCUMENT':
          const document = await this.prisma.km_documents.findUnique({
            where: { id: sourceEntityId, isActive: true },
            select: { id: true },
          });
          exists = !!document;
          break;

        case 'COMMUNICATION':
          const communication = await this.prisma.km_communications.findUnique({
            where: { id: sourceEntityId, isActive: true },
            select: { id: true },
          });
          exists = !!communication;
          break;

        default:
          return { valid: true }; // Allow other types without validation
      }

      if (!exists) {
        return {
          valid: false,
          error: `Source ${sourceEntityType.toLowerCase()} with ID ${sourceEntityId} not found`
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Failed to validate source reference: ${error}`
      };
    }
  }

  /**
   * Validate approval status transitions based on business rules
   */
  validateApprovalStatusTransition(
    currentStatus: string,
    newStatus: string,
    userRoles: string[]
  ): { valid: boolean; error?: string } {
    // Define valid transition matrix
    const validTransitions: Record<string, string[]> = {
      'PENDING': ['UNDER_REVIEW', 'APPROVED', 'REJECTED'],
      'UNDER_REVIEW': ['APPROVED', 'REJECTED', 'ESCALATED', 'PENDING'],
      'APPROVED': ['UNDER_REVIEW'], // Only allow re-review of approved facts
      'REJECTED': ['PENDING', 'UNDER_REVIEW'], // Allow resubmission
      'ESCALATED': ['UNDER_REVIEW', 'APPROVED', 'REJECTED'],
    };

    // Check if transition is valid
    const allowedNextStates = validTransitions[currentStatus] || [];
    if (!allowedNextStates.includes(newStatus)) {
      return {
        valid: false,
        error: `Invalid approval status transition from ${currentStatus} to ${newStatus}`
      };
    }

    // Check role-based permissions for certain transitions
    if (newStatus === 'APPROVED' && !userRoles.includes('approver') && !userRoles.includes('admin')) {
      return {
        valid: false,
        error: 'Insufficient permissions to approve facts. Requires approver or admin role.'
      };
    }

    if (newStatus === 'ESCALATED' && !userRoles.includes('reviewer') && !userRoles.includes('admin')) {
      return {
        valid: false,
        error: 'Insufficient permissions to escalate facts. Requires reviewer or admin role.'
      };
    }

    return { valid: true };
  }

  /**
   * Calculate confidence score based on various factors
   */
  private calculateAdjustedConfidence(
    baseConfidence: number,
    metadata?: any,
    sourceType?: string
  ): number {
    let adjustedConfidence = baseConfidence;

    // Adjust based on source type reliability
    if (sourceType === 'DOCUMENT') {
      adjustedConfidence *= 1.1; // Documents are typically more reliable
    } else if (sourceType === 'COMMUNICATION') {
      adjustedConfidence *= 0.9; // Communications may be less formal
    }

    // Adjust based on metadata factors
    if (metadata) {
      if (metadata.verified === true) {
        adjustedConfidence *= 1.2;
      }
      if (metadata.uncertain === true) {
        adjustedConfidence *= 0.8;
      }
      if (metadata.automated === true) {
        adjustedConfidence *= 0.9; // Automated extraction may be less reliable
      }
    }

    // Ensure confidence stays within bounds
    return Math.min(1.0, Math.max(0.0, adjustedConfidence));
  }

  /**
   * Create a new fact record
   */
  async createFact(
    factData: z.infer<typeof createFactSchema>,
    userId: string
  ) {
    try {
      // Calculate adjusted confidence score
      const adjustedConfidence = this.calculateAdjustedConfidence(
        factData.confidence,
        factData.metadata,
        factData.sourceEntityType
      );

      const fact = await this.prisma.km_facts.create({
        data: {
          factType: this.mapFactType(factData.factType) as any,
          content: factData.content,
          summary: factData.summary || null,
          confidence: adjustedConfidence,
          // source: factData.source || null, // Not in schema, use sourceDocumentId/sourceCommunicationId
          sourceDocumentId: factData.sourceEntityType === 'DOCUMENT' ? factData.sourceEntityId : null,
          sourceCommunicationId: factData.sourceEntityType === 'COMMUNICATION' ? factData.sourceEntityId : null,
          // sourceEntityType calculated based on sourceDocumentId vs sourceCommunicationId
          extractionMetadata: factData.metadata || undefined,
          approvalStatus: this.mapApprovalStatus(factData.approvalStatus) as any,
          securityClassification: this.mapSecurityClassification(factData.securityClassification) as any,
          isActive: true,
          extractedBy: userId,
          extractedAt: factData.extractedAt ? new Date(factData.extractedAt) : new Date(),
        },
        include: {
          users_extracted: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          users_approved: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          source_document: {
            select: {
              id: true,
              name: true,
              originalFileName: true,
            },
          },
          source_communication: {
            select: {
              id: true,
              subject: true,
              platform: true,
              threadId: true,
            },
          },
        },
      });

      return fact;
    } catch (error: any) {
      this.handleError(error, 'createFact');
    }
  }

  /**
   * Get facts with filtering, pagination, and security filtering
   */
  async getFacts(
    queryParams: z.infer<typeof getFactsQuerySchema>,
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
          { content: { contains: queryParams.search, mode: 'insensitive' } },
          { summary: { contains: queryParams.search, mode: 'insensitive' } },
          // { source: { contains: queryParams.search, mode: 'insensitive' } }, // Field not in schema
        ];
      }

      // Add fact type filter
      if (queryParams.factType) {
        whereConditions.factType = this.mapFactType(queryParams.factType);
      }

      // Add source entity filters
      if (queryParams.sourceEntityId && queryParams.sourceEntityType) {
        if (queryParams.sourceEntityType === 'DOCUMENT') {
          whereConditions.sourceDocumentId = queryParams.sourceEntityId;
        } else if (queryParams.sourceEntityType === 'COMMUNICATION') {
          whereConditions.sourceCommunicationId = queryParams.sourceEntityId;
        }
      }

      // Add approval status filter
      if (queryParams.approvalStatus) {
        whereConditions.approvalStatus = this.mapApprovalStatus(queryParams.approvalStatus);
      }

      // Add security classification filter
      if (queryParams.securityClassification) {
        whereConditions.securityClassification = this.mapSecurityClassification(queryParams.securityClassification);
      }

      // Add confidence range filters
      if (queryParams.minConfidence !== undefined || queryParams.maxConfidence !== undefined) {
        whereConditions.confidence = {};
        if (queryParams.minConfidence !== undefined) {
          whereConditions.confidence.gte = queryParams.minConfidence;
        }
        if (queryParams.maxConfidence !== undefined) {
          whereConditions.confidence.lte = queryParams.maxConfidence;
        }
      }

      // Get total count
      const total = await this.prisma.km_facts.count({
        where: whereConditions,
      });

      // Get facts
      const facts = await this.prisma.km_facts.findMany({
        where: whereConditions,
        include: {
          users_extracted: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          users_approved: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          source_document: {
            select: {
              id: true,
              name: true,
              originalFileName: true,
            },
          },
          source_communication: {
            select: {
              id: true,
              subject: true,
              platform: true,
              threadId: true,
            },
          },
        },
        orderBy: [
          { confidence: 'desc' },
          { extractedAt: 'desc' },
        ],
        take: queryParams.limit,
        skip: queryParams.offset,
      });

      // Apply security filtering
      const filteredFacts = this.applySecurityFilter(facts, userContext.clearanceLevel);

      // Calculate approval workflow statistics
      const approvalStats = this.calculateApprovalStatistics(filteredFacts);

      return {
        facts: filteredFacts,
        approvalStatistics: approvalStats,
        pagination: {
          total: filteredFacts.length,
          limit: queryParams.limit,
          offset: queryParams.offset,
          hasMore: queryParams.offset + queryParams.limit < total,
        },
      };
    } catch (error: any) {
      this.handleError(error, 'getFacts');
    }
  }

  /**
   * Get fact by ID with source context and security filtering
   */
  async getFactById(factId: string, userContext: UserContext) {
    try {
      const fact = await this.prisma.km_facts.findUnique({
        where: {
          id: factId,
          isActive: true,
        },
        include: {
          users_extracted: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          users_approved: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          source_document: {
            select: {
              id: true,
              name: true,
              originalFileName: true,
              securityClassification: true,
            },
          },
          source_communication: {
            select: {
              id: true,
              subject: true,
              platform: true,
              threadId: true,
              securityClassification: true,
            },
          },
        },
      });

      if (!fact) {
        return null;
      }

      // Apply security filtering
      const filteredFacts = this.applySecurityFilter([fact], userContext.clearanceLevel);

      if (filteredFacts.length === 0) {
        throw new Error('User has insufficient permissions to access this fact');
      }

      const result = filteredFacts[0];

      // Add approval history if available
      (result as any).approvalHistory = await this.getFactApprovalHistory(factId);

      return result;
    } catch (error: any) {
      this.handleError(error, 'getFactById');
    }
  }

  /**
   * Update fact metadata and approval status
   */
  async updateFact(
    factId: string,
    updateData: z.infer<typeof updateFactSchema>,
    userId: string
  ) {
    try {
      // Check if fact exists
      const existingFact = await this.prisma.km_facts.findUnique({
        where: { id: factId, isActive: true },
      });

      if (!existingFact) {
        throw new Error('Fact not found');
      }

      // Prepare update data
      const updatePayload: any = {
        updatedAt: new Date(),
      };

      if (updateData.factType !== undefined) {
        updatePayload.factType = this.mapFactType(updateData.factType);
      }

      if (updateData.content !== undefined) {
        updatePayload.content = updateData.content;
      }

      if (updateData.summary !== undefined) {
        updatePayload.summary = updateData.summary;
      }

      if (updateData.confidence !== undefined) {
        // Recalculate adjusted confidence
        updatePayload.confidence = this.calculateAdjustedConfidence(
          updateData.confidence,
          updateData.metadata || existingFact.extractionMetadata,
          existingFact.sourceDocumentId ? 'DOCUMENT' : 'COMMUNICATION' // Calculate source type
        );
      }

      // if (updateData.source !== undefined) {
      //   updatePayload.source = updateData.source; // Field not in schema
      // }

      if (updateData.metadata !== undefined) {
        updatePayload.extractionMetadata = updateData.metadata;
      }

      if (updateData.approvalStatus !== undefined) {
        updatePayload.approvalStatus = this.mapApprovalStatus(updateData.approvalStatus);

        // Set approval metadata when approving
        if (updateData.approvalStatus === 'APPROVED') {
          updatePayload.approvedBy = userId;
          updatePayload.approvedAt = new Date();
        }

        // Clear approval metadata when changing from approved
        if (existingFact.approvalStatus === 'Approved' && updateData.approvalStatus !== 'APPROVED') {
          updatePayload.approvedBy = null;
          updatePayload.approvedAt = null;
        }
      }

      if (updateData.rejectionReason !== undefined) {
        updatePayload.rejectionReason = updateData.rejectionReason;
      }

      if (updateData.securityClassification !== undefined) {
        updatePayload.securityClassification = this.mapSecurityClassification(updateData.securityClassification);
      }

      if (updateData.isActive !== undefined) {
        updatePayload.isActive = updateData.isActive;
      }

      const updatedFact = await this.prisma.km_facts.update({
        where: { id: factId },
        data: updatePayload,
        include: {
          users_extracted: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          users_approved: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          source_document: {
            select: {
              id: true,
              name: true,
              originalFileName: true,
            },
          },
          source_communication: {
            select: {
              id: true,
              subject: true,
              platform: true,
              threadId: true,
            },
          },
        },
      });

      return updatedFact;
    } catch (error: any) {
      this.handleError(error, 'updateFact');
    }
  }

  /**
   * Soft delete fact by setting isActive to false
   */
  async deleteFact(factId: string, userId: string) {
    try {
      const existingFact = await this.prisma.km_facts.findUnique({
        where: { id: factId, isActive: true },
      });

      if (!existingFact) {
        throw new Error('Fact not found');
      }

      await this.prisma.km_facts.update({
        where: { id: factId },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      return { success: true };
    } catch (error: any) {
      this.handleError(error, 'deleteFact');
    }
  }

  /**
   * Calculate approval workflow statistics
   */
  private calculateApprovalStatistics(facts: any[]) {
    const stats = {
      total: facts.length,
      byStatus: {} as Record<string, number>,
      byConfidenceRange: {
        high: 0, // 0.8-1.0
        medium: 0, // 0.5-0.8
        low: 0, // 0.0-0.5
      },
      averageConfidence: 0,
    };

    facts.forEach(fact => {
      // Count by approval status
      const status = fact.approvalStatus;
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

      // Count by confidence range
      if (fact.confidence >= 0.8) {
        stats.byConfidenceRange.high++;
      } else if (fact.confidence >= 0.5) {
        stats.byConfidenceRange.medium++;
      } else {
        stats.byConfidenceRange.low++;
      }
    });

    // Calculate average confidence
    if (facts.length > 0) {
      stats.averageConfidence = facts.reduce((sum, fact) => sum + fact.confidence, 0) / facts.length;
    }

    return stats;
  }

  /**
   * Get fact approval history from audit logs
   */
  private async getFactApprovalHistory(factId: string) {
    try {
      const auditLogs = await this.prisma.auditLog.findMany({
        where: {
          entityType: 'km_facts',
          entityId: factId,
          action: 'UPDATE',
        },
        orderBy: {
          timestamp: 'desc',
        },
        take: 10, // Last 10 approval actions
      });

      return auditLogs.filter(log =>
        log.newValues &&
        typeof log.newValues === 'object' &&
        'approvalStatus' in log.newValues
      ).map(log => ({
        timestamp: log.timestamp,
        userId: log.userId,
        previousStatus: log.oldValues && typeof log.oldValues === 'object' ? (log.oldValues as any).approvalStatus : null,
        newStatus: (log.newValues as any).approvalStatus,
        rejectionReason: (log.newValues as any).rejectionReason || null,
      }));
    } catch (error) {
      console.error('Failed to get approval history:', error);
      return [];
    }
  }

  /**
   * Bulk approve facts with batch processing
   */
  async bulkApproveFacts(factIds: string[], userId: string, userContext: UserContext) {
    try {
      // Validate user has approval permissions
      if (!userContext.roles.includes('approver') && !userContext.roles.includes('admin')) {
        throw new Error('Insufficient permissions to approve facts');
      }

      const results = [];

      for (const factId of factIds) {
        try {
          const updatedFact = await this.updateFact(
            factId,
            { approvalStatus: 'APPROVED' },
            userId
          );
          results.push({ factId, success: true, fact: updatedFact });
        } catch (error) {
          results.push({ factId, success: false, error: (error as Error).message });
        }
      }

      return results;
    } catch (error: any) {
      this.handleError(error, 'bulkApproveFacts');
    }
  }
}
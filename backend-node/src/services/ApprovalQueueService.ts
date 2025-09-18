import { PrismaClient, FactApprovalStatus, User, km_facts } from '@prisma/client';
import { z } from 'zod';
import { KnowledgeService } from './KnowledgeService';

// Use singleton pattern for Prisma client - should be injected in production
let prismaInstance: PrismaClient | null = null;

function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient();
  }
  return prismaInstance;
}

export interface ApprovalQueueFilters {
  status?: FactApprovalStatus[];
  confidence?: { min?: number; max?: number };
  factType?: string[];
  sourceType?: 'document' | 'communication';
  dateRange?: { from?: Date; to?: Date };
  reviewer?: string;
  submitter?: string;
  securityClassification?: string;
  search?: string;
}

export interface ApprovalQueueOptions {
  sortBy?: 'confidence' | 'createdAt' | 'priority';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface BulkApprovalRequest {
  factIds: string[];
  action: 'approve' | 'reject';
  comments?: string;
  reason?: string;
}

export interface UserContext {
  userId: string;
  roles: string[];
  clearanceLevel: string;
}

export interface ApprovalDecision {
  factId: string;
  action: 'approve' | 'reject' | 'needs_review' | 'escalate';
  comments?: string;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface WorkflowTransition {
  fromStatus: FactApprovalStatus;
  toStatus: FactApprovalStatus;
  allowedRoles: string[];
  requiresComment: boolean;
  autoApprovalRules?: {
    minConfidence?: number;
    allowedFactTypes?: string[];
    trustedSources?: boolean;
  };
}

const workflowTransitions: WorkflowTransition[] = [
  {
    fromStatus: 'Pending',
    toStatus: 'Under_Review',
    allowedRoles: ['Knowledge_Manager', 'Program_Manager'],
    requiresComment: false,
  },
  {
    fromStatus: 'Under_Review',
    toStatus: 'Approved',
    allowedRoles: ['Knowledge_Manager', 'Program_Manager'],
    requiresComment: false,
  },
  {
    fromStatus: 'Under_Review',
    toStatus: 'Rejected',
    allowedRoles: ['Knowledge_Manager', 'Program_Manager'],
    requiresComment: true,
  },
  {
    fromStatus: 'Pending',
    toStatus: 'Approved',
    allowedRoles: ['Program_Manager'],
    requiresComment: false,
    autoApprovalRules: {
      minConfidence: 0.9,
      allowedFactTypes: ['Technical_Specification', 'Contact_Information'],
      trustedSources: true,
    },
  },
  {
    fromStatus: 'Needs_Review',
    toStatus: 'Under_Review',
    allowedRoles: ['Knowledge_Manager', 'Program_Manager'],
    requiresComment: false,
  },
];

export class ApprovalQueueService extends KnowledgeService {
  private readonly prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    super();
    this.prisma = prismaClient || getPrismaClient();
  }

  /**
   * Get facts pending approval with filtering and pagination
   */
  async getApprovalQueue(
    filters: ApprovalQueueFilters = {},
    options: ApprovalQueueOptions = {},
    userContext: UserContext
  ) {
    try {
      const {
        sortBy = 'createdAt',
        sortOrder = 'desc',
        limit = 20,
        offset = 0,
      } = options;

      // Build where conditions
      const whereConditions: any = {
        isActive: true,
        approvalStatus: filters.status || ['Pending', 'Under_Review', 'Needs_Review'],
      };

      // Add confidence filter
      if (filters.confidence) {
        whereConditions.confidence = {};
        if (filters.confidence.min !== undefined) {
          whereConditions.confidence.gte = filters.confidence.min;
        }
        if (filters.confidence.max !== undefined) {
          whereConditions.confidence.lte = filters.confidence.max;
        }
      }

      // Add fact type filter
      if (filters.factType?.length) {
        whereConditions.factType = { in: filters.factType };
      }

      // Add source type filter
      if (filters.sourceType === 'document') {
        whereConditions.sourceDocumentId = { not: null };
        whereConditions.sourceCommunicationId = null;
      } else if (filters.sourceType === 'communication') {
        whereConditions.sourceCommunicationId = { not: null };
        whereConditions.sourceDocumentId = null;
      }

      // Add date range filter
      if (filters.dateRange) {
        whereConditions.extractedAt = {};
        if (filters.dateRange.from) {
          whereConditions.extractedAt.gte = filters.dateRange.from;
        }
        if (filters.dateRange.to) {
          whereConditions.extractedAt.lte = filters.dateRange.to;
        }
      }

      // Add reviewer filter
      if (filters.reviewer) {
        whereConditions.reviewedBy = filters.reviewer;
      }

      // Add submitter filter
      if (filters.submitter) {
        whereConditions.extractedBy = filters.submitter;
      }

      // Add security classification filter
      if (filters.securityClassification) {
        whereConditions.securityClassification = filters.securityClassification;
      }

      // Add search filter
      if (filters.search) {
        whereConditions.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { content: { contains: filters.search, mode: 'insensitive' } },
          { summary: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      // Get total count
      const total = await this.prisma.km_facts.count({
        where: whereConditions,
      });

      // Build order by
      let orderBy: any = {};
      if (sortBy === 'confidence') {
        orderBy = { confidence: sortOrder };
      } else if (sortBy === 'priority') {
        orderBy = [{ confidence: 'desc' }, { extractedAt: 'desc' }];
      } else {
        orderBy = { [sortBy]: sortOrder };
      }

      // Get facts with related data
      const facts = await this.prisma.km_facts.findMany({
        where: whereConditions,
        include: {
          source_document: {
            select: {
              id: true,
              name: true,
              originalFileName: true,
              mimeType: true,
              securityClassification: true,
            },
          },
          source_communication: {
            select: {
              id: true,
              subject: true,
              platform: true,
              fromName: true,
              sentAt: true,
              securityClassification: true,
            },
          },
          users_extracted: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          users_reviewed: {
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
        },
        orderBy,
        take: limit,
        skip: offset,
      });

      // Apply security filtering
      const filteredFacts = this.applySecurityFilter(facts, userContext.clearanceLevel);

      return {
        facts: filteredFacts,
        pagination: {
          total: filteredFacts.length,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
        summary: {
          totalPending: await this.getStatusCount('Pending', userContext),
          totalUnderReview: await this.getStatusCount('Under_Review', userContext),
          totalNeedsReview: await this.getStatusCount('Needs_Review', userContext),
          avgConfidence: await this.getAverageConfidence(userContext),
        },
      };
    } catch (error: any) {
      this.handleError(error, 'getApprovalQueue');
    }
  }

  /**
   * Get specific fact for review with full context
   */
  async getFactForReview(
    factId: string,
    userContext: UserContext
  ) {
    try {
      const fact = await this.prisma.km_facts.findUnique({
        where: {
          id: factId,
          isActive: true,
        },
        include: {
          source_document: {
            select: {
              id: true,
              name: true,
              originalFileName: true,
              filePath: true,
              mimeType: true,
              extractedText: true,
              securityClassification: true,
              pageCount: true,
            },
          },
          source_communication: {
            select: {
              id: true,
              subject: true,
              content: true,
              platform: true,
              fromName: true,
              fromEmail: true,
              sentAt: true,
              participants: true,
              securityClassification: true,
            },
          },
          users_extracted: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          users_reviewed: {
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
          km_fact_tags: {
            include: {
              tag: true,
              category: true,
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

      // Get related facts for context
      const relatedFacts = await this.getRelatedFacts(factId, userContext);

      // Get approval history
      const approvalHistory = await this.getApprovalHistory(factId);

      return {
        ...filteredFacts[0],
        relatedFacts,
        approvalHistory,
        allowedTransitions: this.getAllowedTransitions(fact.approvalStatus, userContext.roles),
      };
    } catch (error: any) {
      this.handleError(error, 'getFactForReview');
    }
  }

  /**
   * Approve a fact with comments and metadata
   */
  async approveFact(
    factId: string,
    decision: ApprovalDecision,
    userId: string,
    userRoles: string[]
  ) {
    try {
      const fact = await this.prisma.km_facts.findUnique({
        where: { id: factId, isActive: true },
      });

      if (!fact) {
        throw new Error('Fact not found');
      }

      // Validate transition
      const transition = this.validateTransition(
        fact.approvalStatus,
        decision.action === 'approve' ? 'Approved' : 'Rejected',
        userRoles
      );

      if (!transition.allowed) {
        throw new Error(transition.reason);
      }

      // Check if comment is required
      if (transition.requiresComment && !decision.comments) {
        throw new Error('Comments are required for this action');
      }

      const updateData: any = {
        approvalStatus: decision.action === 'approve' ? 'Approved' : 'Rejected',
        approvedBy: userId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      };

      if (decision.action === 'reject') {
        updateData.rejectionReason = decision.reason || decision.comments;
      }

      // Update fact
      const updatedFact = await this.prisma.km_facts.update({
        where: { id: factId },
        data: updateData,
        include: {
          users_approved: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // Create audit log
      await this.createAuditLog(
        userId,
        decision.action === 'approve' ? 'APPROVE_FACT' : 'REJECT_FACT',
        'km_facts',
        factId,
        { approvalStatus: fact.approvalStatus },
        { approvalStatus: updateData.approvalStatus, comments: decision.comments }
      );

      return updatedFact;
    } catch (error: any) {
      this.handleError(error, 'approveFact');
    }
  }

  /**
   * Update approval status (pending, under_review, escalated)
   */
  async updateApprovalStatus(
    factId: string,
    newStatus: FactApprovalStatus,
    userId: string,
    userRoles: string[],
    comments?: string
  ) {
    try {
      const fact = await this.prisma.km_facts.findUnique({
        where: { id: factId, isActive: true },
      });

      if (!fact) {
        throw new Error('Fact not found');
      }

      // Validate transition
      const transition = this.validateTransition(fact.approvalStatus, newStatus, userRoles);

      if (!transition.allowed) {
        throw new Error(transition.reason);
      }

      const updateData: any = {
        approvalStatus: newStatus,
        updatedAt: new Date(),
      };

      if (newStatus === 'Under_Review') {
        updateData.reviewedBy = userId;
        updateData.reviewedAt = new Date();
      }

      const updatedFact = await this.prisma.km_facts.update({
        where: { id: factId },
        data: updateData,
      });

      // Create audit log
      await this.createAuditLog(
        userId,
        'UPDATE_APPROVAL_STATUS',
        'km_facts',
        factId,
        { approvalStatus: fact.approvalStatus },
        { approvalStatus: newStatus, comments }
      );

      return updatedFact;
    } catch (error: any) {
      this.handleError(error, 'updateApprovalStatus');
    }
  }

  /**
   * Bulk approve or reject multiple facts
   */
  async bulkApproval(
    request: BulkApprovalRequest,
    userId: string,
    userRoles: string[]
  ) {
    try {
      const results = [];
      const errors = [];

      for (const factId of request.factIds) {
        try {
          const result = await this.approveFact(
            factId,
            {
              factId,
              action: request.action,
              comments: request.comments,
              reason: request.reason,
            },
            userId,
            userRoles
          );
          results.push({ factId, success: true, result });
        } catch (error: any) {
          errors.push({ factId, success: false, error: error.message });
        }
      }

      const bulkResult = {
        successful: results,
        failed: errors,
        summary: {
          total: request.factIds.length,
          successful: results.length,
          failed: errors.length,
        },
      };

      // Create audit log for bulk operation
      await this.createAuditLog(
        userId,
        `BULK_${request.action.toUpperCase()}_FACTS`,
        'km_facts',
        'bulk_operation',
        undefined,
        {
          action: request.action,
          factIds: request.factIds,
          comments: request.comments,
          summary: bulkResult.summary,
        }
      );

      return bulkResult;
    } catch (error: any) {
      this.handleError(error, 'bulkApproval');
    }
  }

  /**
   * Get approval history for a fact
   */
  private async getApprovalHistory(factId: string) {
    return await this.prisma.auditLog.findMany({
      where: {
        entityType: 'km_facts',
        entityId: factId,
        action: {
          in: ['APPROVE_FACT', 'REJECT_FACT', 'UPDATE_APPROVAL_STATUS'],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  /**
   * Get related facts based on content similarity and source
   */
  private async getRelatedFacts(factId: string, userContext: UserContext) {
    const fact = await this.prisma.km_facts.findUnique({
      where: { id: factId },
      select: {
        factType: true,
        keywords: true,
        sourceDocumentId: true,
        sourceCommunicationId: true,
      },
    });

    if (!fact) return [];

    const whereConditions: any = {
      id: { not: factId },
      isActive: true,
      OR: [
        { factType: fact.factType },
        { sourceDocumentId: fact.sourceDocumentId },
        { sourceCommunicationId: fact.sourceCommunicationId },
      ],
    };

    const relatedFacts = await this.prisma.km_facts.findMany({
      where: whereConditions,
      select: {
        id: true,
        title: true,
        factType: true,
        confidence: true,
        approvalStatus: true,
        extractedAt: true,
        securityClassification: true,
      },
      take: 10,
      orderBy: { confidence: 'desc' },
    });

    return this.applySecurityFilter(relatedFacts, userContext.clearanceLevel);
  }

  /**
   * Get count of facts by status
   */
  private async getStatusCount(status: FactApprovalStatus, userContext: UserContext) {
    const count = await this.prisma.km_facts.count({
      where: {
        approvalStatus: status,
        isActive: true,
      },
    });
    return count;
  }

  /**
   * Get average confidence score for pending facts
   */
  private async getAverageConfidence(userContext: UserContext) {
    const result = await this.prisma.km_facts.aggregate({
      where: {
        approvalStatus: { in: ['Pending', 'Under_Review'] },
        isActive: true,
      },
      _avg: {
        confidence: true,
      },
    });
    return result._avg.confidence || 0;
  }

  /**
   * Validate workflow transition
   */
  private validateTransition(
    fromStatus: FactApprovalStatus,
    toStatus: FactApprovalStatus,
    userRoles: string[]
  ): { allowed: boolean; reason?: string; requiresComment: boolean } {
    const transition = workflowTransitions.find(
      t => t.fromStatus === fromStatus && t.toStatus === toStatus
    );

    if (!transition) {
      return {
        allowed: false,
        reason: `Transition from ${fromStatus} to ${toStatus} is not allowed`,
        requiresComment: false,
      };
    }

    const hasRequiredRole = transition.allowedRoles.some(role =>
      userRoles.includes(role)
    );

    if (!hasRequiredRole) {
      return {
        allowed: false,
        reason: `User does not have required role. Required: ${transition.allowedRoles.join(', ')}`,
        requiresComment: false,
      };
    }

    return {
      allowed: true,
      requiresComment: transition.requiresComment,
    };
  }

  /**
   * Get allowed transitions for current status and user roles
   */
  private getAllowedTransitions(currentStatus: FactApprovalStatus, userRoles: string[]) {
    return workflowTransitions
      .filter(t => t.fromStatus === currentStatus)
      .filter(t => t.allowedRoles.some(role => userRoles.includes(role)))
      .map(t => ({
        toStatus: t.toStatus,
        requiresComment: t.requiresComment,
        autoApprovalRules: t.autoApprovalRules,
      }));
  }

  /**
   * Check if fact meets auto-approval criteria
   */
  async checkAutoApproval(
    fact: km_facts & { source_document?: any; source_communication?: any },
    userRoles: string[]
  ): Promise<boolean> {
    // Find applicable auto-approval rules
    const applicableRules = workflowTransitions
      .filter(t => t.fromStatus === 'Pending' && t.toStatus === 'Approved')
      .filter(t => t.allowedRoles.some(role => userRoles.includes(role)))
      .filter(t => t.autoApprovalRules)
      .map(t => t.autoApprovalRules!);

    for (const rules of applicableRules) {
      let meetsAllCriteria = true;

      // Check minimum confidence
      if (rules.minConfidence && Number(fact.confidence) < rules.minConfidence) {
        meetsAllCriteria = false;
      }

      // Check allowed fact types
      if (rules.allowedFactTypes && !rules.allowedFactTypes.includes(fact.factType)) {
        meetsAllCriteria = false;
      }

      // Check trusted sources (placeholder - would check source reliability)
      if (rules.trustedSources) {
        // Implementation would check source reliability scores
        // For now, assume sources are trusted if they have high confidence
        if (Number(fact.confidence) < 0.8) {
          meetsAllCriteria = false;
        }
      }

      if (meetsAllCriteria) {
        return true;
      }
    }

    return false;
  }
}
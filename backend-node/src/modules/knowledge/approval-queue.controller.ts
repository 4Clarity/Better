import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ApprovalQueueService, UserContext, BulkApprovalRequest } from '../../services/ApprovalQueueService';
import {
  getApprovalQueueQuerySchema,
  approveFactSchema,
  rejectFactSchema,
  updateApprovalStatusSchema,
  bulkApprovalSchema,
} from './approval-queue.route';

// Service instance factory - should be dependency injection in production
let serviceInstance: ApprovalQueueService | null = null;

function getApprovalQueueService(): ApprovalQueueService {
  if (!serviceInstance) {
    serviceInstance = new ApprovalQueueService();
  }
  return serviceInstance;
}

/**
 * Get approval queue with filtering and pagination
 */
export async function getApprovalQueueHandler(
  request: FastifyRequest<{
    Querystring: z.infer<typeof getApprovalQueueQuerySchema>;
  }>,
  reply: FastifyReply
) {
  try {
    // Extract user context from authenticated request
    const userContext = getApprovalQueueService().extractUserContext(request);

    // Validate user has appropriate permissions
    if (!getApprovalQueueService().validateUserAccess(userContext.roles, 'READ', 'READ')) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions to access approval queue',
      });
    }

    const query = request.query;

    // Build filters from query parameters
    const filters = {
      status: query.status,
      confidence: query.minConfidence || query.maxConfidence ? {
        min: query.minConfidence,
        max: query.maxConfidence,
      } : undefined,
      factType: query.factType,
      sourceType: query.sourceType,
      dateRange: query.dateFrom || query.dateTo ? {
        from: query.dateFrom,
        to: query.dateTo,
      } : undefined,
      reviewer: query.reviewer,
      submitter: query.submitter,
      securityClassification: query.securityClassification,
      search: query.search,
    };

    // Build options
    const options = {
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc',
      limit: query.limit || 20,
      offset: query.offset || 0,
    };

    const result = await getApprovalQueueService().getApprovalQueue(
      filters,
      options,
      userContext
    );

    return reply.status(200).send(result);
  } catch (error: any) {
    request.log.warn('GetApprovalQueue error:', error);
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: error.message || 'Failed to retrieve approval queue',
    });
  }
}

/**
 * Get specific fact for review
 */
export async function getFactForReviewHandler(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply
) {
  try {
    const userContext = getApprovalQueueService().extractUserContext(request);
    const { id: factId } = request.params;

    // Validate user has appropriate permissions
    if (!getApprovalQueueService().validateUserAccess(userContext.roles, 'READ', 'READ')) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions to access this fact',
      });
    }

    const fact = await getApprovalQueueService().getFactForReview(factId, userContext);

    if (!fact) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Fact not found or access denied',
      });
    }

    return reply.status(200).send(fact);
  } catch (error: any) {
    request.log.warn('GetFactForReview error:', error);
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: error.message || 'Failed to retrieve fact for review',
    });
  }
}

/**
 * Approve a fact
 */
export async function approveFactHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: z.infer<typeof approveFactSchema>;
  }>,
  reply: FastifyReply
) {
  try {
    const userContext = getApprovalQueueService().extractUserContext(request);
    const { id: factId } = request.params;
    const { comments, metadata } = request.body;

    // Validate user has appropriate permissions
    if (!getApprovalQueueService().validateUserAccess(userContext.roles, 'APPROVE', 'UPDATE')) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions to approve facts',
      });
    }

    const decision = {
      factId,
      action: 'approve' as const,
      comments,
      metadata,
    };

    const result = await getApprovalQueueService().approveFact(
      factId,
      decision,
      userContext.userId,
      userContext.roles
    );

    return reply.status(200).send({
      message: 'Fact approved successfully',
      fact: result,
    });
  } catch (error: any) {
    request.log.warn('ApproveFact error:', error);
    return reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: error.message || 'Failed to approve fact',
    });
  }
}

/**
 * Reject a fact
 */
export async function rejectFactHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: z.infer<typeof rejectFactSchema>;
  }>,
  reply: FastifyReply
) {
  try {
    const userContext = getApprovalQueueService().extractUserContext(request);
    const { id: factId } = request.params;
    const { reason, comments, feedback } = request.body;

    // Validate user has appropriate permissions
    if (!getApprovalQueueService().validateUserAccess(userContext.roles, 'REJECT', 'UPDATE')) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions to reject facts',
      });
    }

    const decision = {
      factId,
      action: 'reject' as const,
      reason,
      comments,
      metadata: { feedback },
    };

    const result = await getApprovalQueueService().approveFact(
      factId,
      decision,
      userContext.userId,
      userContext.roles
    );

    return reply.status(200).send({
      message: 'Fact rejected successfully',
      fact: result,
    });
  } catch (error: any) {
    request.log.warn('RejectFact error:', error);
    return reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: error.message || 'Failed to reject fact',
    });
  }
}

/**
 * Update approval status
 */
export async function updateApprovalStatusHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: z.infer<typeof updateApprovalStatusSchema>;
  }>,
  reply: FastifyReply
) {
  try {
    const userContext = getApprovalQueueService().extractUserContext(request);
    const { id: factId } = request.params;
    const { status, comments } = request.body;

    // Validate user has appropriate permissions
    if (!getApprovalQueueService().validateUserAccess(userContext.roles, status, 'UPDATE')) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions to update approval status',
      });
    }

    const result = await getApprovalQueueService().updateApprovalStatus(
      factId,
      status,
      userContext.userId,
      userContext.roles,
      comments
    );

    return reply.status(200).send({
      message: 'Approval status updated successfully',
      fact: result,
    });
  } catch (error: any) {
    request.log.warn('UpdateApprovalStatus error:', error);
    return reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: error.message || 'Failed to update approval status',
    });
  }
}

/**
 * Bulk approve or reject facts
 */
export async function bulkApprovalHandler(
  request: FastifyRequest<{
    Body: z.infer<typeof bulkApprovalSchema>;
  }>,
  reply: FastifyReply
) {
  try {
    const userContext = getApprovalQueueService().extractUserContext(request);
    const bulkRequest = request.body;

    // Validate user has appropriate permissions
    const requiredPermission = bulkRequest.action === 'approve' ? 'APPROVE' : 'REJECT';
    if (!getApprovalQueueService().validateUserAccess(userContext.roles, requiredPermission, 'UPDATE')) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: `Insufficient permissions to ${bulkRequest.action} facts in bulk`,
      });
    }

    // Validate bulk request size
    if (bulkRequest.factIds.length > 50) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Bulk operations are limited to 50 facts at a time',
      });
    }

    const result = await getApprovalQueueService().bulkApproval(
      bulkRequest as BulkApprovalRequest,
      userContext.userId,
      userContext.roles
    );

    return reply.status(200).send({
      message: `Bulk ${bulkRequest.action} completed`,
      results: result,
    });
  } catch (error: any) {
    request.log.warn('BulkApproval error:', error);
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: error.message || 'Failed to process bulk approval',
    });
  }
}

/**
 * Get approval queue statistics
 */
export async function getApprovalStatsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const userContext = getApprovalQueueService().extractUserContext(request);

    // Validate user has appropriate permissions
    if (!getApprovalQueueService().validateUserAccess(userContext.roles, 'STATS', 'READ')) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions to view approval statistics',
      });
    }

    // Get basic statistics
    const stats = await getApprovalQueueService().getApprovalQueue(
      {}, // No filters to get all stats
      { limit: 1, offset: 0 }, // Just get summary
      userContext
    );

    // Get additional metrics
    const additionalStats = {
      avgProcessingTime: await getAverageProcessingTime(),
      topReviewers: await getTopReviewers(userContext),
      factTypeDistribution: await getFactTypeDistribution(userContext),
      confidenceDistribution: await getConfidenceDistribution(userContext),
    };

    return reply.status(200).send({
      ...stats.summary,
      ...additionalStats,
    });
  } catch (error: any) {
    request.log.warn('GetApprovalStats error:', error);
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: error.message || 'Failed to retrieve approval statistics',
    });
  }
}

// Helper functions for statistics - these should be moved to service layer
async function getAverageProcessingTime(): Promise<number> {
  // TODO: Implement calculation of average time from extraction to approval
  // Query auditLog for EXTRACT_FACT to APPROVE_FACT/REJECT_FACT time differences
  return 0; // Return 0 to indicate no data available yet
}

async function getTopReviewers(userContext: UserContext): Promise<Array<{
  userId: string;
  name: string;
  approvalCount: number;
  avgResponseTime: number;
}>> {
  // TODO: Implement query for most active reviewers
  // Group auditLog by userId for APPROVE_FACT/REJECT_FACT actions
  return [];
}

async function getFactTypeDistribution(userContext: UserContext): Promise<Record<string, number>> {
  // TODO: Implement query for fact type distribution in queue
  // Group km_facts by factType where approvalStatus is pending/under_review
  return {};
}

async function getConfidenceDistribution(userContext: UserContext): Promise<{
  high: number;
  medium: number;
  low: number;
}> {
  // TODO: Implement confidence score distribution
  // Count facts by confidence ranges: high (>0.8), medium (0.5-0.8), low (<0.5)
  return { high: 0, medium: 0, low: 0 };
}
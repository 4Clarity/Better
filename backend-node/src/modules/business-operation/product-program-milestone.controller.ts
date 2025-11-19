import { FastifyRequest, FastifyReply } from 'fastify';
import {
  createMilestone,
  getMilestoneById,
  getMilestonesByProductProgram,
  updateMilestone,
  deleteMilestone,
  markMilestoneAchieved,
  canModifyMilestone,
  CreateMilestoneInput,
  UpdateMilestoneInput,
} from './product-program-milestone.service';

/**
 * Create a new milestone for a Product/Program
 * POST /api/business-operations/products-programs/:id/milestones
 */
export async function createMilestoneHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: CreateMilestoneInput;
  }>,
  reply: FastifyReply
) {
  try {
    const { id: productProgramId } = request.params;

    // Get user from auth context (for now using a placeholder)
    // TODO: Replace with actual authenticated user from request context
    const createdBy = (request as any).user?.id || 'demo-user-id';

    // Check permissions
    const userRoles = (request as any).user?.roles || ['Admin']; // Default to Admin for demo
    if (!canModifyMilestone(userRoles)) {
      return reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'You do not have permission to create milestones'
      });
    }

    const milestone = await createMilestone(productProgramId, request.body, createdBy);
    return reply.code(201).send({ success: true, data: milestone });
  } catch (error: any) {
    console.error('Create milestone error:', error);

    if (error.message.includes('not found')) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: error.message
      });
    }

    if (error.message.includes('Invalid')) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: error.message
      });
    }

    return reply.code(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: error.message || 'Failed to create milestone'
    });
  }
}

/**
 * Get all milestones for a Product/Program
 * GET /api/business-operations/products-programs/:id/milestones
 */
export async function getMilestonesHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id: productProgramId } = request.params;
    const milestones = await getMilestonesByProductProgram(productProgramId);
    return reply.code(200).send({ success: true, data: milestones });
  } catch (error: any) {
    console.error('Get milestones error:', error);

    if (error.message.includes('not found')) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: error.message
      });
    }

    return reply.code(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: error.message || 'Failed to fetch milestones'
    });
  }
}

/**
 * Get a specific milestone by ID
 * GET /api/business-operations/milestones/:milestoneId
 */
export async function getMilestoneByIdHandler(
  request: FastifyRequest<{ Params: { milestoneId: string } }>,
  reply: FastifyReply
) {
  try {
    const { milestoneId } = request.params;
    const milestone = await getMilestoneById(milestoneId);
    return reply.code(200).send({ success: true, data: milestone });
  } catch (error: any) {
    console.error('Get milestone by ID error:', error);

    if (error.message === 'Milestone not found') {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: error.message
      });
    }

    return reply.code(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to fetch milestone'
    });
  }
}

/**
 * Update a milestone
 * PUT /api/business-operations/milestones/:milestoneId
 */
export async function updateMilestoneHandler(
  request: FastifyRequest<{
    Params: { milestoneId: string };
    Body: UpdateMilestoneInput;
  }>,
  reply: FastifyReply
) {
  try {
    const { milestoneId } = request.params;

    // Get user from auth context
    const updatedBy = (request as any).user?.id || 'demo-user-id';

    // Check permissions
    const userRoles = (request as any).user?.roles || ['Admin'];
    if (!canModifyMilestone(userRoles)) {
      return reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'You do not have permission to update milestones'
      });
    }

    const milestone = await updateMilestone(milestoneId, request.body, updatedBy);
    return reply.code(200).send({ success: true, data: milestone });
  } catch (error: any) {
    console.error('Update milestone error:', error);

    if (error.message === 'Milestone not found') {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: error.message
      });
    }

    if (error.message.includes('Invalid')) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: error.message
      });
    }

    return reply.code(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: error.message || 'Failed to update milestone'
    });
  }
}

/**
 * Delete a milestone
 * DELETE /api/business-operations/milestones/:milestoneId
 */
export async function deleteMilestoneHandler(
  request: FastifyRequest<{ Params: { milestoneId: string } }>,
  reply: FastifyReply
) {
  try {
    const { milestoneId } = request.params;

    // Get user from auth context
    const deletedBy = (request as any).user?.id || 'demo-user-id';

    // Check permissions
    const userRoles = (request as any).user?.roles || ['Admin'];
    if (!canModifyMilestone(userRoles)) {
      return reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'You do not have permission to delete milestones'
      });
    }

    const result = await deleteMilestone(milestoneId, deletedBy);
    return reply.code(200).send({ success: true, message: result.message });
  } catch (error: any) {
    console.error('Delete milestone error:', error);

    if (error.message === 'Milestone not found') {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: error.message
      });
    }

    return reply.code(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: error.message || 'Failed to delete milestone'
    });
  }
}

/**
 * Mark a milestone as achieved
 * PATCH /api/business-operations/milestones/:milestoneId/achieved
 */
export async function markMilestoneAchievedHandler(
  request: FastifyRequest<{ Params: { milestoneId: string } }>,
  reply: FastifyReply
) {
  try {
    const { milestoneId } = request.params;

    // Get user from auth context
    const userId = (request as any).user?.id || 'demo-user-id';

    // Check permissions
    const userRoles = (request as any).user?.roles || ['Admin'];
    if (!canModifyMilestone(userRoles)) {
      return reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'You do not have permission to mark milestones as achieved'
      });
    }

    const milestone = await markMilestoneAchieved(milestoneId, userId);
    return reply.code(200).send({ success: true, data: milestone });
  } catch (error: any) {
    console.error('Mark milestone achieved error:', error);

    if (error.message === 'Milestone not found') {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: error.message
      });
    }

    if (error.message === 'Milestone is already achieved') {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: error.message
      });
    }

    return reply.code(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: error.message || 'Failed to mark milestone as achieved'
    });
  }
}

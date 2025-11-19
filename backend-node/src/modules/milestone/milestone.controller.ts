import { FastifyRequest, FastifyReply } from 'fastify';
import {
  createMilestone,
  getMilestones,
  getMilestoneById,
  updateMilestone,
  deleteMilestone,
  bulkDeleteMilestones,
  getCombinedMilestones,
  CreateMilestoneInput,
  UpdateMilestoneInput,
  GetMilestonesQuery,
} from './milestone.service';

// Helper function to get user ID from request
function getUserId(request: FastifyRequest): string {
  // Support x-user-id header for auth bypass mode, otherwise fall back to authenticated user
  return request.headers['x-user-id'] as string || (request as any).user?.id || 'user-richard-001';
}

export async function createMilestoneHandler(
  request: FastifyRequest<{
    Body: CreateMilestoneInput;
    Params: { transitionId: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { transitionId } = request.params;
    const userId = getUserId(request);
    try {
      const milestone = await createMilestone(transitionId, request.body, userId);
      return reply.code(201).send(milestone);
    } catch (inner: any) {
      // If creation failed but an identical milestone exists, return it as success
      try {
        const { title, dueDate } = request.body as any;
        if (title && dueDate) {
          const existing = await getMilestones(transitionId, { page:1, limit:100, sortBy:'dueDate', sortOrder:'asc' } as any, userId);
          const found = (existing?.data || []).find((m:any)=> m.title===title && new Date(m.dueDate).toISOString() === new Date(dueDate).toISOString());
          if (found) return reply.code(201).send(found);
        }
      } catch {}
      throw inner;
    }
  } catch (error: any) {
    console.error('Create milestone error:', error);
    
    if (error.message === 'Transition not found') {
      return reply.code(404).send({ 
        statusCode: 404,
        error: 'Not Found',
        message: error.message 
      });
    }
    
    if (error.message === 'Due date cannot be in the past') {
      return reply.code(400).send({ 
        statusCode: 400,
        error: 'Bad Request',
        message: error.message 
      });
    }
    
    if (error.message === 'Milestone due date must be within transition timeframe') {
      return reply.code(400).send({ 
        statusCode: 400,
        error: 'Bad Request',
        message: error.message 
      });
    }
    
    return reply.code(500).send({ 
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to create milestone' 
    });
  }
}

export async function getMilestonesHandler(
  request: FastifyRequest<{
    Querystring: GetMilestonesQuery;
    Params: { transitionId: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { transitionId } = request.params;
    const userId = getUserId(request);
    const milestones = await getMilestones(transitionId, request.query, userId);
    return reply.code(200).send(milestones);
  } catch (error: any) {
    console.error('Get milestones error:', error);
    
    if (error.message === 'Transition not found') {
      return reply.code(404).send({ 
        statusCode: 404,
        error: 'Not Found',
        message: error.message 
      });
    }
    
    return reply.code(500).send({ 
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to fetch milestones' 
    });
  }
}

export async function getMilestoneByIdHandler(
  request: FastifyRequest<{
    Params: { transitionId: string; milestoneId: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { transitionId, milestoneId } = request.params;
    const userId = getUserId(request);
    const milestone = await getMilestoneById(transitionId, milestoneId, userId);
    return reply.code(200).send(milestone);
  } catch (error: any) {
    console.error('Get milestone by ID error:', error);
    
    if (error.message === 'Transition not found' || error.message === 'Milestone not found') {
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

export async function updateMilestoneHandler(
  request: FastifyRequest<{
    Body: UpdateMilestoneInput;
    Params: { transitionId: string; milestoneId: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { transitionId, milestoneId } = request.params;
    const userId = getUserId(request);
    const milestone = await updateMilestone(transitionId, milestoneId, request.body, userId);
    return reply.code(200).send(milestone);
  } catch (error: any) {
    console.error('Update milestone error:', error);
    
    if (error.message === 'Transition not found' || error.message === 'Milestone not found') {
      return reply.code(404).send({ 
        statusCode: 404,
        error: 'Not Found',
        message: error.message 
      });
    }
    
    if (error.message === 'Due date cannot be in the past') {
      return reply.code(400).send({ 
        statusCode: 400,
        error: 'Bad Request',
        message: error.message 
      });
    }
    
    if (error.message === 'Milestone due date must be within transition timeframe') {
      return reply.code(400).send({ 
        statusCode: 400,
        error: 'Bad Request',
        message: error.message 
      });
    }
    
    return reply.code(500).send({ 
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to update milestone' 
    });
  }
}

export async function deleteMilestoneHandler(
  request: FastifyRequest<{
    Params: { transitionId: string; milestoneId: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { transitionId, milestoneId } = request.params;
    const userId = getUserId(request);
    const result = await deleteMilestone(transitionId, milestoneId, userId);
    return reply.code(200).send(result);
  } catch (error: any) {
    console.error('Delete milestone error:', error);
    
    if (error.message === 'Transition not found' || error.message === 'Milestone not found') {
      return reply.code(404).send({ 
        statusCode: 404,
        error: 'Not Found',
        message: error.message 
      });
    }
    
    return reply.code(500).send({ 
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to delete milestone' 
    });
  }
}

export async function bulkDeleteMilestonesHandler(
  request: FastifyRequest<{
    Body: { milestoneIds: string[] };
    Params: { transitionId: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { transitionId } = request.params;
    const { milestoneIds } = request.body;
    const userId = getUserId(request);

    if (!milestoneIds || !Array.isArray(milestoneIds) || milestoneIds.length === 0) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'milestoneIds array is required and cannot be empty'
      });
    }

    const result = await bulkDeleteMilestones(transitionId, milestoneIds, userId);
    return reply.code(200).send(result);
  } catch (error: any) {
    console.error('Bulk delete milestones error:', error);

    if (error.message === 'Transition not found') {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: error.message
      });
    }

    if (error.message === 'Some milestones not found') {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: error.message
      });
    }

    return reply.code(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to delete milestones'
    });
  }
}

export async function getCombinedMilestonesHandler(
  request: FastifyRequest<{
    Params: { transitionId: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { transitionId } = request.params;
    const userId = getUserId(request);
    const combined = await getCombinedMilestones(transitionId, userId);
    return reply.code(200).send(combined);
  } catch (error: any) {
    console.error('Get combined milestones error:', error);

    if (error.message === 'Transition not found') {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: error.message
      });
    }

    return reply.code(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to fetch combined milestones'
    });
  }
}

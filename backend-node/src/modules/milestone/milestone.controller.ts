import { FastifyRequest, FastifyReply } from 'fastify';
import {
  createMilestone,
  getMilestones,
  getMilestoneById,
  updateMilestone,
  deleteMilestone,
  bulkDeleteMilestones,
  CreateMilestoneInput,
  UpdateMilestoneInput,
  GetMilestonesQuery,
} from './milestone.service';

// Mock user ID for now - in real app this would come from JWT token
const MOCK_USER_ID = 'user_123'; // TODO: Replace with actual auth

export async function createMilestoneHandler(
  request: FastifyRequest<{ 
    Body: CreateMilestoneInput;
    Params: { transitionId: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { transitionId } = request.params;
    try {
      const milestone = await createMilestone(transitionId, request.body, MOCK_USER_ID);
      return reply.code(201).send(milestone);
    } catch (inner: any) {
      // If creation failed but an identical milestone exists, return it as success
      try {
        const { title, dueDate } = request.body as any;
        if (title && dueDate) {
          const existing = await getMilestones(transitionId, { page:1, limit:100, sortBy:'dueDate', sortOrder:'asc' } as any, MOCK_USER_ID);
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
    const milestones = await getMilestones(transitionId, request.query, MOCK_USER_ID);
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
    const milestone = await getMilestoneById(transitionId, milestoneId, MOCK_USER_ID);
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
    const milestone = await updateMilestone(transitionId, milestoneId, request.body, MOCK_USER_ID);
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
    const result = await deleteMilestone(transitionId, milestoneId, MOCK_USER_ID);
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
    
    if (!milestoneIds || !Array.isArray(milestoneIds) || milestoneIds.length === 0) {
      return reply.code(400).send({ 
        statusCode: 400,
        error: 'Bad Request',
        message: 'milestoneIds array is required and cannot be empty' 
      });
    }
    
    const result = await bulkDeleteMilestones(transitionId, milestoneIds, MOCK_USER_ID);
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

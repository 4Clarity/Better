import { FastifyRequest, FastifyReply } from 'fastify';
import {
  createTransition,
  getTransitions,
  getTransitionById,
  updateTransition,
  updateTransitionStatus,
  deleteTransition,
  CreateTransitionInput,
  UpdateTransitionInput,
  UpdateTransitionStatusInput,
  GetTransitionsQuery,
} from './transition-simple.service';

export async function createTransitionHandler(
  request: FastifyRequest<{ Body: CreateTransitionInput }>,
  reply: FastifyReply
) {
  try {
    const transition = await createTransition(request.body);
    return reply.code(201).send(transition);
  } catch (error: any) {
    console.error('Create transition error:', error);
    
    if (error.message === 'End date must be after start date') {
      return reply.code(400).send({ 
        statusCode: 400,
        error: 'Bad Request',
        message: error.message 
      });
    }
    
    if (error.message === 'Contract number already exists') {
      return reply.code(409).send({ 
        statusCode: 409,
        error: 'Conflict',
        message: error.message 
      });
    }
    
    return reply.code(500).send({ 
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to create transition' 
    });
  }
}

export async function getTransitionsHandler(
  request: FastifyRequest<{ Querystring: GetTransitionsQuery }>,
  reply: FastifyReply
) {
  try {
    const transitions = await getTransitions(request.query);
    return reply.code(200).send(transitions);
  } catch (error: any) {
    console.error('Get transitions error:', error);
    return reply.code(500).send({ 
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to fetch transitions' 
    });
  }
}

export async function getTransitionByIdHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const transition = await getTransitionById(id);
    return reply.code(200).send(transition);
  } catch (error: any) {
    console.error('Get transition by ID error:', error);
    
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
      message: 'Failed to fetch transition' 
    });
  }
}

export async function updateTransitionHandler(
  request: FastifyRequest<{ Body: UpdateTransitionInput; Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const transition = await updateTransition(id, request.body);
    return reply.code(200).send(transition);
  } catch (error: any) {
    console.error('Update transition error:', error);
    
    if (error.message === 'Transition not found') {
      return reply.code(404).send({ 
        statusCode: 404,
        error: 'Not Found',
        message: error.message 
      });
    }
    
    if (error.message === 'End date must be after start date') {
      return reply.code(400).send({ 
        statusCode: 400,
        error: 'Bad Request',
        message: error.message 
      });
    }
    
    if (error.message === 'Contract number already exists') {
      return reply.code(409).send({ 
        statusCode: 409,
        error: 'Conflict',
        message: error.message 
      });
    }
    
    return reply.code(500).send({ 
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to update transition' 
    });
  }
}

export async function updateTransitionStatusHandler(
  request: FastifyRequest<{ Body: UpdateTransitionStatusInput; Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const transition = await updateTransitionStatus(id, request.body);
    return reply.code(200).send(transition);
  } catch (error: any) {
    console.error('Update transition status error:', error);
    
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
      message: 'Failed to update transition status' 
    });
  }
}

export async function deleteTransitionHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const result = await deleteTransition(id);
    return reply.code(200).send(result);
  } catch (error: any) {
    console.error('Delete transition error:', error);
    
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
      message: 'Failed to delete transition' 
    });
  }
}
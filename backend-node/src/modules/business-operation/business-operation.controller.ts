import { FastifyRequest, FastifyReply } from 'fastify';
import {
  createBusinessOperation,
  getBusinessOperations,
  getBusinessOperationById,
  updateBusinessOperation,
  deleteBusinessOperation,
  CreateBusinessOperationInput,
  UpdateBusinessOperationInput,
  GetBusinessOperationsQuery,
} from './business-operation.service';

export async function createBusinessOperationHandler(
  request: FastifyRequest<{ Body: CreateBusinessOperationInput }>,
  reply: FastifyReply
) {
  try {
    const businessOperation = await createBusinessOperation(request.body);
    return reply.code(201).send(businessOperation);
  } catch (error: any) {
    console.error('Create business operation error:', error);
    
    if (error.message.includes('Support period end date must be after start date') ||
        error.message.includes('Current contract end cannot be after support period end')) {
      return reply.code(400).send({ 
        statusCode: 400,
        error: 'Bad Request',
        message: error.message 
      });
    }
    
    return reply.code(500).send({ 
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to create business operation' 
    });
  }
}

export async function getBusinessOperationsHandler(
  request: FastifyRequest<{ Querystring: GetBusinessOperationsQuery }>,
  reply: FastifyReply
) {
  try {
    const businessOperations = await getBusinessOperations(request.query);
    return reply.code(200).send(businessOperations);
  } catch (error: any) {
    console.error('Get business operations error:', error);
    return reply.code(500).send({ 
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to fetch business operations' 
    });
  }
}

export async function getBusinessOperationByIdHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const businessOperation = await getBusinessOperationById(id);
    return reply.code(200).send(businessOperation);
  } catch (error: any) {
    console.error('Get business operation by ID error:', error);
    
    if (error.message === 'Business operation not found') {
      return reply.code(404).send({ 
        statusCode: 404,
        error: 'Not Found',
        message: error.message 
      });
    }
    
    return reply.code(500).send({ 
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to fetch business operation' 
    });
  }
}

export async function updateBusinessOperationHandler(
  request: FastifyRequest<{ Body: UpdateBusinessOperationInput; Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const businessOperation = await updateBusinessOperation(id, request.body);
    return reply.code(200).send(businessOperation);
  } catch (error: any) {
    console.error('Update business operation error:', error);
    
    if (error.message === 'Business operation not found') {
      return reply.code(404).send({ 
        statusCode: 404,
        error: 'Not Found',
        message: error.message 
      });
    }
    
    if (error.message.includes('Support period end date must be after start date') ||
        error.message.includes('Current contract end cannot be after support period end')) {
      return reply.code(400).send({ 
        statusCode: 400,
        error: 'Bad Request',
        message: error.message 
      });
    }
    
    return reply.code(500).send({ 
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to update business operation' 
    });
  }
}

export async function deleteBusinessOperationHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const result = await deleteBusinessOperation(id);
    return reply.code(200).send(result);
  } catch (error: any) {
    console.error('Delete business operation error:', error);
    
    if (error.message === 'Business operation not found') {
      return reply.code(404).send({ 
        statusCode: 404,
        error: 'Not Found',
        message: error.message 
      });
    }

    if (error.message === 'Cannot delete business operation with active contracts') {
      return reply.code(409).send({ 
        statusCode: 409,
        error: 'Conflict',
        message: error.message 
      });
    }
    
    return reply.code(500).send({ 
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to delete business operation' 
    });
  }
}
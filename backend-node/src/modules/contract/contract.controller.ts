import { FastifyRequest, FastifyReply } from 'fastify';
import {
  createContract,
  getContracts,
  getContractById,
  updateContract,
  deleteContract,
  getContractsByBusinessOperation,
  CreateContractInput,
  UpdateContractInput,
  GetContractsQuery,
} from './contract.service';

export async function createContractHandler(
  request: FastifyRequest<{ Body: CreateContractInput }>,
  reply: FastifyReply
) {
  try {
    const contract = await createContract(request.body);
    return reply.code(201).send(contract);
  } catch (error: any) {
    console.error('Create contract error:', error);
    
    if (error.message === 'Business operation not found') {
      return reply.code(404).send({ 
        statusCode: 404,
        error: 'Not Found',
        message: error.message 
      });
    }

    if (error.message === 'Contract end date must be after start date') {
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
      message: 'Failed to create contract' 
    });
  }
}

export async function getContractsHandler(
  request: FastifyRequest<{ Querystring: GetContractsQuery }>,
  reply: FastifyReply
) {
  try {
    const contracts = await getContracts(request.query);
    return reply.code(200).send(contracts);
  } catch (error: any) {
    console.error('Get contracts error:', error);
    return reply.code(500).send({ 
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to fetch contracts' 
    });
  }
}

export async function getContractByIdHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const contract = await getContractById(id);
    return reply.code(200).send(contract);
  } catch (error: any) {
    console.error('Get contract by ID error:', error);
    
    if (error.message === 'Contract not found') {
      return reply.code(404).send({ 
        statusCode: 404,
        error: 'Not Found',
        message: error.message 
      });
    }
    
    return reply.code(500).send({ 
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to fetch contract' 
    });
  }
}

export async function updateContractHandler(
  request: FastifyRequest<{ Body: UpdateContractInput; Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const contract = await updateContract(id, request.body);
    return reply.code(200).send(contract);
  } catch (error: any) {
    console.error('Update contract error:', error);
    
    if (error.message === 'Contract not found') {
      return reply.code(404).send({ 
        statusCode: 404,
        error: 'Not Found',
        message: error.message 
      });
    }
    
    if (error.message === 'Contract end date must be after start date') {
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
      message: 'Failed to update contract' 
    });
  }
}

export async function deleteContractHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const result = await deleteContract(id);
    return reply.code(200).send(result);
  } catch (error: any) {
    console.error('Delete contract error:', error);
    
    if (error.message === 'Contract not found') {
      return reply.code(404).send({ 
        statusCode: 404,
        error: 'Not Found',
        message: error.message 
      });
    }

    if (error.message === 'Cannot delete contract with active transitions') {
      return reply.code(409).send({ 
        statusCode: 409,
        error: 'Conflict',
        message: error.message 
      });
    }
    
    return reply.code(500).send({ 
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to delete contract' 
    });
  }
}

export async function getContractsByBusinessOperationHandler(
  request: FastifyRequest<{ Params: { businessOperationId: string } }>,
  reply: FastifyReply
) {
  try {
    const { businessOperationId } = request.params;
    const contracts = await getContractsByBusinessOperation(businessOperationId);
    return reply.code(200).send(contracts);
  } catch (error: any) {
    console.error('Get contracts by business operation error:', error);
    return reply.code(500).send({ 
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to fetch contracts for business operation' 
    });
  }
}
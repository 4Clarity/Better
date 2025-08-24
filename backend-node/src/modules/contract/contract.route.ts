import { FastifyInstance } from 'fastify';
import {
  createContractHandler,
  getContractsHandler,
  getContractByIdHandler,
  updateContractHandler,
  deleteContractHandler,
  getContractsByBusinessOperationHandler,
} from './contract.controller';

const errorSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'number' },
    error: { type: 'string' },
    message: { type: 'string' },
  },
};

const contractResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    businessOperationId: { type: 'string' },
    contractName: { type: 'string' },
    contractNumber: { type: 'string' },
    contractorName: { type: 'string' },
    contractorPMId: { type: ['string', 'null'] },
    startDate: { type: 'string' },
    endDate: { type: 'string' },
    canBeExtended: { type: 'boolean' },
    status: { type: 'string' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
};

async function contractRoutes(server: FastifyInstance) {
  // POST /api/contracts - Create new contract
  server.post(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          required: ['businessOperationId', 'contractName', 'contractNumber', 'contractorName', 'startDate', 'endDate'],
          properties: {
            businessOperationId: { type: 'string', minLength: 1 },
            contractName: { type: 'string', minLength: 1, maxLength: 255 },
            contractNumber: { type: 'string', minLength: 1, maxLength: 100 },
            contractorName: { type: 'string', minLength: 1, maxLength: 255 },
            contractorPMId: { type: 'string' },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            canBeExtended: { type: 'boolean', default: true },
            status: { 
              type: 'string', 
              enum: ['PLANNING', 'ACTIVE', 'RENEWAL', 'EXPIRING', 'EXPIRED', 'EXTENDED'], 
              default: 'PLANNING' 
            },
          },
        },
        response: {
          201: contractResponseSchema,
          400: errorSchema,
          404: errorSchema,
          409: errorSchema,
        },
      },
    },
    createContractHandler
  );

  // GET /api/contracts - List all contracts
  server.get(
    '/',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            businessOperationId: { type: 'string' },
            search: { type: 'string' },
            status: { type: 'string', enum: ['PLANNING', 'ACTIVE', 'RENEWAL', 'EXPIRING', 'EXPIRED', 'EXTENDED'] },
            page: { type: 'number', minimum: 1, default: 1 },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 10 },
            sortBy: { type: 'string', enum: ['contractName', 'contractNumber', 'startDate', 'endDate', 'status', 'createdAt'], default: 'createdAt' },
            sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: contractResponseSchema,
              },
              pagination: {
                type: 'object',
                properties: {
                  page: { type: 'number' },
                  limit: { type: 'number' },
                  total: { type: 'number' },
                  totalPages: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    getContractsHandler
  );

  // GET /api/contracts/:id - Get specific contract
  server.get(
    '/:id',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        response: {
          200: contractResponseSchema,
          404: errorSchema,
        },
      },
    },
    getContractByIdHandler
  );

  // GET /api/contracts/by-business-operation/:businessOperationId - Get contracts for business operation
  server.get(
    '/by-business-operation/:businessOperationId',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            businessOperationId: { type: 'string' },
          },
          required: ['businessOperationId'],
        },
        response: {
          200: {
            type: 'array',
            items: contractResponseSchema,
          },
        },
      },
    },
    getContractsByBusinessOperationHandler
  );

  // PUT /api/contracts/:id - Update contract
  server.put(
    '/:id',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            contractName: { type: 'string', minLength: 1, maxLength: 255 },
            contractNumber: { type: 'string', minLength: 1, maxLength: 100 },
            contractorName: { type: 'string', minLength: 1, maxLength: 255 },
            contractorPMId: { type: 'string' },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            canBeExtended: { type: 'boolean' },
            status: { 
              type: 'string', 
              enum: ['PLANNING', 'ACTIVE', 'RENEWAL', 'EXPIRING', 'EXPIRED', 'EXTENDED'] 
            },
          },
        },
        response: {
          200: contractResponseSchema,
          400: errorSchema,
          404: errorSchema,
          409: errorSchema,
        },
      },
    },
    updateContractHandler
  );

  // DELETE /api/contracts/:id - Delete contract
  server.delete(
    '/:id',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
          404: errorSchema,
          409: errorSchema,
        },
      },
    },
    deleteContractHandler
  );
}

export default contractRoutes;
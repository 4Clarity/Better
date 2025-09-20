import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  createFactHandler,
  getFactsHandler,
  getFactByIdHandler,
  updateFactHandler,
  deleteFactHandler,
} from './facts.controller';

// Zod schemas for request/response validation
const errorSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'number' },
    error: { type: 'string' },
    message: { type: 'string' },
  },
};

const factResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    factType: { type: 'string' },
    content: { type: 'string' },
    summary: { type: ['string', 'null'] },
    confidence: { type: 'number' },
    // source: { type: ['string', 'null'] }, // Not in schema
    sourceDocumentId: { type: ['string', 'null'] },
    sourceCommunicationId: { type: ['string', 'null'] },
    // sourceEntityType calculated from sourceDocumentId vs sourceCommunicationId
    extractionMetadata: { type: ['object', 'null'] },
    approvalStatus: { type: 'string' },
    approvedBy: { type: ['string', 'null'] },
    approvedAt: { type: ['string', 'null'] },
    rejectionReason: { type: ['string', 'null'] },
    securityClassification: { type: 'string' },
    isActive: { type: 'boolean' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
    extractedAt: { type: ['string', 'null'] },
  },
};

const factsListResponseSchema = {
  type: 'object',
  properties: {
    facts: {
      type: 'array',
      items: factResponseSchema,
    },
    pagination: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        limit: { type: 'number' },
        offset: { type: 'number' },
        hasMore: { type: 'boolean' },
      },
    },
  },
};

// Request body schemas
export const createFactSchema = z.object({
  factType: z.enum(['ENTITY', 'RELATIONSHIP', 'EVENT', 'METRIC', 'CLASSIFICATION', 'OTHER']),
  content: z.string().min(1, "Content is required"),
  summary: z.string().optional(),
  confidence: z.number().min(0.0).max(1.0),
  // source: z.string().optional(), // Not in schema
  sourceEntityId: z.string().optional(),
  sourceEntityType: z.enum(['DOCUMENT', 'COMMUNICATION', 'OTHER']).optional(),
  metadata: z.object({}).optional(), // Will be mapped to extractionMetadata
  approvalStatus: z.enum(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ESCALATED']).default('PENDING'),
  securityClassification: z.enum(['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET']).default('UNCLASSIFIED'),
  extractedAt: z.string().datetime().optional(),
});

export const updateFactSchema = z.object({
  factType: z.enum(['ENTITY', 'RELATIONSHIP', 'EVENT', 'METRIC', 'CLASSIFICATION', 'OTHER']).optional(),
  content: z.string().min(1).optional(),
  summary: z.string().optional(),
  confidence: z.number().min(0.0).max(1.0).optional(),
  // source: z.string().optional(), // Not in schema
  metadata: z.object({}).optional(), // Will be mapped to extractionMetadata
  approvalStatus: z.enum(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ESCALATED']).optional(),
  rejectionReason: z.string().optional(),
  securityClassification: z.enum(['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET']).optional(),
  isActive: z.boolean().optional(),
});

export const getFactsQuerySchema = z.object({
  search: z.string().optional(),
  factType: z.enum(['ENTITY', 'RELATIONSHIP', 'EVENT', 'METRIC', 'CLASSIFICATION', 'OTHER']).optional(),
  sourceEntityId: z.string().optional(),
  sourceEntityType: z.enum(['DOCUMENT', 'COMMUNICATION', 'OTHER']).optional(),
  approvalStatus: z.enum(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ESCALATED']).optional(),
  securityClassification: z.enum(['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET']).optional(),
  minConfidence: z.coerce.number().min(0.0).max(1.0).optional(),
  maxConfidence: z.coerce.number().min(0.0).max(1.0).optional(),
  isActive: z.boolean().transform(val => val === true).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// Route definitions
export default async function factsRoutes(fastify: FastifyInstance) {
  // Create fact
  fastify.post('/facts', {
    schema: {
      body: {
        type: 'object',
        properties: {
          factType: {
            type: 'string',
            enum: ['ENTITY', 'RELATIONSHIP', 'EVENT', 'METRIC', 'CLASSIFICATION', 'OTHER']
          },
          content: { type: 'string', minLength: 1 },
          summary: { type: 'string' },
          confidence: { type: 'number', minimum: 0.0, maximum: 1.0 },
          // source: { type: 'string' }, // Not in schema
          sourceEntityId: { type: 'string' },
          sourceEntityType: {
            type: 'string',
            enum: ['DOCUMENT', 'COMMUNICATION', 'OTHER']
          },
          metadata: { type: 'object' },
          approvalStatus: {
            type: 'string',
            enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ESCALATED'],
            default: 'PENDING'
          },
          securityClassification: {
            type: 'string',
            enum: ['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'],
            default: 'UNCLASSIFIED'
          },
          extractedAt: { type: 'string', format: 'date-time' },
        },
        required: ['factType', 'content', 'confidence'],
      },
      response: {
        201: factResponseSchema,
        400: errorSchema,
        401: errorSchema,
        403: errorSchema,
        500: errorSchema,
      },
    },
  }, createFactHandler);

  // Get facts list
  fastify.get('/facts', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          search: { type: 'string' },
          factType: {
            type: 'string',
            enum: ['ENTITY', 'RELATIONSHIP', 'EVENT', 'METRIC', 'CLASSIFICATION', 'OTHER']
          },
          sourceEntityId: { type: 'string' },
          sourceEntityType: {
            type: 'string',
            enum: ['DOCUMENT', 'COMMUNICATION', 'OTHER']
          },
          approvalStatus: {
            type: 'string',
            enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ESCALATED']
          },
          securityClassification: {
            type: 'string',
            enum: ['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET']
          },
          minConfidence: { type: 'number', minimum: 0.0, maximum: 1.0 },
          maxConfidence: { type: 'number', minimum: 0.0, maximum: 1.0 },
          isActive: { type: 'boolean' },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          offset: { type: 'number', minimum: 0, default: 0 },
        },
      },
      response: {
        200: factsListResponseSchema,
        400: errorSchema,
        401: errorSchema,
        403: errorSchema,
        500: errorSchema,
      },
    },
  }, getFactsHandler);

  // Get fact by ID
  fastify.get('/facts/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      response: {
        200: factResponseSchema,
        400: errorSchema,
        401: errorSchema,
        403: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
    },
  }, getFactByIdHandler);

  // Update fact
  fastify.patch('/facts/:id', {
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
          factType: {
            type: 'string',
            enum: ['ENTITY', 'RELATIONSHIP', 'EVENT', 'METRIC', 'CLASSIFICATION', 'OTHER']
          },
          content: { type: 'string', minLength: 1 },
          summary: { type: 'string' },
          confidence: { type: 'number', minimum: 0.0, maximum: 1.0 },
          // source: { type: 'string' }, // Not in schema
          metadata: { type: 'object' },
          approvalStatus: {
            type: 'string',
            enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ESCALATED']
          },
          rejectionReason: { type: 'string' },
          securityClassification: {
            type: 'string',
            enum: ['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET']
          },
          isActive: { type: 'boolean' },
        },
      },
      response: {
        200: factResponseSchema,
        400: errorSchema,
        401: errorSchema,
        403: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
    },
  }, updateFactHandler);

  // Delete fact (soft delete)
  fastify.delete('/facts/:id', {
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
            id: { type: 'string' },
          },
        },
        400: errorSchema,
        401: errorSchema,
        403: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
    },
  }, deleteFactHandler);
}
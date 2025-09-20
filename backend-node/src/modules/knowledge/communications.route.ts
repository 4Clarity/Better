import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  createCommunicationHandler,
  getCommunicationsHandler,
  getCommunicationByIdHandler,
  updateCommunicationHandler,
  deleteCommunicationHandler,
} from './communications.controller';

// Zod schemas for request/response validation
const errorSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'number' },
    error: { type: 'string' },
    message: { type: 'string' },
  },
};

const communicationResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    platform: { type: 'string' },
    externalId: { type: ['string', 'null'] },
    threadId: { type: ['string', 'null'] },
    direction: { type: 'string' },
    subject: { type: ['string', 'null'] },
    content: { type: 'string' },
    contentType: { type: 'string' },
    senderEmail: { type: ['string', 'null'] },
    recipientEmails: { type: 'array', items: { type: 'string' } },
    participants: { type: 'array', items: { type: 'string' } },
    externalParticipants: { type: 'array', items: { type: 'string' } },
    metadata: { type: ['object', 'null'] },
    processingStatus: { type: 'string' },
    securityClassification: { type: 'string' },
    isActive: { type: 'boolean' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
    sentAt: { type: ['string', 'null'] },
  },
};

const communicationsListResponseSchema = {
  type: 'object',
  properties: {
    communications: {
      type: 'array',
      items: communicationResponseSchema,
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
export const createCommunicationSchema = z.object({
  platform: z.enum(['EMAIL', 'TEAMS', 'SLACK', 'ZOOM', 'PHONE', 'OTHER']),
  externalId: z.string().optional(),
  threadId: z.string().optional(),
  direction: z.enum(['INBOUND', 'OUTBOUND', 'INTERNAL']),
  subject: z.string().optional(),
  content: z.string().min(1, "Content is required"),
  contentType: z.enum(['TEXT', 'HTML', 'MARKDOWN', 'RICH_TEXT', 'JSON']).default('TEXT'),
  senderEmail: z.string().email().optional(),
  recipientEmails: z.array(z.string().email()).default([]),
  participants: z.array(z.string()).default([]),
  externalParticipants: z.array(z.string().email()).default([]),
  metadata: z.object({}).optional(),
  processingStatus: z.enum(['PENDING', 'PROCESSING', 'PROCESSED', 'FAILED']).default('PENDING'),
  securityClassification: z.enum(['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET']).default('UNCLASSIFIED'),
  sentAt: z.string().datetime().optional(),
});

export const updateCommunicationSchema = z.object({
  subject: z.string().optional(),
  content: z.string().min(1).optional(),
  contentType: z.enum(['TEXT', 'HTML', 'MARKDOWN', 'RICH_TEXT', 'JSON']).optional(),
  recipientEmails: z.array(z.string().email()).optional(),
  participants: z.array(z.string()).optional(),
  externalParticipants: z.array(z.string().email()).optional(),
  metadata: z.object({}).optional(),
  processingStatus: z.enum(['PENDING', 'PROCESSING', 'PROCESSED', 'FAILED']).optional(),
  securityClassification: z.enum(['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET']).optional(),
  isActive: z.boolean().optional(),
});

export const getCommunicationsQuerySchema = z.object({
  search: z.string().optional(),
  platform: z.enum(['EMAIL', 'TEAMS', 'SLACK', 'ZOOM', 'PHONE', 'OTHER']).optional(),
  direction: z.enum(['INBOUND', 'OUTBOUND', 'INTERNAL']).optional(),
  threadId: z.string().optional(),
  processingStatus: z.enum(['PENDING', 'PROCESSING', 'PROCESSED', 'FAILED']).optional(),
  securityClassification: z.enum(['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET']).optional(),
  participants: z.string().optional(),
  isActive: z.boolean().transform(val => val === true).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// Route definitions
export default async function communicationsRoutes(fastify: FastifyInstance) {
  // Create communication
  fastify.post('/communications', {
    schema: {
      body: {
        type: 'object',
        properties: {
          platform: {
            type: 'string',
            enum: ['EMAIL', 'TEAMS', 'SLACK', 'ZOOM', 'PHONE', 'OTHER']
          },
          externalId: { type: 'string' },
          threadId: { type: 'string' },
          direction: {
            type: 'string',
            enum: ['INBOUND', 'OUTBOUND', 'INTERNAL']
          },
          subject: { type: 'string' },
          content: { type: 'string', minLength: 1 },
          contentType: {
            type: 'string',
            enum: ['TEXT', 'HTML', 'MARKDOWN', 'RICH_TEXT', 'JSON'],
            default: 'TEXT'
          },
          senderEmail: { type: 'string', format: 'email' },
          recipientEmails: { type: 'array', items: { type: 'string', format: 'email' } },
          participants: { type: 'array', items: { type: 'string' } },
          externalParticipants: { type: 'array', items: { type: 'string', format: 'email' } },
          metadata: { type: 'object' },
          processingStatus: {
            type: 'string',
            enum: ['PENDING', 'PROCESSING', 'PROCESSED', 'FAILED'],
            default: 'PENDING'
          },
          securityClassification: {
            type: 'string',
            enum: ['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'],
            default: 'UNCLASSIFIED'
          },
          sentAt: { type: 'string', format: 'date-time' },
        },
        required: ['platform', 'direction', 'content'],
      },
      response: {
        201: communicationResponseSchema,
        400: errorSchema,
        401: errorSchema,
        403: errorSchema,
        500: errorSchema,
      },
    },
  }, createCommunicationHandler);

  // Get communications list
  fastify.get('/communications', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          search: { type: 'string' },
          platform: {
            type: 'string',
            enum: ['EMAIL', 'TEAMS', 'SLACK', 'ZOOM', 'PHONE', 'OTHER']
          },
          direction: {
            type: 'string',
            enum: ['INBOUND', 'OUTBOUND', 'INTERNAL']
          },
          threadId: { type: 'string' },
          processingStatus: {
            type: 'string',
            enum: ['PENDING', 'PROCESSING', 'PROCESSED', 'FAILED']
          },
          securityClassification: {
            type: 'string',
            enum: ['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET']
          },
          participants: { type: 'string' },
          isActive: { type: 'boolean' },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          offset: { type: 'number', minimum: 0, default: 0 },
        },
      },
      response: {
        200: communicationsListResponseSchema,
        400: errorSchema,
        401: errorSchema,
        403: errorSchema,
        500: errorSchema,
      },
    },
  }, getCommunicationsHandler);

  // Get communication by ID
  fastify.get('/communications/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      response: {
        200: communicationResponseSchema,
        400: errorSchema,
        401: errorSchema,
        403: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
    },
  }, getCommunicationByIdHandler);

  // Update communication
  fastify.patch('/communications/:id', {
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
          subject: { type: 'string' },
          content: { type: 'string', minLength: 1 },
          contentType: {
            type: 'string',
            enum: ['TEXT', 'HTML', 'MARKDOWN', 'RICH_TEXT', 'JSON']
          },
          recipientEmails: { type: 'array', items: { type: 'string', format: 'email' } },
          participants: { type: 'array', items: { type: 'string' } },
          externalParticipants: { type: 'array', items: { type: 'string', format: 'email' } },
          metadata: { type: 'object' },
          processingStatus: {
            type: 'string',
            enum: ['PENDING', 'PROCESSING', 'PROCESSED', 'FAILED']
          },
          securityClassification: {
            type: 'string',
            enum: ['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET']
          },
          isActive: { type: 'boolean' },
        },
      },
      response: {
        200: communicationResponseSchema,
        400: errorSchema,
        401: errorSchema,
        403: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
    },
  }, updateCommunicationHandler);

  // Delete communication (soft delete)
  fastify.delete('/communications/:id', {
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
  }, deleteCommunicationHandler);
}
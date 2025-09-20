import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  createDocumentHandler,
  getDocumentsHandler,
  getDocumentByIdHandler,
  updateDocumentHandler,
  deleteDocumentHandler,
} from './documents.controller';

// Zod schemas for request/response validation
const errorSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'number' },
    error: { type: 'string' },
    message: { type: 'string' },
  },
};

const documentResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: ['string', 'null'] },
    originalFileName: { type: 'string' },
    mimeType: { type: 'string' },
    fileSize: { type: 'number' },
    filePath: { type: 'string' },
    checksum: { type: 'string' },
    version: { type: 'number' },
    parentId: { type: ['string', 'null'] },
    securityClassification: { type: 'string' },
    processingStatus: { type: 'string' },
    extractedMetadata: { type: ['object', 'null'] },
    uploadedBy: { type: 'string' },
    approvedBy: { type: ['string', 'null'] },
    isActive: { type: 'boolean' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
};

const documentsListResponseSchema = {
  type: 'object',
  properties: {
    documents: {
      type: 'array',
      items: documentResponseSchema,
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
export const createDocumentSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  originalFilename: z.string().min(1, "Original filename is required"),
  mimeType: z.string().min(1, "MIME type is required"),
  fileSize: z.number().min(1, "File size must be positive"),
  storageUrl: z.string().url("Storage URL must be valid"),
  checksum: z.string().optional(),
  securityClassification: z.enum(['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET']),
  parentId: z.string().optional(),
  extractionMetadata: z.object({}).optional(),
});

export const updateDocumentSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  securityClassification: z.enum(['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET']).optional(),
  processingStatus: z.enum(['UPLOADED', 'PROCESSING', 'PROCESSED', 'FAILED', 'QUARANTINED']).optional(),
  extractionMetadata: z.object({}).optional(),
  isActive: z.boolean().optional(),
});

export const getDocumentsQuerySchema = z.object({
  search: z.string().optional(),
  securityClassification: z.enum(['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET']).optional(),
  processingStatus: z.enum(['UPLOADED', 'PROCESSING', 'PROCESSED', 'FAILED', 'QUARANTINED']).optional(),
  uploadedBy: z.string().optional(),
  isActive: z.boolean().transform(val => val === true).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// Route definitions
export default async function documentsRoutes(fastify: FastifyInstance) {
  // Create document
  fastify.post('/documents', {
    schema: {
      body: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 255 },
          description: { type: 'string' },
          filename: { type: 'string', minLength: 1 },
          originalFilename: { type: 'string', minLength: 1 },
          mimeType: { type: 'string', minLength: 1 },
          fileSize: { type: 'number', minimum: 1 },
          storageUrl: { type: 'string', format: 'uri' },
          checksum: { type: 'string' },
          securityClassification: {
            type: 'string',
            enum: ['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET']
          },
          parentId: { type: 'string' },
          extractionMetadata: { type: 'object' },
        },
        required: ['title', 'filename', 'originalFilename', 'mimeType', 'fileSize', 'storageUrl', 'securityClassification'],
      },
      response: {
        201: documentResponseSchema,
        400: errorSchema,
        401: errorSchema,
        403: errorSchema,
        500: errorSchema,
      },
    },
  }, createDocumentHandler);

  // Get documents list
  fastify.get('/documents', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          search: { type: 'string' },
          securityClassification: {
            type: 'string',
            enum: ['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET']
          },
          processingStatus: {
            type: 'string',
            enum: ['UPLOADED', 'PROCESSING', 'PROCESSED', 'FAILED', 'QUARANTINED']
          },
          uploadedBy: { type: 'string' },
          isActive: { type: 'boolean' },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          offset: { type: 'number', minimum: 0, default: 0 },
        },
      },
      response: {
        200: documentsListResponseSchema,
        400: errorSchema,
        401: errorSchema,
        403: errorSchema,
        500: errorSchema,
      },
    },
  }, getDocumentsHandler);

  // Get document by ID
  fastify.get('/documents/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      response: {
        200: documentResponseSchema,
        400: errorSchema,
        401: errorSchema,
        403: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
    },
  }, getDocumentByIdHandler);

  // Update document
  fastify.patch('/documents/:id', {
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
          title: { type: 'string', minLength: 1, maxLength: 255 },
          description: { type: 'string' },
          securityClassification: {
            type: 'string',
            enum: ['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET']
          },
          processingStatus: {
            type: 'string',
            enum: ['UPLOADED', 'PROCESSING', 'PROCESSED', 'FAILED', 'QUARANTINED']
          },
          extractionMetadata: { type: 'object' },
          isActive: { type: 'boolean' },
        },
      },
      response: {
        200: documentResponseSchema,
        400: errorSchema,
        401: errorSchema,
        403: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
    },
  }, updateDocumentHandler);

  // Delete document (soft delete)
  fastify.delete('/documents/:id', {
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
  }, deleteDocumentHandler);
}
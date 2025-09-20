import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  createTagHandler,
  getTagsHandler,
  getTagByIdHandler,
  updateTagHandler,
  deleteTagHandler,
} from './tags.controller';

// Zod schemas for request/response validation
const errorSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'number' },
    error: { type: 'string' },
    message: { type: 'string' },
  },
};

const tagResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: ['string', 'null'] },
    type: { type: 'string' },
    color: { type: ['string', 'null'] },
    icon: { type: ['string', 'null'] },
    metadata: { type: ['object', 'null'] },
    usageCount: { type: 'number' },
    isActive: { type: 'boolean' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
    relatedEntities: {
      type: 'object',
      properties: {
        documents: { type: 'number' },
        communications: { type: 'number' },
        facts: { type: 'number' },
      },
    },
  },
};

const tagsListResponseSchema = {
  type: 'object',
  properties: {
    tags: {
      type: 'array',
      items: tagResponseSchema,
    },
    tagCloud: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string' },
          usageCount: { type: 'number' },
          weight: { type: 'number' },
        },
      },
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
export const createTagSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  description: z.string().optional(),
  type: z.enum(['CONTENT', 'TOPIC', 'PRIORITY', 'STATUS', 'CUSTOM']).default('CUSTOM'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().optional(),
  metadata: z.object({}).optional(),
});

export const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().optional(),
  type: z.enum(['CONTENT', 'TOPIC', 'PRIORITY', 'STATUS', 'CUSTOM']).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().optional(),
  metadata: z.object({}).optional(),
  isActive: z.boolean().optional(),
});

export const getTagsQuerySchema = z.object({
  search: z.string().optional(),
  type: z.enum(['CONTENT', 'TOPIC', 'PRIORITY', 'STATUS', 'CUSTOM']).optional(),
  entityType: z.enum(['DOCUMENT', 'COMMUNICATION', 'FACT']).optional(),
  entityId: z.string().optional(),
  includeUsageStats: z.boolean().default(true),
  includeTagCloud: z.boolean().default(false),
  minUsageCount: z.coerce.number().min(0).optional(),
  isActive: z.boolean().transform(val => val === true).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

// Tag relationship schemas
export const addTagRelationshipSchema = z.object({
  entityType: z.enum(['DOCUMENT', 'COMMUNICATION', 'FACT']),
  entityId: z.string(),
  tagIds: z.array(z.string()).min(1, "At least one tag ID is required"),
});

export const removeTagRelationshipSchema = z.object({
  entityType: z.enum(['DOCUMENT', 'COMMUNICATION', 'FACT']),
  entityId: z.string(),
  tagIds: z.array(z.string()).min(1, "At least one tag ID is required"),
});

// Route definitions
export default async function tagsRoutes(fastify: FastifyInstance) {
  // Create tag
  fastify.post('/tags', {
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 50 },
          description: { type: 'string' },
          type: {
            type: 'string',
            enum: ['CONTENT', 'TOPIC', 'PRIORITY', 'STATUS', 'CUSTOM'],
            default: 'CUSTOM'
          },
          color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
          icon: { type: 'string' },
          metadata: { type: 'object' },
        },
        required: ['name'],
      },
      response: {
        201: tagResponseSchema,
        400: errorSchema,
        401: errorSchema,
        403: errorSchema,
        500: errorSchema,
      },
    },
  }, createTagHandler);

  // Get tags list
  fastify.get('/tags', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          search: { type: 'string' },
          type: {
            type: 'string',
            enum: ['CONTENT', 'TOPIC', 'PRIORITY', 'STATUS', 'CUSTOM']
          },
          entityType: {
            type: 'string',
            enum: ['DOCUMENT', 'COMMUNICATION', 'FACT']
          },
          entityId: { type: 'string' },
          includeUsageStats: { type: 'boolean', default: true },
          includeTagCloud: { type: 'boolean', default: false },
          minUsageCount: { type: 'number', minimum: 0 },
          isActive: { type: 'boolean' },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 50 },
          offset: { type: 'number', minimum: 0, default: 0 },
        },
      },
      response: {
        200: tagsListResponseSchema,
        400: errorSchema,
        401: errorSchema,
        403: errorSchema,
        500: errorSchema,
      },
    },
  }, getTagsHandler);

  // Get tag by ID
  fastify.get('/tags/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      response: {
        200: tagResponseSchema,
        400: errorSchema,
        401: errorSchema,
        403: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
    },
  }, getTagByIdHandler);

  // Update tag
  fastify.patch('/tags/:id', {
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
          name: { type: 'string', minLength: 1, maxLength: 50 },
          description: { type: 'string' },
          type: {
            type: 'string',
            enum: ['CONTENT', 'TOPIC', 'PRIORITY', 'STATUS', 'CUSTOM']
          },
          color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
          icon: { type: 'string' },
          metadata: { type: 'object' },
          isActive: { type: 'boolean' },
        },
      },
      response: {
        200: tagResponseSchema,
        400: errorSchema,
        401: errorSchema,
        403: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
    },
  }, updateTagHandler);

  // Delete tag (soft delete)
  fastify.delete('/tags/:id', {
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
            removedRelationships: { type: 'number' },
          },
        },
        400: errorSchema,
        401: errorSchema,
        403: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
    },
  }, deleteTagHandler);

  // Add tag relationships to entities
  fastify.post('/tags/relationships', {
    schema: {
      body: {
        type: 'object',
        properties: {
          entityType: {
            type: 'string',
            enum: ['DOCUMENT', 'COMMUNICATION', 'FACT']
          },
          entityId: { type: 'string' },
          tagIds: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1
          },
        },
        required: ['entityType', 'entityId', 'tagIds'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            addedRelationships: { type: 'number' },
            skippedDuplicates: { type: 'number' },
          },
        },
        400: errorSchema,
        401: errorSchema,
        403: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    // This will be handled by a separate relationship handler
    return reply.status(501).send({
      statusCode: 501,
      error: 'Not Implemented',
      message: 'Tag relationship management will be implemented separately',
    });
  });

  // Remove tag relationships from entities
  fastify.delete('/tags/relationships', {
    schema: {
      body: {
        type: 'object',
        properties: {
          entityType: {
            type: 'string',
            enum: ['DOCUMENT', 'COMMUNICATION', 'FACT']
          },
          entityId: { type: 'string' },
          tagIds: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1
          },
        },
        required: ['entityType', 'entityId', 'tagIds'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            removedRelationships: { type: 'number' },
          },
        },
        400: errorSchema,
        401: errorSchema,
        403: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    // This will be handled by a separate relationship handler
    return reply.status(501).send({
      statusCode: 501,
      error: 'Not Implemented',
      message: 'Tag relationship management will be implemented separately',
    });
  });

  // Get tag suggestions based on content
  fastify.post('/tags/suggestions', {
    schema: {
      body: {
        type: 'object',
        properties: {
          content: { type: 'string', minLength: 1 },
          entityType: {
            type: 'string',
            enum: ['DOCUMENT', 'COMMUNICATION', 'FACT']
          },
          limit: { type: 'number', minimum: 1, maximum: 20, default: 10 },
        },
        required: ['content'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            suggestions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  type: { type: 'string' },
                  relevanceScore: { type: 'number' },
                  usageCount: { type: 'number' },
                },
              },
            },
            totalSuggestions: { type: 'number' },
          },
        },
        400: errorSchema,
        401: errorSchema,
        403: errorSchema,
        500: errorSchema,
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    // This will be handled by a separate suggestions handler
    return reply.status(501).send({
      statusCode: 501,
      error: 'Not Implemented',
      message: 'Tag suggestions will be implemented separately',
    });
  });
}
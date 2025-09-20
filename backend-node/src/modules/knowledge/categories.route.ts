import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  createCategoryHandler,
  getCategoriesHandler,
  getCategoryByIdHandler,
  updateCategoryHandler,
  deleteCategoryHandler,
} from './categories.controller';

// Zod schemas for request/response validation
const errorSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'number' },
    error: { type: 'string' },
    message: { type: 'string' },
  },
};

const categoryResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: ['string', 'null'] },
    parentId: { type: ['string', 'null'] },
    level: { type: 'number' },
    path: { type: 'string' },
    displayOrder: { type: 'number' },
    color: { type: ['string', 'null'] },
    icon: { type: ['string', 'null'] },
    metadata: { type: ['object', 'null'] },
    // usageCount: { type: 'number' }, // Calculated field, not in schema
    isActive: { type: 'boolean' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
    parent: {
      type: ['object', 'null'],
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        path: { type: 'string' },
      },
    },
    children: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: ['string', 'null'] },
          level: { type: 'number' },
          // usageCount: { type: 'number' }, // Calculated field, not in schema
        },
      },
    },
  },
};

const categoriesListResponseSchema = {
  type: 'object',
  properties: {
    categories: {
      type: 'array',
      items: categoryResponseSchema,
    },
    tree: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          level: { type: 'number' },
          // usageCount: { type: 'number' }, // Calculated field, not in schema
          children: { type: 'array' },
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
export const createCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
  parentId: z.string().optional(),
  displayOrder: z.number().min(0).default(0),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().optional(),
  metadata: z.object({}).optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  parentId: z.string().optional(),
  displayOrder: z.number().min(0).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().optional(),
  metadata: z.object({}).optional(),
  isActive: z.boolean().optional(),
});

export const getCategoriesQuerySchema = z.object({
  search: z.string().optional(),
  parentId: z.string().optional(),
  level: z.coerce.number().min(0).optional(),
  includeUsageStats: z.boolean().default(true),
  includeTree: z.boolean().default(false),
  isActive: z.boolean().transform(val => val === true).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

// Route definitions
export default async function categoriesRoutes(fastify: FastifyInstance) {
  // Create category
  fastify.post('/categories', {
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          description: { type: 'string' },
          parentId: { type: 'string' },
          displayOrder: { type: 'number', minimum: 0, default: 0 },
          color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
          icon: { type: 'string' },
          metadata: { type: 'object' },
        },
        required: ['name'],
      },
      response: {
        201: categoryResponseSchema,
        400: errorSchema,
        401: errorSchema,
        403: errorSchema,
        500: errorSchema,
      },
    },
  }, createCategoryHandler);

  // Get categories list
  fastify.get('/categories', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          search: { type: 'string' },
          parentId: { type: 'string' },
          level: { type: 'number', minimum: 0 },
          includeUsageStats: { type: 'boolean', default: true },
          includeTree: { type: 'boolean', default: false },
          isActive: { type: 'boolean' },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 50 },
          offset: { type: 'number', minimum: 0, default: 0 },
        },
      },
      response: {
        200: categoriesListResponseSchema,
        400: errorSchema,
        401: errorSchema,
        403: errorSchema,
        500: errorSchema,
      },
    },
  }, getCategoriesHandler);

  // Get category by ID
  fastify.get('/categories/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      response: {
        200: categoryResponseSchema,
        400: errorSchema,
        401: errorSchema,
        403: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
    },
  }, getCategoryByIdHandler);

  // Update category
  fastify.patch('/categories/:id', {
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
          name: { type: 'string', minLength: 1, maxLength: 100 },
          description: { type: 'string' },
          parentId: { type: 'string' },
          displayOrder: { type: 'number', minimum: 0 },
          color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
          icon: { type: 'string' },
          metadata: { type: 'object' },
          isActive: { type: 'boolean' },
        },
      },
      response: {
        200: categoryResponseSchema,
        400: errorSchema,
        401: errorSchema,
        403: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
    },
  }, updateCategoryHandler);

  // Delete category (soft delete)
  fastify.delete('/categories/:id', {
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
            affectedChildren: { type: 'number' },
          },
        },
        400: errorSchema,
        401: errorSchema,
        403: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
    },
  }, deleteCategoryHandler);

  // Get category tree
  fastify.get('/categories/tree/structure', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          rootId: { type: 'string' },
          maxDepth: { type: 'number', minimum: 1, maximum: 10, default: 5 },
          includeUsageStats: { type: 'boolean', default: true },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            tree: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  level: { type: 'number' },
                  // usageCount: { type: 'number' }, // Calculated field, not in schema
                  children: { type: 'array' },
                },
              },
            },
            totalCategories: { type: 'number' },
            maxLevel: { type: 'number' },
          },
        },
        400: errorSchema,
        401: errorSchema,
        403: errorSchema,
        500: errorSchema,
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    // This will be handled by a separate tree handler
    return reply.status(501).send({
      statusCode: 501,
      error: 'Not Implemented',
      message: 'Tree structure endpoint will be implemented separately',
    });
  });
}
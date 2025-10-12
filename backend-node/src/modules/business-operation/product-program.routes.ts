import { FastifyInstance } from 'fastify';
import {
  createProductProgramHandler,
  getProductProgramsHandler,
  getProductProgramByIdHandler,
  updateProductProgramHandler,
  deleteProductProgramHandler,
} from './product-program.controller';
import {
  addStakeholderHandler,
  removeStakeholderHandler,
  getStakeholdersHandler,
  updateStakeholderRoleHandler,
} from './product-program-stakeholders.controller';
import { authenticate, requireRoles } from '../auth/auth.middleware';

const errorSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'number' },
    error: { type: 'string' },
    message: { type: 'string' },
  },
};

const criticalDateSchema = {
  type: 'object',
  required: ['date', 'description'],
  properties: {
    date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    description: { type: 'string', minLength: 1 },
    type: { type: 'string', enum: ['milestone', 'deadline', 'review', 'other'] },
  },
};

const productProgramResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    objectives: { type: 'string' },
    deliverables: { type: 'string' },
    dependencies: { type: ['string', 'null'] },
    securityClassification: { type: 'string', enum: ['UNCLASSIFIED', 'CUI', 'SECRET', 'TOP_SECRET'] },
    criticalDates: { type: 'array', items: criticalDateSchema },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
    createdBy: { type: 'string' },
    updatedBy: { type: 'string' },
  },
};

async function productProgramRoutes(server: FastifyInstance) {
  // POST /api/business-operations/products-programs - Create new product/program
  server.post(
    '/products-programs',
    {
      onRequest: [authenticate, requireRoles(['Admin', 'Gov Program Director', 'Gov Program Manager'])],
      schema: {
        body: {
          type: 'object',
          required: ['name', 'description', 'objectives', 'deliverables', 'securityClassification'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 200 },
            description: { type: 'string', minLength: 1 },
            objectives: { type: 'string', minLength: 1 },
            deliverables: { type: 'string', minLength: 1 },
            dependencies: { type: 'string' },
            securityClassification: { type: 'string', enum: ['UNCLASSIFIED', 'CUI', 'SECRET', 'TOP_SECRET'] },
            criticalDates: {
              type: 'array',
              items: criticalDateSchema,
            },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: productProgramResponseSchema,
            },
          },
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
        },
      },
    },
    createProductProgramHandler
  );

  // GET /api/business-operations/products-programs - List all product/programs
  server.get(
    '/products-programs',
    {
      onRequest: [authenticate],
      schema: {
        querystring: {
          type: 'object',
          properties: {
            search: { type: 'string' },
            securityClassification: { type: 'string', enum: ['UNCLASSIFIED', 'CUI', 'SECRET', 'TOP_SECRET'] },
            page: { type: 'number', minimum: 1, default: 1 },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
            sortBy: { type: 'string', enum: ['name', 'security_classification', 'created_at'], default: 'created_at' },
            sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: productProgramResponseSchema,
              },
              pagination: {
                type: 'object',
                properties: {
                  page: { type: 'number' },
                  limit: { type: 'number' },
                  total: { type: 'number' },
                  pages: { type: 'number' },
                },
              },
            },
          },
          401: errorSchema,
        },
      },
    },
    getProductProgramsHandler
  );

  // GET /api/business-operations/products-programs/:id - Get specific product/program
  server.get(
    '/products-programs/:id',
    {
      onRequest: [authenticate],
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
              success: { type: 'boolean' },
              data: productProgramResponseSchema,
            },
          },
          401: errorSchema,
          404: errorSchema,
        },
      },
    },
    getProductProgramByIdHandler
  );

  // PUT /api/business-operations/products-programs/:id - Update product/program
  server.put(
    '/products-programs/:id',
    {
      onRequest: [authenticate, requireRoles(['Admin', 'Gov Program Director', 'Gov Program Manager'])],
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
            name: { type: 'string', minLength: 1, maxLength: 200 },
            description: { type: 'string', minLength: 1 },
            objectives: { type: 'string', minLength: 1 },
            deliverables: { type: 'string', minLength: 1 },
            dependencies: { type: 'string' },
            securityClassification: { type: 'string', enum: ['UNCLASSIFIED', 'CUI', 'SECRET', 'TOP_SECRET'] },
            criticalDates: {
              type: 'array',
              items: criticalDateSchema,
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: productProgramResponseSchema,
            },
          },
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
        },
      },
    },
    updateProductProgramHandler
  );

  // DELETE /api/business-operations/products-programs/:id - Delete product/program
  server.delete(
    '/products-programs/:id',
    {
      onRequest: [authenticate, requireRoles(['Admin', 'Gov Program Director', 'Gov Program Manager'])],
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
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
        },
      },
    },
    deleteProductProgramHandler
  );

  // Stakeholder Management Routes (Story 4.2 - Phase 1)

  // POST /api/business-operations/products-programs/:id/stakeholders - Add stakeholder
  server.post(
    '/products-programs/:id/stakeholders',
    {
      onRequest: [authenticate, requireRoles(['Admin', 'Gov Program Director', 'Gov Program Manager'])],
      schema: {
        params: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
        },
        body: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string' },
            role: { type: 'string', maxLength: 100 },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
        },
      },
    },
    addStakeholderHandler
  );

  // GET /api/business-operations/products-programs/:id/stakeholders - Get stakeholders
  server.get(
    '/products-programs/:id/stakeholders',
    {
      onRequest: [authenticate],
      schema: {
        params: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'array' },
            },
          },
          401: errorSchema,
          404: errorSchema,
        },
      },
    },
    getStakeholdersHandler
  );

  // PUT /api/business-operations/products-programs/:id/stakeholders/:userId - Update stakeholder role
  server.put(
    '/products-programs/:id/stakeholders/:userId',
    {
      onRequest: [authenticate, requireRoles(['Admin', 'Gov Program Director', 'Gov Program Manager'])],
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
          },
          required: ['id', 'userId'],
        },
        body: {
          type: 'object',
          required: ['role'],
          properties: {
            role: { type: ['string', 'null'], maxLength: 100 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
        },
      },
    },
    updateStakeholderRoleHandler
  );

  // DELETE /api/business-operations/products-programs/:id/stakeholders/:userId - Remove stakeholder
  server.delete(
    '/products-programs/:id/stakeholders/:userId',
    {
      onRequest: [authenticate, requireRoles(['Admin', 'Gov Program Director', 'Gov Program Manager'])],
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
          },
          required: ['id', 'userId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
        },
      },
    },
    removeStakeholderHandler
  );
}

export default productProgramRoutes;

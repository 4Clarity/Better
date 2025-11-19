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
  getProductProgramTransitionsHandler,
} from './product-program-stakeholders.controller';
import {
  linkProgramProductToOperationHandler,
  unlinkProgramProductFromOperationHandler,
} from './business-operation.controller';
import {
  createTaskHandler,
  getTasksHandler,
  getTaskByIdHandler,
  updateTaskHandler,
  deleteTaskHandler,
  markTaskCompleteHandler,
} from './product-program-task.controller';
import {
  createMilestoneHandler,
  getMilestonesHandler,
  getMilestoneByIdHandler,
  updateMilestoneHandler,
  deleteMilestoneHandler,
  markMilestoneAchievedHandler,
} from './product-program-milestone.controller';
import {
  createKnowledgeLinkHandler,
  getKnowledgeLinksHandler,
  getKnowledgeLinkByIdHandler,
  updateKnowledgeLinkHandler,
  deleteKnowledgeLinkHandler,
  searchKnowledgeLinksHandler,
} from './product-program-knowledge-link.controller';
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
    security_classification: { type: 'string', enum: ['UNCLASSIFIED', 'CUI', 'SECRET', 'TOP_SECRET'] },
    critical_dates: { type: 'array', items: criticalDateSchema },
    knowledge_context: { type: ['string', 'null'] },
    business_operation_type: { type: 'string' },
    business_operation_id: { type: ['string', 'null'] },
    created_at: { type: 'string' },
    updated_at: { type: 'string' },
    created_by: { type: 'string' },
    updated_by: { type: 'string' },
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
            knowledgeContext: { type: 'string' },
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
            knowledgeContext: { type: 'string' },
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

  // Transition Categorization Routes (Story 4.2 - Phase 2)

  // GET /api/business-operations/products-programs/:id/transitions - Get transitions for product/program
  server.get(
    '/products-programs/:id/transitions',
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
              data: { type: 'array' },
            },
          },
          401: errorSchema,
          404: errorSchema,
        },
      },
    },
    getProductProgramTransitionsHandler
  );

  // Business Operation Linking Routes (Story 4.2 - Phase 3)

  // PUT /api/business-operations/products-programs/:id/business-operation
  // Link a Program or Product to a Business Operation
  server.put(
    '/products-programs/:id/business-operation',
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
          required: ['businessOperationId'],
          properties: {
            businessOperationId: { type: 'string' },
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
          404: errorSchema,
        },
      },
    },
    linkProgramProductToOperationHandler
  );

  // DELETE /api/business-operations/products-programs/:id/business-operation
  // Unlink a Program or Product from its Business Operation
  server.delete(
    '/products-programs/:id/business-operation',
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
              data: { type: 'object' },
            },
          },
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
        },
      },
    },
    unlinkProgramProductFromOperationHandler
  );

  // Task Management Routes (Story 4.3)

  // POST /api/business-operations/products-programs/:id/tasks - Create task
  server.post(
    '/products-programs/:id/tasks',
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
          required: ['title'],
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 200 },
            description: { type: 'string' },
            status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
            dueDate: { type: 'string' },
            assignedTo: { type: 'string' },
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
          404: errorSchema,
        },
      },
    },
    createTaskHandler
  );

  // GET /api/business-operations/products-programs/:id/tasks - Get all tasks
  server.get(
    '/products-programs/:id/tasks',
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
    getTasksHandler
  );

  // GET /api/business-operations/tasks/:taskId - Get specific task
  server.get(
    '/tasks/:taskId',
    {
      onRequest: [authenticate],
      schema: {
        params: {
          type: 'object',
          properties: { taskId: { type: 'string' } },
          required: ['taskId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
          401: errorSchema,
          404: errorSchema,
        },
      },
    },
    getTaskByIdHandler
  );

  // PUT /api/business-operations/tasks/:taskId - Update task
  server.put(
    '/tasks/:taskId',
    {
      onRequest: [authenticate, requireRoles(['Admin', 'Gov Program Director', 'Gov Program Manager'])],
      schema: {
        params: {
          type: 'object',
          properties: { taskId: { type: 'string' } },
          required: ['taskId'],
        },
        body: {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 200 },
            description: { type: 'string' },
            status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
            dueDate: { type: 'string' },
            assignedTo: { type: 'string' },
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
          404: errorSchema,
        },
      },
    },
    updateTaskHandler
  );

  // DELETE /api/business-operations/tasks/:taskId - Delete task
  server.delete(
    '/tasks/:taskId',
    {
      onRequest: [authenticate, requireRoles(['Admin', 'Gov Program Director', 'Gov Program Manager'])],
      schema: {
        params: {
          type: 'object',
          properties: { taskId: { type: 'string' } },
          required: ['taskId'],
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
    deleteTaskHandler
  );

  // PATCH /api/business-operations/tasks/:taskId/complete - Mark task complete
  server.patch(
    '/tasks/:taskId/complete',
    {
      onRequest: [authenticate],
      schema: {
        params: {
          type: 'object',
          properties: { taskId: { type: 'string' } },
          required: ['taskId'],
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
          404: errorSchema,
        },
      },
    },
    markTaskCompleteHandler
  );

  // Milestone Management Routes (Story 4.3)

  // POST /api/business-operations/products-programs/:id/milestones - Create milestone
  server.post(
    '/products-programs/:id/milestones',
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
          required: ['title', 'targetDate'],
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 200 },
            description: { type: 'string' },
            targetDate: { type: 'string' },
            status: { type: 'string', enum: ['UPCOMING', 'IN_PROGRESS', 'ACHIEVED', 'MISSED', 'CANCELLED'] },
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
          404: errorSchema,
        },
      },
    },
    createMilestoneHandler
  );

  // GET /api/business-operations/products-programs/:id/milestones - Get all milestones
  server.get(
    '/products-programs/:id/milestones',
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
    getMilestonesHandler
  );

  // GET /api/business-operations/milestones/:milestoneId - Get specific milestone
  server.get(
    '/milestones/:milestoneId',
    {
      onRequest: [authenticate],
      schema: {
        params: {
          type: 'object',
          properties: { milestoneId: { type: 'string' } },
          required: ['milestoneId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
          401: errorSchema,
          404: errorSchema,
        },
      },
    },
    getMilestoneByIdHandler
  );

  // PUT /api/business-operations/milestones/:milestoneId - Update milestone
  server.put(
    '/milestones/:milestoneId',
    {
      onRequest: [authenticate, requireRoles(['Admin', 'Gov Program Director', 'Gov Program Manager'])],
      schema: {
        params: {
          type: 'object',
          properties: { milestoneId: { type: 'string' } },
          required: ['milestoneId'],
        },
        body: {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 200 },
            description: { type: 'string' },
            targetDate: { type: 'string' },
            status: { type: 'string', enum: ['UPCOMING', 'IN_PROGRESS', 'ACHIEVED', 'MISSED', 'CANCELLED'] },
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
          404: errorSchema,
        },
      },
    },
    updateMilestoneHandler
  );

  // DELETE /api/business-operations/milestones/:milestoneId - Delete milestone
  server.delete(
    '/milestones/:milestoneId',
    {
      onRequest: [authenticate, requireRoles(['Admin', 'Gov Program Director', 'Gov Program Manager'])],
      schema: {
        params: {
          type: 'object',
          properties: { milestoneId: { type: 'string' } },
          required: ['milestoneId'],
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
    deleteMilestoneHandler
  );

  // PATCH /api/business-operations/milestones/:milestoneId/achieved - Mark milestone achieved
  server.patch(
    '/milestones/:milestoneId/achieved',
    {
      onRequest: [authenticate, requireRoles(['Admin', 'Gov Program Director', 'Gov Program Manager'])],
      schema: {
        params: {
          type: 'object',
          properties: { milestoneId: { type: 'string' } },
          required: ['milestoneId'],
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
          404: errorSchema,
        },
      },
    },
    markMilestoneAchievedHandler
  );

  // Knowledge Link Management Routes (Story 4.3)

  // POST /api/business-operations/products-programs/:id/knowledge-links - Create knowledge link
  server.post(
    '/products-programs/:id/knowledge-links',
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
          required: ['knowledgeItemId'],
          properties: {
            knowledgeItemId: { type: 'string', minLength: 1, maxLength: 255 },
            linkType: { type: 'string', maxLength: 50 },
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
          404: errorSchema,
          409: errorSchema,
        },
      },
    },
    createKnowledgeLinkHandler
  );

  // GET /api/business-operations/products-programs/:id/knowledge-links - Get all knowledge links
  server.get(
    '/products-programs/:id/knowledge-links',
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
    getKnowledgeLinksHandler
  );

  // GET /api/business-operations/knowledge-links/search - Search by knowledge item ID
  server.get(
    '/knowledge-links/search',
    {
      onRequest: [authenticate],
      schema: {
        querystring: {
          type: 'object',
          required: ['knowledgeItemId'],
          properties: {
            knowledgeItemId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'array' },
            },
          },
          400: errorSchema,
          401: errorSchema,
        },
      },
    },
    searchKnowledgeLinksHandler
  );

  // GET /api/business-operations/knowledge-links/:linkId - Get specific knowledge link
  server.get(
    '/knowledge-links/:linkId',
    {
      onRequest: [authenticate],
      schema: {
        params: {
          type: 'object',
          properties: { linkId: { type: 'string' } },
          required: ['linkId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
          401: errorSchema,
          404: errorSchema,
        },
      },
    },
    getKnowledgeLinkByIdHandler
  );

  // PUT /api/business-operations/knowledge-links/:linkId - Update knowledge link
  server.put(
    '/knowledge-links/:linkId',
    {
      onRequest: [authenticate, requireRoles(['Admin', 'Gov Program Director', 'Gov Program Manager'])],
      schema: {
        params: {
          type: 'object',
          properties: { linkId: { type: 'string' } },
          required: ['linkId'],
        },
        body: {
          type: 'object',
          properties: {
            linkType: { type: 'string', maxLength: 50 },
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
          404: errorSchema,
        },
      },
    },
    updateKnowledgeLinkHandler
  );

  // DELETE /api/business-operations/knowledge-links/:linkId - Delete knowledge link
  server.delete(
    '/knowledge-links/:linkId',
    {
      onRequest: [authenticate, requireRoles(['Admin', 'Gov Program Director', 'Gov Program Manager'])],
      schema: {
        params: {
          type: 'object',
          properties: { linkId: { type: 'string' } },
          required: ['linkId'],
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
    deleteKnowledgeLinkHandler
  );
}

export default productProgramRoutes;

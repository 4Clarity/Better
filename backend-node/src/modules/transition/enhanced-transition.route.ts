import { FastifyInstance } from 'fastify';
import {
  createEnhancedTransitionHandler,
  getEnhancedTransitionsHandler,
  getEnhancedTransitionByIdHandler,
  updateEnhancedTransitionHandler,
  deleteEnhancedTransitionHandler,
  createMilestoneHandler,
  updateMilestoneStatusHandler,
  getLegacyTransitionsHandler,
  createMajorTransitionHandler,
  createPersonnelTransitionHandler,
  createOperationalChangeHandler,
  getMajorTransitionsHandler,
  getPersonnelTransitionsHandler,
  getOperationalChangesHandler,
  getTransitionCountsHandler,
} from './enhanced-transition.controller';

const errorSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'number' },
    error: { type: 'string' },
    message: { type: 'string' },
  },
};

const transitionResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    contractId: { type: ['string', 'null'] },
    name: { type: ['string', 'null'] },
    description: { type: ['string', 'null'] },
    startDate: { type: 'string' },
    endDate: { type: 'string' },
    duration: { type: 'string' },
    keyPersonnel: { type: ['string', 'null'] },
    status: { type: 'string' },
    requiresContinuousService: { type: 'boolean' },
    createdBy: { type: ['string', 'null'] },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
    contract: {
      type: ['object', 'null'],
      properties: {
        id: { type: 'string' },
        contractName: { type: 'string' },
        contractNumber: { type: 'string' },
        contractorName: { type: 'string' },
        status: { type: 'string' },
        businessOperation: {
          type: ['object', 'null'],
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            businessFunction: { type: 'string' },
          },
        },
      },
    },
    creator: {
      type: ['object', 'null'],
      properties: {
        id: { type: 'string' },
        person: {
          type: ['object', 'null'],
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            primaryEmail: { type: 'string' },
          },
        },
      },
    },
    milestones: {
      type: ['array', 'null'],
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          status: { type: 'string' },
          dueDate: { type: 'string' },
          priority: { type: 'string' },
        },
      },
    },
    _count: {
      type: ['object', 'null'],
      properties: {
        milestones: { type: 'number' },
      },
    },
  },
};

const milestoneResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    description: { type: ['string', 'null'] },
    dueDate: { type: 'string' },
    priority: { type: 'string' },
    status: { type: 'string' },
    transitionId: { type: 'string' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
};

async function enhancedTransitionRoutes(server: FastifyInstance) {
  // POST /api/enhanced-transitions - Create new enhanced transition
  server.post(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          required: ['contractName', 'contractNumber', 'name', 'startDate', 'endDate'],
          properties: {
            contractName: { type: 'string', minLength: 1, maxLength: 255 },
            contractNumber: { type: 'string', minLength: 1, maxLength: 100 },
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string' },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            duration: { 
              type: 'string', 
              enum: ['IMMEDIATE', 'THIRTY_DAYS', 'FORTY_FIVE_DAYS', 'SIXTY_DAYS', 'NINETY_DAYS'], 
              default: 'THIRTY_DAYS' 
            },
            keyPersonnel: { type: 'string' },
            status: { 
              type: 'string', 
              enum: ['NOT_STARTED', 'ON_TRACK', 'AT_RISK', 'BLOCKED', 'COMPLETED'], 
              default: 'NOT_STARTED' 
            },
            requiresContinuousService: { type: 'boolean', default: true },
          },
        },
        response: {
          201: transitionResponseSchema,
          400: errorSchema,
          404: errorSchema,
        },
      },
    },
    createEnhancedTransitionHandler
  );

  // GET /api/enhanced-transitions - List all enhanced transitions
  server.get(
    '/',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            contractName: { type: 'string' },
            businessOperationId: { type: 'string' },
            search: { type: 'string' },
            status: { type: 'string', enum: ['NOT_STARTED', 'ON_TRACK', 'AT_RISK', 'BLOCKED', 'COMPLETED'] },
            page: { type: 'number', minimum: 1, default: 1 },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 10 },
            sortBy: { type: 'string', enum: ['name', 'startDate', 'endDate', 'status', 'createdAt'], default: 'createdAt' },
            sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: transitionResponseSchema,
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
    getEnhancedTransitionsHandler
  );

  // GET /api/enhanced-transitions/legacy - Get legacy transitions
  server.get(
    '/legacy',
    {
      schema: {
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                contractName: { type: 'string' },
                contractNumber: { type: 'string' },
                startDate: { type: 'string' },
                endDate: { type: 'string' },
                status: { type: 'string' },
                createdAt: { type: 'string' },
                updatedAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
    getLegacyTransitionsHandler
  );

  // GET /api/enhanced-transitions/:id - Get specific enhanced transition
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
          200: transitionResponseSchema,
          404: errorSchema,
        },
      },
    },
    getEnhancedTransitionByIdHandler
  );

  // PUT /api/enhanced-transitions/:id - Update enhanced transition
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
            organizationId: { type: 'string', minLength: 1 },
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string' },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            duration: { 
              type: 'string', 
              enum: ['IMMEDIATE', 'THIRTY_DAYS', 'FORTY_FIVE_DAYS', 'SIXTY_DAYS', 'NINETY_DAYS'] 
            },
            keyPersonnel: { type: 'string' },
            status: { 
              type: 'string', 
              enum: ['NOT_STARTED', 'ON_TRACK', 'AT_RISK', 'BLOCKED', 'COMPLETED'] 
            },
            requiresContinuousService: { type: 'boolean' },
            createdBy: { type: 'string' },
          },
        },
        response: {
          200: transitionResponseSchema,
          400: errorSchema,
          404: errorSchema,
        },
      },
    },
    updateEnhancedTransitionHandler
  );

  // DELETE /api/enhanced-transitions/:id - Delete enhanced transition
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
        },
      },
    },
    deleteEnhancedTransitionHandler
  );

  // POST /api/enhanced-transitions/:transitionId/milestones - Create milestone
  server.post(
    '/:transitionId/milestones',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            transitionId: { type: 'string' },
          },
          required: ['transitionId'],
        },
        body: {
          type: 'object',
          required: ['title', 'dueDate', 'priority'],
          properties: {
            title: { type: 'string', minLength: 1 },
            description: { type: 'string' },
            dueDate: { type: 'string', format: 'date' },
            priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
          },
        },
        response: {
          201: milestoneResponseSchema,
          404: errorSchema,
        },
      },
    },
    createMilestoneHandler
  );

  // PATCH /api/enhanced-transitions/milestones/:id/status - Update milestone status
  server.patch(
    '/milestones/:id/status',
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
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'OVERDUE'] },
          },
        },
        response: {
          200: milestoneResponseSchema,
          404: errorSchema,
        },
      },
    },
    updateMilestoneStatusHandler
  );

  // Level-specific routes
  
  // GET /api/enhanced-transitions/counts - Get transition counts by level
  server.get(
    '/counts',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              major: { type: 'number' },
              personnel: { type: 'number' },
              operational: { type: 'number' },
              total: { type: 'number' },
            },
          },
        },
      },
    },
    getTransitionCountsHandler
  );

  // POST /api/enhanced-transitions/major - Create major transition
  server.post(
    '/major',
    {
      schema: {
        body: {
          type: 'object',
          required: ['contractName', 'contractNumber', 'organizationId', 'name', 'startDate', 'endDate', 'createdBy'],
          properties: {
            contractName: { type: 'string', minLength: 1, maxLength: 255 },
            contractNumber: { type: 'string', minLength: 1, maxLength: 100 },
            organizationId: { type: 'string', minLength: 1 },
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string' },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            duration: { 
              type: 'string', 
              enum: ['IMMEDIATE', 'THIRTY_DAYS', 'FORTY_FIVE_DAYS', 'SIXTY_DAYS', 'NINETY_DAYS'], 
              default: 'THIRTY_DAYS' 
            },
            keyPersonnel: { type: 'string' },
            status: { 
              type: 'string', 
              enum: ['NOT_STARTED', 'ON_TRACK', 'AT_RISK', 'BLOCKED', 'COMPLETED'], 
              default: 'NOT_STARTED' 
            },
            requiresContinuousService: { type: 'boolean', default: true },
            createdBy: { type: 'string' },
            transitionSource: { type: 'string', enum: ['STRATEGIC', 'CONTRACTUAL', 'PERSONNEL', 'COMMUNICATION', 'CHANGE_REQUEST', 'ENHANCEMENT'] },
          },
        },
        response: {
          201: transitionResponseSchema,
          400: errorSchema,
          404: errorSchema,
        },
      },
    },
    createMajorTransitionHandler
  );

  // GET /api/enhanced-transitions/major - Get major transitions
  server.get(
    '/major',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            contractName: { type: 'string' },
            businessOperationId: { type: 'string' },
            search: { type: 'string' },
            status: { type: 'string', enum: ['NOT_STARTED', 'ON_TRACK', 'AT_RISK', 'BLOCKED', 'COMPLETED'] },
            transitionSource: { type: 'string', enum: ['STRATEGIC', 'CONTRACTUAL', 'PERSONNEL', 'COMMUNICATION', 'CHANGE_REQUEST', 'ENHANCEMENT'] },
            page: { type: 'number', minimum: 1, default: 1 },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 10 },
            sortBy: { type: 'string', enum: ['name', 'startDate', 'endDate', 'status', 'createdAt'], default: 'createdAt' },
            sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: transitionResponseSchema,
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
    getMajorTransitionsHandler
  );

  // POST /api/enhanced-transitions/personnel - Create personnel transition
  server.post(
    '/personnel',
    {
      schema: {
        body: {
          type: 'object',
          required: ['contractName', 'contractNumber', 'organizationId', 'name', 'startDate', 'endDate', 'createdBy'],
          properties: {
            contractName: { type: 'string', minLength: 1, maxLength: 255 },
            contractNumber: { type: 'string', minLength: 1, maxLength: 100 },
            organizationId: { type: 'string', minLength: 1 },
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string' },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            duration: { 
              type: 'string', 
              enum: ['IMMEDIATE', 'THIRTY_DAYS', 'FORTY_FIVE_DAYS', 'SIXTY_DAYS', 'NINETY_DAYS'], 
              default: 'THIRTY_DAYS' 
            },
            keyPersonnel: { type: 'string' },
            status: { 
              type: 'string', 
              enum: ['NOT_STARTED', 'ON_TRACK', 'AT_RISK', 'BLOCKED', 'COMPLETED'], 
              default: 'NOT_STARTED' 
            },
            requiresContinuousService: { type: 'boolean', default: true },
            createdBy: { type: 'string' },
            transitionSource: { type: 'string', enum: ['STRATEGIC', 'CONTRACTUAL', 'PERSONNEL', 'COMMUNICATION', 'CHANGE_REQUEST', 'ENHANCEMENT'] },
          },
        },
        response: {
          201: transitionResponseSchema,
          400: errorSchema,
          404: errorSchema,
        },
      },
    },
    createPersonnelTransitionHandler
  );

  // GET /api/enhanced-transitions/personnel - Get personnel transitions
  server.get(
    '/personnel',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            contractName: { type: 'string' },
            businessOperationId: { type: 'string' },
            search: { type: 'string' },
            status: { type: 'string', enum: ['NOT_STARTED', 'ON_TRACK', 'AT_RISK', 'BLOCKED', 'COMPLETED'] },
            transitionSource: { type: 'string', enum: ['STRATEGIC', 'CONTRACTUAL', 'PERSONNEL', 'COMMUNICATION', 'CHANGE_REQUEST', 'ENHANCEMENT'] },
            page: { type: 'number', minimum: 1, default: 1 },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 10 },
            sortBy: { type: 'string', enum: ['name', 'startDate', 'endDate', 'status', 'createdAt'], default: 'createdAt' },
            sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: transitionResponseSchema,
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
    getPersonnelTransitionsHandler
  );

  // POST /api/enhanced-transitions/operational - Create operational change
  server.post(
    '/operational',
    {
      schema: {
        body: {
          type: 'object',
          required: ['contractName', 'contractNumber', 'organizationId', 'name', 'startDate', 'endDate', 'createdBy'],
          properties: {
            contractName: { type: 'string', minLength: 1, maxLength: 255 },
            contractNumber: { type: 'string', minLength: 1, maxLength: 100 },
            organizationId: { type: 'string', minLength: 1 },
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string' },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            duration: { 
              type: 'string', 
              enum: ['IMMEDIATE', 'THIRTY_DAYS', 'FORTY_FIVE_DAYS', 'SIXTY_DAYS', 'NINETY_DAYS'], 
              default: 'THIRTY_DAYS' 
            },
            keyPersonnel: { type: 'string' },
            status: { 
              type: 'string', 
              enum: ['NOT_STARTED', 'ON_TRACK', 'AT_RISK', 'BLOCKED', 'COMPLETED'], 
              default: 'NOT_STARTED' 
            },
            requiresContinuousService: { type: 'boolean', default: true },
            createdBy: { type: 'string' },
            transitionSource: { type: 'string', enum: ['STRATEGIC', 'CONTRACTUAL', 'PERSONNEL', 'COMMUNICATION', 'CHANGE_REQUEST', 'ENHANCEMENT'] },
          },
        },
        response: {
          201: transitionResponseSchema,
          400: errorSchema,
          404: errorSchema,
        },
      },
    },
    createOperationalChangeHandler
  );

  // GET /api/enhanced-transitions/operational - Get operational changes
  server.get(
    '/operational',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            contractName: { type: 'string' },
            businessOperationId: { type: 'string' },
            search: { type: 'string' },
            status: { type: 'string', enum: ['NOT_STARTED', 'ON_TRACK', 'AT_RISK', 'BLOCKED', 'COMPLETED'] },
            transitionSource: { type: 'string', enum: ['STRATEGIC', 'CONTRACTUAL', 'PERSONNEL', 'COMMUNICATION', 'CHANGE_REQUEST', 'ENHANCEMENT'] },
            page: { type: 'number', minimum: 1, default: 1 },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 10 },
            sortBy: { type: 'string', enum: ['name', 'startDate', 'endDate', 'status', 'createdAt'], default: 'createdAt' },
            sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: transitionResponseSchema,
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
    getOperationalChangesHandler
  );
}

export default enhancedTransitionRoutes;
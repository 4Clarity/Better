import { FastifyInstance } from 'fastify';
import {
  createMilestoneHandler,
  getMilestonesHandler,
  getMilestoneByIdHandler,
  updateMilestoneHandler,
  deleteMilestoneHandler,
  bulkDeleteMilestonesHandler,
} from './milestone.controller';
import { $ref } from './milestone.service';

async function milestoneRoutes(server: FastifyInstance) {
  // POST /api/transitions/:transitionId/milestones - Create new milestone (User Story 1.2.1)
  server.post(
    '/',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            transitionId: { type: 'string' },
          },
          required: ['transitionId'],
        },
        body: $ref('createMilestoneSchema'),
        response: {
          201: $ref('milestoneResponseSchema'),
          400: {
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
          404: {
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    createMilestoneHandler
  );

  // GET /api/transitions/:transitionId/milestones - List milestones with filtering (User Story 1.2.2)
  server.get(
    '/',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            transitionId: { type: 'string' },
          },
          required: ['transitionId'],
        },
        querystring: $ref('getMilestonesQuerySchema'),
        response: {
          200: $ref('milestoneListResponseSchema'),
          404: {
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    getMilestonesHandler
  );

  // GET /api/transitions/:transitionId/milestones/:milestoneId - Get specific milestone
  server.get(
    '/:milestoneId',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            transitionId: { type: 'string' },
            milestoneId: { type: 'string' },
          },
          required: ['transitionId', 'milestoneId'],
        },
        response: {
          200: $ref('milestoneResponseSchema'),
          404: {
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    getMilestoneByIdHandler
  );

  // PUT /api/transitions/:transitionId/milestones/:milestoneId - Update milestone (User Story 1.2.3)
  server.put(
    '/:milestoneId',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            transitionId: { type: 'string' },
            milestoneId: { type: 'string' },
          },
          required: ['transitionId', 'milestoneId'],
        },
        body: $ref('updateMilestoneSchema'),
        response: {
          200: $ref('milestoneResponseSchema'),
          400: {
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
          404: {
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    updateMilestoneHandler
  );

  // DELETE /api/transitions/:transitionId/milestones/:milestoneId - Delete milestone (User Story 1.2.4)
  server.delete(
    '/:milestoneId',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            transitionId: { type: 'string' },
            milestoneId: { type: 'string' },
          },
          required: ['transitionId', 'milestoneId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
          404: {
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    deleteMilestoneHandler
  );

  // POST /api/transitions/:transitionId/milestones/bulk-delete - Bulk delete milestones (User Story 1.2.4)
  server.post(
    '/bulk-delete',
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
          properties: {
            milestoneIds: {
              type: 'array',
              items: { type: 'string' },
              minItems: 1,
            },
          },
          required: ['milestoneIds'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
          400: {
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
          404: {
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    bulkDeleteMilestonesHandler
  );
}

export default milestoneRoutes;
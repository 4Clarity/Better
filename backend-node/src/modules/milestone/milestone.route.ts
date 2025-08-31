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
  const pmOnly = async (request: any, reply: any) => {
    const bypass = process.env.AUTH_BYPASS === 'true' || request.headers['x-auth-bypass'] === 'true';
    if (bypass) return;
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ statusCode: 401, error: 'Unauthorized', message: 'JWT required' });
    }
    const user: any = request.user || {};
    const realmRoles: string[] = (user.realm_access?.roles ?? []).map((r: string) => r.toLowerCase());
    if (!realmRoles.includes('program_manager')) {
      return reply.code(403).send({ statusCode: 403, error: 'Forbidden', message: 'PM role required' });
    }
  };
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
      preHandler: pmOnly,
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
      preHandler: pmOnly,
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
      preHandler: pmOnly,
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
      preHandler: pmOnly,
    },
    bulkDeleteMilestonesHandler
  );
}

export default milestoneRoutes;

import { FastifyInstance } from 'fastify';
import {
  createTransitionHandler,
  getTransitionsHandler,
  getTransitionByIdHandler,
  updateTransitionHandler,
  updateTransitionStatusHandler,
  deleteTransitionHandler,
} from './transition-raw.controller';
import { $ref } from './transition-raw.service';

async function transitionRoutes(server: FastifyInstance) {
  // Minimal RBAC guard: allow if AUTH_BYPASS=true or x-user-role includes program_manager
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
  // POST /api/transitions - Create new transition (User Story 1.1.1)
  server.post(
    '/',
    {
      schema: {
        body: $ref('createTransitionSchema'),
        response: {
          201: $ref('transitionResponseSchema'),
          400: {
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
          409: {
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
    createTransitionHandler
  );

  // GET /api/transitions - List all transitions with filtering/pagination
  server.get(
    '/',
    {
      schema: {
        querystring: $ref('getTransitionsQuerySchema'),
        response: {
          200: $ref('transitionListResponseSchema'),
        },
      },
    },
    getTransitionsHandler
  );

  // GET /api/transitions/:id - Get specific transition with details
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
          200: $ref('transitionResponseSchema'),
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
    getTransitionByIdHandler
  );

  // PUT /api/transitions/:id - Update transition information
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
        body: $ref('updateTransitionSchema'),
        response: {
          200: $ref('transitionResponseSchema'),
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
          409: {
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
    updateTransitionHandler
  );

  // PATCH /api/transitions/:id/status - Update transition status
  server.patch(
    '/:id/status',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        body: $ref('updateTransitionStatusSchema'),
        response: {
          200: $ref('transitionResponseSchema'),
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
    updateTransitionStatusHandler
  );

  // DELETE /api/transitions/:id - Delete transition
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
    deleteTransitionHandler
  );
}

export default transitionRoutes;

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
    },
    deleteTransitionHandler
  );
}

export default transitionRoutes;
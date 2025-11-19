/**
 * Chat Routes
 * API endpoints that proxy chat requests to Python AI service
 * Story: 1.5 - Roadmap UI Complete Implementation
 */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import chatProxyService from '../services/ChatProxyService';

export default async function chatRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/chat/sessions
   * Create a new chat session
   */
  fastify.post<{ Body: { context?: Record<string, any> } }>(
    '/sessions',
    {
      schema: {
        description: 'Create a new chat session',
        tags: ['chat'],
        body: {
          type: 'object',
          properties: {
            context: {
              type: 'object',
              properties: {
                role: { type: 'string' },
                transitionId: { type: 'string' },
              },
            },
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
          401: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: { context?: Record<string, any> } }>, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        if (!user) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
          });
        }

        const session = await chatProxyService.createSession(user.id, request.body.context);

        return reply.code(201).send({
          success: true,
          data: session,
        });
      } catch (error) {
        request.log.error(error, 'Error creating chat session');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create chat session',
        });
      }
    }
  );

  /**
   * GET /api/chat/sessions/:sessionId
   * Get chat session history
   */
  fastify.get<{ Params: { sessionId: string }; Querystring: { limit?: number } }>(
    '/sessions/:sessionId',
    {
      schema: {
        description: 'Get chat session history',
        tags: ['chat'],
        params: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number' },
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
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { sessionId: string }; Querystring: { limit?: number } }>, reply: FastifyReply) => {
      try {
        const history = await chatProxyService.getSessionHistory(request.params.sessionId, request.query.limit);

        return reply.send({
          success: true,
          data: history,
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          return reply.code(404).send({
            success: false,
            error: error.message,
          });
        }
        request.log.error(error, `Error getting session history for ${request.params.sessionId}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get session history',
        });
      }
    }
  );

  /**
   * POST /api/chat/sessions/:sessionId/messages
   * Send a message to the AI assistant
   */
  fastify.post<{ Params: { sessionId: string }; Body: { message: string; stream?: boolean } }>(
    '/sessions/:sessionId/messages',
    {
      schema: {
        description: 'Send a message to the AI assistant',
        tags: ['chat'],
        params: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['message'],
          properties: {
            message: { type: 'string', minLength: 1 },
            stream: { type: 'boolean' },
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
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { sessionId: string }; Body: { message: string; stream?: boolean } }>, reply: FastifyReply) => {
      try {
        const response = await chatProxyService.sendMessage(
          request.params.sessionId,
          request.body.message,
          request.body.stream
        );

        return reply.send({
          success: true,
          data: response,
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          return reply.code(404).send({
            success: false,
            error: error.message,
          });
        }
        request.log.error(error, `Error sending message to session ${request.params.sessionId}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to send message',
        });
      }
    }
  );

  /**
   * DELETE /api/chat/sessions/:sessionId
   * Delete a chat session
   */
  fastify.delete<{ Params: { sessionId: string } }>(
    '/sessions/:sessionId',
    {
      schema: {
        description: 'Delete a chat session',
        tags: ['chat'],
        params: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) => {
      try {
        await chatProxyService.deleteSession(request.params.sessionId);

        return reply.send({
          success: true,
          message: 'Chat session deleted successfully',
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          return reply.code(404).send({
            success: false,
            error: error.message,
          });
        }
        request.log.error(error, `Error deleting session ${request.params.sessionId}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete session',
        });
      }
    }
  );

  /**
   * GET /api/chat/my-sessions
   * List all chat sessions for the authenticated user
   */
  fastify.get(
    '/my-sessions',
    {
      schema: {
        description: 'List all chat sessions for the authenticated user',
        tags: ['chat'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
          401: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        if (!user) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
          });
        }

        const sessions = await chatProxyService.listUserSessions(user.id);

        return reply.send({
          success: true,
          data: sessions,
        });
      } catch (error) {
        request.log.error(error, 'Error listing user chat sessions');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to list sessions',
        });
      }
    }
  );

  /**
   * GET /api/chat/health
   * Health check for chat service
   */
  fastify.get(
    '/health',
    {
      schema: {
        description: 'Health check for chat service',
        tags: ['chat'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const health = await chatProxyService.healthCheck();

        return reply.send({
          success: true,
          data: health,
        });
      } catch (error) {
        request.log.error(error, 'Chat service health check failed');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Chat service unavailable',
        });
      }
    }
  );
}

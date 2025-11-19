/**
 * Handover Checklist Routes
 * API endpoints for managing handover checklist items and tracking completion
 * Story: 1.5 - Roadmap UI Complete Implementation
 */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import handoverChecklistService from '../services/HandoverChecklistService';

export default async function handoverChecklistRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/handover-checklist/transition/:transitionId
   * Get all checklist items for a transition
   */
  fastify.get<{ Params: { transitionId: string } }>(
    '/transition/:transitionId',
    {
      schema: {
        description: 'Get all checklist items for a transition',
        tags: ['handover-checklist'],
        params: {
          type: 'object',
          properties: {
            transitionId: { type: 'string' },
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
        },
      },
    },
    async (request: FastifyRequest<{ Params: { transitionId: string } }>, reply: FastifyReply) => {
      try {
        const items = await handoverChecklistService.getChecklistByTransition(request.params.transitionId);
        return reply.send({
          success: true,
          data: items,
        });
      } catch (error) {
        request.log.error(error, `Error fetching checklist for transition ${request.params.transitionId}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch checklist',
        });
      }
    }
  );

  /**
   * GET /api/handover-checklist/user/:userId
   * Get all checklist items for a user
   */
  fastify.get<{ Params: { userId: string } }>(
    '/user/:userId',
    {
      schema: {
        description: 'Get all checklist items for a user',
        tags: ['handover-checklist'],
        params: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
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
        },
      },
    },
    async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
      try {
        const items = await handoverChecklistService.getChecklistByUser(request.params.userId);
        return reply.send({
          success: true,
          data: items,
        });
      } catch (error) {
        request.log.error(error, `Error fetching checklist for user ${request.params.userId}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch checklist',
        });
      }
    }
  );

  /**
   * GET /api/handover-checklist/transition/:transitionId/user/:userId
   * Get checklist items for a user in a specific transition
   */
  fastify.get<{ Params: { transitionId: string; userId: string } }>(
    '/transition/:transitionId/user/:userId',
    {
      schema: {
        description: 'Get checklist items for a user in a specific transition',
        tags: ['handover-checklist'],
        params: {
          type: 'object',
          properties: {
            transitionId: { type: 'string' },
            userId: { type: 'string' },
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
        },
      },
    },
    async (request: FastifyRequest<{ Params: { transitionId: string; userId: string } }>, reply: FastifyReply) => {
      try {
        const items = await handoverChecklistService.getChecklistByTransitionAndUser(
          request.params.transitionId,
          request.params.userId
        );
        return reply.send({
          success: true,
          data: items,
        });
      } catch (error) {
        request.log.error(
          error,
          `Error fetching checklist for transition ${request.params.transitionId} and user ${request.params.userId}`
        );
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch checklist',
        });
      }
    }
  );

  /**
   * GET /api/handover-checklist/my-checklist
   * Get checklist items for the authenticated user
   */
  fastify.get(
    '/my-checklist',
    {
      schema: {
        description: 'Get checklist items for the authenticated user',
        tags: ['handover-checklist'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'array' },
            },
          },
          401: {
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

        const items = await handoverChecklistService.getChecklistByUser(user.id);
        return reply.send({
          success: true,
          data: items,
        });
      } catch (error) {
        request.log.error(error, 'Error fetching user checklist');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch checklist',
        });
      }
    }
  );

  /**
   * GET /api/handover-checklist/:itemId
   * Get a specific checklist item by ID
   */
  fastify.get<{ Params: { itemId: string } }>(
    '/:itemId',
    {
      schema: {
        description: 'Get a specific checklist item by ID',
        tags: ['handover-checklist'],
        params: {
          type: 'object',
          properties: {
            itemId: { type: 'string' },
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
        },
      },
    },
    async (request: FastifyRequest<{ Params: { itemId: string } }>, reply: FastifyReply) => {
      try {
        const item = await handoverChecklistService.getChecklistItemById(request.params.itemId);
        if (!item) {
          return reply.code(404).send({
            success: false,
            error: 'Checklist item not found',
          });
        }
        return reply.send({
          success: true,
          data: item,
        });
      } catch (error) {
        request.log.error(error, `Error fetching checklist item ${request.params.itemId}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch checklist item',
        });
      }
    }
  );

  /**
   * POST /api/handover-checklist
   * Create a new checklist item
   */
  fastify.post<{ Body: any }>(
    '/',
    {
      schema: {
        description: 'Create a new checklist item',
        tags: ['handover-checklist'],
        body: {
          type: 'object',
          required: ['transitionId', 'userId', 'itemText', 'category', 'orderIndex'],
          properties: {
            transitionId: { type: 'string' },
            userId: { type: 'string' },
            itemText: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            orderIndex: { type: 'number' },
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
        },
      },
    },
    async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        if (!user) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
          });
        }

        const item = await handoverChecklistService.createChecklistItem(request.body);
        return reply.code(201).send({
          success: true,
          data: item,
        });
      } catch (error) {
        request.log.error(error, 'Error creating checklist item');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create checklist item',
        });
      }
    }
  );

  /**
   * POST /api/handover-checklist/bulk
   * Create multiple checklist items
   */
  fastify.post<{ Body: { items: any[] } }>(
    '/bulk',
    {
      schema: {
        description: 'Create multiple checklist items',
        tags: ['handover-checklist'],
        body: {
          type: 'object',
          required: ['items'],
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                required: ['transitionId', 'userId', 'itemText', 'category', 'orderIndex'],
                properties: {
                  transitionId: { type: 'string' },
                  userId: { type: 'string' },
                  itemText: { type: 'string' },
                  description: { type: 'string' },
                  category: { type: 'string' },
                  orderIndex: { type: 'number' },
                },
              },
            },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'array' },
            },
          },
          401: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: { items: any[] } }>, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        if (!user) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
          });
        }

        const items = await handoverChecklistService.createChecklistItems(request.body.items);
        return reply.code(201).send({
          success: true,
          data: items,
        });
      } catch (error) {
        request.log.error(error, 'Error creating checklist items');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create checklist items',
        });
      }
    }
  );

  /**
   * PATCH /api/handover-checklist/:itemId
   * Update a checklist item
   */
  fastify.patch<{ Params: { itemId: string }; Body: any }>(
    '/:itemId',
    {
      schema: {
        description: 'Update a checklist item',
        tags: ['handover-checklist'],
        params: {
          type: 'object',
          properties: {
            itemId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            itemText: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            orderIndex: { type: 'number' },
            completed: { type: 'boolean' },
            notes: { type: 'string' },
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
          401: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { itemId: string }; Body: any }>, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        if (!user) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
          });
        }

        const item = await handoverChecklistService.updateChecklistItem(request.params.itemId, request.body);
        return reply.send({
          success: true,
          data: item,
        });
      } catch (error) {
        request.log.error(error, `Error updating checklist item ${request.params.itemId}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update checklist item',
        });
      }
    }
  );

  /**
   * POST /api/handover-checklist/:itemId/complete
   * Mark a checklist item as completed
   */
  fastify.post<{ Params: { itemId: string }; Body: { notes?: string } }>(
    '/:itemId/complete',
    {
      schema: {
        description: 'Mark a checklist item as completed',
        tags: ['handover-checklist'],
        params: {
          type: 'object',
          properties: {
            itemId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            notes: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
              message: { type: 'string' },
            },
          },
          401: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { itemId: string }; Body: { notes?: string } }>, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        if (!user) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
          });
        }

        const item = await handoverChecklistService.completeChecklistItem(
          request.params.itemId,
          user.id,
          request.body.notes
        );

        return reply.send({
          success: true,
          data: item,
          message: 'Checklist item completed successfully',
        });
      } catch (error) {
        request.log.error(error, `Error completing checklist item ${request.params.itemId}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to complete checklist item',
        });
      }
    }
  );

  /**
   * POST /api/handover-checklist/:itemId/verify
   * Verify a checklist item (supervisor/PM)
   */
  fastify.post<{ Params: { itemId: string }; Body: { notes?: string } }>(
    '/:itemId/verify',
    {
      schema: {
        description: 'Verify a completed checklist item',
        tags: ['handover-checklist'],
        params: {
          type: 'object',
          properties: {
            itemId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            notes: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
              message: { type: 'string' },
            },
          },
          401: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { itemId: string }; Body: { notes?: string } }>, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        if (!user) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
          });
        }

        const item = await handoverChecklistService.verifyChecklistItem(
          request.params.itemId,
          user.id,
          request.body.notes
        );

        return reply.send({
          success: true,
          data: item,
          message: 'Checklist item verified successfully',
        });
      } catch (error) {
        request.log.error(error, `Error verifying checklist item ${request.params.itemId}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to verify checklist item',
        });
      }
    }
  );

  /**
   * DELETE /api/handover-checklist/:itemId
   * Delete a checklist item
   */
  fastify.delete<{ Params: { itemId: string } }>(
    '/:itemId',
    {
      schema: {
        description: 'Delete a checklist item',
        tags: ['handover-checklist'],
        params: {
          type: 'object',
          properties: {
            itemId: { type: 'string' },
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
          401: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { itemId: string } }>, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        if (!user) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
          });
        }

        await handoverChecklistService.deleteChecklistItem(request.params.itemId);
        return reply.send({
          success: true,
          message: 'Checklist item deleted successfully',
        });
      } catch (error) {
        request.log.error(error, `Error deleting checklist item ${request.params.itemId}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete checklist item',
        });
      }
    }
  );

  /**
   * GET /api/handover-checklist/summary/:transitionId
   * Get checklist completion summary for a transition
   */
  fastify.get<{ Params: { transitionId: string }; Querystring: { userId?: string } }>(
    '/summary/:transitionId',
    {
      schema: {
        description: 'Get checklist completion summary for a transition',
        tags: ['handover-checklist'],
        params: {
          type: 'object',
          properties: {
            transitionId: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
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
        },
      },
    },
    async (request: FastifyRequest<{ Params: { transitionId: string }; Querystring: { userId?: string } }>, reply: FastifyReply) => {
      try {
        const summary = await handoverChecklistService.getChecklistSummary(
          request.params.transitionId,
          request.query.userId
        );
        return reply.send({
          success: true,
          data: summary,
        });
      } catch (error) {
        request.log.error(error, `Error fetching checklist summary for transition ${request.params.transitionId}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch checklist summary',
        });
      }
    }
  );

  /**
   * POST /api/handover-checklist/initialize/:transitionId
   * Initialize standard checklist template for a transition
   */
  fastify.post<{ Params: { transitionId: string }; Body: { userId: string } }>(
    '/initialize/:transitionId',
    {
      schema: {
        description: 'Initialize standard checklist template for a transition',
        tags: ['handover-checklist'],
        params: {
          type: 'object',
          properties: {
            transitionId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'array' },
              message: { type: 'string' },
            },
          },
          401: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { transitionId: string }; Body: { userId: string } }>, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        if (!user) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
          });
        }

        const items = await handoverChecklistService.initializeStandardChecklist(
          request.params.transitionId,
          request.body.userId
        );

        return reply.code(201).send({
          success: true,
          data: items,
          message: 'Standard checklist initialized successfully',
        });
      } catch (error) {
        request.log.error(error, `Error initializing checklist for transition ${request.params.transitionId}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to initialize checklist',
        });
      }
    }
  );
}

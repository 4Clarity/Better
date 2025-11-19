/**
 * Activity Log Routes
 * API endpoints for activity logging and audit trail management
 * Story: 1.5 - Roadmap UI Complete Implementation
 */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import activityLogService from '../services/ActivityLogService';

export default async function activityLogRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/activity-logs
   * Create a new activity log entry
   */
  fastify.post<{ Body: any }>(
    '/',
    {
      schema: {
        description: 'Create a new activity log entry',
        tags: ['activity-logs'],
        body: {
          type: 'object',
          required: ['userId', 'activityType', 'description'],
          properties: {
            userId: { type: 'string' },
            transitionId: { type: 'string' },
            activityType: { type: 'string' },
            description: { type: 'string' },
            metadata: { type: 'object' },
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

        const log = await activityLogService.logActivity(request.body);
        return reply.code(201).send({
          success: true,
          data: log,
        });
      } catch (error) {
        request.log.error(error, 'Error creating activity log');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create activity log',
        });
      }
    }
  );

  /**
   * GET /api/activity-logs
   * Get activity logs with filters
   */
  fastify.get<{
    Querystring: {
      userId?: string;
      transitionId?: string;
      activityType?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    };
  }>(
    '/',
    {
      schema: {
        description: 'Get activity logs with optional filters',
        tags: ['activity-logs'],
        querystring: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            transitionId: { type: 'string' },
            activityType: { type: 'string' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            limit: { type: 'number', minimum: 1, maximum: 1000 },
            offset: { type: 'number', minimum: 0 },
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
    async (
      request: FastifyRequest<{
        Querystring: {
          userId?: string;
          transitionId?: string;
          activityType?: string;
          startDate?: string;
          endDate?: string;
          limit?: number;
          offset?: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const filters: any = {};
        if (request.query.userId) filters.userId = request.query.userId;
        if (request.query.transitionId) filters.transitionId = request.query.transitionId;
        if (request.query.activityType) filters.activityType = request.query.activityType;
        if (request.query.startDate) filters.startDate = new Date(request.query.startDate);
        if (request.query.endDate) filters.endDate = new Date(request.query.endDate);
        if (request.query.limit) filters.limit = request.query.limit;
        if (request.query.offset) filters.offset = request.query.offset;

        const logs = await activityLogService.getActivityLogs(filters);
        return reply.send({
          success: true,
          data: logs,
        });
      } catch (error) {
        request.log.error(error, 'Error fetching activity logs');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch activity logs',
        });
      }
    }
  );

  /**
   * GET /api/activity-logs/my-activities
   * Get activity logs for the authenticated user
   */
  fastify.get<{ Querystring: { limit?: number } }>(
    '/my-activities',
    {
      schema: {
        description: 'Get activity logs for the authenticated user',
        tags: ['activity-logs'],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', minimum: 1, maximum: 500 },
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
    async (request: FastifyRequest<{ Querystring: { limit?: number } }>, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        if (!user) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
          });
        }

        const logs = await activityLogService.getUserActivityLogs(user.id, request.query.limit);
        return reply.send({
          success: true,
          data: logs,
        });
      } catch (error) {
        request.log.error(error, 'Error fetching user activity logs');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch activity logs',
        });
      }
    }
  );

  /**
   * GET /api/activity-logs/user/:userId
   * Get activity logs for a specific user
   */
  fastify.get<{ Params: { userId: string }; Querystring: { limit?: number } }>(
    '/user/:userId',
    {
      schema: {
        description: 'Get activity logs for a specific user',
        tags: ['activity-logs'],
        params: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', minimum: 1, maximum: 500 },
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
    async (request: FastifyRequest<{ Params: { userId: string }; Querystring: { limit?: number } }>, reply: FastifyReply) => {
      try {
        const logs = await activityLogService.getUserActivityLogs(request.params.userId, request.query.limit);
        return reply.send({
          success: true,
          data: logs,
        });
      } catch (error) {
        request.log.error(error, `Error fetching activity logs for user ${request.params.userId}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch activity logs',
        });
      }
    }
  );

  /**
   * GET /api/activity-logs/transition/:transitionId
   * Get activity logs for a specific transition
   */
  fastify.get<{ Params: { transitionId: string }; Querystring: { limit?: number } }>(
    '/transition/:transitionId',
    {
      schema: {
        description: 'Get activity logs for a specific transition',
        tags: ['activity-logs'],
        params: {
          type: 'object',
          properties: {
            transitionId: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', minimum: 1, maximum: 500 },
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
    async (request: FastifyRequest<{ Params: { transitionId: string }; Querystring: { limit?: number } }>, reply: FastifyReply) => {
      try {
        const logs = await activityLogService.getTransitionActivityLogs(request.params.transitionId, request.query.limit);
        return reply.send({
          success: true,
          data: logs,
        });
      } catch (error) {
        request.log.error(error, `Error fetching activity logs for transition ${request.params.transitionId}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch activity logs',
        });
      }
    }
  );

  /**
   * GET /api/activity-logs/timeline/my-timeline
   * Get activity timeline for the authenticated user
   */
  fastify.get<{ Querystring: { limit?: number } }>(
    '/timeline/my-timeline',
    {
      schema: {
        description: 'Get activity timeline for the authenticated user',
        tags: ['activity-logs'],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', minimum: 1, maximum: 500 },
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
    async (request: FastifyRequest<{ Querystring: { limit?: number } }>, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        if (!user) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
          });
        }

        const timeline = await activityLogService.getUserActivityTimeline(user.id, request.query.limit);
        return reply.send({
          success: true,
          data: timeline,
        });
      } catch (error) {
        request.log.error(error, 'Error fetching user activity timeline');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch activity timeline',
        });
      }
    }
  );

  /**
   * GET /api/activity-logs/timeline/transition/:transitionId
   * Get activity timeline for a specific transition
   */
  fastify.get<{ Params: { transitionId: string }; Querystring: { limit?: number } }>(
    '/timeline/transition/:transitionId',
    {
      schema: {
        description: 'Get activity timeline for a specific transition',
        tags: ['activity-logs'],
        params: {
          type: 'object',
          properties: {
            transitionId: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', minimum: 1, maximum: 500 },
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
    async (request: FastifyRequest<{ Params: { transitionId: string }; Querystring: { limit?: number } }>, reply: FastifyReply) => {
      try {
        const timeline = await activityLogService.getTransitionActivityTimeline(
          request.params.transitionId,
          request.query.limit
        );
        return reply.send({
          success: true,
          data: timeline,
        });
      } catch (error) {
        request.log.error(error, `Error fetching transition activity timeline for ${request.params.transitionId}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch activity timeline',
        });
      }
    }
  );

  /**
   * GET /api/activity-logs/stats/my-stats
   * Get activity statistics for the authenticated user
   */
  fastify.get<{ Querystring: { startDate?: string; endDate?: string } }>(
    '/stats/my-stats',
    {
      schema: {
        description: 'Get activity statistics for the authenticated user',
        tags: ['activity-logs'],
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
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
    async (request: FastifyRequest<{ Querystring: { startDate?: string; endDate?: string } }>, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        if (!user) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
          });
        }

        const startDate = request.query.startDate ? new Date(request.query.startDate) : undefined;
        const endDate = request.query.endDate ? new Date(request.query.endDate) : undefined;

        const stats = await activityLogService.getUserActivityStats(user.id, startDate, endDate);
        return reply.send({
          success: true,
          data: stats,
        });
      } catch (error) {
        request.log.error(error, 'Error fetching user activity stats');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch activity stats',
        });
      }
    }
  );

  /**
   * GET /api/activity-logs/stats/transition/:transitionId
   * Get activity statistics for a specific transition
   */
  fastify.get<{ Params: { transitionId: string }; Querystring: { startDate?: string; endDate?: string } }>(
    '/stats/transition/:transitionId',
    {
      schema: {
        description: 'Get activity statistics for a specific transition',
        tags: ['activity-logs'],
        params: {
          type: 'object',
          properties: {
            transitionId: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
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
    async (
      request: FastifyRequest<{ Params: { transitionId: string }; Querystring: { startDate?: string; endDate?: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const startDate = request.query.startDate ? new Date(request.query.startDate) : undefined;
        const endDate = request.query.endDate ? new Date(request.query.endDate) : undefined;

        const stats = await activityLogService.getTransitionActivityStats(request.params.transitionId, startDate, endDate);
        return reply.send({
          success: true,
          data: stats,
        });
      } catch (error) {
        request.log.error(error, `Error fetching activity stats for transition ${request.params.transitionId}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch activity stats',
        });
      }
    }
  );

  /**
   * GET /api/activity-logs/:logId
   * Get a specific activity log by ID
   */
  fastify.get<{ Params: { logId: string } }>(
    '/:logId',
    {
      schema: {
        description: 'Get a specific activity log by ID',
        tags: ['activity-logs'],
        params: {
          type: 'object',
          properties: {
            logId: { type: 'string' },
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
    async (request: FastifyRequest<{ Params: { logId: string } }>, reply: FastifyReply) => {
      try {
        const log = await activityLogService.getActivityLogById(request.params.logId);
        if (!log) {
          return reply.code(404).send({
            success: false,
            error: 'Activity log not found',
          });
        }
        return reply.send({
          success: true,
          data: log,
        });
      } catch (error) {
        request.log.error(error, `Error fetching activity log ${request.params.logId}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch activity log',
        });
      }
    }
  );
}

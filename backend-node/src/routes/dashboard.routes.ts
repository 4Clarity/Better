/**
 * Dashboard Routes
 * API endpoints for role-specific dashboard data
 * Story: 1.5 - Roadmap UI Complete Implementation
 */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import dashboardService from '../services/DashboardService';
import { authenticate } from '../modules/auth/auth.middleware';

export interface DashboardParams {
  role?: string;
}

export default async function dashboardRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/dashboard/government-pm
   * Get Government PM dashboard data
   */
  fastify.get(
    '/government-pm',
    {
      onRequest: [authenticate],
      schema: {
        description: 'Get Government PM dashboard data with platform setup, curation queue, and transition roadmap',
        tags: ['dashboard'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  metrics: {
                    type: 'object',
                    properties: {
                      activeTransitions: { type: 'number' },
                      pendingReviews: { type: 'number' },
                      knowledgeArticles: { type: 'number' },
                      onTrackRate: { type: 'number' },
                    },
                  },
                  platformSetup: { type: 'array' },
                  curationQueue: { type: 'array' },
                  transitionRoadmap: { type: 'object' },
                },
              },
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
        // Get user from request (set by auth middleware)
        const user = (request as any).user;
        if (!user) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
          });
        }

        const data = await dashboardService.getGovernmentPMDashboardData(user.id);
        return reply.send({
          success: true,
          data,
        });
      } catch (error) {
        request.log.error(error, 'Error fetching Government PM dashboard data');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch dashboard data',
        });
      }
    }
  );

  /**
   * GET /api/dashboard/outgoing-contractor
   * Get Outgoing Contractor dashboard data
   */
  fastify.get(
    '/outgoing-contractor',
    {
      onRequest: [authenticate],
      schema: {
        description: 'Get Outgoing Contractor dashboard data with handover progress and verification checklist',
        tags: ['dashboard'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  metrics: {
                    type: 'object',
                    properties: {
                      documentsUploaded: { type: 'number' },
                      trainingSessions: { type: 'number' },
                      handoverComplete: { type: 'number' },
                      daysRemaining: { type: 'number' },
                    },
                  },
                  handoverTimeline: { type: 'array' },
                  activityLog: { type: 'array' },
                  verificationChecklist: { type: 'array' },
                },
              },
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

        const data = await dashboardService.getOutgoingContractorDashboardData(user.id);
        return reply.send({
          success: true,
          data,
        });
      } catch (error) {
        request.log.error(error, 'Error fetching Outgoing Contractor dashboard data');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch dashboard data',
        });
      }
    }
  );

  /**
   * GET /api/dashboard/incoming-contractor
   * Get Incoming Contractor dashboard data
   */
  fastify.get(
    '/incoming-contractor',
    {
      onRequest: [authenticate],
      schema: {
        description: 'Get Incoming Contractor dashboard data with learning progress and skills tracking',
        tags: ['dashboard'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  metrics: {
                    type: 'object',
                    properties: {
                      overallProgress: { type: 'number' },
                      modulesCompleted: { type: 'number' },
                      hoursLogged: { type: 'number' },
                      quizAverage: { type: 'number' },
                    },
                  },
                  learningRoadmap: { type: 'array' },
                  skillsToMaster: { type: 'array' },
                  learningResources: { type: 'array' },
                },
              },
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

        const data = await dashboardService.getIncomingContractorDashboardData(user.id);
        return reply.send({
          success: true,
          data,
        });
      } catch (error) {
        request.log.error(error, 'Error fetching Incoming Contractor dashboard data');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch dashboard data',
        });
      }
    }
  );

  /**
   * GET /api/dashboard/metrics/:role
   * Get metrics for a specific role
   */
  fastify.get<{ Params: { role: string } }>(
    '/metrics/:role',
    {
      onRequest: [authenticate],
      schema: {
        description: 'Get real-time metrics for a specific persona role',
        tags: ['dashboard'],
        params: {
          type: 'object',
          properties: {
            role: { type: 'string', enum: ['government-pm', 'outgoing-contractor', 'incoming-contractor'] },
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
          400: {
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
    async (request: FastifyRequest<{ Params: { role: string } }>, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        if (!user) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
          });
        }

        const { role } = request.params;
        if (!['government-pm', 'outgoing-contractor', 'incoming-contractor'].includes(role)) {
          return reply.code(400).send({
            success: false,
            error: 'Invalid role. Must be one of: government-pm, outgoing-contractor, incoming-contractor',
          });
        }

        const metrics = await dashboardService.getMetricsByRole(role, user.id);
        return reply.send({
          success: true,
          data: metrics,
        });
      } catch (error) {
        request.log.error(error, `Error fetching metrics for role: ${request.params.role}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch metrics',
        });
      }
    }
  );
}

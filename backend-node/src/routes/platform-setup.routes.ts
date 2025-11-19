/**
 * Platform Setup Routes
 * API endpoints for Government PM platform initialization wizard
 * Story: 1.5 - Roadmap UI Complete Implementation
 */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import platformSetupService from '../services/PlatformSetupService';

export default async function platformSetupRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/platform/setup-status
   * Get all platform setup steps
   */
  fastify.get(
    '/setup-status',
    {
      schema: {
        description: 'Get all platform setup steps in order',
        tags: ['platform-setup'],
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
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const steps = await platformSetupService.getPlatformSetupStatus();
        return reply.send({
          success: true,
          data: steps,
        });
      } catch (error) {
        request.log.error(error, 'Error fetching platform setup status');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch platform setup status',
        });
      }
    }
  );

  /**
   * GET /api/platform/setup/progress
   * Get platform setup progress summary
   */
  fastify.get(
    '/setup/progress',
    {
      schema: {
        description: 'Get platform setup progress summary',
        tags: ['platform-setup'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  totalSteps: { type: 'number' },
                  completedSteps: { type: 'number' },
                  inProgressSteps: { type: 'number' },
                  notStartedSteps: { type: 'number' },
                  percentComplete: { type: 'number' },
                  currentStep: { type: ['number', 'null'] },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const progress = await platformSetupService.getPlatformSetupProgress();
        return reply.send({
          success: true,
          data: progress,
        });
      } catch (error) {
        request.log.error(error, 'Error fetching platform setup progress');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch platform setup progress',
        });
      }
    }
  );

  /**
   * GET /api/platform/setup/:stepNumber
   * Get a specific platform setup step
   */
  fastify.get<{ Params: { stepNumber: string } }>(
    '/setup/:stepNumber',
    {
      schema: {
        description: 'Get a specific platform setup step by step number',
        tags: ['platform-setup'],
        params: {
          type: 'object',
          properties: {
            stepNumber: { type: 'string' },
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
    async (request: FastifyRequest<{ Params: { stepNumber: string } }>, reply: FastifyReply) => {
      try {
        const stepNumber = parseInt(request.params.stepNumber, 10);
        if (isNaN(stepNumber)) {
          return reply.code(400).send({
            success: false,
            error: 'Invalid step number',
          });
        }

        const step = await platformSetupService.getPlatformSetupStep(stepNumber);
        if (!step) {
          return reply.code(404).send({
            success: false,
            error: `Platform setup step ${stepNumber} not found`,
          });
        }

        return reply.send({
          success: true,
          data: step,
        });
      } catch (error) {
        request.log.error(error, `Error fetching platform setup step ${request.params.stepNumber}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch platform setup step',
        });
      }
    }
  );

  /**
   * PATCH /api/platform/setup/:stepNumber
   * Update platform setup step status
   */
  fastify.patch<{
    Params: { stepNumber: string };
    Body: { status: string; completedBy?: string; metadata?: any };
  }>(
    '/setup/:stepNumber',
    {
      schema: {
        description: 'Update platform setup step status',
        tags: ['platform-setup'],
        params: {
          type: 'object',
          properties: {
            stepNumber: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['not-started', 'in-progress', 'complete'] },
            completedBy: { type: 'string' },
            metadata: { type: 'object' },
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
      request: FastifyRequest<{
        Params: { stepNumber: string };
        Body: { status: string; completedBy?: string; metadata?: any };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const user = (request as any).user;
        if (!user) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
          });
        }

        const stepNumber = parseInt(request.params.stepNumber, 10);
        if (isNaN(stepNumber)) {
          return reply.code(400).send({
            success: false,
            error: 'Invalid step number',
          });
        }

        const updatedStep = await platformSetupService.updatePlatformSetupStep(stepNumber, {
          status: request.body.status as 'not-started' | 'in-progress' | 'complete',
          completedBy: request.body.completedBy || user.id,
          metadata: request.body.metadata,
        });

        return reply.send({
          success: true,
          data: updatedStep,
        });
      } catch (error) {
        request.log.error(error, `Error updating platform setup step ${request.params.stepNumber}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update platform setup step',
        });
      }
    }
  );

  /**
   * POST /api/platform/setup/:stepNumber/complete
   * Mark a platform setup step as complete
   */
  fastify.post<{ Params: { stepNumber: string } }>(
    '/setup/:stepNumber/complete',
    {
      schema: {
        description: 'Mark a platform setup step as complete',
        tags: ['platform-setup'],
        params: {
          type: 'object',
          properties: {
            stepNumber: { type: 'string' },
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
        },
      },
    },
    async (request: FastifyRequest<{ Params: { stepNumber: string } }>, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        if (!user) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
          });
        }

        const stepNumber = parseInt(request.params.stepNumber, 10);
        if (isNaN(stepNumber)) {
          return reply.code(400).send({
            success: false,
            error: 'Invalid step number',
          });
        }

        const completedStep = await platformSetupService.completePlatformSetupStep(stepNumber, user.id);

        return reply.send({
          success: true,
          data: completedStep,
          message: `Platform setup step ${stepNumber} completed successfully`,
        });
      } catch (error) {
        request.log.error(error, `Error completing platform setup step ${request.params.stepNumber}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to complete platform setup step',
        });
      }
    }
  );
}

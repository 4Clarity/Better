/**
 * Learning Path Routes
 * API endpoints for managing learning modules and user progress
 * Story: 1.5 - Roadmap UI Complete Implementation
 */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import learningPathService from '../services/LearningPathService';

export default async function learningPathRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/learning/modules
   * Get all active learning modules
   */
  fastify.get(
    '/modules',
    {
      schema: {
        description: 'Get all active learning modules in order',
        tags: ['learning-path'],
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
        const modules = await learningPathService.getAllModules();
        return reply.send({
          success: true,
          data: modules,
        });
      } catch (error) {
        request.log.error(error, 'Error fetching learning modules');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch learning modules',
        });
      }
    }
  );

  /**
   * GET /api/learning/modules/:moduleId
   * Get a specific learning module
   */
  fastify.get<{ Params: { moduleId: string } }>(
    '/modules/:moduleId',
    {
      schema: {
        description: 'Get a specific learning module by ID',
        tags: ['learning-path'],
        params: {
          type: 'object',
          properties: {
            moduleId: { type: 'string' },
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
    async (request: FastifyRequest<{ Params: { moduleId: string } }>, reply: FastifyReply) => {
      try {
        const module = await learningPathService.getModuleById(request.params.moduleId);
        if (!module) {
          return reply.code(404).send({
            success: false,
            error: 'Learning module not found',
          });
        }
        return reply.send({
          success: true,
          data: module,
        });
      } catch (error) {
        request.log.error(error, `Error fetching learning module ${request.params.moduleId}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch learning module',
        });
      }
    }
  );

  /**
   * POST /api/learning/modules
   * Create a new learning module (admin only)
   */
  fastify.post<{ Body: any }>(
    '/modules',
    {
      schema: {
        description: 'Create a new learning module',
        tags: ['learning-path'],
        body: {
          type: 'object',
          required: ['moduleName', 'orderIndex', 'estimatedMinutes'],
          properties: {
            moduleName: { type: 'string' },
            description: { type: 'string' },
            orderIndex: { type: 'number' },
            estimatedMinutes: { type: 'number' },
            contentUrl: { type: 'string' },
            prerequisites: { type: 'string' },
            isActive: { type: 'boolean' },
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

        const module = await learningPathService.createModule(request.body);
        return reply.code(201).send({
          success: true,
          data: module,
        });
      } catch (error) {
        request.log.error(error, 'Error creating learning module');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create learning module',
        });
      }
    }
  );

  /**
   * PATCH /api/learning/modules/:moduleId
   * Update a learning module (admin only)
   */
  fastify.patch<{ Params: { moduleId: string }; Body: any }>(
    '/modules/:moduleId',
    {
      schema: {
        description: 'Update a learning module',
        tags: ['learning-path'],
        params: {
          type: 'object',
          properties: {
            moduleId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            moduleName: { type: 'string' },
            description: { type: 'string' },
            orderIndex: { type: 'number' },
            estimatedMinutes: { type: 'number' },
            contentUrl: { type: 'string' },
            prerequisites: { type: 'string' },
            isActive: { type: 'boolean' },
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
    async (request: FastifyRequest<{ Params: { moduleId: string }; Body: any }>, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        if (!user) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
          });
        }

        const module = await learningPathService.updateModule(request.params.moduleId, request.body);
        return reply.send({
          success: true,
          data: module,
        });
      } catch (error) {
        request.log.error(error, `Error updating learning module ${request.params.moduleId}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update learning module',
        });
      }
    }
  );

  /**
   * DELETE /api/learning/modules/:moduleId
   * Deactivate a learning module (admin only)
   */
  fastify.delete<{ Params: { moduleId: string } }>(
    '/modules/:moduleId',
    {
      schema: {
        description: 'Deactivate a learning module',
        tags: ['learning-path'],
        params: {
          type: 'object',
          properties: {
            moduleId: { type: 'string' },
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
        },
      },
    },
    async (request: FastifyRequest<{ Params: { moduleId: string } }>, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        if (!user) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
          });
        }

        await learningPathService.deleteModule(request.params.moduleId);
        return reply.send({
          success: true,
          message: 'Learning module deactivated successfully',
        });
      } catch (error) {
        request.log.error(error, `Error deleting learning module ${request.params.moduleId}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete learning module',
        });
      }
    }
  );

  /**
   * GET /api/learning/progress
   * Get user's learning progress for all modules
   */
  fastify.get(
    '/progress',
    {
      schema: {
        description: "Get user's learning progress for all modules",
        tags: ['learning-path'],
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

        const progress = await learningPathService.getUserProgress(user.id);
        return reply.send({
          success: true,
          data: progress,
        });
      } catch (error) {
        request.log.error(error, 'Error fetching user learning progress');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch learning progress',
        });
      }
    }
  );

  /**
   * GET /api/learning/progress/:moduleId
   * Get user's progress for a specific module
   */
  fastify.get<{ Params: { moduleId: string } }>(
    '/progress/:moduleId',
    {
      schema: {
        description: "Get user's progress for a specific module",
        tags: ['learning-path'],
        params: {
          type: 'object',
          properties: {
            moduleId: { type: 'string' },
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
    async (request: FastifyRequest<{ Params: { moduleId: string } }>, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        if (!user) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
          });
        }

        const progress = await learningPathService.getUserModuleProgress(user.id, request.params.moduleId);
        if (!progress) {
          return reply.code(404).send({
            success: false,
            error: 'Progress record not found',
          });
        }

        return reply.send({
          success: true,
          data: progress,
        });
      } catch (error) {
        request.log.error(error, `Error fetching progress for module ${request.params.moduleId}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch module progress',
        });
      }
    }
  );

  /**
   * PUT /api/learning/progress/:moduleId
   * Update user's progress for a module
   */
  fastify.put<{ Params: { moduleId: string }; Body: any }>(
    '/progress/:moduleId',
    {
      schema: {
        description: "Update user's progress for a module",
        tags: ['learning-path'],
        params: {
          type: 'object',
          properties: {
            moduleId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            progressPercentage: { type: 'number', minimum: 0, maximum: 100 },
            timeSpentMinutes: { type: 'number', minimum: 0 },
            quizScore: { type: 'number', minimum: 0, maximum: 100 },
            lastAccessedAt: { type: 'string', format: 'date-time' },
            completedAt: { type: 'string', format: 'date-time' },
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
    async (request: FastifyRequest<{ Params: { moduleId: string }; Body: any }>, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        if (!user) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
          });
        }

        const progress = await learningPathService.updateUserProgress(user.id, request.params.moduleId, request.body);
        return reply.send({
          success: true,
          data: progress,
        });
      } catch (error) {
        request.log.error(error, `Error updating progress for module ${request.params.moduleId}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update progress',
        });
      }
    }
  );

  /**
   * POST /api/learning/progress/:moduleId/complete
   * Mark a module as completed
   */
  fastify.post<{ Params: { moduleId: string }; Body: { quizScore?: number } }>(
    '/progress/:moduleId/complete',
    {
      schema: {
        description: 'Mark a module as completed',
        tags: ['learning-path'],
        params: {
          type: 'object',
          properties: {
            moduleId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            quizScore: { type: 'number', minimum: 0, maximum: 100 },
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
    async (request: FastifyRequest<{ Params: { moduleId: string }; Body: { quizScore?: number } }>, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        if (!user) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
          });
        }

        const progress = await learningPathService.completeModule(
          user.id,
          request.params.moduleId,
          request.body.quizScore
        );

        return reply.send({
          success: true,
          data: progress,
          message: 'Module completed successfully',
        });
      } catch (error) {
        request.log.error(error, `Error completing module ${request.params.moduleId}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to complete module',
        });
      }
    }
  );

  /**
   * GET /api/learning/summary
   * Get learning path summary for user
   */
  fastify.get(
    '/summary',
    {
      schema: {
        description: "Get user's learning path summary with overall progress",
        tags: ['learning-path'],
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
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        if (!user) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
          });
        }

        const summary = await learningPathService.getLearningPathSummary(user.id);
        return reply.send({
          success: true,
          data: summary,
        });
      } catch (error) {
        request.log.error(error, 'Error fetching learning path summary');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch learning summary',
        });
      }
    }
  );
}

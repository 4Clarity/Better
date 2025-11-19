/**
 * Skills Assessment Routes
 * API endpoints for managing skills and user proficiency assessments
 * Story: 1.5 - Roadmap UI Complete Implementation
 */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import skillsAssessmentService from '../services/SkillsAssessmentService';

export default async function skillsAssessmentRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/skills
   * Get all active skills
   */
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get all active skills',
        tags: ['skills-assessment'],
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
        const skills = await skillsAssessmentService.getAllSkills();
        return reply.send({
          success: true,
          data: skills,
        });
      } catch (error) {
        request.log.error(error, 'Error fetching skills');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch skills',
        });
      }
    }
  );

  /**
   * GET /api/skills/categories
   * Get all skill categories
   */
  fastify.get(
    '/categories',
    {
      schema: {
        description: 'Get all unique skill categories',
        tags: ['skills-assessment'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const categories = await skillsAssessmentService.getSkillCategories();
        return reply.send({
          success: true,
          data: categories,
        });
      } catch (error) {
        request.log.error(error, 'Error fetching skill categories');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch skill categories',
        });
      }
    }
  );

  /**
   * GET /api/skills/category/:category
   * Get skills by category
   */
  fastify.get<{ Params: { category: string } }>(
    '/category/:category',
    {
      schema: {
        description: 'Get skills by category',
        tags: ['skills-assessment'],
        params: {
          type: 'object',
          properties: {
            category: { type: 'string' },
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
    async (request: FastifyRequest<{ Params: { category: string } }>, reply: FastifyReply) => {
      try {
        const skills = await skillsAssessmentService.getSkillsByCategory(request.params.category);
        return reply.send({
          success: true,
          data: skills,
        });
      } catch (error) {
        request.log.error(error, `Error fetching skills for category ${request.params.category}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch skills',
        });
      }
    }
  );

  /**
   * GET /api/skills/:skillId
   * Get a specific skill by ID
   */
  fastify.get<{ Params: { skillId: string } }>(
    '/:skillId',
    {
      schema: {
        description: 'Get a specific skill by ID',
        tags: ['skills-assessment'],
        params: {
          type: 'object',
          properties: {
            skillId: { type: 'string' },
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
    async (request: FastifyRequest<{ Params: { skillId: string } }>, reply: FastifyReply) => {
      try {
        const skill = await skillsAssessmentService.getSkillById(request.params.skillId);
        if (!skill) {
          return reply.code(404).send({
            success: false,
            error: 'Skill not found',
          });
        }
        return reply.send({
          success: true,
          data: skill,
        });
      } catch (error) {
        request.log.error(error, `Error fetching skill ${request.params.skillId}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch skill',
        });
      }
    }
  );

  /**
   * POST /api/skills
   * Create a new skill (admin only)
   */
  fastify.post<{ Body: any }>(
    '/',
    {
      schema: {
        description: 'Create a new skill',
        tags: ['skills-assessment'],
        body: {
          type: 'object',
          required: ['skillName', 'category', 'requiredProficiency'],
          properties: {
            skillName: { type: 'string' },
            category: { type: 'string' },
            description: { type: 'string' },
            requiredProficiency: { type: 'number', minimum: 1, maximum: 5 },
            assessmentCriteria: { type: 'string' },
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

        const skill = await skillsAssessmentService.createSkill(request.body);
        return reply.code(201).send({
          success: true,
          data: skill,
        });
      } catch (error) {
        request.log.error(error, 'Error creating skill');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create skill',
        });
      }
    }
  );

  /**
   * PATCH /api/skills/:skillId
   * Update a skill (admin only)
   */
  fastify.patch<{ Params: { skillId: string }; Body: any }>(
    '/:skillId',
    {
      schema: {
        description: 'Update a skill',
        tags: ['skills-assessment'],
        params: {
          type: 'object',
          properties: {
            skillId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            skillName: { type: 'string' },
            category: { type: 'string' },
            description: { type: 'string' },
            requiredProficiency: { type: 'number', minimum: 1, maximum: 5 },
            assessmentCriteria: { type: 'string' },
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
    async (request: FastifyRequest<{ Params: { skillId: string }; Body: any }>, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        if (!user) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
          });
        }

        const skill = await skillsAssessmentService.updateSkill(request.params.skillId, request.body);
        return reply.send({
          success: true,
          data: skill,
        });
      } catch (error) {
        request.log.error(error, `Error updating skill ${request.params.skillId}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update skill',
        });
      }
    }
  );

  /**
   * DELETE /api/skills/:skillId
   * Deactivate a skill (admin only)
   */
  fastify.delete<{ Params: { skillId: string } }>(
    '/:skillId',
    {
      schema: {
        description: 'Deactivate a skill',
        tags: ['skills-assessment'],
        params: {
          type: 'object',
          properties: {
            skillId: { type: 'string' },
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
    async (request: FastifyRequest<{ Params: { skillId: string } }>, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        if (!user) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
          });
        }

        await skillsAssessmentService.deleteSkill(request.params.skillId);
        return reply.send({
          success: true,
          message: 'Skill deactivated successfully',
        });
      } catch (error) {
        request.log.error(error, `Error deleting skill ${request.params.skillId}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete skill',
        });
      }
    }
  );

  /**
   * GET /api/skills/progress/my-progress
   * Get user's skill progress for all skills
   */
  fastify.get(
    '/progress/my-progress',
    {
      schema: {
        description: "Get user's skill progress for all skills",
        tags: ['skills-assessment'],
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

        const progress = await skillsAssessmentService.getUserSkillProgress(user.id);
        return reply.send({
          success: true,
          data: progress,
        });
      } catch (error) {
        request.log.error(error, 'Error fetching user skill progress');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch skill progress',
        });
      }
    }
  );

  /**
   * GET /api/skills/progress/:skillId
   * Get user's progress for a specific skill
   */
  fastify.get<{ Params: { skillId: string } }>(
    '/progress/:skillId',
    {
      schema: {
        description: "Get user's progress for a specific skill",
        tags: ['skills-assessment'],
        params: {
          type: 'object',
          properties: {
            skillId: { type: 'string' },
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
    async (request: FastifyRequest<{ Params: { skillId: string } }>, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        if (!user) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
          });
        }

        const progress = await skillsAssessmentService.getUserSkillById(user.id, request.params.skillId);
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
        request.log.error(error, `Error fetching progress for skill ${request.params.skillId}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch skill progress',
        });
      }
    }
  );

  /**
   * PUT /api/skills/progress/:skillId
   * Update user's progress for a skill
   */
  fastify.put<{ Params: { skillId: string }; Body: any }>(
    '/progress/:skillId',
    {
      schema: {
        description: "Update user's progress for a skill",
        tags: ['skills-assessment'],
        params: {
          type: 'object',
          properties: {
            skillId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            progressPercentage: { type: 'number', minimum: 0, maximum: 100 },
            currentProficiency: { type: 'number', minimum: 1, maximum: 5 },
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
    async (request: FastifyRequest<{ Params: { skillId: string }; Body: any }>, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        if (!user) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
          });
        }

        const progress = await skillsAssessmentService.updateUserSkillProgress(
          user.id,
          request.params.skillId,
          request.body
        );
        return reply.send({
          success: true,
          data: progress,
        });
      } catch (error) {
        request.log.error(error, `Error updating progress for skill ${request.params.skillId}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update progress',
        });
      }
    }
  );

  /**
   * POST /api/skills/assess/:skillId
   * Assess a user's skill proficiency (assessor only)
   */
  fastify.post<{ Params: { skillId: string }; Body: { userId: string; proficiency: number; notes?: string } }>(
    '/assess/:skillId',
    {
      schema: {
        description: "Assess a user's skill proficiency",
        tags: ['skills-assessment'],
        params: {
          type: 'object',
          properties: {
            skillId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['userId', 'proficiency'],
          properties: {
            userId: { type: 'string' },
            proficiency: { type: 'number', minimum: 1, maximum: 5 },
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
    async (
      request: FastifyRequest<{ Params: { skillId: string }; Body: { userId: string; proficiency: number; notes?: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const assessor = (request as any).user;
        if (!assessor) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
          });
        }

        const progress = await skillsAssessmentService.assessSkill(
          request.body.userId,
          request.params.skillId,
          request.body.proficiency,
          assessor.id,
          request.body.notes
        );

        return reply.send({
          success: true,
          data: progress,
          message: 'Skill assessment recorded successfully',
        });
      } catch (error) {
        request.log.error(error, `Error assessing skill ${request.params.skillId}`);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to assess skill',
        });
      }
    }
  );

  /**
   * GET /api/skills/summary/my-summary
   * Get skills assessment summary for user
   */
  fastify.get(
    '/summary/my-summary',
    {
      schema: {
        description: "Get user's skills assessment summary with overall progress",
        tags: ['skills-assessment'],
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

        const summary = await skillsAssessmentService.getSkillsAssessmentSummary(user.id);
        return reply.send({
          success: true,
          data: summary,
        });
      } catch (error) {
        request.log.error(error, 'Error fetching skills assessment summary');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch skills summary',
        });
      }
    }
  );
}

/**
 * AI Planning Controller
 *
 * Handles HTTP requests for AI-assisted transition planning.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { aiPlanningService } from './ai-planning.service';

export class AIPlanningController {
  /**
   * Start a new AI planning session
   * POST /api/ai-planning/start
   */
  async startSession(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { transitionId, transitionType, executionMode } = request.body as {
        transitionId: string;
        transitionType: 'Contract' | 'Personnel' | 'System';
        executionMode?: 'DirectLLM' | 'N8NWorkflow';
      };

      // Get user ID from request (set by auth middleware)
      const userId = (request as any).user?.id || 'dev-user';

      // Validate inputs
      if (!transitionId || !transitionType) {
        return reply.status(400).send({
          error: 'Missing required fields: transitionId, transitionType'
        });
      }

      // Check if AI service is available
      const isHealthy = await aiPlanningService.checkServiceHealth();
      if (!isHealthy) {
        return reply.status(503).send({
          error: 'AI Planning service is currently unavailable. Please try manual planning.',
          fallbackAvailable: true
        });
      }

      // Start planning session
      const session = await aiPlanningService.startPlanningSession(
        transitionId,
        transitionType,
        userId,
        executionMode
      );

      return reply.status(200).send(session);
    } catch (error: any) {
      console.error('Error starting AI planning session:', error);
      return reply.status(500).send({
        error: 'Failed to start AI planning session',
        message: error.message,
        fallbackAvailable: true
      });
    }
  }

  /**
   * Submit user responses to planning session
   * POST /api/ai-planning/sessions/:sessionId/respond
   */
  async submitResponses(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { sessionId } = request.params as { sessionId: string };
      const responses = request.body as any[];

      if (!sessionId || !responses || !Array.isArray(responses)) {
        return reply.status(400).send({
          error: 'Missing required fields: sessionId, responses'
        });
      }

      const session = await aiPlanningService.submitResponses(sessionId, responses);

      return reply.status(200).send(session);
    } catch (error: any) {
      console.error('Error submitting responses:', error);
      return reply.status(500).send({
        error: 'Failed to submit responses',
        message: error.message
      });
    }
  }

  /**
   * Get planning session state
   * GET /api/ai-planning/sessions/:sessionId
   */
  async getSession(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { sessionId } = request.params as { sessionId: string };

      if (!sessionId) {
        return reply.status(400).send({
          error: 'Missing required parameter: sessionId'
        });
      }

      const session = await aiPlanningService.getPlanningSession(sessionId);

      return reply.status(200).send(session);
    } catch (error: any) {
      console.error('Error getting planning session:', error);

      if (error.message.includes('not found')) {
        return reply.status(404).send({
          error: 'Planning session not found'
        });
      }

      return reply.status(500).send({
        error: 'Failed to get planning session',
        message: error.message
      });
    }
  }

  /**
   * Generate task and milestone recommendations
   * POST /api/ai-planning/sessions/:sessionId/generate
   */
  async generateRecommendations(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { sessionId } = request.params as { sessionId: string };

      if (!sessionId) {
        return reply.status(400).send({
          error: 'Missing required parameter: sessionId'
        });
      }

      const recommendations = await aiPlanningService.generateRecommendations(sessionId);

      return reply.status(200).send(recommendations);
    } catch (error: any) {
      console.error('Error generating recommendations:', error);

      return reply.status(500).send({
        error: 'Failed to generate recommendations',
        message: error.message,
        fallbackAvailable: true
      });
    }
  }

  /**
   * Accept AI recommendations and create tasks/milestones
   * POST /api/ai-planning/sessions/:sessionId/accept
   */
  async acceptRecommendations(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { sessionId } = request.params as { sessionId: string };
      const { taskIds, milestoneIds, edits } = request.body as {
        taskIds: string[];
        milestoneIds: string[];
        edits?: Record<string, any>;
      };

      if (!sessionId) {
        return reply.status(400).send({
          error: 'Missing required parameter: sessionId'
        });
      }

      const result = await aiPlanningService.acceptRecommendations(
        sessionId,
        taskIds || [],
        milestoneIds || [],
        edits || {}
      );

      return reply.status(200).send({
        success: true,
        tasksCreated: result.tasksCreated,
        milestonesCreated: result.milestonesCreated
      });
    } catch (error: any) {
      console.error('Error accepting recommendations:', error);

      return reply.status(500).send({
        error: 'Failed to accept recommendations',
        message: error.message
      });
    }
  }

  /**
   * Reject AI recommendations
   * POST /api/ai-planning/sessions/:sessionId/reject
   */
  async rejectRecommendations(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { sessionId } = request.params as { sessionId: string };
      const { reason } = request.body as { reason?: string };

      if (!sessionId) {
        return reply.status(400).send({
          error: 'Missing required parameter: sessionId'
        });
      }

      await aiPlanningService.rejectRecommendations(sessionId, reason);

      return reply.status(200).send({
        success: true,
        message: 'Recommendations rejected. You can proceed with manual planning.'
      });
    } catch (error: any) {
      console.error('Error rejecting recommendations:', error);

      return reply.status(500).send({
        error: 'Failed to reject recommendations',
        message: error.message
      });
    }
  }

  /**
   * Health check for AI planning service
   * GET /api/ai-planning/health
   */
  async healthCheck(request: FastifyRequest, reply: FastifyReply) {
    try {
      const isHealthy = await aiPlanningService.checkServiceHealth();

      return reply.status(200).send({
        service: 'AI Planning Integration',
        status: isHealthy ? 'healthy' : 'degraded',
        pythonServiceAvailable: isHealthy,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      return reply.status(503).send({
        service: 'AI Planning Integration',
        status: 'unavailable',
        pythonServiceAvailable: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get AI planning configuration for a specific transition type
   * GET /api/ai-planning/config/:transitionType
   */
  async getConfiguration(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { transitionType } = request.params as { transitionType: string };

      if (!transitionType) {
        return reply.status(400).send({
          error: 'Missing required parameter: transitionType'
        });
      }

      const config = await aiPlanningService.getConfiguration(transitionType);

      return reply.status(200).send(config);
    } catch (error: any) {
      console.error('Error getting configuration:', error);
      return reply.status(500).send({
        error: 'Failed to get configuration',
        message: error.message
      });
    }
  }

  /**
   * Save AI planning questions for a specific transition type
   * PUT /api/ai-planning/config/:transitionType/questions
   */
  async saveQuestions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { transitionType } = request.params as { transitionType: string };
      const questions = request.body as any[];
      const userId = (request as any).user?.id || 'system';

      if (!transitionType || !questions) {
        return reply.status(400).send({
          error: 'Missing required fields: transitionType, questions'
        });
      }

      const saved = await aiPlanningService.saveQuestions(transitionType, questions, userId);

      return reply.status(200).send(saved);
    } catch (error: any) {
      console.error('Error saving questions:', error);
      return reply.status(500).send({
        error: 'Failed to save questions',
        message: error.message
      });
    }
  }

  /**
   * Save AI planning task templates for a specific transition type
   * PUT /api/ai-planning/config/:transitionType/task-templates
   */
  async saveTaskTemplates(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { transitionType } = request.params as { transitionType: string };
      const templates = request.body as any[];
      const userId = (request as any).user?.id || 'system';

      if (!transitionType || !templates) {
        return reply.status(400).send({
          error: 'Missing required fields: transitionType, templates'
        });
      }

      const saved = await aiPlanningService.saveTaskTemplates(transitionType, templates, userId);

      return reply.status(200).send(saved);
    } catch (error: any) {
      console.error('Error saving task templates:', error);
      return reply.status(500).send({
        error: 'Failed to save task templates',
        message: error.message
      });
    }
  }
}

// Export singleton instance
export const aiPlanningController = new AIPlanningController();

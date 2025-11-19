/**
 * AI Planning Routes
 *
 * Defines routing for AI-assisted transition planning endpoints.
 */

import { FastifyInstance } from 'fastify';
import { aiPlanningController } from './ai-planning.controller';

export async function aiPlanningRoutes(fastify: FastifyInstance) {
  // Health check
  fastify.get('/api/ai-planning/health', aiPlanningController.healthCheck.bind(aiPlanningController));

  // Start a new planning session
  fastify.post('/api/ai-planning/start', aiPlanningController.startSession.bind(aiPlanningController));

  // Submit responses to planning session
  fastify.post('/api/ai-planning/sessions/:sessionId/respond', aiPlanningController.submitResponses.bind(aiPlanningController));

  // Get planning session state
  fastify.get('/api/ai-planning/sessions/:sessionId', aiPlanningController.getSession.bind(aiPlanningController));

  // Generate recommendations
  fastify.post('/api/ai-planning/sessions/:sessionId/generate', aiPlanningController.generateRecommendations.bind(aiPlanningController));

  // Accept recommendations
  fastify.post('/api/ai-planning/sessions/:sessionId/accept', aiPlanningController.acceptRecommendations.bind(aiPlanningController));

  // Reject recommendations
  fastify.post('/api/ai-planning/sessions/:sessionId/reject', aiPlanningController.rejectRecommendations.bind(aiPlanningController));

  // Configuration endpoints
  // Get configuration for a transition type
  fastify.get('/api/ai-planning/config/:transitionType', aiPlanningController.getConfiguration.bind(aiPlanningController));

  // Save questions for a transition type
  fastify.put('/api/ai-planning/config/:transitionType/questions', aiPlanningController.saveQuestions.bind(aiPlanningController));

  // Save task templates for a transition type
  fastify.put('/api/ai-planning/config/:transitionType/task-templates', aiPlanningController.saveTaskTemplates.bind(aiPlanningController));
}

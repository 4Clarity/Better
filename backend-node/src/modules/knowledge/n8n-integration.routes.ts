import { FastifyInstance } from 'fastify';
import { n8nIntegrationController } from './n8n-integration.controller';

async function n8nIntegrationRoutes(fastify: FastifyInstance) {
  /**
   * Get N8N integration documentation
   */
  fastify.get('/docs', {
    handler: n8nIntegrationController.getN8NDocumentation.bind(n8nIntegrationController)
  });

  /**
   * Get all knowledge sources for N8N
   */
  fastify.get('/sources', {
    handler: n8nIntegrationController.getAllN8NKnowledgeSources.bind(n8nIntegrationController)
  });

  /**
   * Get specific knowledge source for N8N
   */
  fastify.get('/sources/:id', {
    handler: n8nIntegrationController.getN8NKnowledgeSource.bind(n8nIntegrationController)
  });

  /**
   * Register N8N webhook for a knowledge source
   */
  fastify.post('/sources/:id/webhook', {
    handler: n8nIntegrationController.registerWebhook.bind(n8nIntegrationController)
  });

  /**
   * Unregister N8N webhook for a knowledge source
   */
  fastify.delete('/sources/:id/webhook', {
    handler: n8nIntegrationController.unregisterWebhook.bind(n8nIntegrationController)
  });

  /**
   * Get source data for N8N processing
   */
  fastify.get('/sources/:id/data', {
    handler: n8nIntegrationController.getSourceData.bind(n8nIntegrationController)
  });

  /**
   * Trigger sync for a knowledge source
   */
  fastify.post('/sources/:id/sync', {
    handler: n8nIntegrationController.triggerSync.bind(n8nIntegrationController)
  });
}

export default n8nIntegrationRoutes;
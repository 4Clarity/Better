import { FastifyInstance } from 'fastify';
import { knowledgeSourceController } from './knowledge-source.controller';

async function knowledgeSourceRoutes(fastify: FastifyInstance) {
  // Get all knowledge sources
  fastify.get('/', {
    handler: knowledgeSourceController.getAllKnowledgeSources.bind(knowledgeSourceController)
  });

  // Get a specific knowledge source by ID
  fastify.get('/:id', {
    handler: knowledgeSourceController.getKnowledgeSource.bind(knowledgeSourceController)
  });

  // Create a new knowledge source
  fastify.post('/', {
    handler: knowledgeSourceController.createKnowledgeSource.bind(knowledgeSourceController)
  });

  // Update an existing knowledge source
  fastify.put('/:id', {
    handler: knowledgeSourceController.updateKnowledgeSource.bind(knowledgeSourceController)
  });

  // Delete a knowledge source (soft delete)
  fastify.delete('/:id', {
    handler: knowledgeSourceController.deleteKnowledgeSource.bind(knowledgeSourceController)
  });

  // Test connection health for a specific knowledge source
  fastify.post('/:id/health', {
    handler: knowledgeSourceController.testConnection.bind(knowledgeSourceController)
  });

  // Test connection health for a configuration (before saving)
  fastify.post('/test-connection', {
    handler: knowledgeSourceController.testConnectionConfig.bind(knowledgeSourceController)
  });

  // Get N8N integration metadata for a knowledge source
  fastify.get('/:id/n8n-metadata', {
    handler: knowledgeSourceController.getN8NIntegrationMetadata.bind(knowledgeSourceController)
  });
}

export default knowledgeSourceRoutes;
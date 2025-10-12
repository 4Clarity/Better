import { FastifyInstance } from 'fastify';
import { SettingsController } from './settings.controller';

export async function settingsRoutes(fastify: FastifyInstance) {
  const controller = new SettingsController();

  // Get setting by key
  fastify.get('/:key', {
    handler: controller.getSetting.bind(controller),
  });

  // Get settings by category
  fastify.get('/category/:category', {
    handler: controller.getSettingsByCategory.bind(controller),
  });

  // Get all public settings
  fastify.get('/public', {
    handler: controller.getPublicSettings.bind(controller),
  });

  // Update setting
  fastify.put('/:key', {
    handler: controller.updateSetting.bind(controller),
  });

  // Initialize knowledge management settings
  fastify.post('/initialize-knowledge', {
    handler: controller.initializeKnowledgeSettings.bind(controller),
  });
}

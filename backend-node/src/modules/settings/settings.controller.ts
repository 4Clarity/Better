import { FastifyRequest, FastifyReply } from 'fastify';
import { SettingsService } from './settings.service';

export class SettingsController {
  private settingsService: SettingsService;

  constructor() {
    this.settingsService = new SettingsService();
  }

  /**
   * GET /api/settings/:key
   * Get a specific setting by key
   */
  async getSetting(request: FastifyRequest<{ Params: { key: string } }>, reply: FastifyReply) {
    try {
      const { key } = request.params;
      const setting = await this.settingsService.getSetting(key);

      if (!setting) {
        return reply.status(404).send({
          success: false,
          message: `Setting '${key}' not found`,
        });
      }

      return reply.status(200).send({
        success: true,
        data: setting,
      });
    } catch (error: any) {
      console.error('Error in getSetting:', error);
      return reply.status(500).send({
        success: false,
        message: error.message || 'Failed to retrieve setting',
      });
    }
  }

  /**
   * GET /api/settings/category/:category
   * Get all settings for a specific category
   */
  async getSettingsByCategory(
    request: FastifyRequest<{ Params: { category: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { category } = request.params;
      const settings = await this.settingsService.getSettingsByCategory(category);

      return reply.status(200).send({
        success: true,
        data: settings,
      });
    } catch (error: any) {
      console.error('Error in getSettingsByCategory:', error);
      return reply.status(500).send({
        success: false,
        message: error.message || 'Failed to retrieve settings',
      });
    }
  }

  /**
   * GET /api/settings/public
   * Get all public settings
   */
  async getPublicSettings(request: FastifyRequest, reply: FastifyReply) {
    try {
      const settings = await this.settingsService.getPublicSettings();

      return reply.status(200).send({
        success: true,
        data: settings,
      });
    } catch (error: any) {
      console.error('Error in getPublicSettings:', error);
      return reply.status(500).send({
        success: false,
        message: error.message || 'Failed to retrieve public settings',
      });
    }
  }

  /**
   * PUT /api/settings/:key
   * Update a setting
   */
  async updateSetting(
    request: FastifyRequest<{
      Params: { key: string };
      Body: { value: any };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { key } = request.params;
      const { value } = request.body;

      // Get user ID from request (assumes auth middleware adds user to request)
      // If no user is authenticated, modifiedBy will be null
      const userId = (request as any).user?.id || undefined;

      const updatedSetting = await this.settingsService.updateSetting(key, {
        value,
        modifiedBy: userId,
      });

      return reply.status(200).send({
        success: true,
        data: updatedSetting,
        message: `Setting '${key}' updated successfully`,
      });
    } catch (error: any) {
      console.error('Error in updateSetting:', error);
      return reply.status(400).send({
        success: false,
        message: error.message || 'Failed to update setting',
      });
    }
  }

  /**
   * POST /api/settings/initialize-knowledge
   * Initialize default knowledge management settings
   */
  async initializeKnowledgeSettings(request: FastifyRequest, reply: FastifyReply) {
    try {
      await this.settingsService.initializeKnowledgeSettings();

      return reply.status(200).send({
        success: true,
        message: 'Knowledge management settings initialized successfully',
      });
    } catch (error: any) {
      console.error('Error in initializeKnowledgeSettings:', error);
      return reply.status(500).send({
        success: false,
        message: error.message || 'Failed to initialize knowledge settings',
      });
    }
  }
}

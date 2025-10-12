import { FastifyRequest, FastifyReply } from 'fastify';
import { knowledgeSourceService, type KnowledgeSourceConfigRequest, type KnowledgeSourceUpdateRequest } from './knowledge-source.service';
import { KnowledgeSourceType, KnowledgeSourceAuthMethod, KnowledgeSourceSyncFrequency } from '@prisma/client';

export class KnowledgeSourceController {
  async getAllKnowledgeSources(req: FastifyRequest, res: FastifyReply) {
    try {
      const userId = (req as any).user?.id;
      const sources = await knowledgeSourceService.getAllKnowledgeSources(userId);
      res.send(sources);
    } catch (error) {
      console.error('Error fetching knowledge sources:', error);
      res.status(500).send({
        message: 'Failed to fetch knowledge sources',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getKnowledgeSource(req: FastifyRequest, res: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const source = await knowledgeSourceService.getKnowledgeSourceById(id);
      res.send(source);
    } catch (error) {
      console.error('Error fetching knowledge source:', error);
      if (error instanceof Error && error.message === 'Knowledge source not found') {
        res.status(404).send({ message: 'Knowledge source not found' });
      } else {
        res.status(500).send({
          message: 'Failed to fetch knowledge source',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  async createKnowledgeSource(req: FastifyRequest, res: FastifyReply) {
    try {
      // Get user ID from authenticated user or use null for development
      const userId = (req as any).user?.id || null;

      // Validate request body
      const validationError = this.validateKnowledgeSourceRequest(req.body);
      if (validationError) {
        return res.status(400).send({ message: validationError });
      }

      const data: KnowledgeSourceConfigRequest = {
        name: req.body.name,
        description: req.body.description,
        endpointUrl: req.body.endpointUrl,
        sourceType: this.mapSourceTypeFromRequest(req.body.sourceType),
        authenticationMethod: this.mapAuthMethodFromRequest(req.body.authType || req.body.authenticationMethod),
        authenticationCredentials: req.body.authConfig,
        authenticationMetadata: req.body.authMetadata || {},
        connectionParameters: req.body.connectionParameters || {},
        metadata: req.body.metadata || {},
        syncFrequency: req.body.syncFrequency || 'Manual',
        dataRetentionDays: req.body.dataRetentionDays,
        maxRecordsPerSync: req.body.maxRecordsPerSync,
        supportedContentTypes: req.body.supportedContentTypes || [],
        supportedOperations: req.body.supportedOperations || [],
        capabilities: req.body.capabilities || {}
      };

      const source = await knowledgeSourceService.createKnowledgeSource(data, userId);
      res.status(201).send(source);
    } catch (error) {
      console.error('Error creating knowledge source:', error);
      res.status(500).send({
        message: 'Failed to create knowledge source',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateKnowledgeSource(req: FastifyRequest, res: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const userId = (req as any).user?.id || null;

      // Validate request body
      const validationError = this.validateKnowledgeSourceUpdateRequest(req.body);
      if (validationError) {
        return res.status(400).send({ message: validationError });
      }

      const data: KnowledgeSourceUpdateRequest = {
        ...(req.body.name && { name: req.body.name }),
        ...(req.body.description !== undefined && { description: req.body.description }),
        ...(req.body.endpointUrl && { endpointUrl: req.body.endpointUrl }),
        ...(req.body.sourceType && { sourceType: this.mapSourceTypeFromRequest(req.body.sourceType) }),
        ...(req.body.authType && { authenticationMethod: this.mapAuthMethodFromRequest(req.body.authType) }),
        ...(req.body.authConfig && { authenticationCredentials: req.body.authConfig }),
        ...(req.body.authMetadata && { authenticationMetadata: req.body.authMetadata }),
        ...(req.body.connectionParameters && { connectionParameters: req.body.connectionParameters }),
        ...(req.body.metadata && { metadata: req.body.metadata }),
        ...(req.body.syncFrequency && { syncFrequency: req.body.syncFrequency }),
        ...(req.body.status && { isActive: req.body.status === 'active' }),
        ...(req.body.isEnabled !== undefined && { isEnabled: req.body.isEnabled }),
        ...(req.body.dataRetentionDays !== undefined && { dataRetentionDays: req.body.dataRetentionDays }),
        ...(req.body.maxRecordsPerSync !== undefined && { maxRecordsPerSync: req.body.maxRecordsPerSync }),
        ...(req.body.supportedContentTypes && { supportedContentTypes: req.body.supportedContentTypes }),
        ...(req.body.supportedOperations && { supportedOperations: req.body.supportedOperations }),
        ...(req.body.capabilities && { capabilities: req.body.capabilities })
      };

      const source = await knowledgeSourceService.updateKnowledgeSource(id, data, userId);
      res.send(source);
    } catch (error) {
      console.error('Error updating knowledge source:', error);
      if (error instanceof Error && error.message === 'Knowledge source not found') {
        res.status(404).send({ message: 'Knowledge source not found' });
      } else {
        res.status(500).send({
          message: 'Failed to update knowledge source',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  async deleteKnowledgeSource(req: FastifyRequest, res: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      await knowledgeSourceService.deleteKnowledgeSource(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting knowledge source:', error);
      if (error instanceof Error && error.message === 'Knowledge source not found') {
        res.status(404).send({ message: 'Knowledge source not found' });
      } else {
        res.status(500).send({
          message: 'Failed to delete knowledge source',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  async testConnection(req: FastifyRequest, res: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const result = await knowledgeSourceService.testConnection(id);
      res.send(result);
    } catch (error) {
      console.error('Error testing connection:', error);
      if (error instanceof Error && error.message === 'Knowledge source not found') {
        res.status(404).send({ message: 'Knowledge source not found' });
      } else {
        res.status(500).send({
          message: 'Failed to test connection',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  async testConnectionConfig(req: FastifyRequest, res: FastifyReply) {
    try {
      // Validate request body
      const validationError = this.validateKnowledgeSourceRequest(req.body);
      if (validationError) {
        return res.status(400).send({ message: validationError });
      }

      const config: KnowledgeSourceConfigRequest = {
        name: req.body.name,
        description: req.body.description,
        endpointUrl: req.body.endpointUrl,
        sourceType: this.mapSourceTypeFromRequest(req.body.sourceType || 'REST_API'),
        authenticationMethod: this.mapAuthMethodFromRequest(req.body.authType || req.body.authenticationMethod),
        authenticationCredentials: req.body.authConfig,
        authenticationMetadata: req.body.authMetadata || {},
        connectionParameters: req.body.connectionParameters || {}
      };

      const result = await knowledgeSourceService.testConnectionConfig(config);
      res.send(result);
    } catch (error) {
      console.error('Error testing connection config:', error);
      res.status(500).send({
        message: 'Failed to test connection',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getN8NIntegrationMetadata(req: FastifyRequest, res: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const metadata = await knowledgeSourceService.getN8NIntegrationMetadata(id);
      res.send(metadata);
    } catch (error) {
      console.error('Error fetching N8N integration metadata:', error);
      if (error instanceof Error && error.message === 'Knowledge source not found') {
        res.status(404).send({ message: 'Knowledge source not found' });
      } else {
        res.status(500).send({
          message: 'Failed to fetch N8N integration metadata',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  private validateKnowledgeSourceRequest(body: any): string | null {
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return 'Name is required and must be a non-empty string';
    }

    if (!body.endpointUrl || typeof body.endpointUrl !== 'string' || body.endpointUrl.trim().length === 0) {
      return 'Endpoint URL is required and must be a non-empty string';
    }

    try {
      new URL(body.endpointUrl);
    } catch {
      return 'Endpoint URL must be a valid URL';
    }

    const authType = body.authType || body.authenticationMethod || 'none';
    if (authType === 'basic' || authType === 'Basic_Auth') {
      const authConfig = body.authConfig;
      if (!authConfig || !authConfig.username || !authConfig.password) {
        return 'Username and password are required for basic authentication';
      }
    } else if (authType === 'api_key' || authType === 'API_Key') {
      const authConfig = body.authConfig;
      if (!authConfig || !authConfig.apiKey) {
        return 'API key is required for API key authentication';
      }
    } else if (authType === 'oauth' || authType === 'OAuth2') {
      const authConfig = body.authConfig;
      if (!authConfig || !authConfig.clientId || !authConfig.clientSecret) {
        return 'Client ID and Client Secret are required for OAuth authentication';
      }
    }

    return null;
  }

  private validateKnowledgeSourceUpdateRequest(body: any): string | null {
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        return 'Name must be a non-empty string';
      }
    }

    if (body.endpointUrl !== undefined) {
      if (typeof body.endpointUrl !== 'string' || body.endpointUrl.trim().length === 0) {
        return 'Endpoint URL must be a non-empty string';
      }
      try {
        new URL(body.endpointUrl);
      } catch {
        return 'Endpoint URL must be a valid URL';
      }
    }

    return null;
  }

  private mapSourceTypeFromRequest(sourceType?: string): KnowledgeSourceType {
    // Map from frontend to Prisma enum
    switch (sourceType) {
      case 'ServiceNow':
        return 'ServiceNow';
      case 'Azure_DevOps':
        return 'Azure_DevOps';
      case 'Microsoft_Teams':
        return 'Microsoft_Teams';
      case 'Microsoft_SharePoint':
        return 'Microsoft_SharePoint';
      case 'Microsoft_Outlook':
        return 'Microsoft_Outlook';
      case 'Slack':
        return 'Slack';
      case 'Confluence':
        return 'Confluence';
      case 'Jira':
        return 'Jira';
      case 'GitHub':
        return 'GitHub';
      case 'GitLab':
        return 'GitLab';
      default:
        return 'REST_API'; // Default fallback
    }
  }

  private mapAuthMethodFromRequest(authMethod?: string): KnowledgeSourceAuthMethod {
    // Map from frontend to Prisma enum
    switch (authMethod) {
      case 'basic':
        return 'Basic_Auth';
      case 'api_key':
        return 'API_Key';
      case 'oauth':
        return 'OAuth2';
      case 'Bearer_Token':
        return 'Bearer_Token';
      case 'none':
      default:
        return 'None';
    }
  }
}

export const knowledgeSourceController = new KnowledgeSourceController();
import { FastifyRequest, FastifyReply } from 'fastify';
import { n8nIntegrationService } from './n8n-integration.service';

export class N8NIntegrationController {
  /**
   * Get all knowledge sources for N8N
   */
  async getAllN8NKnowledgeSources(req: FastifyRequest, res: FastifyReply) {
    try {
      const sources = await n8nIntegrationService.getAllN8NKnowledgeSources();
      res.send({
        success: true,
        count: sources.length,
        data: sources
      });
    } catch (error) {
      console.error('Error fetching N8N knowledge sources:', error);
      res.status(500).send({
        success: false,
        message: 'Failed to fetch knowledge sources for N8N',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get a specific knowledge source for N8N
   */
  async getN8NKnowledgeSource(req: FastifyRequest, res: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const source = await n8nIntegrationService.getN8NKnowledgeSource(id);
      res.send({
        success: true,
        data: source
      });
    } catch (error) {
      console.error('Error fetching N8N knowledge source:', error);
      if (error instanceof Error && error.message === 'Knowledge source not found') {
        res.status(404).send({
          success: false,
          message: 'Knowledge source not found'
        });
      } else {
        res.status(500).send({
          success: false,
          message: 'Failed to fetch knowledge source for N8N',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  /**
   * Register N8N webhook for a knowledge source
   */
  async registerWebhook(req: FastifyRequest, res: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const { webhookUrl, workflowId } = req.body as { webhookUrl: string; workflowId: string };

      if (!webhookUrl || !workflowId) {
        return res.status(400).send({
          success: false,
          message: 'webhookUrl and workflowId are required'
        });
      }

      // Validate webhook URL
      try {
        new URL(webhookUrl);
      } catch {
        return res.status(400).send({
          success: false,
          message: 'Invalid webhook URL format'
        });
      }

      const result = await n8nIntegrationService.registerN8NWebhook(id, webhookUrl, workflowId);
      res.send(result);
    } catch (error) {
      console.error('Error registering N8N webhook:', error);
      if (error instanceof Error && error.message === 'Knowledge source not found') {
        res.status(404).send({
          success: false,
          message: 'Knowledge source not found'
        });
      } else {
        res.status(500).send({
          success: false,
          message: 'Failed to register N8N webhook',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  /**
   * Unregister N8N webhook for a knowledge source
   */
  async unregisterWebhook(req: FastifyRequest, res: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const result = await n8nIntegrationService.unregisterN8NWebhook(id);
      res.send(result);
    } catch (error) {
      console.error('Error unregistering N8N webhook:', error);
      if (error instanceof Error && error.message === 'Knowledge source not found') {
        res.status(404).send({
          success: false,
          message: 'Knowledge source not found'
        });
      } else {
        res.status(500).send({
          success: false,
          message: 'Failed to unregister N8N webhook',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  /**
   * Get source data for N8N processing
   */
  async getSourceData(req: FastifyRequest, res: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const query = req.query as Record<string, any>;

      const options = {
        limit: query.limit ? parseInt(query.limit, 10) : undefined,
        offset: query.offset ? parseInt(query.offset, 10) : undefined,
        format: query.format as 'json' | 'xml' | 'csv' || 'json',
        includeMetadata: query.includeMetadata === 'true'
      };

      const data = await n8nIntegrationService.getSourceDataForN8N(id, options);
      res.send({
        success: true,
        data
      });
    } catch (error) {
      console.error('Error fetching source data for N8N:', error);
      if (error instanceof Error && error.message === 'Knowledge source not found') {
        res.status(404).send({
          success: false,
          message: 'Knowledge source not found'
        });
      } else if (error instanceof Error && error.message.includes('not active')) {
        res.status(400).send({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).send({
          success: false,
          message: 'Failed to fetch source data for N8N',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  /**
   * Trigger sync for a knowledge source
   */
  async triggerSync(req: FastifyRequest, res: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const userId = (req as any).user?.id;

      const result = await n8nIntegrationService.triggerSync(id, userId);
      res.send({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error triggering sync for N8N:', error);
      if (error instanceof Error && error.message === 'Knowledge source not found') {
        res.status(404).send({
          success: false,
          message: 'Knowledge source not found'
        });
      } else {
        res.status(500).send({
          success: false,
          message: 'Failed to trigger sync',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  /**
   * Get N8N configuration documentation
   */
  async getN8NDocumentation(req: FastifyRequest, res: FastifyReply) {
    const baseUrl = process.env.API_BASE_URL || 'http://api.tip.localhost';

    const documentation = {
      title: 'Knowledge Management Platform - N8N Integration Guide',
      version: '1.0.0',
      description: 'API endpoints for integrating knowledge sources with N8N workflows',
      baseUrl,
      endpoints: {
        getAllSources: {
          method: 'GET',
          path: '/api/n8n/sources',
          description: 'Get all active knowledge sources available for N8N workflows',
          response: 'Array of knowledge source metadata objects'
        },
        getSource: {
          method: 'GET',
          path: '/api/n8n/sources/{id}',
          description: 'Get specific knowledge source metadata for N8N',
          parameters: {
            id: 'Knowledge source ID'
          }
        },
        registerWebhook: {
          method: 'POST',
          path: '/api/n8n/sources/{id}/webhook',
          description: 'Register an N8N webhook for source events',
          parameters: {
            id: 'Knowledge source ID'
          },
          body: {
            webhookUrl: 'N8N webhook URL to notify',
            workflowId: 'N8N workflow ID'
          }
        },
        getSourceData: {
          method: 'GET',
          path: '/api/n8n/sources/{id}/data',
          description: 'Get source data for N8N processing',
          parameters: {
            id: 'Knowledge source ID',
            limit: 'Number of records to return (optional)',
            offset: 'Number of records to skip (optional)',
            format: 'Response format: json, xml, csv (optional, default: json)',
            includeMetadata: 'Include source metadata (optional, default: false)'
          }
        },
        triggerSync: {
          method: 'POST',
          path: '/api/n8n/sources/{id}/sync',
          description: 'Trigger a sync for the knowledge source',
          parameters: {
            id: 'Knowledge source ID'
          }
        }
      },
      authentication: {
        type: 'Bearer Token',
        description: 'Include Authorization header with valid JWT token or use x-auth-bypass header for development'
      },
      webhookEvents: {
        sync_completed: {
          description: 'Sent when a knowledge source sync completes',
          payload: {
            event: 'sync_completed',
            sourceId: 'Knowledge source ID',
            syncId: 'Sync operation ID',
            status: 'completed | failed',
            timestamp: 'ISO 8601 timestamp'
          }
        }
      },
      exampleWorkflow: {
        description: 'Example N8N workflow configuration',
        steps: [
          '1. Create HTTP Request node to GET /api/n8n/sources',
          '2. Filter sources by sourceType or capabilities',
          '3. For each source, register webhook with POST /api/n8n/sources/{id}/webhook',
          '4. Create Webhook node to receive sync completion events',
          '5. Process source data with GET /api/n8n/sources/{id}/data',
          '6. Transform and route data to target systems'
        ]
      }
    };

    res.send(documentation);
  }
}

export const n8nIntegrationController = new N8NIntegrationController();
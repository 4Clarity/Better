import { PrismaClient } from '@prisma/client';
import { knowledgeSourceService } from './knowledge-source.service';

const prisma = new PrismaClient();

export interface N8NWorkflowConfiguration {
  sourceId: string;
  workflowId: string;
  workflowName: string;
  triggerType: 'webhook' | 'polling' | 'manual';
  configuration: Record<string, any>;
  isActive: boolean;
}

export interface N8NKnowledgeSourceMetadata {
  id: string;
  name: string;
  description?: string;
  sourceType: string;
  connectionUrl: string;
  authenticationMethod: string;
  isEnabled: boolean;
  isActive: boolean;
  capabilities: string[];
  supportedContentTypes: string[];
  supportedOperations: string[];
  n8nEndpoints: {
    webhookUrl?: string;
    metadataUrl: string;
    healthUrl: string;
    dataUrl?: string;
  };
  lastSyncStatus: string;
  lastSyncAt?: string;
}

export class N8NIntegrationService {
  /**
   * Get all knowledge sources formatted for N8N consumption
   */
  async getAllN8NKnowledgeSources(): Promise<N8NKnowledgeSourceMetadata[]> {
    const sources = await prisma.km_knowledge_sources.findMany({
      where: {
        isActive: true,
        isEnabled: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return sources.map(source => this.transformToN8NFormat(source));
  }

  /**
   * Get a specific knowledge source formatted for N8N
   */
  async getN8NKnowledgeSource(id: string): Promise<N8NKnowledgeSourceMetadata> {
    const source = await prisma.km_knowledge_sources.findUnique({
      where: { id }
    });

    if (!source) {
      throw new Error('Knowledge source not found');
    }

    return this.transformToN8NFormat(source);
  }

  /**
   * Register a webhook for N8N workflow notifications
   */
  async registerN8NWebhook(sourceId: string, webhookUrl: string, workflowId: string) {
    const source = await prisma.km_knowledge_sources.findUnique({
      where: { id: sourceId }
    });

    if (!source) {
      throw new Error('Knowledge source not found');
    }

    // Update the source with N8N webhook configuration
    const currentMetadata = source.metadata as any || {};
    const n8nConfig = currentMetadata.n8n || {};

    const updatedMetadata = {
      ...currentMetadata,
      n8n: {
        ...n8nConfig,
        webhookUrl,
        workflowId,
        registeredAt: new Date().toISOString(),
        isActive: true
      }
    };

    await prisma.km_knowledge_sources.update({
      where: { id: sourceId },
      data: {
        metadata: updatedMetadata
      }
    });

    return {
      success: true,
      message: 'N8N webhook registered successfully',
      webhookUrl,
      workflowId
    };
  }

  /**
   * Unregister N8N webhook
   */
  async unregisterN8NWebhook(sourceId: string) {
    const source = await prisma.km_knowledge_sources.findUnique({
      where: { id: sourceId }
    });

    if (!source) {
      throw new Error('Knowledge source not found');
    }

    const currentMetadata = source.metadata as any || {};
    const updatedMetadata = {
      ...currentMetadata,
      n8n: {
        ...currentMetadata.n8n,
        isActive: false,
        unregisteredAt: new Date().toISOString()
      }
    };

    await prisma.km_knowledge_sources.update({
      where: { id: sourceId },
      data: {
        metadata: updatedMetadata
      }
    });

    return {
      success: true,
      message: 'N8N webhook unregistered successfully'
    };
  }

  /**
   * Get source data in a format suitable for N8N processing
   */
  async getSourceDataForN8N(sourceId: string, options: {
    limit?: number;
    offset?: number;
    format?: 'json' | 'xml' | 'csv';
    includeMetadata?: boolean;
  } = {}) {
    const source = await prisma.km_knowledge_sources.findUnique({
      where: { id: sourceId }
    });

    if (!source) {
      throw new Error('Knowledge source not found');
    }

    if (!source.isEnabled || !source.isActive) {
      throw new Error('Knowledge source is not active or enabled');
    }

    // This is a placeholder for actual data retrieval logic
    // In a real implementation, this would fetch data from the actual source
    // based on the source type and configuration

    const mockData = {
      sourceId: source.id,
      sourceName: source.name,
      sourceType: source.sourceType,
      retrievedAt: new Date().toISOString(),
      format: options.format || 'json',
      totalRecords: 0, // Would be actual count
      records: [], // Would be actual data
      metadata: options.includeMetadata ? {
        connectionUrl: source.connectionUrl,
        lastSync: source.lastSyncAt?.toISOString(),
        capabilities: source.capabilities,
        supportedContentTypes: source.supportedContentTypes
      } : undefined
    };

    return mockData;
  }

  /**
   * Trigger a sync for N8N workflow
   */
  async triggerSync(sourceId: string, triggeredBy?: string) {
    const source = await prisma.km_knowledge_sources.findUnique({
      where: { id: sourceId }
    });

    if (!source) {
      throw new Error('Knowledge source not found');
    }

    // Create a sync log entry
    const syncLog = await prisma.km_sync_logs.create({
      data: {
        knowledgeSourceId: sourceId,
        status: 'Running',
        startedAt: new Date(),
        syncType: 'Incremental',
        triggerType: 'API_Call',
        triggeredBy,
        metadata: {
          requestedBy: 'N8N',
          timestamp: new Date().toISOString()
        }
      }
    });

    // In a real implementation, this would trigger the actual sync process
    // For now, we'll simulate a successful sync

    setTimeout(async () => {
      try {
        await prisma.km_sync_logs.update({
          where: { id: syncLog.id },
          data: {
            status: 'Completed',
            completedAt: new Date(),
            recordsProcessed: 0, // Would be actual count
            recordsSuccessful: 0, // Would be actual count
            recordsSkipped: 0,
            recordsFailed: 0
          }
        });

        // Update the source's last sync info
        await prisma.km_knowledge_sources.update({
          where: { id: sourceId },
          data: {
            lastSyncAt: new Date(),
            lastSyncStatus: 'Completed',
            lastSyncDuration: 1000 // Would be actual duration
          }
        });

        // If there's a webhook configured, notify N8N
        const currentMetadata = source.metadata as any || {};
        const n8nConfig = currentMetadata.n8n;

        if (n8nConfig?.webhookUrl && n8nConfig?.isActive) {
          try {
            const fetch = (await import('node-fetch')).default;
            await fetch(n8nConfig.webhookUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                event: 'sync_completed',
                sourceId: sourceId,
                syncId: syncLog.id,
                status: 'completed',
                timestamp: new Date().toISOString()
              })
            });
          } catch (error) {
            console.error('Failed to notify N8N webhook:', error);
          }
        }
      } catch (error) {
        console.error('Failed to complete sync:', error);
        await prisma.km_sync_logs.update({
          where: { id: syncLog.id },
          data: {
            status: 'Failed',
            completedAt: new Date(),
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }
    }, 1000); // Simulate 1 second processing time

    return {
      syncId: syncLog.id,
      status: 'started',
      message: 'Sync triggered successfully',
      estimatedDuration: '1-2 minutes'
    };
  }

  private transformToN8NFormat(source: any): N8NKnowledgeSourceMetadata {
    const baseUrl = process.env.API_BASE_URL || 'http://api.tip.localhost';
    const metadata = source.metadata as any || {};
    const n8nConfig = metadata.n8n || {};

    return {
      id: source.id,
      name: source.name,
      description: source.description,
      sourceType: source.sourceType,
      connectionUrl: source.connectionUrl,
      authenticationMethod: source.authenticationMethod,
      isEnabled: source.isEnabled,
      isActive: source.isActive,
      capabilities: Array.isArray(source.capabilities) ? source.capabilities : Object.keys(source.capabilities || {}),
      supportedContentTypes: source.supportedContentTypes || [],
      supportedOperations: source.supportedOperations || [],
      n8nEndpoints: {
        webhookUrl: n8nConfig.webhookUrl,
        metadataUrl: `${baseUrl}/api/knowledge-sources/${source.id}/n8n-metadata`,
        healthUrl: `${baseUrl}/api/knowledge-sources/${source.id}/health`,
        dataUrl: `${baseUrl}/api/n8n/sources/${source.id}/data`
      },
      lastSyncStatus: source.lastSyncStatus || 'Never_Synced',
      lastSyncAt: source.lastSyncAt?.toISOString()
    };
  }
}

export const n8nIntegrationService = new N8NIntegrationService();
import { PrismaClient, KnowledgeSourceType, KnowledgeSourceAuthMethod, KnowledgeSourceSyncFrequency, KnowledgeSourceSyncStatus } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';

const prisma = new PrismaClient();

export interface KnowledgeSourceConfigRequest {
  name: string;
  description?: string;
  endpointUrl: string; // Match frontend interface
  sourceType: KnowledgeSourceType;
  authenticationMethod: KnowledgeSourceAuthMethod;
  authenticationCredentials?: any;
  authenticationMetadata?: any;
  connectionParameters?: any;
  metadata?: any;
  syncFrequency?: KnowledgeSourceSyncFrequency;
  dataRetentionDays?: number;
  maxRecordsPerSync?: number;
  supportedContentTypes?: string[];
  supportedOperations?: string[];
  capabilities?: any;
}

export interface KnowledgeSourceUpdateRequest extends Partial<KnowledgeSourceConfigRequest> {
  isActive?: boolean;
  isEnabled?: boolean;
}

export interface HealthCheckResult {
  sourceId: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  lastCheck: string;
  details?: string;
  responseTime?: number;
  errorMessage?: string;
}

export class KnowledgeSourceService {
  async getAllKnowledgeSources(userId?: string) {
    const sources = await prisma.km_knowledge_sources.findMany({
      include: {
        users_configured: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return sources.map(source => this.transformKnowledgeSource(source));
  }

  async getKnowledgeSourceById(id: string) {
    const source = await prisma.km_knowledge_sources.findUnique({
      where: { id },
      include: {
        users_configured: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!source) {
      throw new Error('Knowledge source not found');
    }

    return this.transformKnowledgeSource(source);
  }

  async createKnowledgeSource(data: KnowledgeSourceConfigRequest, configuredBy: string) {
    // Validate required fields
    if (!data.name || !data.endpointUrl) {
      throw new Error('Name and endpoint URL are required');
    }

    // Validate URL format
    try {
      new URL(data.endpointUrl);
    } catch {
      throw new Error('Invalid endpoint URL format');
    }

    const source = await prisma.km_knowledge_sources.create({
      data: {
        id: createId(),
        name: data.name,
        description: data.description,
        sourceType: data.sourceType,
        connectionUrl: data.endpointUrl,
        connectionParameters: data.connectionParameters || {},
        authenticationMethod: data.authenticationMethod,
        authenticationCredentials: data.authenticationCredentials ? JSON.stringify(data.authenticationCredentials) : null,
        authenticationMetadata: data.authenticationMetadata || {},
        syncFrequency: data.syncFrequency || 'Manual',
        dataRetentionDays: data.dataRetentionDays,
        maxRecordsPerSync: data.maxRecordsPerSync,
        supportedContentTypes: data.supportedContentTypes || [],
        supportedOperations: data.supportedOperations || [],
        capabilities: data.capabilities || {},
        metadata: data.metadata || {},
        configuredBy: configuredBy || null,
        isActive: true,
        isEnabled: false, // Disabled by default until first successful health check
        lastSyncStatus: 'Never_Synced'
      },
      include: {
        users_configured: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    return this.transformKnowledgeSource(source);
  }

  async updateKnowledgeSource(id: string, data: KnowledgeSourceUpdateRequest, configuredBy: string) {
    const existingSource = await prisma.km_knowledge_sources.findUnique({
      where: { id }
    });

    if (!existingSource) {
      throw new Error('Knowledge source not found');
    }

    // Validate URL if provided
    if (data.endpointUrl) {
      try {
        new URL(data.endpointUrl);
      } catch {
        throw new Error('Invalid endpoint URL format');
      }
    }

    const updateData: any = {
      ...data,
      lastConfiguredAt: new Date()
    };

    // Handle credentials separately
    if (data.authenticationCredentials) {
      updateData.authenticationCredentials = JSON.stringify(data.authenticationCredentials);
    }

    // Map endpointUrl to connectionUrl for database
    if (data.endpointUrl) {
      updateData.connectionUrl = data.endpointUrl;
      delete updateData.endpointUrl;
    }

    const source = await prisma.km_knowledge_sources.update({
      where: { id },
      data: updateData,
      include: {
        users_configured: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    return this.transformKnowledgeSource(source);
  }

  async deleteKnowledgeSource(id: string) {
    const existingSource = await prisma.km_knowledge_sources.findUnique({
      where: { id }
    });

    if (!existingSource) {
      throw new Error('Knowledge source not found');
    }

    // Soft delete by archiving
    await prisma.km_knowledge_sources.update({
      where: { id },
      data: {
        isActive: false,
        isEnabled: false,
        archivedAt: new Date()
      }
    });
  }

  async testConnection(id: string): Promise<HealthCheckResult> {
    const source = await prisma.km_knowledge_sources.findUnique({
      where: { id }
    });

    if (!source) {
      throw new Error('Knowledge source not found');
    }

    return this.performHealthCheck(source);
  }

  async testConnectionConfig(config: KnowledgeSourceConfigRequest): Promise<HealthCheckResult> {
    // Create a temporary source object for testing
    const testSource = {
      id: 'test',
      connectionUrl: config.endpointUrl,
      authenticationMethod: config.authenticationMethod,
      authenticationCredentials: config.authenticationCredentials ? JSON.stringify(config.authenticationCredentials) : null,
      authenticationMetadata: config.authenticationMetadata || {},
      connectionParameters: config.connectionParameters || {}
    };

    return this.performHealthCheck(testSource);
  }

  private async performHealthCheck(source: any): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const result: HealthCheckResult = {
      sourceId: source.id,
      status: 'unknown',
      lastCheck: new Date().toISOString(),
      responseTime: 0
    };

    try {
      // Prepare headers based on authentication method
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Knowledge-Management-Platform/1.0'
      };

      // Parse credentials if they exist
      let credentials: any = {};
      if (source.authenticationCredentials) {
        try {
          credentials = JSON.parse(source.authenticationCredentials);
        } catch {
          credentials = {};
        }
      }

      // Add authentication headers
      switch (source.authenticationMethod) {
        case 'Basic_Auth':
          if (credentials.username && credentials.password) {
            const auth = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
            headers['Authorization'] = `Basic ${auth}`;
          }
          break;
        case 'Bearer_Token':
          if (credentials.token) {
            headers['Authorization'] = `Bearer ${credentials.token}`;
          }
          break;
        case 'API_Key':
          const headerName = credentials.headerName || 'X-API-Key';
          if (credentials.apiKey) {
            headers[headerName] = credentials.apiKey;
          }
          break;
      }

      // Perform the health check
      const { default: fetch } = await import('node-fetch');
      const response = await fetch(source.connectionUrl, {
        method: 'GET',
        headers,
        timeout: 10000 // 10 second timeout
      });

      const responseTime = Date.now() - startTime;
      result.responseTime = responseTime;

      if (response.ok) {
        result.status = 'healthy';
        result.details = `Connection successful (${response.status} ${response.statusText})`;

        // Update the source health status if this isn't a test
        if (source.id !== 'test') {
          await prisma.km_knowledge_sources.update({
            where: { id: source.id },
            data: {
              lastSyncStatus: 'Completed',
              lastSyncAt: new Date(),
              lastSyncDuration: responseTime,
              lastSyncErrorMessage: null,
              isEnabled: true // Enable on successful health check
            }
          });
        }
      } else {
        result.status = 'unhealthy';
        result.details = `HTTP ${response.status}: ${response.statusText}`;
        result.errorMessage = await response.text().catch(() => 'Unable to read response');

        // Update the source health status if this isn't a test
        if (source.id !== 'test') {
          await prisma.km_knowledge_sources.update({
            where: { id: source.id },
            data: {
              lastSyncStatus: 'Failed',
              lastSyncAt: new Date(),
              lastSyncDuration: responseTime,
              lastSyncErrorMessage: result.errorMessage
            }
          });
        }
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      result.responseTime = responseTime;
      result.status = 'unhealthy';
      result.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.details = `Connection failed: ${result.errorMessage}`;

      // Update the source health status if this isn't a test
      if (source.id !== 'test') {
        await prisma.km_knowledge_sources.update({
          where: { id: source.id },
          data: {
            lastSyncStatus: 'Failed',
            lastSyncAt: new Date(),
            lastSyncDuration: responseTime,
            lastSyncErrorMessage: result.errorMessage
          }
        });
      }
    }

    return result;
  }

  async getN8NIntegrationMetadata(id: string) {
    const source = await prisma.km_knowledge_sources.findUnique({
      where: { id }
    });

    if (!source) {
      throw new Error('Knowledge source not found');
    }

    // Return metadata for N8N integration
    return {
      id: source.id,
      name: source.name,
      description: source.description,
      sourceType: source.sourceType,
      connectionUrl: source.connectionUrl,
      authenticationMethod: source.authenticationMethod,
      isEnabled: source.isEnabled,
      isActive: source.isActive,
      supportedContentTypes: source.supportedContentTypes,
      supportedOperations: source.supportedOperations,
      capabilities: source.capabilities,
      metadata: source.metadata,
      lastSyncStatus: source.lastSyncStatus,
      lastSyncAt: source.lastSyncAt
    };
  }

  private transformKnowledgeSource(source: any) {
    // Parse credentials if they exist (but don't return them for security)
    let authConfig = {};
    if (source.authenticationCredentials) {
      try {
        const parsed = JSON.parse(source.authenticationCredentials);
        // Return only non-sensitive metadata about auth config
        authConfig = {
          hasCredentials: true,
          method: source.authenticationMethod,
          ...(parsed.username && { username: parsed.username }),
          ...(parsed.headerName && { headerName: parsed.headerName })
        };
      } catch {
        authConfig = { hasCredentials: false };
      }
    }

    return {
      id: source.id,
      name: source.name,
      description: source.description,
      endpointUrl: source.connectionUrl,
      authType: this.mapAuthMethodToApiFormat(source.authenticationMethod),
      authConfig,
      status: source.isActive ? 'active' : 'inactive',
      metadata: source.metadata || {},
      createdAt: source.createdAt.toISOString(),
      updatedAt: source.updatedAt.toISOString(),
      createdBy: source.configuredBy,
      lastHealthCheck: source.lastSyncAt?.toISOString(),
      healthStatus: this.mapSyncStatusToHealthStatus(source.lastSyncStatus),
      sourceType: source.sourceType,
      isEnabled: source.isEnabled,
      syncFrequency: source.syncFrequency,
      lastSyncDuration: source.lastSyncDuration,
      supportedContentTypes: source.supportedContentTypes,
      supportedOperations: source.supportedOperations,
      capabilities: source.capabilities
    };
  }

  private mapAuthMethodToApiFormat(method: KnowledgeSourceAuthMethod): string {
    switch (method) {
      case 'None':
        return 'none';
      case 'Basic_Auth':
        return 'basic';
      case 'API_Key':
        return 'api_key';
      case 'OAuth2':
        return 'oauth';
      default:
        return 'none';
    }
  }

  private mapSyncStatusToHealthStatus(status: KnowledgeSourceSyncStatus): string {
    switch (status) {
      case 'Completed':
        return 'healthy';
      case 'Failed':
      case 'Authentication_Error':
      case 'Network_Error':
      case 'Configuration_Error':
        return 'unhealthy';
      default:
        return 'unknown';
    }
  }
}

export const knowledgeSourceService = new KnowledgeSourceService();
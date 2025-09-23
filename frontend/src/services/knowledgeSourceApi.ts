// API service for knowledge source configuration operations
const inferDefaultKnowledgeSourceBase = () => {
  try {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:3000/api/knowledge-sources';
    }
    return 'http://api.tip.localhost/api/knowledge-sources';
  } catch {
    return 'http://api.tip.localhost/api/knowledge-sources';
  }
};

const API_BASE_URL = (import.meta as any)?.env?.VITE_KNOWLEDGE_SOURCE_BASE_URL || inferDefaultKnowledgeSourceBase();

// Types for Knowledge Source Configuration
export interface KnowledgeSource {
  id: string;
  name: string;
  description?: string;
  endpointUrl: string;
  authType: 'none' | 'basic' | 'oauth' | 'api_key';
  authConfig?: Record<string, any>;
  status: 'active' | 'inactive';
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastHealthCheck?: string;
  healthStatus?: 'healthy' | 'unhealthy' | 'unknown';
  sourceType?: string;
  isEnabled?: boolean;
  syncFrequency?: string;
  lastSyncDuration?: number;
  supportedContentTypes?: string[];
  supportedOperations?: string[];
  capabilities?: Record<string, any>;
}

export interface CreateKnowledgeSourceRequest {
  name: string;
  description?: string;
  endpointUrl: string;
  sourceType?: string;
  authType: 'none' | 'basic' | 'oauth' | 'api_key';
  authConfig?: Record<string, any>;
  metadata?: Record<string, any>;
  syncFrequency?: string;
  dataRetentionDays?: number;
  maxRecordsPerSync?: number;
  supportedContentTypes?: string[];
  supportedOperations?: string[];
  capabilities?: Record<string, any>;
}

export interface UpdateKnowledgeSourceRequest extends Partial<CreateKnowledgeSourceRequest> {
  status?: 'active' | 'inactive';
}

export interface KnowledgeSourceHealthCheck {
  sourceId: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  lastCheck: string;
  details?: string;
  responseTime?: number;
}

class KnowledgeSourceApiService {
  private async getAuthHeaders(): Promise<Headers> {
    const headers = new Headers({
      'Content-Type': 'application/json',
    });

    // Add auth bypass header if enabled (for development)
    const authBypass = localStorage.getItem('authBypass') === 'true';
    if (authBypass) {
      headers.set('x-auth-bypass', 'true');
    }

    // Add JWT token if available
    const token = localStorage.getItem('token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  async getAllKnowledgeSources(): Promise<KnowledgeSource[]> {
    const response = await fetch(API_BASE_URL, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse<KnowledgeSource[]>(response);
  }

  async getKnowledgeSource(id: string): Promise<KnowledgeSource> {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse<KnowledgeSource>(response);
  }

  async createKnowledgeSource(data: CreateKnowledgeSourceRequest): Promise<KnowledgeSource> {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<KnowledgeSource>(response);
  }

  async updateKnowledgeSource(id: string, data: UpdateKnowledgeSourceRequest): Promise<KnowledgeSource> {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<KnowledgeSource>(response);
  }

  async deleteKnowledgeSource(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'DELETE',
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
  }

  async testConnection(id: string): Promise<KnowledgeSourceHealthCheck> {
    const response = await fetch(`${API_BASE_URL}/${id}/health`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse<KnowledgeSourceHealthCheck>(response);
  }

  async testConnectionConfig(config: CreateKnowledgeSourceRequest): Promise<KnowledgeSourceHealthCheck> {
    const response = await fetch(`${API_BASE_URL}/test-connection`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(config),
    });
    return this.handleResponse<KnowledgeSourceHealthCheck>(response);
  }

  async getN8NIntegrationMetadata(id: string): Promise<Record<string, any>> {
    const response = await fetch(`${API_BASE_URL}/${id}/n8n-metadata`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse<Record<string, any>>(response);
  }
}

export const knowledgeSourceApi = new KnowledgeSourceApiService();
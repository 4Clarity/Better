// API service for knowledge document operations
const inferDefaultDocumentApiBase = () => {
  try {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:8000/api/knowledge/documents';
    }
    return 'http://py.tip.localhost/api/knowledge/documents';
  } catch {
    return 'http://py.tip.localhost/api/knowledge/documents';
  }
};

const API_BASE_URL = (import.meta as any)?.env?.VITE_DOCUMENT_API_BASE_URL || inferDefaultDocumentApiBase();

class DocumentApiService {
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
      throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Trigger document processing via n8n workflow
   *
   * @param documentId - UUID of the document to process
   * @returns Processing status
   */
  async triggerDocumentProcessing(documentId: string): Promise<{
    success: boolean;
    document_id: string;
    filename: string;
    n8n_status: number;
    message: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/${documentId}/process`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  /**
   * Get document processing status
   *
   * @param documentId - UUID of the document
   * @returns Document status
   */
  async getDocumentStatus(documentId: string): Promise<{
    id: string;
    filename: string;
    upload_status: string;
    chunk_count: number;
    processing_error?: string;
  }> {
    const response = await fetch(`${API_BASE_URL.replace('/documents', '')}/${documentId}/status`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  /**
   * List all documents
   *
   * @param options - Query options
   * @returns List of documents
   */
  async listDocuments(options?: {
    limit?: number;
    offset?: number;
    security_classification?: string;
  }): Promise<{
    documents: Array<{
      id: string;
      filename: string;
      upload_status: string;
      chunk_count: number;
      created_at: string;
      security_classification?: string;
    }>;
    count: number;
  }> {
    const queryParams = new URLSearchParams();
    if (options?.limit) queryParams.append('limit', options.limit.toString());
    if (options?.offset) queryParams.append('offset', options.offset.toString());
    if (options?.security_classification) queryParams.append('security_classification', options.security_classification);

    const url = `${API_BASE_URL.replace('/documents', '')}/documents${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }
}

export const documentApi = new DocumentApiService();

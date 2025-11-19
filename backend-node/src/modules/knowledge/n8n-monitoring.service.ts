import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

/**
 * n8n Workflow Execution History
 */
export interface ExecutionHistory {
  id: string;
  documentId: string;
  documentName: string;
  startedAt: Date;
  finishedAt?: Date;
  duration?: number; // in milliseconds
  status: 'running' | 'success' | 'failed';
  error?: string;
  n8nWorkflowId: string;
}

/**
 * Aggregated Workflow Metrics
 */
export interface WorkflowMetrics {
  successRate: number;
  avgDuration: number; // in milliseconds
  totalExecutions: number;
  failureRate: number;
  executionsByDay: { date: string; count: number }[];
}

/**
 * Detailed Execution Information
 */
export interface ExecutionDetails {
  id: string;
  workflowId: string;
  documentId: string;
  documentName: string;
  status: 'running' | 'success' | 'failed';
  startedAt: Date;
  finishedAt?: Date;
  duration?: number;
  error?: string;
  steps: {
    name: string;
    status: string;
    duration?: number;
    error?: string;
  }[];
  metadata: Record<string, any>;
}

/**
 * N8N Monitoring Service
 * Tracks workflow executions and displays metrics for document processing
 */
export class N8NMonitoringService {
  private n8nApiUrl: string;
  private n8nApiKey: string;
  private isEnabled: boolean;

  constructor() {
    this.n8nApiUrl = process.env.N8N_API_URL || 'http://n8n:5678/api/v1';
    this.n8nApiKey = process.env.N8N_API_KEY || '';
    this.isEnabled = process.env.N8N_ENABLED === 'true';
  }

  /**
   * Get workflow execution history for a specific document
   * Queries n8n API for execution data
   */
  async getWorkflowExecutions(documentId: string): Promise<ExecutionHistory[]> {
    try {
      // Get document from database to get n8n workflow ID
      const document = await prisma.knowledge_documents.findUnique({
        where: { id: documentId },
        select: {
          id: true,
          filename: true,
          original_name: true,
          n8n_workflow_id: true,
          n8n_triggered_at: true,
          n8n_completed_at: true,
          n8n_execution_status: true,
          n8n_execution_error: true,
        },
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // If n8n is not enabled or no workflow ID, return local execution data only
      if (!this.isEnabled || !document.n8n_workflow_id) {
        return this.getLocalExecutionHistory(document);
      }

      // Query n8n API for execution history
      const executions = await this.queryN8NExecutions(document.n8n_workflow_id);

      // Combine with local database data
      return this.mergeExecutionData(document, executions);
    } catch (error) {
      console.error('Error fetching workflow executions:', error);
      throw error;
    }
  }

  /**
   * Get aggregated workflow metrics across all documents
   */
  async getWorkflowMetrics(): Promise<WorkflowMetrics> {
    try {
      // Query database for execution statistics
      const documents = await prisma.knowledge_documents.findMany({
        where: {
          n8n_workflow_id: { not: null },
          n8n_triggered_at: { not: null },
        },
        select: {
          n8n_execution_status: true,
          n8n_triggered_at: true,
          n8n_completed_at: true,
          created_at: true,
        },
      });

      const totalExecutions = documents.length;
      const successfulExecutions = documents.filter(
        (doc) => doc.n8n_execution_status === 'COMPLETED'
      ).length;
      const failedExecutions = documents.filter(
        (doc) => doc.n8n_execution_status === 'FAILED'
      ).length;

      // Calculate success and failure rates
      const successRate = totalExecutions > 0 ? successfulExecutions / totalExecutions : 0;
      const failureRate = totalExecutions > 0 ? failedExecutions / totalExecutions : 0;

      // Calculate average duration for completed executions
      const completedDurations = documents
        .filter((doc) => doc.n8n_triggered_at && doc.n8n_completed_at)
        .map((doc) => {
          const start = new Date(doc.n8n_triggered_at!).getTime();
          const end = new Date(doc.n8n_completed_at!).getTime();
          return end - start;
        });

      const avgDuration =
        completedDurations.length > 0
          ? completedDurations.reduce((sum, dur) => sum + dur, 0) / completedDurations.length
          : 0;

      // Group executions by day
      const executionsByDay = this.groupExecutionsByDay(documents);

      return {
        successRate,
        avgDuration,
        totalExecutions,
        failureRate,
        executionsByDay,
      };
    } catch (error) {
      console.error('Error fetching workflow metrics:', error);
      throw error;
    }
  }

  /**
   * Get detailed execution information by execution ID
   */
  async getExecutionById(executionId: string): Promise<ExecutionDetails> {
    try {
      // Try to find document by n8n_workflow_id
      const document = await prisma.knowledge_documents.findFirst({
        where: { n8n_workflow_id: executionId },
        select: {
          id: true,
          filename: true,
          original_name: true,
          n8n_workflow_id: true,
          n8n_triggered_at: true,
          n8n_completed_at: true,
          n8n_execution_status: true,
          n8n_execution_error: true,
        },
      });

      if (!document) {
        throw new Error('Execution not found');
      }

      // If n8n is enabled, query API for detailed execution data
      let n8nDetails: any = null;
      if (this.isEnabled && this.n8nApiKey) {
        n8nDetails = await this.queryN8NExecutionDetails(executionId);
      }

      // Build execution details
      const duration =
        document.n8n_triggered_at && document.n8n_completed_at
          ? new Date(document.n8n_completed_at).getTime() -
            new Date(document.n8n_triggered_at).getTime()
          : undefined;

      const status = this.mapExecutionStatus(document.n8n_execution_status);

      return {
        id: executionId,
        workflowId: document.n8n_workflow_id || '',
        documentId: document.id,
        documentName: document.original_name,
        status,
        startedAt: document.n8n_triggered_at || new Date(),
        finishedAt: document.n8n_completed_at || undefined,
        duration,
        error: document.n8n_execution_error || undefined,
        steps: n8nDetails?.steps || [],
        metadata: n8nDetails?.metadata || {},
      };
    } catch (error) {
      console.error('Error fetching execution details:', error);
      throw error;
    }
  }

  /**
   * Retry workflow for a failed document
   * Triggers a new n8n workflow execution
   */
  async retryWorkflow(documentId: string): Promise<void> {
    try {
      const document = await prisma.knowledge_documents.findUnique({
        where: { id: documentId },
        select: {
          id: true,
          storage_path: true,
          mime_type: true,
          n8n_execution_status: true,
        },
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // Only allow retry for failed documents
      if (document.n8n_execution_status !== 'FAILED') {
        throw new Error('Can only retry failed workflow executions');
      }

      if (!this.isEnabled) {
        throw new Error('n8n workflow integration is not enabled');
      }

      // Trigger new n8n workflow execution
      const workflowId = await this.triggerN8NWorkflow(document);

      // Update document status
      await prisma.knowledge_documents.update({
        where: { id: documentId },
        data: {
          n8n_workflow_id: workflowId,
          n8n_execution_status: 'RUNNING',
          n8n_execution_error: null,
          n8n_triggered_at: new Date(),
          n8n_completed_at: null,
          upload_status: 'ANALYZING',
        },
      });
    } catch (error) {
      console.error('Error retrying workflow:', error);
      throw error;
    }
  }

  /**
   * PRIVATE HELPERS
   */

  /**
   * Get local execution history from database only
   */
  private getLocalExecutionHistory(document: any): ExecutionHistory[] {
    if (!document.n8n_workflow_id || !document.n8n_triggered_at) {
      return [];
    }

    const duration =
      document.n8n_triggered_at && document.n8n_completed_at
        ? new Date(document.n8n_completed_at).getTime() -
          new Date(document.n8n_triggered_at).getTime()
        : undefined;

    return [
      {
        id: document.n8n_workflow_id,
        documentId: document.id,
        documentName: document.original_name,
        startedAt: document.n8n_triggered_at,
        finishedAt: document.n8n_completed_at || undefined,
        duration,
        status: this.mapExecutionStatus(document.n8n_execution_status),
        error: document.n8n_execution_error || undefined,
        n8nWorkflowId: document.n8n_workflow_id,
      },
    ];
  }

  /**
   * Query n8n API for execution data
   */
  private async queryN8NExecutions(workflowId: string): Promise<any[]> {
    try {
      if (!this.n8nApiKey) {
        console.warn('n8n API key not configured, skipping API query');
        return [];
      }

      const response = await axios.get(`${this.n8nApiUrl}/executions`, {
        params: { workflowId },
        headers: {
          'X-N8N-API-KEY': this.n8nApiKey,
        },
        timeout: 5000,
      });

      return response.data.data || [];
    } catch (error) {
      console.error('Error querying n8n API:', error);
      // Don't throw - just return empty array and rely on local data
      return [];
    }
  }

  /**
   * Query n8n API for detailed execution information
   */
  private async queryN8NExecutionDetails(executionId: string): Promise<any> {
    try {
      if (!this.n8nApiKey) {
        return null;
      }

      const response = await axios.get(`${this.n8nApiUrl}/executions/${executionId}`, {
        headers: {
          'X-N8N-API-KEY': this.n8nApiKey,
        },
        timeout: 5000,
      });

      return response.data;
    } catch (error) {
      console.error('Error querying n8n execution details:', error);
      return null;
    }
  }

  /**
   * Merge local database data with n8n API data
   */
  private mergeExecutionData(document: any, _n8nExecutions: any[]): ExecutionHistory[] {
    // For now, prioritize local database data
    // In the future, we can merge n8n API data with local data
    const localExecution = this.getLocalExecutionHistory(document);
    return localExecution;
  }

  /**
   * Map database execution status to API format
   */
  private mapExecutionStatus(dbStatus: string | null): 'running' | 'success' | 'failed' {
    switch (dbStatus) {
      case 'RUNNING':
        return 'running';
      case 'COMPLETED':
        return 'success';
      case 'FAILED':
        return 'failed';
      default:
        return 'running';
    }
  }

  /**
   * Group executions by day for metrics
   */
  private groupExecutionsByDay(
    documents: any[]
  ): { date: string; count: number }[] {
    const grouped = new Map<string, number>();

    documents.forEach((doc) => {
      if (doc.created_at) {
        const date = new Date(doc.created_at).toISOString().split('T')[0];
        grouped.set(date, (grouped.get(date) || 0) + 1);
      }
    });

    return Array.from(grouped.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Trigger n8n workflow for document processing
   */
  private async triggerN8NWorkflow(document: any): Promise<string> {
    try {
      const webhookUrl = process.env.N8N_WEBHOOK_URL;
      if (!webhookUrl) {
        throw new Error('N8N_WEBHOOK_URL not configured');
      }

      const response = await axios.post(
        webhookUrl,
        {
          documentId: document.id,
          storagePath: document.storage_path,
          mimeType: document.mime_type,
        },
        {
          timeout: parseInt(process.env.N8N_WORKFLOW_TIMEOUT_MS || '60000', 10),
        }
      );

      // n8n typically returns execution ID in response
      return response.data.executionId || `n8n-exec-${Date.now()}`;
    } catch (error) {
      console.error('Error triggering n8n workflow:', error);
      throw new Error('Failed to trigger n8n workflow');
    }
  }
}

export const n8nMonitoringService = new N8NMonitoringService();

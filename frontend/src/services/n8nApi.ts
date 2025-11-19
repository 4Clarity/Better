import { WorkflowExecution, WorkflowMetrics } from '../types/n8n';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://api.tip.localhost';

/**
 * Get authorization token from localStorage
 */
const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

/**
 * Create headers with authorization
 */
const createHeaders = (): HeadersInit => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

/**
 * Get workflow executions with optional document filtering
 */
export const getExecutions = async (documentId?: string): Promise<WorkflowExecution[]> => {
  const url = documentId
    ? `${API_BASE_URL}/api/n8n/executions?documentId=${documentId}`
    : `${API_BASE_URL}/api/n8n/executions`;

  const response = await fetch(url, {
    method: 'GET',
    headers: createHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch executions: ${response.statusText}`);
  }

  const data = await response.json();

  // Transform dates from strings to Date objects
  return data.map((execution: any) => ({
    ...execution,
    startedAt: new Date(execution.startedAt),
    finishedAt: execution.finishedAt ? new Date(execution.finishedAt) : undefined,
  }));
};

/**
 * Get workflow metrics
 */
export const getMetrics = async (): Promise<WorkflowMetrics> => {
  const response = await fetch(`${API_BASE_URL}/api/n8n/metrics`, {
    method: 'GET',
    headers: createHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch metrics: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Get a specific execution by ID
 */
export const getExecution = async (executionId: string): Promise<WorkflowExecution> => {
  const response = await fetch(`${API_BASE_URL}/api/n8n/executions/${executionId}`, {
    method: 'GET',
    headers: createHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch execution: ${response.statusText}`);
  }

  const data = await response.json();

  // Transform dates from strings to Date objects
  return {
    ...data,
    startedAt: new Date(data.startedAt),
    finishedAt: data.finishedAt ? new Date(data.finishedAt) : undefined,
  };
};

/**
 * Retry a failed workflow for a specific document
 */
export const retryWorkflow = async (documentId: string): Promise<WorkflowExecution> => {
  const response = await fetch(`${API_BASE_URL}/api/n8n/retry/${documentId}`, {
    method: 'POST',
    headers: createHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to retry workflow: ${response.statusText}`);
  }

  const data = await response.json();

  // Transform dates from strings to Date objects
  return {
    ...data,
    startedAt: new Date(data.startedAt),
    finishedAt: data.finishedAt ? new Date(data.finishedAt) : undefined,
  };
};

export interface WorkflowExecution {
  id: string;
  documentId: string;
  documentName: string;
  startedAt: Date;
  finishedAt?: Date;
  duration?: number;
  status: 'running' | 'success' | 'failed';
  error?: string;
  n8nWorkflowId: string;
}

export interface WorkflowMetrics {
  successRate: number;
  avgDuration: number;
  totalExecutions: number;
  failureRate: number;
}

export interface DocumentRevision {
  id: string;
  documentId: string;
  version: number;
  uploadedAt: Date;
  uploadedBy: string;
  chunks: number;
  status: 'processing' | 'completed' | 'failed';
  isLatest: boolean;
  isDuplicate: boolean;
  fileSize: number;
  fileName: string;
}

export interface DuplicateHandlingStrategy {
  strategy: 'replace' | 'keep_both' | 'ask_user';
  message?: string;
}

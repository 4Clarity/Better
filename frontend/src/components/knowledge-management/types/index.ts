// Knowledge Management Type Definitions
// This ensures type safety across all KM components

export interface NavigationItem {
  name: string;
  path: string;
  icon?: React.ReactNode;
  requiresPermission?: string[];
}

export interface ApprovalStats {
  label: string;
  count: number;
  color: string;
  trend?: 'up' | 'down' | 'stable';
}

export interface Fact {
  id: string;
  content: string;
  source: string;
  confidence: number;
  category: string;
  tags: string[];
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Document {
  id: string;
  name: string;
  type: string;
  status: 'processing' | 'completed' | 'failed';
  uploadedAt: string;
  processingProgress?: number;
  processingStage?: string;
}

export interface CommunicationItem {
  id: string;
  type: 'email' | 'slack' | 'teams';
  subject: string;
  sender: string;
  timestamp: string;
  factsExtracted: number;
  status: 'processed' | 'processing' | 'failed';
}

export interface KMPermissions {
  canViewWeeklyCuration: boolean;
  canUploadDocuments: boolean;
  canViewCommunications: boolean;
  canCurateFacts: boolean;
  canApprove: boolean;
  canSearch: boolean;
  canConfigure: boolean;
}

export interface KMConfiguration {
  autoProcessingThreshold: number;
  factRetentionDays: number;
  enableAutoExtraction: boolean;
  enableCommunicationMonitoring: boolean;
  categories: ConfigCategory[];
  approvalRules: ApprovalRule[];
}

export interface ConfigCategory {
  id: string;
  name: string;
  color: string;
  factCount: number;
}

export interface ApprovalRule {
  id: string;
  role: string;
  permissions: string[];
}
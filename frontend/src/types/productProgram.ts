export enum SecurityClassification {
  UNCLASSIFIED = 'UNCLASSIFIED',
  CUI = 'CUI',
  SECRET = 'SECRET',
  TOP_SECRET = 'TOP_SECRET',
}

export interface CriticalDate {
  date: string; // ISO 8601 format
  description: string;
  type?: 'milestone' | 'deadline' | 'review' | 'other';
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface ProductProgram {
  id: string;
  name: string;
  description: string;
  objectives: string;
  deliverables: string;
  dependencies: string | null;
  securityClassification?: SecurityClassification;
  security_classification?: string; // Backend returns snake_case
  criticalDates?: CriticalDate[];
  critical_dates?: any[]; // Backend returns snake_case
  knowledge_context?: string | null; // Story 4.3
  business_operation_type?: BusinessOperationType | string;
  business_operation_id?: string | null;
  business_operation?: BusinessOperationSummary;
  createdAt?: string;
  updatedAt?: string;
  created_at?: string; // Backend returns snake_case
  updated_at?: string; // Backend returns snake_case
  createdBy?: string;
  updatedBy?: string;
  created_by?: string; // Backend returns snake_case
  updated_by?: string; // Backend returns snake_case
  createdByUser?: User;
  updatedByUser?: User;
  _count?: {
    transitions?: number;
    product_program_stakeholders?: number;
  };
}

export interface CreateProductProgramRequest {
  name: string;
  description: string;
  objectives: string;
  deliverables: string;
  dependencies?: string;
  securityClassification: SecurityClassification;
  criticalDates: CriticalDate[];
}

export interface UpdateProductProgramRequest {
  name?: string;
  description?: string;
  objectives?: string;
  deliverables?: string;
  dependencies?: string | null;
  securityClassification?: SecurityClassification;
  criticalDates?: CriticalDate[];
  knowledgeContext?: string | null; // Story 4.3
}

export interface ProductProgramFilters {
  search?: string;
  securityClassification?: SecurityClassification;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'securityClassification' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ProductProgramListResponse {
  success: boolean;
  data: ProductProgram[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ProductProgramResponse {
  success: boolean;
  data: ProductProgram;
}

export interface DeleteProductProgramResponse {
  success: boolean;
  message: string;
}

// Stakeholder Types (Story 4.2 - Phase 1)

export interface ProductProgramStakeholder {
  id: string;
  productProgramId: string;
  userId: string;
  role: string | null;
  assignedAt: string;
  assignedBy: string;
  user: User;
  assignedByUser: User;
}

export interface AddStakeholderRequest {
  userId: string;
  role?: string;
}

export interface UpdateStakeholderRoleRequest {
  role: string | null;
}

export interface StakeholderResponse {
  success: boolean;
  data: ProductProgramStakeholder;
}

export interface StakeholdersListResponse {
  success: boolean;
  data: ProductProgramStakeholder[];
}

export interface RemoveStakeholderResponse {
  success: boolean;
  message: string;
}

// Transition Types (Story 4.2 - Phase 2)

export interface TransitionSummary {
  id: string;
  name: string;
  contractName: string;
  contractNumber: string;
  status: string;
  startDate: string;
  endDate: string;
  description: string | null;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssignTransitionRequest {
  productProgramId: string;
}

export interface AssignTransitionResponse {
  success: boolean;
  data: TransitionSummary;
}

export interface RemoveTransitionResponse {
  success: boolean;
  message: string;
  data: TransitionSummary;
}

export interface ProductProgramTransitionsResponse {
  success: boolean;
  data: TransitionSummary[];
}

// Business Operation Types (Story 4.2 - Phase 3)

export enum BusinessOperationType {
  Operation = 'Operation',
  Program = 'Program',
  Product = 'Product',
}

export interface BusinessOperationSummary {
  id: string;
  name: string;
  description: string;
  business_operation_type: BusinessOperationType;
}

export interface LinkToBusinessOperationRequest {
  businessOperationId: string;
}

export interface LinkToBusinessOperationResponse {
  success: boolean;
  data: ProductProgram & {
    business_operation?: BusinessOperationSummary;
  };
}

export interface UnlinkFromBusinessOperationResponse {
  success: boolean;
  message: string;
  data: ProductProgram;
}

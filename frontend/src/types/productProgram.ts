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
  securityClassification: SecurityClassification;
  criticalDates: CriticalDate[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  createdByUser?: User;
  updatedByUser?: User;
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

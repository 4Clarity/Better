// Product/Program Milestone Types
// Story 4.3: Knowledge Integration and Advanced Features

export enum MilestoneStatus {
  UPCOMING = 'UPCOMING',
  IN_PROGRESS = 'IN_PROGRESS',
  ACHIEVED = 'ACHIEVED',
  MISSED = 'MISSED',
  CANCELLED = 'CANCELLED',
}

export interface ProductProgramMilestone {
  id: string;
  productProgramId: string;
  title: string;
  description?: string;
  targetDate: string; // ISO 8601 date string
  status: MilestoneStatus;
  achievedAt?: string; // ISO 8601 date string
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  createdByUser?: {
    id: string;
    person?: {
      firstName: string;
      lastName: string;
      primaryEmail: string;
    };
  };
}

export interface CreateMilestoneRequest {
  title: string;
  description?: string;
  targetDate: string; // ISO 8601 date string
  status?: MilestoneStatus;
}

export interface UpdateMilestoneRequest {
  title?: string;
  description?: string;
  targetDate?: string; // ISO 8601 date string
  status?: MilestoneStatus;
}

export interface MilestoneApiResponse {
  success: boolean;
  data: ProductProgramMilestone;
}

export interface MilestoneListApiResponse {
  success: boolean;
  data: ProductProgramMilestone[];
}

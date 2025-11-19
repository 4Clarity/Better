// Product/Program Task Types
// Story 4.3: Knowledge Integration and Advanced Features

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface ProductProgramTask {
  id: string;
  productProgramId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  dueDate?: string; // ISO 8601 date string
  assignedTo?: string;
  completedAt?: string; // ISO 8601 date string
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  assignedUser?: {
    id: string;
    person?: {
      firstName: string;
      lastName: string;
      primaryEmail: string;
    };
  };
  createdByUser?: {
    id: string;
    person?: {
      firstName: string;
      lastName: string;
      primaryEmail: string;
    };
  };
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  status?: TaskStatus;
  dueDate?: string; // ISO 8601 date string
  assignedTo?: string;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  dueDate?: string; // ISO 8601 date string
  assignedTo?: string;
}

export interface TaskApiResponse {
  success: boolean;
  data: ProductProgramTask;
}

export interface TaskListApiResponse {
  success: boolean;
  data: ProductProgramTask[];
}

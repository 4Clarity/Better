const inferDefaultApiBase = () => {
  try {
    const host = window.location.hostname;
    const port = window.location.port;
    // If running locally via Vite (localhost:5173), use the proxy
    if ((host === 'localhost' || host === '127.0.0.1') && port === '5173') {
      return '/api';
    }
    // If running locally but not on Vite port, use direct backend
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:3000/api';
    }
    // If accessing via Traefik hostnames, use proxy
    return 'http://api.tip.localhost/api';
  } catch {
    return '/api';
  }
};

export const API_BASE_URL = (import.meta as any)?.env?.VITE_API_BASE_URL || inferDefaultApiBase();

// Helper function to create URLs that works with both relative and absolute API base URLs
const createApiUrl = (path: string): URL => {
  const fullPath = `${API_BASE_URL}${path}`;
  // If API_BASE_URL starts with '/', it's relative, so we need to provide the base
  if (API_BASE_URL.startsWith('/')) {
    return new URL(fullPath, window.location.origin);
  }
  // Otherwise, it's an absolute URL
  return new URL(fullPath);
};

// Types
export interface BusinessOperation {
  id: string;
  name: string;
  businessFunction: string;
  technicalDomain: string;
  description?: string;
  scope: string;
  objectives: string;
  performanceMetrics: {
    operational?: string[];
    quality?: string[];
    compliance?: string[];
  };
  supportPeriodStart: string;
  supportPeriodEnd: string;
  currentContractEnd: string;
  governmentPMId: string;
  directorId: string;
  currentManagerId?: string;
  createdAt: string;
  updatedAt: string;
  governmentPM?: User;
  director?: User;
  currentManager?: User;
  contracts?: Contract[];
  stakeholders?: OperationStakeholder[];
  _count?: {
    contracts: number;
    stakeholders: number;
  };
}

export interface Contract {
  id: string;
  businessOperationId: string;
  contractName: string;
  contractNumber: string;
  contractorName: string;
  contractorPMId?: string;
  startDate: string;
  endDate: string;
  canBeExtended: boolean;
  status: 'PLANNING' | 'ACTIVE' | 'RENEWAL' | 'EXPIRING' | 'EXPIRED' | 'EXTENDED';
  createdAt: string;
  updatedAt: string;
  businessOperation?: BusinessOperation;
  contractorPM?: User;
  transitions?: EnhancedTransition[];
  _count?: {
    transitions: number;
  };
}

export interface EnhancedTransition {
  id: string;
  contractId?: string;
  contractName: string;
  contractNumber: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  duration: 'IMMEDIATE' | 'THIRTY_DAYS' | 'FORTY_FIVE_DAYS' | 'SIXTY_DAYS' | 'NINETY_DAYS';
  keyPersonnel?: string;
  status: 'NOT_STARTED' | 'ON_TRACK' | 'AT_RISK' | 'BLOCKED' | 'COMPLETED';
  requiresContinuousService: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  contract?: Contract;
  creator?: User;
  milestones?: Milestone[];
  _count?: {
    milestones: number;
  };
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export interface OperationStakeholder {
  id: string;
  businessOperationId: string;
  userId?: string;
  name: string;
  role: string;
  email: string;
  phone?: string;
  organization?: string;
  stakeholderType: 'INTERNAL_PROGRAM' | 'INTERNAL_TECHNICAL' | 'INTERNAL_EXECUTIVE' | 'EXTERNAL_VENDOR' | 'EXTERNAL_SERVICE' | 'EXTERNAL_SME_RESOURCE' | 'INCOMING_CONTRACTOR';
  receiveNotifications: boolean;
  isActive: boolean;
  user?: User;
}

export interface Milestone {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'OVERDUE';
  transitionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  dueDate: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'NOT_STARTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'ON_HOLD' | 'BLOCKED' | 'UNDER_REVIEW' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE';
  transitionId: string;
  milestoneId?: string | null;
  parentTaskId?: string | null;
  orderIndex?: number;
  sequence?: string; // present in tree responses
  children?: Task[]; // present in tree responses
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Tasks API
export const taskApi = {
  async getAll(transitionId: string, params?: {
    status?: Task['status'];
    priority?: Task['priority'];
    page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc'|'desc';
  }): Promise<PaginatedResponse<Task>> {
    const url = createApiUrl(`/transitions/${transitionId}/tasks`);
    if (params) {
      Object.entries(params).forEach(([k,v])=>{ if (v!==undefined && v!==null) url.searchParams.append(k, v.toString()); });
    }
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Failed to fetch tasks: ${res.statusText}`);
    return res.json();
  },
  async create(transitionId: string, data: Omit<Task,'id'|'createdAt'|'updatedAt'|'transitionId'>): Promise<Task> {
    const res = await fetch(`${API_BASE_URL}/transitions/${transitionId}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'program_manager',
        'x-auth-bypass': localStorage.getItem('authBypass') === 'true' ? 'true' : 'false',
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      let message = 'Failed to create task';
      try { const err = await res.json(); if (err?.message) message = err.message; } catch {}
      throw new Error(message);
    }
    return res.json();
  },
  async update(transitionId: string, taskId: string, data: Partial<Omit<Task,'id'|'createdAt'|'updatedAt'|'transitionId'>>): Promise<Task> {
    const res = await fetch(`${API_BASE_URL}/transitions/${transitionId}/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'program_manager',
        'x-auth-bypass': localStorage.getItem('authBypass') === 'true' ? 'true' : 'false',
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      let message = 'Failed to update task';
      try { const err = await res.json(); if (err?.message) message = err.message; } catch {}
      throw new Error(message);
    }
    return res.json();
  },
  async delete(transitionId: string, taskId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/transitions/${transitionId}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: {
        'x-user-role': 'program_manager',
        'x-auth-bypass': localStorage.getItem('authBypass') === 'true' ? 'true' : 'false',
      },
    });
    if (!res.ok) {
      let message = 'Failed to delete task';
      try { const err = await res.json(); if (err?.message) message = err.message; } catch {}
      throw new Error(message);
    }
  },
  async getTree(transitionId: string): Promise<{ data: Task[] }> {
    const res = await fetch(`${API_BASE_URL}/transitions/${transitionId}/tasks/tree`);
    if (!res.ok) throw new Error(`Failed to fetch task tree: ${res.statusText}`);
    return res.json();
  },
  async move(transitionId: string, taskId: string, body: { parentTaskId?: string | null; milestoneId?: string | null; beforeTaskId?: string; afterTaskId?: string; position?: number; }): Promise<Task> {
    const res = await fetch(`${API_BASE_URL}/transitions/${transitionId}/tasks/${taskId}/move`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'program_manager',
        'x-auth-bypass': localStorage.getItem('authBypass') === 'true' ? 'true' : 'false',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      let message = 'Failed to move task';
      try { const err = await res.json(); if (err?.message) message = err.message; } catch {}
      throw new Error(message);
    }
    return res.json();
  },
};

// Business Operations API
export const businessOperationApi = {
  async getAll(params?: {
    search?: string;
    businessFunction?: string;
    technicalDomain?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<BusinessOperation>> {
    const url = createApiUrl(`/business-operations`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value.toString());
        }
      });
    }
    
    const response = await fetch(url.toString());
    if (!response.ok) {
      const errorText = await response.text();
      // Check if this is a database table doesn't exist error
      if (response.status === 500 && errorText.includes('Internal Server Error')) {
        // Return empty result for now when database tables don't exist
        return {
          data: [],
          pagination: { page: 1, limit: 50, total: 0, totalPages: 0 }
        };
      }
      throw new Error(`Failed to fetch business operations: ${response.statusText}`);
    }
    return response.json();
  },

  async getById(id: string): Promise<BusinessOperation> {
    const response = await fetch(`${API_BASE_URL}/business-operations/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch business operation: ${response.statusText}`);
    }
    return response.json();
  },

  async create(data: Omit<BusinessOperation, 'id' | 'createdAt' | 'updatedAt' | 'governmentPM' | 'director' | 'currentManager' | 'contracts' | 'stakeholders' | '_count'>): Promise<BusinessOperation> {
    const response = await fetch(`${API_BASE_URL}/business-operations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      let errorMessage;
      try {
        const error = await response.json();
        errorMessage = error.message || `Failed to create business operation: ${response.statusText}`;
      } catch (parseError) {
        const errorText = await response.text();
        errorMessage = `Failed to create business operation: ${response.status} ${response.statusText} - ${errorText}`;
      }
      throw new Error(errorMessage);
    }
    return response.json();
  },

  async update(id: string, data: Partial<Omit<BusinessOperation, 'id' | 'createdAt' | 'updatedAt' | 'governmentPM' | 'director' | 'currentManager' | 'contracts' | 'stakeholders' | '_count'>>): Promise<BusinessOperation> {
    const response = await fetch(`${API_BASE_URL}/business-operations/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to update business operation: ${response.statusText}`);
    }
    return response.json();
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/business-operations/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to delete business operation: ${response.statusText}`);
    }
  },
};

// Contracts API
export const contractApi = {
  async getAll(params?: {
    businessOperationId?: string;
    search?: string;
    status?: Contract['status'];
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<Contract>> {
    const url = createApiUrl(`/contracts`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value.toString());
        }
      });
    }
    
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Failed to fetch contracts: ${response.statusText}`);
    }
    return response.json();
  },

  async getById(id: string): Promise<Contract> {
    const response = await fetch(`${API_BASE_URL}/contracts/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch contract: ${response.statusText}`);
    }
    return response.json();
  },

  async getByBusinessOperation(businessOperationId: string): Promise<Contract[]> {
    const response = await fetch(`${API_BASE_URL}/contracts/by-business-operation/${businessOperationId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch contracts: ${response.statusText}`);
    }
    return response.json();
  },

  async create(data: Omit<Contract, 'id' | 'createdAt' | 'updatedAt' | 'businessOperation' | 'contractorPM' | 'transitions' | '_count'>): Promise<Contract> {
    const response = await fetch(`${API_BASE_URL}/contracts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to create contract: ${response.statusText}`);
    }
    return response.json();
  },

  async update(id: string, data: Partial<Omit<Contract, 'id' | 'businessOperationId' | 'createdAt' | 'updatedAt' | 'businessOperation' | 'contractorPM' | 'transitions' | '_count'>>): Promise<Contract> {
    const response = await fetch(`${API_BASE_URL}/contracts/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to update contract: ${response.statusText}`);
    }
    return response.json();
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/contracts/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to delete contract: ${response.statusText}`);
    }
  },
};

// Enhanced Transitions API
export const enhancedTransitionApi = {
  async getAll(params?: {
    contractId?: string;
    businessOperationId?: string;
    search?: string;
    status?: EnhancedTransition['status'];
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<EnhancedTransition>> {
    const url = createApiUrl(`/enhanced-transitions`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value.toString());
        }
      });
    }
    
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Failed to fetch enhanced transitions: ${response.statusText}`);
    }
    return response.json();
  },

  async getById(id: string): Promise<EnhancedTransition> {
    const response = await fetch(`${API_BASE_URL}/enhanced-transitions/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch enhanced transition: ${response.statusText}`);
    }
    return response.json();
  },

  async create(data: Omit<EnhancedTransition, 'id' | 'createdAt' | 'updatedAt' | 'contract' | 'creator' | 'milestones' | '_count'>): Promise<EnhancedTransition> {
    console.log('Creating enhanced transition with data:', data);

    const response = await fetch(`${API_BASE_URL}/enhanced-transitions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const responseText = await response.text();
      console.log('Error response body:', responseText);

      let errorMessage = `Failed to create enhanced transition: ${response.statusText}`;
      try {
        const error = JSON.parse(responseText);
        errorMessage = error.message || errorMessage;
      } catch (parseError) {
        errorMessage = `HTTP ${response.status}: ${responseText}`;
      }
      throw new Error(errorMessage);
    }
    return response.json();
  },

  async update(id: string, data: Partial<Omit<EnhancedTransition, 'id' | 'createdAt' | 'updatedAt' | 'contract' | 'creator' | 'milestones' | '_count'> & { contractId?: string }>): Promise<EnhancedTransition> {
    const response = await fetch(`${API_BASE_URL}/enhanced-transitions/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to update enhanced transition: ${response.statusText}`);
    }
    return response.json();
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/enhanced-transitions/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to delete enhanced transition: ${response.statusText}`);
    }
  },
};

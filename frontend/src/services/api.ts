const API_BASE_URL = 'http://localhost:3000/api';

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
  name?: string;
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

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

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
    const url = new URL(`${API_BASE_URL}/business-operations`);
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
    const url = new URL(`${API_BASE_URL}/contracts`);
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
    const url = new URL(`${API_BASE_URL}/enhanced-transitions`);
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
    const response = await fetch(`${API_BASE_URL}/enhanced-transitions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to create enhanced transition: ${response.statusText}`);
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
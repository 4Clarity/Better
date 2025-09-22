// API service for user management operations
const inferDefaultUserMgmtBase = () => {
  try {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:3000/api/user-management';
    }
    return 'http://api.tip.localhost/api/user-management';
  } catch {
    return 'http://api.tip.localhost/api/user-management';
  }
};

const API_BASE_URL = (import.meta as any)?.env?.VITE_USER_MGMT_BASE_URL || inferDefaultUserMgmtBase();

// Types based on the backend schemas
export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  preferredName?: string;
  title?: string;
  primaryEmail: string;
  alternateEmail?: string;
  workPhone?: string;
  mobilePhone?: string;
  workLocation?: string;
  professionalSummary?: string;
  securityClearanceLevel?: 'None' | 'Public_Trust' | 'Confidential' | 'Secret' | 'Top_Secret' | 'TS_SCI';
  clearanceExpirationDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string; // Current API returns single role
  username?: string;
  keycloakId?: string;
  accountStatus?: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'LOCKED' | 'EXPIRED' | 'DEACTIVATED';
  statusReason?: string;
  roles?: string[]; // Legacy field for compatibility
  permissions?: Record<string, any>;
  sessionTimeout?: number;
  allowedIpRanges?: string[];
  lastLoginAt?: string;
  invitationToken?: string;
  invitationExpiresAt?: string;
  invitedBy?: string;
  createdAt: string;
  updatedAt: string;
  deactivatedBy?: string;
  deactivatedAt?: string;
  personId: string;
  registrationRequestId?: string;
  person: Person;
  organizationAffiliations?: OrganizationAffiliation[];
}

export interface OrganizationAffiliation {
  id: string;
  organizationId: string;
  jobTitle?: string;
  department?: string;
  affiliationType: 'EMPLOYEE' | 'CONTRACTOR' | 'CONSULTANT' | 'VENDOR' | 'PARTNER' | 'VOLUNTEER' | 'INTERN';
  employmentStatus: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED' | 'RESIGNED' | 'RETIRED' | 'CONTRACT_ENDED' | 'TRANSFERRED';
  accessLevel: 'VISITOR' | 'STANDARD' | 'ELEVATED' | 'ADMINISTRATIVE' | 'EXECUTIVE';
  contractNumber?: string;
  organization?: {
    id: string;
    name: string;
    type: string;
  };
}

export interface UserInvitationData {
  personData: {
    firstName: string;
    lastName: string;
    middleName?: string;
    preferredName?: string;
    title?: string;
    primaryEmail: string;
    alternateEmail?: string;
    workPhone?: string;
    mobilePhone?: string;
    workLocation?: string;
    professionalSummary?: string;
    securityClearanceLevel?: 'None' | 'Public_Trust' | 'Confidential' | 'Secret' | 'Top_Secret' | 'TS_SCI';
  };
  userData: {
    username: string;
    password: string;
    roles: string[];
    sessionTimeout?: number;
    allowedIpRanges?: string[];
    permissions?: Record<string, any>;
  };
  organizationAffiliation?: {
    organizationId: string;
    jobTitle?: string;
    department?: string;
    affiliationType: 'Employee' | 'Contractor' | 'Consultant' | 'Vendor' | 'Partner' | 'Volunteer' | 'Intern';
    employmentStatus: 'Active' | 'On_Leave' | 'Terminated' | 'Resigned' | 'Retired' | 'Contract_Ended' | 'Transferred';
    accessLevel: 'Visitor' | 'Standard' | 'Elevated' | 'Administrative' | 'Executive';
    contractNumber?: string;
  };
}

export interface UsersResponse {
  users: User[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface SecurityDashboard {
  totalUsers: number;
  activeUsers: number;
  pendingInvitations: number;
  expiringSecurity: number;
  clearanceLevelCounts: Record<string, number>;
  recentActivity: {
    id: string;
    type: string;
    description: string;
    timestamp: string;
    userId?: string;
  }[];
}

// API functions
export class UserManagementApi {
  private static getAuthHeaders(): Record<string, string> {
    // Get stored token from localStorage (same as authApi does)
    const token = localStorage.getItem('sessionToken');
    const authBypass = localStorage.getItem('authBypass') === 'true';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add auth headers if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Add auth bypass for development
    if (authBypass) {
      headers['x-auth-bypass'] = 'true';
    }

    return headers;
  }

  private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error occurred' }));
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Get all users with filtering and pagination
  static async getUsers(params: {
    accountStatus?: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'LOCKED' | 'EXPIRED' | 'DEACTIVATED';
    organizationId?: string;
    role?: string;
    searchTerm?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<UsersResponse> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    const endpoint = `/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const backendResponse = await this.request<{
      users: User[];
      totalCount: number;
      page: number;
      pageSize: number;
    }>(endpoint);
    
    // Check if response is already in expected format (has pagination object)
    if ((backendResponse as any).pagination) {
      return backendResponse as unknown as UsersResponse;
    }
    
    // Transform backend response to match frontend expected format
    const totalPages = Math.ceil(backendResponse.totalCount / backendResponse.pageSize);
    return {
      users: backendResponse.users,
      pagination: {
        page: backendResponse.page,
        pageSize: backendResponse.pageSize,
        totalCount: backendResponse.totalCount,
        totalPages,
      },
    };
  }

  // Get user by ID
  static async getUserById(id: string): Promise<User> {
    return this.request<User>(`/users/${id}`);
  }

  // Invite new user
  static async inviteUser(invitationData: UserInvitationData): Promise<{
    message: string;
    userId: string;
    personId: string;
  }> {
    return this.request('/users/invite', {
      method: 'POST',
      body: JSON.stringify(invitationData),
    });
  }

  // Accept invitation
  static async acceptInvitation(data: {
    invitationToken: string;
    keycloakId: string;
    confirmationData?: {
      password?: string;
      twoFactorEnabled?: boolean;
      deviceFingerprint?: string;
    };
  }): Promise<{ message: string; userId: string }> {
    return this.request('/users/accept-invitation', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Resend invitation
  static async resendInvitation(userId: string): Promise<{ message: string }> {
    return this.request(`/users/${userId}/resend-invitation`, {
      method: 'POST',
    });
  }

  // Update user status with enhanced reason tracking
  static async updateUserStatus(userId: string, data: {
    accountStatus: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'LOCKED' | 'EXPIRED' | 'DEACTIVATED';
    statusReason?: string;
    reasonCode?: string;
  }): Promise<{
    message: string;
    user: {
      id: string;
      accountStatus: string;
      statusReason?: string;
    };
  }> {
    return this.request(`/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Get user status history for audit trail
  static async getUserStatusHistory(userId: string): Promise<{
    userId: string;
    statusHistory: Array<{
      id: string;
      fromStatus: string;
      toStatus: string;
      reason?: string;
      reasonCode?: string;
      changedBy?: string;
      changedAt: string;
      changedByUser?: {
        person: {
          firstName: string;
          lastName: string;
          primaryEmail: string;
        };
      };
    }>;
  }> {
    return this.request(`/users/${userId}/status-history`, {
      method: 'GET',
    });
  }

  // Approve or reject status change
  static async approveStatusChange(userId: string, data: {
    approved: boolean;
    approvalReason?: string;
  }): Promise<{
    message: string;
    approval: {
      userId: string;
      approved: boolean;
      approvalReason?: string;
      approvedBy: string;
      approvedAt: string;
    };
  }> {
    return this.request(`/users/${userId}/approve-status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Reactivate suspended user account
  static async reactivateUser(userId: string, reason?: string): Promise<{
    message: string;
    user: {
      id: string;
      accountStatus: string;
      statusReason?: string;
      reactivatedBy: string;
      reactivatedAt: string;
    };
  }> {
    return this.request(`/users/${userId}/reactivate`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // Update user security information
  static async updateUserSecurity(userId: string, data: {
    securityClearanceLevel?: 'None' | 'Public_Trust' | 'Confidential' | 'Secret' | 'Top_Secret' | 'TS_SCI';
    clearanceExpirationDate?: string;
  }): Promise<{
    message: string;
    person: {
      id: string;
      securityClearanceLevel?: string;
      clearanceExpirationDate?: string;
    };
  }> {
    return this.request(`/users/${userId}/security`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Update user roles
  static async updateUserRoles(userId: string, roles: string[]): Promise<{
    message: string;
    user: {
      id: string;
      roles: string[];
    };
  }> {
    return this.request(`/users/${userId}/roles`, {
      method: 'PUT',
      body: JSON.stringify({ roles }),
    });
  }

  // Get person by ID
  static async getPersonById(id: string): Promise<Person> {
    return this.request<Person>(`/persons/${id}`);
  }

  // Update person information
  static async updatePerson(id: string, data: Partial<Omit<Person, 'id' | 'createdAt' | 'updatedAt'>>): Promise<{
    message: string;
    person: Person;
  }> {
    return this.request(`/persons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Get security dashboard data
  static async getSecurityDashboard(): Promise<SecurityDashboard> {
    return this.request<SecurityDashboard>('/security/dashboard');
  }

  // Record user login
  static async recordUserLogin(userId: string, data: {
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ message: string }> {
    return this.request(`/users/${userId}/login`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Record failed login attempt
  static async recordFailedLogin(username: string): Promise<{ message: string }> {
    return this.request('/auth/failed-login', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
  }

  // Transition user management
  static async inviteUserToTransition(transitionId: string, data: {
    userId: string;
    role: 'PROGRAM_MANAGER' | 'DEPARTING_CONTRACTOR' | 'INCOMING_CONTRACTOR' | 'SECURITY_OFFICER' | 'OBSERVER';
    platformAccess: 'DISABLED' | 'READ_ONLY' | 'STANDARD' | 'FULL_ACCESS';
    accessNotes?: string;
  }): Promise<{
    message: string;
    transitionUser: any;
  }> {
    return this.request(`/transitions/${transitionId}/users`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async getTransitionUsers(transitionId: string): Promise<any[]> {
    return this.request<any[]>(`/transitions/${transitionId}/users`);
  }

  static async updateTransitionUserAccess(transitionId: string, userId: string, data: {
    role?: 'PROGRAM_MANAGER' | 'DEPARTING_CONTRACTOR' | 'INCOMING_CONTRACTOR' | 'SECURITY_OFFICER' | 'OBSERVER';
    securityStatus?: 'PENDING' | 'IN_PROCESS' | 'INTERIM_CLEARED' | 'CLEARED' | 'DENIED' | 'REVOKED';
    platformAccess?: 'DISABLED' | 'READ_ONLY' | 'STANDARD' | 'FULL_ACCESS';
    accessNotes?: string;
  }): Promise<{
    message: string;
    transitionUser: any;
  }> {
    return this.request(`/transitions/${transitionId}/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}

export default UserManagementApi;

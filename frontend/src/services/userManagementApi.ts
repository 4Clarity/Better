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
  securityClearanceLevel?: 'NONE' | 'PUBLIC_TRUST' | 'CONFIDENTIAL' | 'SECRET' | 'TOP_SECRET' | 'TS_SCI';
  clearanceExpirationDate?: string;
  pivStatus: 'PIV_VERIFIED' | 'PIV_EXCEPTION_PENDING' | 'PIV_EXCEPTION_INTERIM' | 'PIV_EXPIRED' | 'PIV_SUSPENDED';
  pivExpirationDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  username: string;
  keycloakId?: string;
  accountStatus: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'LOCKED' | 'EXPIRED' | 'DEACTIVATED';
  statusReason?: string;
  roles: string[];
  permissions?: Record<string, any>;
  sessionTimeout?: number;
  allowedIpRanges?: string[];
  lastLoginAt?: string;
  invitationToken?: string;
  invitationExpiresAt?: string;
  invitedBy: string;
  createdAt: string;
  updatedAt: string;
  deactivatedBy?: string;
  deactivatedAt?: string;
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
    securityClearanceLevel?: 'NONE' | 'PUBLIC_TRUST' | 'CONFIDENTIAL' | 'SECRET' | 'TOP_SECRET' | 'TS_SCI';
    pivStatus?: 'PIV_VERIFIED' | 'PIV_EXCEPTION_PENDING' | 'PIV_EXCEPTION_INTERIM' | 'PIV_EXPIRED' | 'PIV_SUSPENDED';
  };
  userData: {
    username: string;
    roles: string[];
    sessionTimeout?: number;
    allowedIpRanges?: string[];
    permissions?: Record<string, any>;
  };
  organizationAffiliation?: {
    organizationId: string;
    jobTitle?: string;
    department?: string;
    affiliationType: 'EMPLOYEE' | 'CONTRACTOR' | 'CONSULTANT' | 'VENDOR' | 'PARTNER' | 'VOLUNTEER' | 'INTERN';
    employmentStatus: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED' | 'RESIGNED' | 'RETIRED' | 'CONTRACT_ENDED' | 'TRANSFERRED';
    accessLevel: 'VISITOR' | 'STANDARD' | 'ELEVATED' | 'ADMINISTRATIVE' | 'EXECUTIVE';
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
  pivStatusCounts: Record<string, number>;
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
  private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
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
      return backendResponse as UsersResponse;
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

  // Update user status
  static async updateUserStatus(userId: string, data: {
    accountStatus: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'LOCKED' | 'EXPIRED' | 'DEACTIVATED';
    statusReason?: string;
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

  // Update user security information
  static async updateUserSecurity(userId: string, data: {
    securityClearanceLevel?: 'NONE' | 'PUBLIC_TRUST' | 'CONFIDENTIAL' | 'SECRET' | 'TOP_SECRET' | 'TS_SCI';
    clearanceExpirationDate?: string;
    pivStatus?: 'PIV_VERIFIED' | 'PIV_EXCEPTION_PENDING' | 'PIV_EXCEPTION_INTERIM' | 'PIV_EXPIRED' | 'PIV_SUSPENDED';
    pivExpirationDate?: string;
  }): Promise<{
    message: string;
    person: {
      id: string;
      securityClearanceLevel?: string;
      clearanceExpirationDate?: string;
      pivStatus: string;
      pivExpirationDate?: string;
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

import { API_BASE_URL } from './api';

// Types
export interface AuthUser {
  id: string;
  username: string;
  email: string;
  roles: string[];
  impersonatedRole?: string; // Current impersonated role
  originalRoles?: string[];  // Original user roles before impersonation
  isImpersonating?: boolean; // Flag to indicate impersonation state
  isFirstUser?: boolean;
  person?: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string;
  };
}

export interface LoginRequest {
  keycloakToken: string;
  deviceInfo?: {
    userAgent?: string;
    ipAddress?: string;
  };
}

export interface EmailLookupRequest {
  email: string;
}

export interface EmailLookupResponse {
  message: string;
  data: {
    email: string;
    displayName: string;
    authMethods: string[];
    requiresChallenge: boolean;
  };
}

export interface PasswordAuthRequest {
  email: string;
  password: string;
  method: 'password';
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: AuthUser;
    sessionToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  success: boolean;
  message: string;
  data: {
    sessionToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface LogoutRequest {
  refreshToken?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export interface UserProfileResponse {
  success: boolean;
  data: AuthUser;
}

export interface SessionValidationResponse {
  success: boolean;
  data: {
    valid: boolean;
    user: AuthUser | null;
  };
}

// Authentication API Service
export class AuthenticationApi {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/auth`;
  }

  /**
   * Login with Keycloak token
   */
  async login(loginData: LoginRequest): Promise<LoginResponse> {
    // For demo login during development
    if (loginData.keycloakToken === 'demo-token-for-development') {
      return this.demoLogin();
    }

    const response = await fetch(`${this.baseUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...loginData,
        deviceInfo: {
          userAgent: navigator.userAgent,
          ...loginData.deviceInfo,
        },
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Login failed');
    }

    // Transform response to match expected format
    return {
      success: true,
      message: result.message,
      data: {
        user: result.user,
        sessionToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        expiresIn: result.tokens.expiresIn,
      },
    };
  }

  /**
   * Look up user by email and get available auth methods
   */
  async lookupUserByEmail(email: string): Promise<EmailLookupResponse> {
    const response = await fetch(`${this.baseUrl}/lookup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Email lookup failed');
    }

    return result;
  }

  /**
   * Authenticate user with password
   */
  async authenticateWithPassword(email: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${this.baseUrl}/authenticate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        method: 'password',
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Authentication failed');
    }

    // Transform response to match expected format
    return {
      success: true,
      message: result.message,
      data: {
        user: result.user,
        sessionToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        expiresIn: result.tokens.expiresIn,
      },
    };
  }

  /**
   * Demo login for development
   */
  async demoLogin(): Promise<LoginResponse> {
    const url = `${this.baseUrl}/demo-login`;
    console.log('Demo login URL:', url);
    console.log('API_BASE_URL:', API_BASE_URL);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}), // Empty body but properly formatted
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    // Check if response has content
    const responseText = await response.text();
    console.log('Response body:', responseText);

    if (!response.ok) {
      let errorMessage = 'Demo login failed';
      try {
        const errorResult = JSON.parse(responseText);
        errorMessage = errorResult.message || errorMessage;
      } catch (parseError) {
        errorMessage = `HTTP ${response.status}: ${responseText || response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    // Parse the response text as JSON
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      throw new Error(`Invalid JSON response: ${responseText}`);
    }

    // Transform the response to match LoginResponse format
    return {
      success: true,
      message: result.message,
      data: {
        user: result.user,
        sessionToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        expiresIn: result.tokens.expiresIn,
      },
    };
  }

  /**
   * Logout current session
   */
  async logout(logoutData?: LogoutRequest): Promise<AuthResponse> {
    const token = this.getStoredToken();
    if (!token && !logoutData?.refreshToken) {
      return { success: true, message: 'Already logged out' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          'x-auth-bypass': localStorage.getItem('authBypass') === 'true' ? 'true' : 'false',
        },
        body: JSON.stringify(logoutData || {}),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Logout error:', error);
      return { success: true, message: 'Logout completed' };
    } finally {
      // Always clear local storage
      this.clearStoredTokens();
    }
  }

  /**
   * Refresh session token
   */
  async refreshSession(refreshData: RefreshRequest): Promise<RefreshResponse> {
    const response = await fetch(`${this.baseUrl}/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(refreshData),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Token refresh failed');
    }

    return result;
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<UserProfileResponse> {
    const token = this.getStoredToken();

    const response = await fetch(`${this.baseUrl}/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        'x-auth-bypass': localStorage.getItem('authBypass') === 'true' ? 'true' : 'false',
      },
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to get user profile');
    }

    // Transform the response format
    return {
      success: true,
      data: result.user,
    };
  }

  /**
   * Validate current session
   */
  async validateSession(): Promise<SessionValidationResponse> {
    const token = this.getStoredToken();
    
    try {
      const response = await fetch(`${this.baseUrl}/validate`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          'x-auth-bypass': localStorage.getItem('authBypass') === 'true' ? 'true' : 'false',
        },
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Session validation error:', error);
      return {
        success: true,
        data: { valid: false, user: null },
      };
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: { firstName?: string; lastName?: string }): Promise<AuthResponse> {
    const token = this.getStoredToken();

    const response = await fetch(`${this.baseUrl}/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        'x-auth-bypass': localStorage.getItem('authBypass') === 'true' ? 'true' : 'false',
      },
      body: JSON.stringify(updates),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to update profile');
    }

    return result;
  }

  /**
   * Store authentication tokens
   */
  storeTokens(sessionToken: string, refreshToken: string): void {
    localStorage.setItem('authToken', sessionToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('tokenExpiry', (Date.now() + 15 * 60 * 1000).toString()); // 15 minutes
  }

  /**
   * Get stored session token
   */
  getStoredToken(): string | null {
    const token = localStorage.getItem('authToken');
    const expiry = localStorage.getItem('tokenExpiry');
    
    if (!token || !expiry) {
      return null;
    }

    if (Date.now() > parseInt(expiry)) {
      // Token expired, try to refresh
      this.attemptTokenRefresh();
      return null;
    }

    return token;
  }

  /**
   * Get stored refresh token
   */
  getStoredRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  /**
   * Clear stored tokens
   */
  clearStoredTokens(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiry');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getStoredToken();
    return !!token;
  }

  /**
   * Check if user has specific roles (case-insensitive)
   */
  hasRoles(requiredRoles: string[], user?: AuthUser): boolean {
    if (!user) return false;
    if (!requiredRoles.length) return true;

    // Normalize roles to lowercase for comparison
    const userRolesLower = user.roles.map(r => r.toLowerCase());
    return requiredRoles.some(role => userRolesLower.includes(role.toLowerCase()));
  }

  /**
   * Check if user has all required roles (case-insensitive)
   */
  hasAllRoles(requiredRoles: string[], user?: AuthUser): boolean {
    if (!user) return false;
    if (!requiredRoles.length) return true;

    // Normalize roles to lowercase for comparison
    const userRolesLower = user.roles.map(r => r.toLowerCase());
    return requiredRoles.every(role => userRolesLower.includes(role.toLowerCase()));
  }

  /**
   * Attempt to refresh token automatically
   */
  private async attemptTokenRefresh(): Promise<boolean> {
    const refreshToken = this.getStoredRefreshToken();
    if (!refreshToken) {
      this.clearStoredTokens();
      return false;
    }

    try {
      const result = await this.refreshSession({ refreshToken });
      this.storeTokens(result.data.sessionToken, result.data.refreshToken);
      return true;
    } catch (error) {
      console.error('Automatic token refresh failed:', error);
      this.clearStoredTokens();
      return false;
    }
  }

  /**
   * Start role impersonation
   */
  async impersonateRole(roleToImpersonate: string): Promise<{
    success: boolean;
    impersonatedRole: string;
    originalRole: string;
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      tokenType: string;
    };
  }> {
    const token = this.getStoredToken();

    const response = await fetch(`${API_BASE_URL}/api/security/impersonation/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        'x-auth-bypass': localStorage.getItem('authBypass') === 'true' ? 'true' : 'false',
      },
      body: JSON.stringify({ role: roleToImpersonate }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Role impersonation failed');
    }

    // Return expected format with tokens
    return {
      success: result.success,
      impersonatedRole: result.impersonatedRole,
      originalRole: 'Admin',
      tokens: {
        accessToken: token || '',
        refreshToken: this.getStoredRefreshToken() || '',
        expiresIn: 3600,
        tokenType: 'Bearer',
      },
    };
  }

  /**
   * Clear role impersonation
   */
  async clearImpersonation(): Promise<{
    success: boolean;
    message: string;
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      tokenType: string;
    };
  }> {
    const token = this.getStoredToken();

    const response = await fetch(`${API_BASE_URL}/api/security/impersonation/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        'x-auth-bypass': localStorage.getItem('authBypass') === 'true' ? 'true' : 'false',
      },
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Clear impersonation failed');
    }

    // Return expected format with tokens
    return {
      success: result.success,
      message: result.restoredRole ? `Restored to ${result.restoredRole}` : 'Impersonation cleared',
      tokens: {
        accessToken: token || '',
        refreshToken: this.getStoredRefreshToken() || '',
        expiresIn: 3600,
        tokenType: 'Bearer',
      },
    };
  }

  /**
   * Get available roles for impersonation
   */
  async getImpersonationRoles(): Promise<{
    success: boolean;
    canImpersonate: boolean;
    availableRoles: string[];
    currentRole: string;
    isImpersonating: boolean;
  }> {
    const token = this.getStoredToken();

    const response = await fetch(`${API_BASE_URL}/api/security/roles`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        'x-auth-bypass': localStorage.getItem('authBypass') === 'true' ? 'true' : 'false',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get available roles');
    }

    const roles = await response.json();

    // Return expected format
    return {
      success: true,
      canImpersonate: true,
      availableRoles: roles.map((r: any) => r.name),
      currentRole: 'Admin',
      isImpersonating: false,
    };
  }

  /**
   * Get authentication health status
   */
  async getHealthStatus(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/health`);
    return response.json();
  }
}

// Export singleton instance
export const authApi = new AuthenticationApi();
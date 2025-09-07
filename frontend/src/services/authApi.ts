import { API_BASE_URL } from './api';

// Types
export interface AuthUser {
  id: string;
  username: string;
  email: string;
  roles: string[];
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
   * Demo login for development
   */
  async demoLogin(): Promise<LoginResponse> {
    const response = await fetch(`${this.baseUrl}/demo-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}), // Empty body but properly formatted
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Demo login failed');
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
        'x-auth-bypass': 'true', // Enable auth bypass for development
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
        'x-auth-bypass': 'true', // Enable auth bypass for development
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
   * Check if user has specific roles
   */
  hasRoles(requiredRoles: string[], user?: AuthUser): boolean {
    if (!user) return false;
    if (!requiredRoles.length) return true;
    return requiredRoles.some(role => user.roles.includes(role));
  }

  /**
   * Check if user has all required roles
   */
  hasAllRoles(requiredRoles: string[], user?: AuthUser): boolean {
    if (!user) return false;
    if (!requiredRoles.length) return true;
    return requiredRoles.every(role => user.roles.includes(role));
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
   * Get authentication health status
   */
  async getHealthStatus(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/health`);
    return response.json();
  }
}

// Export singleton instance
export const authApi = new AuthenticationApi();
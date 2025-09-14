import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { ReactKeycloakProvider, useKeycloak } from '@react-keycloak/web';
import keycloak, { keycloakInitOptions } from '../config/keycloak';
import { authApi, AuthUser, LoginRequest } from '../services/authApi';
import { registrationApi, UserRegistrationRequest, RegistrationResponse } from '../services/registrationApi';

// Enhanced Authentication State
interface EnhancedAuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  keycloakReady: boolean;
  authMethod: 'keycloak' | 'password' | null;
  registrationInProgress: boolean;
}

// Enhanced Authentication Actions
type EnhancedAuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: AuthUser; method: 'keycloak' | 'password' } }
  | { type: 'AUTH_ERROR'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_INITIALIZED' }
  | { type: 'KEYCLOAK_READY'; payload: boolean }
  | { type: 'REGISTRATION_START' }
  | { type: 'REGISTRATION_SUCCESS' }
  | { type: 'REGISTRATION_ERROR'; payload: string };

// Initial State
const initialState: EnhancedAuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  isInitialized: false,
  keycloakReady: false,
  authMethod: null,
  registrationInProgress: false,
};

// Reducer
function enhancedAuthReducer(state: EnhancedAuthState, action: EnhancedAuthAction): EnhancedAuthState {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        authMethod: action.payload.method,
      };
    case 'AUTH_ERROR':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
        authMethod: null,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        authMethod: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'SET_INITIALIZED':
      return {
        ...state,
        isInitialized: true,
        isLoading: false,
      };
    case 'KEYCLOAK_READY':
      return {
        ...state,
        keycloakReady: action.payload,
      };
    case 'REGISTRATION_START':
      return {
        ...state,
        registrationInProgress: true,
        error: null,
      };
    case 'REGISTRATION_SUCCESS':
      return {
        ...state,
        registrationInProgress: false,
        error: null,
      };
    case 'REGISTRATION_ERROR':
      return {
        ...state,
        registrationInProgress: false,
        error: action.payload,
      };
    default:
      return state;
  }
}

// Enhanced Context Type
interface EnhancedAuthContextType extends EnhancedAuthState {
  // Keycloak auth methods
  loginWithKeycloak: () => Promise<void>;
  logoutFromKeycloak: () => Promise<void>;

  // Password auth methods
  loginWithPassword: (email: string, password: string) => Promise<void>;
  lookupUserByEmail: (email: string) => Promise<{ authMethods: string[]; displayName: string }>;

  // Registration methods
  registerUser: (registrationData: UserRegistrationRequest) => Promise<RegistrationResponse>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
  checkRegistrationStatus: (email: string) => Promise<any>;

  // Legacy methods (for backward compatibility)
  login: (loginData: LoginRequest) => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  updateProfile: (updates: { firstName?: string; lastName?: string }) => Promise<void>;
  clearError: () => void;

  // Role checking methods
  hasRoles: (roles: string[]) => boolean;
  hasAllRoles: (roles: string[]) => boolean;
  isAdmin: boolean;
  isManager: boolean;

  // Environment configuration
  config: {
    enableKeycloak: boolean;
    enableEmailAuth: boolean;
    allowSelfRegistration: boolean;
    adminApprovalRequired: boolean;
  };
}

const EnhancedAuthContext = createContext<EnhancedAuthContextType | undefined>(undefined);

// Auth Provider Component
function AuthProviderContent({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(enhancedAuthReducer, initialState);
  const { keycloak: keycloakInstance, initialized: keycloakInitialized } = useKeycloak();

  // Environment configuration
  const config = {
    enableKeycloak: import.meta.env.VITE_ENABLE_KEYCLOAK === 'true',
    enableEmailAuth: import.meta.env.VITE_ENABLE_EMAIL_AUTH === 'true',
    allowSelfRegistration: import.meta.env.VITE_ALLOW_SELF_REGISTRATION === 'true',
    adminApprovalRequired: import.meta.env.VITE_ADMIN_APPROVAL_REQUIRED === 'true',
  };

  // Initialize authentication state
  useEffect(() => {
    if (keycloakInitialized) {
      dispatch({ type: 'KEYCLOAK_READY', payload: true });
      initializeAuth();
    }
  }, [keycloakInitialized]);

  // Initialize authentication from Keycloak and stored tokens
  async function initializeAuth() {
    try {
      dispatch({ type: 'AUTH_START' });

      // Check Keycloak authentication first
      if (config.enableKeycloak && keycloakInstance.authenticated) {
        await authenticateWithKeycloak();
        return;
      }

      // Fall back to stored session tokens
      if (authApi.isAuthenticated()) {
        const validation = await authApi.validateSession();

        if (validation.data.valid && validation.data.user) {
          dispatch({
            type: 'AUTH_SUCCESS',
            payload: { user: validation.data.user, method: 'password' }
          });
        } else {
          // Try to refresh session
          const refreshToken = authApi.getStoredRefreshToken();
          if (refreshToken) {
            try {
              const refreshResult = await authApi.refreshSession({ refreshToken });
              authApi.storeTokens(refreshResult.data.sessionToken, refreshResult.data.refreshToken);

              const userResult = await authApi.getCurrentUser();
              dispatch({
                type: 'AUTH_SUCCESS',
                payload: { user: userResult.data, method: 'password' }
              });
            } catch (refreshError) {
              authApi.clearStoredTokens();
              dispatch({ type: 'LOGOUT' });
            }
          } else {
            dispatch({ type: 'LOGOUT' });
          }
        }
      } else {
        dispatch({ type: 'LOGOUT' });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      dispatch({ type: 'AUTH_ERROR', payload: 'Failed to initialize authentication' });
    } finally {
      dispatch({ type: 'SET_INITIALIZED' });
    }
  }

  // Keycloak Authentication
  async function loginWithKeycloak(): Promise<void> {
    if (!keycloakInstance) {
      throw new Error('Keycloak not initialized');
    }

    try {
      dispatch({ type: 'AUTH_START' });

      // Trigger Keycloak login
      await keycloakInstance.login({
        redirectUri: window.location.origin,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Keycloak login failed';
      dispatch({ type: 'AUTH_ERROR', payload: message });
      throw error;
    }
  }

  async function authenticateWithKeycloak(): Promise<void> {
    if (!keycloakInstance.authenticated || !keycloakInstance.token) {
      throw new Error('Not authenticated with Keycloak');
    }

    try {
      dispatch({ type: 'AUTH_START' });

      // Send Keycloak token to backend
      const result = await authApi.login({
        keycloakToken: keycloakInstance.token,
        deviceInfo: {
          userAgent: navigator.userAgent,
        },
      });

      // Store tokens
      authApi.storeTokens(result.data.sessionToken, result.data.refreshToken);

      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user: result.data.user, method: 'keycloak' }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Keycloak authentication failed';
      dispatch({ type: 'AUTH_ERROR', payload: message });
      throw error;
    }
  }

  async function logoutFromKeycloak(): Promise<void> {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // Logout from backend
      const refreshToken = authApi.getStoredRefreshToken();
      await authApi.logout(refreshToken ? { refreshToken } : undefined);

      // Clear stored tokens
      authApi.clearStoredTokens();

      // Logout from Keycloak
      if (keycloakInstance.authenticated) {
        await keycloakInstance.logout({
          redirectUri: window.location.origin,
        });
      }

      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      console.error('Keycloak logout error:', error);
      // Even if logout fails on server, clear local state
      dispatch({ type: 'LOGOUT' });
    }
  }

  // Password Authentication
  async function loginWithPassword(email: string, password: string): Promise<void> {
    try {
      dispatch({ type: 'AUTH_START' });

      const result = await authApi.authenticateWithPassword(email, password);

      // Store tokens
      authApi.storeTokens(result.data.sessionToken, result.data.refreshToken);

      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user: result.data.user, method: 'password' }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Password authentication failed';
      dispatch({ type: 'AUTH_ERROR', payload: message });
      throw error;
    }
  }

  async function lookupUserByEmail(email: string) {
    try {
      const result = await authApi.lookupUserByEmail(email);
      return {
        authMethods: result.data.authMethods,
        displayName: result.data.displayName,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'User lookup failed';
      throw new Error(message);
    }
  }

  // Registration Methods
  async function registerUser(registrationData: UserRegistrationRequest): Promise<RegistrationResponse> {
    try {
      dispatch({ type: 'REGISTRATION_START' });

      const result = await registrationApi.registerUser(registrationData);

      dispatch({ type: 'REGISTRATION_SUCCESS' });
      return result;
    } catch (error) {
      const message = registrationApi.formatRegistrationError(error as Error);
      dispatch({ type: 'REGISTRATION_ERROR', payload: message });
      throw error;
    }
  }

  async function verifyEmail(token: string): Promise<void> {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      await registrationApi.verifyEmail(token);

      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Email verification failed';
      dispatch({ type: 'AUTH_ERROR', payload: message });
      throw error;
    }
  }

  async function resendVerificationEmail(email: string): Promise<void> {
    try {
      await registrationApi.resendVerificationEmail(email);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to resend verification email';
      throw new Error(message);
    }
  }

  async function checkRegistrationStatus(email: string) {
    try {
      const result = await registrationApi.getRegistrationStatus(email);
      return result.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to check registration status';
      throw new Error(message);
    }
  }

  // Legacy methods for backward compatibility
  async function login(loginData: LoginRequest): Promise<void> {
    try {
      dispatch({ type: 'AUTH_START' });

      const result = await authApi.login(loginData);

      authApi.storeTokens(result.data.sessionToken, result.data.refreshToken);

      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user: result.data.user, method: 'password' }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'AUTH_ERROR', payload: message });
      throw error;
    }
  }

  async function demoLogin(): Promise<void> {
    try {
      dispatch({ type: 'AUTH_START' });

      const result = await authApi.demoLogin();

      authApi.storeTokens(result.data.sessionToken, result.data.refreshToken);

      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user: result.data.user, method: 'password' }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Demo login failed';
      dispatch({ type: 'AUTH_ERROR', payload: message });
      throw error;
    }
  }

  async function logout(): Promise<void> {
    if (state.authMethod === 'keycloak') {
      await logoutFromKeycloak();
    } else {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });

        const refreshToken = authApi.getStoredRefreshToken();
        await authApi.logout(refreshToken ? { refreshToken } : undefined);

        dispatch({ type: 'LOGOUT' });
      } catch (error) {
        console.error('Logout error:', error);
        dispatch({ type: 'LOGOUT' });
      }
    }
  }

  async function refreshSession(): Promise<boolean> {
    try {
      const refreshToken = authApi.getStoredRefreshToken();
      if (!refreshToken) {
        dispatch({ type: 'LOGOUT' });
        return false;
      }

      const result = await authApi.refreshSession({ refreshToken });
      authApi.storeTokens(result.data.sessionToken, result.data.refreshToken);

      const userResult = await authApi.getCurrentUser();
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user: userResult.data, method: state.authMethod || 'password' }
      });

      return true;
    } catch (error) {
      console.error('Session refresh error:', error);
      dispatch({ type: 'LOGOUT' });
      return false;
    }
  }

  async function updateProfile(updates: { firstName?: string; lastName?: string }): Promise<void> {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      await authApi.updateProfile(updates);

      const userResult = await authApi.getCurrentUser();
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user: userResult.data, method: state.authMethod || 'password' }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Profile update failed';
      dispatch({ type: 'AUTH_ERROR', payload: message });
      throw error;
    }
  }

  function clearError() {
    dispatch({ type: 'CLEAR_ERROR' });
  }

  // Role checking functions
  function hasRoles(roles: string[]): boolean {
    return authApi.hasRoles(roles, state.user || undefined);
  }

  function hasAllRoles(roles: string[]): boolean {
    return authApi.hasAllRoles(roles, state.user || undefined);
  }

  // Computed properties
  const isAdmin = hasRoles(['admin']);
  const isManager = hasRoles(['program_manager', 'admin']);

  // Auto-refresh token before expiry
  useEffect(() => {
    if (!state.isAuthenticated || state.authMethod === 'keycloak') return;

    const interval = setInterval(async () => {
      const token = authApi.getStoredToken();
      if (!token && state.isAuthenticated) {
        const success = await refreshSession();
        if (!success) {
          console.warn('Session expired, user needs to login again');
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, [state.isAuthenticated, state.authMethod]);

  // Keycloak token refresh
  useEffect(() => {
    if (keycloakInstance.authenticated) {
      const interval = setInterval(() => {
        keycloakInstance.updateToken(30) // Refresh if expires in 30 seconds
          .then((refreshed) => {
            if (refreshed) {
              console.log('Keycloak token refreshed');
            }
          })
          .catch(() => {
            console.error('Failed to refresh Keycloak token');
          });
      }, 60 * 1000); // Check every minute

      return () => clearInterval(interval);
    }
  }, [keycloakInstance.authenticated]);

  const value: EnhancedAuthContextType = {
    ...state,
    loginWithKeycloak,
    logoutFromKeycloak,
    loginWithPassword,
    lookupUserByEmail,
    registerUser,
    verifyEmail,
    resendVerificationEmail,
    checkRegistrationStatus,
    login,
    demoLogin,
    logout,
    refreshSession,
    updateProfile,
    clearError,
    hasRoles,
    hasAllRoles,
    isAdmin,
    isManager,
    config,
  };

  return (
    <EnhancedAuthContext.Provider value={value}>
      {children}
    </EnhancedAuthContext.Provider>
  );
}

// Provider Props
interface EnhancedAuthProviderProps {
  children: ReactNode;
}

// Main Provider Component with Keycloak Integration
export function EnhancedAuthProvider({ children }: EnhancedAuthProviderProps) {
  const enableKeycloak = import.meta.env.VITE_ENABLE_KEYCLOAK === 'true';

  if (enableKeycloak) {
    return (
      <ReactKeycloakProvider
        authClient={keycloak}
        initOptions={keycloakInitOptions}
        LoadingComponent={
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        }
      >
        <AuthProviderContent>{children}</AuthProviderContent>
      </ReactKeycloakProvider>
    );
  }

  // If Keycloak is disabled, provide a mock keycloak context
  return (
    <AuthProviderContent>{children}</AuthProviderContent>
  );
}

// Hook to use enhanced auth context
export function useEnhancedAuth() {
  const context = useContext(EnhancedAuthContext);
  if (context === undefined) {
    throw new Error('useEnhancedAuth must be used within an EnhancedAuthProvider');
  }
  return context;
}

// For backward compatibility
export const useAuth = useEnhancedAuth;
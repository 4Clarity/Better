import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { authApi, AuthUser, LoginRequest } from '../services/authApi';

// Authentication State
interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
}

// Authentication Actions
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: AuthUser }
  | { type: 'AUTH_ERROR'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_INITIALIZED' };

// Initial State
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  isInitialized: false,
};

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
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
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_ERROR':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
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
    default:
      return state;
  }
}

// Context
interface AuthContextType extends AuthState {
  login: (loginData: LoginRequest) => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  updateProfile: (updates: { firstName?: string; lastName?: string }) => Promise<void>;
  clearError: () => void;
  hasRoles: (roles: string[]) => boolean;
  hasAllRoles: (roles: string[]) => boolean;
  isAdmin: boolean;
  isManager: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider Props
interface AuthProviderProps {
  children: ReactNode;
}

// Provider Component
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize authentication state
  useEffect(() => {
    initializeAuth();
  }, []);

  // Initialize authentication from stored tokens
  async function initializeAuth() {
    try {
      dispatch({ type: 'AUTH_START' });

      // Check if user is already authenticated
      if (authApi.isAuthenticated()) {
        // Validate the current session
        const validation = await authApi.validateSession();
        
        if (validation.data.valid && validation.data.user) {
          dispatch({ type: 'AUTH_SUCCESS', payload: validation.data.user });
        } else {
          // Session is invalid, try to refresh
          const refreshToken = authApi.getStoredRefreshToken();
          if (refreshToken) {
            try {
              const refreshResult = await authApi.refreshSession({ refreshToken });
              authApi.storeTokens(refreshResult.data.sessionToken, refreshResult.data.refreshToken);
              
              // Get user profile after refresh
              const userResult = await authApi.getCurrentUser();
              dispatch({ type: 'AUTH_SUCCESS', payload: userResult.data });
            } catch (refreshError) {
              // Refresh failed, clear tokens
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

  // Login function
  async function login(loginData: LoginRequest) {
    try {
      dispatch({ type: 'AUTH_START' });
      
      const result = await authApi.login(loginData);
      
      // Store tokens
      authApi.storeTokens(result.data.sessionToken, result.data.refreshToken);
      
      dispatch({ type: 'AUTH_SUCCESS', payload: result.data.user });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'AUTH_ERROR', payload: message });
      throw error;
    }
  }

  // Demo login function
  async function demoLogin() {
    try {
      dispatch({ type: 'AUTH_START' });
      
      const result = await authApi.demoLogin();
      
      // Store tokens
      authApi.storeTokens(result.data.sessionToken, result.data.refreshToken);
      
      dispatch({ type: 'AUTH_SUCCESS', payload: result.data.user });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Demo login failed';
      dispatch({ type: 'AUTH_ERROR', payload: message });
      throw error;
    }
  }

  // Logout function
  async function logout() {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const refreshToken = authApi.getStoredRefreshToken();
      await authApi.logout(refreshToken ? { refreshToken } : undefined);
      
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails on server, clear local state
      dispatch({ type: 'LOGOUT' });
    }
  }

  // Refresh session function
  async function refreshSession(): Promise<boolean> {
    try {
      const refreshToken = authApi.getStoredRefreshToken();
      if (!refreshToken) {
        dispatch({ type: 'LOGOUT' });
        return false;
      }

      const result = await authApi.refreshSession({ refreshToken });
      authApi.storeTokens(result.data.sessionToken, result.data.refreshToken);
      
      // Get updated user profile
      const userResult = await authApi.getCurrentUser();
      dispatch({ type: 'AUTH_SUCCESS', payload: userResult.data });
      
      return true;
    } catch (error) {
      console.error('Session refresh error:', error);
      dispatch({ type: 'LOGOUT' });
      return false;
    }
  }

  // Update profile function
  async function updateProfile(updates: { firstName?: string; lastName?: string }) {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      await authApi.updateProfile(updates);
      
      // Get updated user profile
      const userResult = await authApi.getCurrentUser();
      dispatch({ type: 'AUTH_SUCCESS', payload: userResult.data });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Profile update failed';
      dispatch({ type: 'AUTH_ERROR', payload: message });
      throw error;
    }
  }

  // Clear error function
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
    if (!state.isAuthenticated) return;

    const interval = setInterval(async () => {
      const token = authApi.getStoredToken();
      if (!token && state.isAuthenticated) {
        // Token expired, try to refresh
        const success = await refreshSession();
        if (!success) {
          // Refresh failed, user needs to login again
          console.warn('Session expired, user needs to login again');
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, [state.isAuthenticated]);

  const value: AuthContextType = {
    ...state,
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Higher-order component for protected routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredRoles?: string[]
) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading, hasRoles, user } = useAuth();
    
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }
    
    if (!isAuthenticated) {
      // Redirect to login or show login form
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
            <p className="text-gray-600">Please log in to access this page.</p>
          </div>
        </div>
      );
    }
    
    if (requiredRoles && !hasRoles(requiredRoles)) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4">Access Denied</h2>
            <p className="text-gray-600">
              You don't have permission to access this page.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Required roles: {requiredRoles.join(', ')}
            </p>
          </div>
        </div>
      );
    }
    
    return <Component {...props} />;
  };
}

// Hook for protected routes
export function useProtectedRoute(requiredRoles?: string[]) {
  const { isAuthenticated, isLoading, hasRoles, user } = useAuth();
  
  return {
    isAuthenticated,
    isLoading,
    hasAccess: !requiredRoles || hasRoles(requiredRoles),
    user,
  };
}
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface LoginFormProps {
  onSuccess?: () => void;
  className?: string;
}

export function LoginForm({ onSuccess, className }: LoginFormProps) {
  const [keycloakToken, setKeycloakToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, demoLogin, error, clearError, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keycloakToken.trim()) return;

    try {
      setIsSubmitting(true);
      clearError();

      await login({
        keycloakToken: keycloakToken.trim(),
        deviceInfo: {
          userAgent: navigator.userAgent,
        },
      });

      onSuccess?.();
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    try {
      setIsSubmitting(true);
      clearError();

      // Use the dedicated demo login function
      await demoLogin();

      onSuccess?.();
    } catch (error) {
      console.error('Demo login failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`max-w-md mx-auto ${className}`}>
      <div className="bg-white shadow-md rounded-lg px-8 pt-6 pb-8">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Sign in to TIP
          </h2>
          <p className="text-gray-600">
            Transition Intelligence Platform
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-600">
                  {error}
                </p>
              </div>
              <div className="ml-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button
                    onClick={clearError}
                    className="inline-flex rounded-md p-1.5 text-red-500 hover:bg-red-100"
                  >
                    <span className="sr-only">Dismiss</span>
                    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label 
              htmlFor="keycloakToken" 
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Keycloak Token
            </label>
            <input
              type="text"
              id="keycloakToken"
              value={keycloakToken}
              onChange={(e) => setKeycloakToken(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your Keycloak token"
              disabled={isSubmitting || isLoading}
            />
            <p className="mt-1 text-xs text-gray-500">
              In production, this would be handled automatically by Keycloak SSO
            </p>
          </div>

          <div className="space-y-3">
            <button
              type="submit"
              disabled={!keycloakToken.trim() || isSubmitting || isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting || isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign in with Token'
              )}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={isSubmitting || isLoading}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting || isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                'Demo Login (Development)'
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            This is a development environment with authentication bypass enabled.
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginForm;
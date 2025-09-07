import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoginForm from '../components/auth/LoginForm';

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // If already authenticated, call success callback
    if (isAuthenticated && onLoginSuccess) {
      onLoginSuccess();
    }
  }, [isAuthenticated, onLoginSuccess]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If already authenticated, show success message
  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto">
          <div className="bg-white shadow-md rounded-lg px-8 pt-6 pb-8 text-center">
            <div className="mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Already Signed In
              </h2>
              <p className="text-gray-600">
                You are already authenticated and ready to use TIP.
              </p>
            </div>
            <button
              onClick={() => onLoginSuccess?.()}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Continue to Application
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            TIP Platform
          </h1>
          <p className="text-gray-600">
            Transition Intelligence Platform for Government Contract Management
          </p>
        </div>

        {/* Login Form */}
        <LoginForm 
          onSuccess={onLoginSuccess}
          className="w-full"
        />

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Secure access for authorized personnel only
          </p>
          <div className="mt-2 flex justify-center items-center space-x-2 text-xs text-gray-400">
            <span>Environment: Development</span>
            <span>•</span>
            <span>Auth Bypass: Enabled</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
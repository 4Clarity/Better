import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthenticationApi, EmailLookupResponse } from '../../services/authApi';

interface EmailFirstLoginFormProps {
  onSuccess?: () => void;
  className?: string;
}

type LoginStep = 'email' | 'challenge' | 'loading';
type ChallengeMethod = 'password' | 'oauth';

export function EmailFirstLoginForm({ onSuccess, className }: EmailFirstLoginFormProps) {
  const [step, setStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userInfo, setUserInfo] = useState<EmailLookupResponse['data'] | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<ChallengeMethod>('password');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { authenticateWithPassword } = useAuth();
  const authApi = new AuthenticationApi();

  const clearError = () => setError(null);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setIsSubmitting(true);
      setStep('loading');
      clearError();

      const result = await authApi.lookupUserByEmail(email.trim());
      setUserInfo(result.data);
      
      // Default to password if available, otherwise first available method
      if (result.data.authMethods.includes('password')) {
        setSelectedMethod('password');
      } else if (result.data.authMethods.length > 0) {
        setSelectedMethod(result.data.authMethods[0] as ChallengeMethod);
      }
      
      setStep('challenge');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find account');
      setStep('email');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    try {
      setIsSubmitting(true);
      clearError();

      // Use AuthContext to handle authentication and state updates
      await authenticateWithPassword(email, password);
      
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOAuthChallenge = () => {
    // In a real implementation, this would redirect to OAuth provider
    setError('OAuth authentication not yet implemented. Please use password authentication.');
  };

  const resetForm = () => {
    setStep('email');
    setEmail('');
    setPassword('');
    setUserInfo(null);
    setSelectedMethod('password');
    clearError();
  };

  const renderEmailStep = () => (
    <form onSubmit={handleEmailSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          Email Address
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter your email address"
          disabled={isSubmitting}
          required
        />
      </div>
      
      <button
        type="submit"
        disabled={!email.trim() || isSubmitting}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue
      </button>
    </form>
  );

  const renderChallengeStep = () => {
    if (!userInfo) return null;

    return (
      <div className="space-y-4">
        {/* User Info */}
        <div className="text-center py-4">
          <h3 className="text-lg font-medium text-gray-900">Welcome back!</h3>
          <p className="text-sm text-gray-600">{userInfo.displayName}</p>
          <p className="text-xs text-gray-500">{userInfo.email}</p>
        </div>

        {/* Auth Method Selection */}
        {userInfo.authMethods.length > 1 && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Choose authentication method:
            </label>
            <div className="space-y-2">
              {userInfo.authMethods.map((method) => (
                <label key={method} className="flex items-center">
                  <input
                    type="radio"
                    name="authMethod"
                    value={method}
                    checked={selectedMethod === method}
                    onChange={(e) => setSelectedMethod(e.target.value as ChallengeMethod)}
                    className="mr-2"
                  />
                  <span className="text-sm">
                    {method === 'password' ? 'Password' : 'Single Sign-On (OAuth)'}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Challenge Form */}
        {selectedMethod === 'password' && (
          <form onSubmit={handlePasswordChallenge} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your password"
                disabled={isSubmitting}
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Demo: use 'demo', 'password', or 'admin'
              </p>
            </div>
            
            <button
              type="submit"
              disabled={!password.trim() || isSubmitting}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        {selectedMethod === 'oauth' && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleOAuthChallenge}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign in with SSO
            </button>
          </div>
        )}

        {/* Back button */}
        <button
          type="button"
          onClick={resetForm}
          className="w-full text-sm text-gray-600 hover:text-gray-800 underline"
        >
          Use a different email address
        </button>
      </div>
    );
  };

  const renderLoadingStep = () => (
    <div className="text-center py-8">
      <svg className="animate-spin mx-auto h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p className="mt-2 text-sm text-gray-600">Verifying account...</p>
    </div>
  );

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
                <p className="text-sm text-red-600">{error}</p>
              </div>
              <div className="ml-auto pl-3">
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
        )}

        {step === 'email' && renderEmailStep()}
        {step === 'loading' && renderLoadingStep()}
        {step === 'challenge' && renderChallengeStep()}

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Secure authentication with multiple verification methods
          </p>
        </div>
      </div>
    </div>
  );
}

export default EmailFirstLoginForm;
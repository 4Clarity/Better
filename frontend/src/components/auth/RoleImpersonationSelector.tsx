import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface RoleImpersonationSelectorProps {
  className?: string;
}

export function RoleImpersonationSelector({ className = '' }: RoleImpersonationSelectorProps) {
  const {
    canImpersonate,
    isImpersonating,
    currentRole,
    impersonateRole,
    clearImpersonation,
    getAvailableRoles,
    error,
    clearError,
  } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load available roles when component mounts or when dropdown opens
  useEffect(() => {
    if (canImpersonate && isOpen && availableRoles.length === 0) {
      loadAvailableRoles();
    }
  }, [canImpersonate, isOpen]);

  const loadAvailableRoles = async () => {
    try {
      setIsLoading(true);
      const roles = await getAvailableRoles();
      setAvailableRoles(roles);
    } catch (error) {
      console.error('Failed to load available roles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleSelect = async (roleToImpersonate: string) => {
    try {
      setIsLoading(true);
      await impersonateRole(roleToImpersonate);
      setIsOpen(false);
      clearError();
    } catch (error) {
      console.error('Role impersonation failed:', error);
      // Error will be handled by the AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearImpersonation = async () => {
    try {
      setIsLoading(true);
      await clearImpersonation();
      setIsOpen(false);
      clearError();
    } catch (error) {
      console.error('Clear impersonation failed:', error);
      // Error will be handled by the AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render if user can't impersonate
  if (!canImpersonate) {
    return null;
  }

  const displayRole = currentRole || 'Unknown Role';
  const roleDisplayName = formatRoleDisplayName(displayRole);

  return (
    <div className={`relative ${className}`}>
      {/* Role Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`
          flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
          ${isImpersonating
            ? 'bg-orange-100 text-orange-800 border border-orange-300 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-700'
            : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        title={isImpersonating ? 'Currently impersonating a role' : 'Select role to impersonate'}
      >
        {/* Role Icon */}
        <div className={`w-2 h-2 rounded-full ${isImpersonating ? 'bg-orange-500' : 'bg-gray-400'}`} />

        {/* Role Text */}
        <span className="max-w-32 truncate">
          {isImpersonating ? `Impersonating: ${roleDisplayName}` : roleDisplayName}
        </span>

        {/* Dropdown Arrow */}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Role Selector
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Current Status */}
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Role:</div>
              <div className={`text-sm font-medium ${isImpersonating ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-gray-100'}`}>
                {roleDisplayName}
              </div>
              {isImpersonating && (
                <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  ⚠️ Impersonating - limited permissions
                </div>
              )}
            </div>

            {/* Clear Impersonation Button */}
            {isImpersonating && (
              <button
                onClick={handleClearImpersonation}
                disabled={isLoading}
                className="w-full mb-3 px-3 py-2 text-sm bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-200 rounded-lg transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Clearing...' : 'Return to Original Role'}
              </button>
            )}

            {/* Available Roles */}
            <div className="space-y-1">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Available Roles:</div>
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : availableRoles.length > 0 ? (
                availableRoles.map((role) => (
                  <button
                    key={role}
                    onClick={() => handleRoleSelect(role)}
                    disabled={isLoading || currentRole === role.toLowerCase().replace(/\s+/g, '_')}
                    className={`
                      w-full text-left px-3 py-2 text-sm rounded-lg transition-colors
                      ${currentRole === role.toLowerCase().replace(/\s+/g, '_')
                        ? 'bg-primary/10 text-primary cursor-not-allowed'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }
                      disabled:opacity-50
                    `}
                  >
                    {formatRoleDisplayName(role)}
                    {currentRole === role.toLowerCase().replace(/\s+/g, '_') && (
                      <span className="ml-2 text-xs text-primary">• Current</span>
                    )}
                  </button>
                ))
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400 py-2">
                  No roles available for impersonation
                </div>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="text-xs text-red-600 dark:text-red-400">{error}</div>
              </div>
            )}

            {/* Warning */}
            <div className="mt-4 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="text-xs text-yellow-600 dark:text-yellow-400">
                ⚠️ Role impersonation is for administrative purposes only. All actions are logged.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overlay to close dropdown when clicking outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

/**
 * Format role names for display
 */
function formatRoleDisplayName(role: string): string {
  // Convert underscores to spaces and capitalize
  return role
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout, isAdmin, isManager, isImpersonating, currentRole } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsOpen(false);
    }
  };

  if (!user) {
    return null;
  }

  const displayName = user.person?.displayName || `${user.person?.firstName} ${user.person?.lastName}` || user.username;

  // Format role names for display
  const formatRoleDisplayName = (role: string): string => {
    if (!role) return 'Unknown Role';
    return role
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-full p-2 hover:bg-gray-100"
      >
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="hidden md:block text-left">
          <div className="font-medium text-gray-700">{displayName}</div>
          <div className={`text-xs ${isImpersonating ? 'text-orange-600' : 'text-gray-500'}`}>
            {isImpersonating ? (
              <span>Impersonating: {formatRoleDisplayName(currentRole || 'Unknown')}</span>
            ) : (
              <span>{isAdmin ? 'Administrator' : isManager ? 'Program Manager' : 'User'}</span>
            )}
          </div>
        </div>
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Overlay for mobile */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          ></div>
          
          {/* Dropdown menu */}
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            {/* User info header */}
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{displayName}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                  <div className="text-xs text-gray-400">
                    ID: {user.id}
                  </div>
                </div>
              </div>
            </div>

            {/* Roles section */}
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Roles & Permissions
              </div>

              {/* Impersonation Status */}
              {isImpersonating && (
                <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="text-xs text-orange-600 font-medium mb-1">
                    ⚠️ Currently Impersonating
                  </div>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    {formatRoleDisplayName(currentRole || 'Unknown')}
                  </span>
                  <div className="text-xs text-orange-500 mt-1">
                    Limited permissions active
                  </div>
                </div>
              )}

              {/* Effective Roles */}
              <div className="flex flex-wrap gap-1">
                {user.roles.map((role) => (
                  <span
                    key={role}
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      isImpersonating
                        ? 'bg-gray-100 text-gray-600' // Dimmed when impersonating
                        : role === 'admin'
                        ? 'bg-red-100 text-red-800'
                        : role === 'program_manager'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {formatRoleDisplayName(role)}
                    {isImpersonating && <span className="ml-1 text-gray-400">•</span>}
                  </span>
                ))}
              </div>

              {/* Original Roles When Impersonating */}
              {isImpersonating && user.originalRoles && (
                <div className="mt-2">
                  <div className="text-xs text-gray-400 mb-1">Original roles:</div>
                  <div className="flex flex-wrap gap-1">
                    {user.originalRoles.map((role) => (
                      <span
                        key={role}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200"
                      >
                        {formatRoleDisplayName(role)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Menu options */}
            <div className="py-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  window.location.href = '/profile';
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              >
                <svg className="mr-3 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Account Settings
              </button>
              
              {(isAdmin || isManager) && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    // TODO: Navigate to user management
                    window.location.href = '/security';
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                >
                  <svg className="mr-3 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  User Management
                </button>
              )}

              {isAdmin && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    // TODO: Implement system logs access
                    alert('System logs access coming soon!');
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                >
                  <svg className="mr-3 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  System Logs
                </button>
              )}
            </div>

            {/* Development info */}
            <div className="border-t border-gray-200 px-4 py-3">
              <div className="text-xs text-gray-500">
                Development Mode: Auth Bypass Enabled
              </div>
            </div>

            {/* Logout */}
            <div className="border-t border-gray-200">
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <svg className="mr-3 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default UserMenu;
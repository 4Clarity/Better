/**
 * UserProfileRolesCard Component
 * Displays and manages program roles assigned to a user
 * Story: 0.3.1 - Role-Based UI Implementation
 */

import { useState, useEffect } from 'react';
import { usePermissions } from '../../hooks/usePermissions';

interface UserRole {
  id: string;
  roleId: string;
  roleName: string;
  assignedAt: Date;
  assignedBy?: string;
  isActive: boolean;
}

interface Role {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

interface UserProfileRolesCardProps {
  userId: string;
  canEdit?: boolean;
  onRoleChange?: () => void;
}

export function UserProfileRolesCard({
  userId,
  canEdit = false,
  onRoleChange,
}: UserProfileRolesCardProps) {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const permissions = usePermissions();

  // Load user roles
  useEffect(() => {
    loadUserRoles();
    if (canEdit) {
      loadAvailableRoles();
    }
  }, [userId, canEdit]);

  const loadUserRoles = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/users/${userId}/roles`, {
        headers: {
          'x-auth-bypass': 'true',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load user roles');
      }

      const roles = await response.json();
      setUserRoles(roles);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user roles');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableRoles = async () => {
    try {
      const response = await fetch('/api/security/roles', {
        headers: {
          'x-auth-bypass': 'true',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load available roles');
      }

      const roles = await response.json();
      setAvailableRoles(roles);
    } catch (err) {
      console.error('Failed to load available roles:', err);
    }
  };

  const handleAddRole = async () => {
    if (!selectedRoleId) {
      setError('Please select a role');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/users/${userId}/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-bypass': 'true',
        },
        body: JSON.stringify({ roleId: selectedRoleId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to assign role');
      }

      setSuccessMessage('Role assigned successfully');
      setSelectedRoleId('');
      setIsAddingRole(false);
      await loadUserRoles();
      onRoleChange?.();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign role');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveRole = async (roleId: string, roleName: string) => {
    if (!confirm(`Are you sure you want to remove the "${roleName}" role from this user?`)) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/users/${userId}/roles/${roleId}`, {
        method: 'DELETE',
        headers: {
          'x-auth-bypass': 'true',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to remove role');
      }

      setSuccessMessage('Role removed successfully');
      await loadUserRoles();
      onRoleChange?.();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove role');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getRoleIcon = (roleName: string) => {
    const icons: Record<string, string> = {
      Admin: '👑',
      'Gov Program Director': '🎯',
      'Program Manager': '📊',
      'Departing Contractor': '📤',
      'Incoming Contractor': '📥',
      'Security Officer': '🔐',
      Observer: '👁️',
      'Operational Support': '🔧',
    };
    return icons[roleName] || '👤';
  };

  const getRoleBadgeColor = (roleName: string) => {
    const colors: Record<string, string> = {
      Admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'Gov Program Director': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'Program Manager': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'Departing Contractor': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'Incoming Contractor': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
      'Security Officer': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      Observer: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      'Operational Support': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    };
    return colors[roleName] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  };

  // Filter out already assigned roles
  const unassignedRoles = availableRoles.filter(
    (role) => !userRoles.find((ur) => ur.roleId === role.id)
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Program Roles
          </h3>
          {canEdit && permissions.canInviteUser() && !isAddingRole && (
            <button
              onClick={() => setIsAddingRole(true)}
              className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              + Add Role
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-600 dark:text-green-400">{successMessage}</p>
          </div>
        )}

        {/* Add Role Form */}
        {isAddingRole && (
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Role
                </label>
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  disabled={isLoading}
                >
                  <option value="">-- Select a role --</option>
                  {unassignedRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                      {role.description && ` - ${role.description}`}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleAddRole}
                disabled={isLoading || !selectedRoleId}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Adding...' : 'Add'}
              </button>
              <button
                onClick={() => {
                  setIsAddingRole(false);
                  setSelectedRoleId('');
                  setError(null);
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && userRoles.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Roles List */}
        {!isLoading && userRoles.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">No roles assigned</p>
          </div>
        )}

        {userRoles.length > 0 && (
          <div className="space-y-3">
            {userRoles.map((userRole) => (
              <div
                key={userRole.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-2xl">{getRoleIcon(userRole.roleName)}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {userRole.roleName}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded ${getRoleBadgeColor(
                          userRole.roleName
                        )}`}
                      >
                        Active
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Assigned {formatDate(userRole.assignedAt)}
                      {userRole.assignedBy && ` by ${userRole.assignedBy}`}
                    </p>
                  </div>
                </div>
                {canEdit && permissions.canRevokeAccess() && (
                  <button
                    onClick={() => handleRemoveRole(userRole.roleId, userRole.roleName)}
                    className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    disabled={isLoading}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Info Note */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-xs text-blue-600 dark:text-blue-400">
            ℹ️ Users can have multiple roles. Permissions are combined from all assigned roles.
          </p>
        </div>
      </div>
    </div>
  );
}

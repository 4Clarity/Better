/**
 * usePermissions Hook
 * Provides easy access to permission checking in React components
 */

import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  checkPermission,
  hasFullAccess,
  hasWriteAccess,
  hasReadAccess,
  canPerformOperation,
  type UserContext,
  type PermissionResult,
} from '../utils/permissionChecker';

export function usePermissions() {
  const auth = useAuth();

  // Create user context for permission checking
  const userContext: UserContext = useMemo(
    () => ({
      roles: auth.user?.roles || ['Observer'],
      isImpersonating: auth.isImpersonating,
      impersonatedRole: auth.currentRole,
      userId: auth.user?.id || '',
    }),
    [auth.user, auth.isImpersonating, auth.currentRole]
  );

  return {
    userContext,

    /**
     * Check permission for a feature
     */
    checkPermission: (section: string, feature: string): PermissionResult =>
      checkPermission(section, feature, userContext),

    /**
     * Check if user has full access
     */
    hasFullAccess: (section: string, feature: string): boolean =>
      hasFullAccess(section, feature, userContext),

    /**
     * Check if user has write access
     */
    hasWriteAccess: (section: string, feature: string): boolean =>
      hasWriteAccess(section, feature, userContext),

    /**
     * Check if user has read access
     */
    hasReadAccess: (section: string, feature: string): boolean =>
      hasReadAccess(section, feature, userContext),

    /**
     * Check if user can perform a specific operation
     */
    canPerformOperation: (
      section: string,
      feature: string,
      operation: 'create' | 'read' | 'update' | 'delete'
    ): boolean => canPerformOperation(section, feature, operation, userContext),

    /**
     * Convenience methods for common checks
     */
    canCreateTransition: (): boolean =>
      canPerformOperation('Business Operations', 'Create Transition', 'create', userContext),

    canEditTransition: (): boolean =>
      canPerformOperation('Business Operations', 'Edit Transition', 'update', userContext),

    canDeleteTransition: (): boolean =>
      canPerformOperation('Business Operations', 'Delete Transition', 'delete', userContext),

    canUploadArtifact: (): boolean =>
      canPerformOperation('Artifact Vault', 'Upload Artifact', 'create', userContext),

    canApproveArtifact: (): boolean =>
      canPerformOperation('Artifact Vault', 'Approve Artifact', 'update', userContext),

    canInviteUser: (): boolean =>
      canPerformOperation('Security & Access', 'Invite User', 'create', userContext),

    canRevokeAccess: (): boolean =>
      canPerformOperation('Security & Access', 'Revoke Access', 'delete', userContext),

    canUploadDocument: (): boolean =>
      canPerformOperation('Knowledge Management', 'Upload Document', 'create', userContext),

    canApproveDocument: (): boolean =>
      canPerformOperation('Knowledge Management', 'Approve Document', 'update', userContext),

    canExportReport: (): boolean =>
      canPerformOperation('Reports', 'Export Report', 'read', userContext),
  };
}

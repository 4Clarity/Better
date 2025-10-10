import { getRoleCapabilityMatrix, PermissionLevel } from './role-management.service';

export interface PermissionCheckResult {
  hasPermission: boolean;
  level: PermissionLevel;
}

/**
 * Check if a role has permission for a specific feature
 */
export function checkPermission(
  role: string,
  section: string,
  feature: string
): PermissionCheckResult {
  const matrix = getRoleCapabilityMatrix();

  const matrixSection = matrix.sections.find((s) => s.name === section);
  if (!matrixSection) {
    return {
      hasPermission: false,
      level: PermissionLevel.NO_ACCESS,
    };
  }

  const matrixFeature = matrixSection.features.find((f) => f.name === feature);
  if (!matrixFeature) {
    return {
      hasPermission: false,
      level: PermissionLevel.NO_ACCESS,
    };
  }

  const permissionLevel = matrixFeature.permissions[role];
  if (!permissionLevel) {
    return {
      hasPermission: false,
      level: PermissionLevel.NO_ACCESS,
    };
  }

  return {
    hasPermission: permissionLevel !== PermissionLevel.NO_ACCESS,
    level: permissionLevel,
  };
}

/**
 * Check if a role has at least read-only access
 */
export function hasReadAccess(role: string, section: string, feature: string): boolean {
  const result = checkPermission(role, section, feature);
  return result.hasPermission;
}

/**
 * Check if a role has write access (full or limited)
 */
export function hasWriteAccess(role: string, section: string, feature: string): boolean {
  const result = checkPermission(role, section, feature);
  return (
    result.level === PermissionLevel.FULL ||
    result.level === PermissionLevel.LIMITED
  );
}

/**
 * Check if a role has full access
 */
export function hasFullAccess(role: string, section: string, feature: string): boolean {
  const result = checkPermission(role, section, feature);
  return result.level === PermissionLevel.FULL;
}

export const permissionService = {
  checkPermission,
  hasReadAccess,
  hasWriteAccess,
  hasFullAccess,
};

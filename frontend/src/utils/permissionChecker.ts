/**
 * Permission Checker Utility
 * Provides permission checking for UI elements based on user roles
 * Based on the roles-feature-matrix specification
 */

export type PermissionLevel = 'full' | 'limited' | 'read_only' | 'no_access' | 'conditional';

export interface PermissionResult {
  hasPermission: boolean;
  level: PermissionLevel;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export interface UserContext {
  roles: string[];
  isImpersonating?: boolean;
  impersonatedRole?: string;
  userId: string;
}

/**
 * Feature permission matrix
 * Maps section -> feature -> role -> permission level
 */
const FEATURE_PERMISSIONS: Record<string, Record<string, Record<string, PermissionLevel>>> = {
  'Business Operations': {
    'Create Transition': {
      'Admin': 'full',
      'Gov Program Director': 'full',
      'Program Manager': 'full',
      'Departing Contractor': 'no_access',
      'Incoming Contractor': 'no_access',
      'Security Officer': 'no_access',
      'Observer': 'no_access',
      'Operational Support': 'no_access',
    },
    'Edit Transition': {
      'Admin': 'full',
      'Gov Program Director': 'full',
      'Program Manager': 'full',
      'Departing Contractor': 'limited',
      'Incoming Contractor': 'no_access',
      'Security Officer': 'no_access',
      'Observer': 'no_access',
      'Operational Support': 'no_access',
    },
    'Delete Transition': {
      'Admin': 'full',
      'Gov Program Director': 'full',
      'Program Manager': 'limited',
      'Departing Contractor': 'no_access',
      'Incoming Contractor': 'no_access',
      'Security Officer': 'no_access',
      'Observer': 'no_access',
      'Operational Support': 'no_access',
    },
  },
  'Artifact Vault': {
    'Upload Artifact': {
      'Admin': 'full',
      'Gov Program Director': 'full',
      'Program Manager': 'full',
      'Departing Contractor': 'full',
      'Incoming Contractor': 'no_access',
      'Security Officer': 'no_access',
      'Observer': 'no_access',
      'Operational Support': 'no_access',
    },
    'Approve Artifact': {
      'Admin': 'full',
      'Gov Program Director': 'full',
      'Program Manager': 'full',
      'Departing Contractor': 'no_access',
      'Incoming Contractor': 'no_access',
      'Security Officer': 'full',
      'Observer': 'no_access',
      'Operational Support': 'no_access',
    },
    'Reject Artifact': {
      'Admin': 'full',
      'Gov Program Director': 'full',
      'Program Manager': 'full',
      'Departing Contractor': 'no_access',
      'Incoming Contractor': 'no_access',
      'Security Officer': 'full',
      'Observer': 'no_access',
      'Operational Support': 'no_access',
    },
  },
  'Security & Access': {
    'Invite User': {
      'Admin': 'full',
      'Gov Program Director': 'limited',
      'Program Manager': 'no_access',
      'Departing Contractor': 'no_access',
      'Incoming Contractor': 'no_access',
      'Security Officer': 'full',
      'Observer': 'no_access',
      'Operational Support': 'no_access',
    },
    'Revoke Access': {
      'Admin': 'full',
      'Gov Program Director': 'no_access',
      'Program Manager': 'no_access',
      'Departing Contractor': 'no_access',
      'Incoming Contractor': 'no_access',
      'Security Officer': 'full',
      'Observer': 'no_access',
      'Operational Support': 'no_access',
    },
    'Verify Clearance': {
      'Admin': 'full',
      'Gov Program Director': 'no_access',
      'Program Manager': 'no_access',
      'Departing Contractor': 'no_access',
      'Incoming Contractor': 'no_access',
      'Security Officer': 'full',
      'Observer': 'no_access',
      'Operational Support': 'no_access',
    },
    'Grant PIV Exception': {
      'Admin': 'full',
      'Gov Program Director': 'no_access',
      'Program Manager': 'no_access',
      'Departing Contractor': 'no_access',
      'Incoming Contractor': 'no_access',
      'Security Officer': 'full',
      'Observer': 'no_access',
      'Operational Support': 'no_access',
    },
  },
  'Knowledge Management': {
    'Upload Document': {
      'Admin': 'full',
      'Gov Program Director': 'full',
      'Program Manager': 'full',
      'Departing Contractor': 'full',
      'Incoming Contractor': 'no_access',
      'Security Officer': 'no_access',
      'Observer': 'no_access',
      'Operational Support': 'full',
    },
    'Approve Document': {
      'Admin': 'full',
      'Gov Program Director': 'full',
      'Program Manager': 'full',
      'Departing Contractor': 'no_access',
      'Incoming Contractor': 'no_access',
      'Security Officer': 'no_access',
      'Observer': 'no_access',
      'Operational Support': 'no_access',
    },
    'Curate Facts': {
      'Admin': 'full',
      'Gov Program Director': 'full',
      'Program Manager': 'full',
      'Departing Contractor': 'limited',
      'Incoming Contractor': 'no_access',
      'Security Officer': 'no_access',
      'Observer': 'no_access',
      'Operational Support': 'full',
    },
  },
  'Reports': {
    'Export Report': {
      'Admin': 'full',
      'Gov Program Director': 'full',
      'Program Manager': 'full',
      'Departing Contractor': 'limited',
      'Incoming Contractor': 'no_access',
      'Security Officer': 'full',
      'Observer': 'read_only',
      'Operational Support': 'limited',
    },
  },
};

/**
 * Normalize role name to match the permission matrix format
 * Converts database role names (lowercase, underscores) to display names (capitalized)
 */
function normalizeRoleName(role: string): string {
  const roleMap: Record<string, string> = {
    'admin': 'Admin',
    'administrator': 'Admin',
    'gov_program_director': 'Gov Program Director',
    'program_manager': 'Program Manager',
    'departing_contractor': 'Departing Contractor',
    'incoming_contractor': 'Incoming Contractor',
    'security_officer': 'Security Officer',
    'observer': 'Observer',
    'operational_support': 'Operational Support',
    'user': 'Observer', // Map generic 'user' to Observer
  };

  return roleMap[role.toLowerCase()] || role;
}

/**
 * Get the active role for permission checking
 */
export function getActiveRole(userContext: UserContext): string {
  if (userContext.isImpersonating && userContext.impersonatedRole) {
    return normalizeRoleName(userContext.impersonatedRole);
  }

  // Find the most privileged role from the user's roles
  const roles = userContext.roles.map(normalizeRoleName);

  // Priority order for roles
  const rolePriority = [
    'Admin',
    'Gov Program Director',
    'Security Officer',
    'Program Manager',
    'Departing Contractor',
    'Incoming Contractor',
    'Operational Support',
    'Observer',
  ];

  for (const role of rolePriority) {
    if (roles.includes(role)) {
      return role;
    }
  }

  return roles[0] || 'Observer';
}

/**
 * Check permission for a specific feature
 */
export function checkPermission(
  section: string,
  feature: string,
  userContext: UserContext
): PermissionResult {
  const activeRole = getActiveRole(userContext);

  const sectionPermissions = FEATURE_PERMISSIONS[section];
  if (!sectionPermissions) {
    return {
      hasPermission: false,
      level: 'no_access',
      canCreate: false,
      canRead: false,
      canUpdate: false,
      canDelete: false,
    };
  }

  const featurePermissions = sectionPermissions[feature];
  if (!featurePermissions) {
    return {
      hasPermission: false,
      level: 'no_access',
      canCreate: false,
      canRead: false,
      canUpdate: false,
      canDelete: false,
    };
  }

  const level = featurePermissions[activeRole] || 'no_access';

  return {
    hasPermission: level !== 'no_access',
    level,
    canCreate: level === 'full',
    canRead: level === 'full' || level === 'limited' || level === 'read_only',
    canUpdate: level === 'full' || level === 'limited',
    canDelete: level === 'full',
  };
}

/**
 * Check if user has full access to a feature
 */
export function hasFullAccess(
  section: string,
  feature: string,
  userContext: UserContext
): boolean {
  const result = checkPermission(section, feature, userContext);
  return result.level === 'full';
}

/**
 * Check if user has write access (create/update) to a feature
 */
export function hasWriteAccess(
  section: string,
  feature: string,
  userContext: UserContext
): boolean {
  const result = checkPermission(section, feature, userContext);
  return result.canCreate || result.canUpdate;
}

/**
 * Check if user has read access to a feature
 */
export function hasReadAccess(
  section: string,
  feature: string,
  userContext: UserContext
): boolean {
  const result = checkPermission(section, feature, userContext);
  return result.canRead;
}

/**
 * Check if user can perform a specific CRUD operation
 */
export function canPerformOperation(
  section: string,
  feature: string,
  operation: 'create' | 'read' | 'update' | 'delete',
  userContext: UserContext
): boolean {
  const result = checkPermission(section, feature, userContext);

  switch (operation) {
    case 'create':
      return result.canCreate;
    case 'read':
      return result.canRead;
    case 'update':
      return result.canUpdate;
    case 'delete':
      return result.canDelete;
    default:
      return false;
  }
}

/**
 * Check if user should see a component based on permissions
 * Use this in components to conditionally render based on permissions
 */
export function shouldRenderWithPermission(
  section: string,
  feature: string,
  userContext: UserContext,
  requiredOperation?: 'create' | 'read' | 'update' | 'delete'
): boolean {
  if (requiredOperation) {
    return canPerformOperation(section, feature, requiredOperation, userContext);
  } else {
    const result = checkPermission(section, feature, userContext);
    return result.hasPermission;
  }
}

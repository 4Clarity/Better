/**
 * Navigation Filter Utility
 * Filters navigation items based on user roles and permissions
 * Based on the roles-feature-matrix specification
 */

export interface NavigationItem {
  name: string;
  path: string;
  icon?: React.ReactNode;
  subItems?: SubNavigationItem[];
  requiredPermission?: string;
  roles?: string[]; // If specified, only these roles can see this item
}

export interface SubNavigationItem {
  name: string;
  path: string;
  requiredPermission?: string;
  roles?: string[];
}

export interface UserContext {
  roles: string[];
  isImpersonating?: boolean;
  impersonatedRole?: string;
  userId: string;
}

/**
 * Role-based navigation visibility matrix
 * Maps each navigation item to the roles that can access it
 */
const NAVIGATION_PERMISSIONS: Record<string, string[]> = {
  // Dashboard - All roles
  '/': ['Admin', 'Gov Program Director', 'Program Manager', 'Departing Contractor', 'Incoming Contractor', 'Security Officer', 'Observer', 'Operational Support'],

  // Executive Dashboard - Admin and Gov Program Director only
  '/executive': ['Admin', 'Gov Program Director'],

  // Business Operations - Most roles with varying permissions
  '/business-operations': ['Admin', 'Gov Program Director', 'Program Manager', 'Departing Contractor', 'Security Officer', 'Observer', 'Operational Support'],
  '/transitions': ['Admin', 'Gov Program Director', 'Program Manager', 'Departing Contractor', 'Security Officer', 'Observer', 'Operational Support'],
  '/programs': ['Admin', 'Gov Program Director', 'Program Manager', 'Security Officer', 'Observer', 'Operational Support'],
  '/tasks': ['Admin', 'Gov Program Director', 'Program Manager', 'Departing Contractor', 'Operational Support'],

  // Knowledge Management - Most roles
  '/knowledge': ['Admin', 'Gov Program Director', 'Program Manager', 'Departing Contractor', 'Incoming Contractor', 'Security Officer', 'Observer', 'Operational Support'],
  '/knowledge/weekly-curation': ['Admin', 'Gov Program Director', 'Program Manager', 'Departing Contractor', 'Operational Support'],
  '/knowledge/document-upload': ['Admin', 'Gov Program Director', 'Program Manager', 'Departing Contractor', 'Operational Support'],
  '/knowledge/communication-files': ['Admin', 'Gov Program Director', 'Program Manager', 'Departing Contractor', 'Operational Support'],
  '/knowledge/facts-curation': ['Admin', 'Gov Program Director', 'Program Manager', 'Operational Support'],
  '/knowledge/approval-queue': ['Admin', 'Gov Program Director', 'Program Manager'],
  '/knowledge/knowledge-search': ['Admin', 'Gov Program Director', 'Program Manager', 'Departing Contractor', 'Incoming Contractor', 'Security Officer', 'Observer', 'Operational Support'],
  '/knowledge/configuration': ['Admin', 'Security Officer'],

  // Artifact Vault - Conditional access based on clearance
  '/artifacts': ['Admin', 'Gov Program Director', 'Program Manager', 'Departing Contractor', 'Incoming Contractor', 'Security Officer', 'Observer', 'Operational Support'],

  // Security & Access - Admin and Security Officer (full), Program Manager/Director (limited)
  '/security': ['Admin', 'Gov Program Director', 'Program Manager', 'Security Officer'],
  '/security/roles-matrix': ['Admin', 'Security Officer'],

  // User Profile - All authenticated users
  '/profile': ['Admin', 'Gov Program Director', 'Program Manager', 'Departing Contractor', 'Incoming Contractor', 'Security Officer', 'Observer', 'Operational Support'],

  // Administration - Admin only (with some limited access for others)
  '/admin': ['Admin', 'Gov Program Director', 'Program Manager', 'Security Officer'],
  '/admin/user-management': ['Admin', 'Security Officer'],
  '/admin/system-settings': ['Admin'],
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
 * If impersonating, use the impersonated role, otherwise use the first role
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

  return roles[0] || 'Observer'; // Default to first role or Observer if no roles
}

/**
 * Check if a user has access to a navigation item
 */
export function hasNavigationAccess(
  path: string,
  userContext: UserContext
): boolean {
  const activeRole = getActiveRole(userContext);
  const allowedRoles = NAVIGATION_PERMISSIONS[path];

  if (!allowedRoles) {
    // If not explicitly defined, default to Admin only
    return activeRole === 'Admin';
  }

  return allowedRoles.includes(activeRole);
}

/**
 * Filter navigation items based on user's role and permissions
 */
export function filterNavigationByRole(
  navigationItems: NavigationItem[],
  userContext: UserContext
): NavigationItem[] {
  return navigationItems
    .filter((item) => {
      // Check if item has role restrictions
      if (item.roles && item.roles.length > 0) {
        const activeRole = getActiveRole(userContext);
        return item.roles.includes(activeRole);
      }

      // Check path-based permissions
      return hasNavigationAccess(item.path, userContext);
    })
    .map((item) => {
      // Filter sub-items if they exist
      if (item.subItems && item.subItems.length > 0) {
        const filteredSubItems = item.subItems.filter((subItem) => {
          // Check if sub-item has role restrictions
          if (subItem.roles && subItem.roles.length > 0) {
            const activeRole = getActiveRole(userContext);
            return subItem.roles.includes(activeRole);
          }

          // Check path-based permissions
          return hasNavigationAccess(subItem.path, userContext);
        });

        return {
          ...item,
          subItems: filteredSubItems,
        };
      }

      return item;
    });
}

/**
 * Check if a user can access a specific feature
 */
export function canAccessFeature(
  featurePath: string,
  userContext: UserContext
): boolean {
  return hasNavigationAccess(featurePath, userContext);
}

/**
 * Get a list of all accessible paths for a user
 */
export function getAccessiblePaths(userContext: UserContext): string[] {
  return Object.keys(NAVIGATION_PERMISSIONS).filter((path) =>
    hasNavigationAccess(path, userContext)
  );
}

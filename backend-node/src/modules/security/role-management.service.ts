import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

export interface UserRole {
  id: string;
  roleId: string;
  roleName: string;
  assignedAt: Date;
  assignedBy?: string;
  isActive: boolean;
}

export interface RoleAssignmentRequest {
  userId: string;
  roleId: string;
  assignedBy: string;
}

export interface RoleCapabilityMatrix {
  sections: RoleMatrixSection[];
}

export interface RoleMatrixSection {
  name: string;
  features: RoleMatrixFeature[];
}

export interface RoleMatrixFeature {
  name: string;
  permissions: {
    [roleName: string]: PermissionLevel;
  };
}

export enum PermissionLevel {
  FULL = 'full',
  LIMITED = 'limited',
  READ_ONLY = 'read_only',
  NO_ACCESS = 'no_access',
  CONDITIONAL = 'conditional',
}

/**
 * Get all roles assigned to a user
 */
export async function getUserRoles(userId: string): Promise<UserRole[]> {
  const userRoles = await prisma.user_roles.findMany({
    where: {
      userId,
      isActive: true,
    },
    include: {
      roles: true,
      users_user_roles_assignedByTousers: {
        select: {
          id: true,
          username: true,
        },
      },
    },
    orderBy: {
      assignedAt: 'desc',
    },
  });

  return userRoles.map((ur) => ({
    id: ur.id,
    roleId: ur.roleId,
    roleName: ur.roles.name,
    assignedAt: ur.assignedAt,
    assignedBy: ur.users_user_roles_assignedByTousers?.username || ur.assignedBy || undefined,
    isActive: ur.isActive,
  }));
}

/**
 * Assign a role to a user
 */
export async function assignRoleToUser(
  request: RoleAssignmentRequest
): Promise<UserRole> {
  // Verify the user exists
  const user = await prisma.user.findUnique({
    where: { id: request.userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Verify the role exists
  const role = await prisma.roles.findUnique({
    where: { id: request.roleId },
  });

  if (!role) {
    throw new Error('Role not found');
  }

  // Check if the user already has this role (active or inactive)
  const existingRole = await prisma.user_roles.findFirst({
    where: {
      userId: request.userId,
      roleId: request.roleId,
    },
    include: {
      roles: true,
    },
  });

  let userRole;

  if (existingRole) {
    if (existingRole.isActive) {
      throw new Error('User already has this role');
    }

    // Reactivate the existing role assignment
    userRole = await prisma.user_roles.update({
      where: { id: existingRole.id },
      data: {
        isActive: true,
        assignedBy: request.assignedBy === 'system' ? null : request.assignedBy,
        assignedAt: new Date(),
      },
      include: {
        roles: true,
      },
    });
  } else {
    // Create a new role assignment
    userRole = await prisma.user_roles.create({
      data: {
        id: randomUUID(),
        userId: request.userId,
        roleId: request.roleId,
        assignedBy: request.assignedBy === 'system' ? null : request.assignedBy,
        isActive: true,
      },
      include: {
        roles: true,
      },
    });
  }

  // Log the assignment in audit log (only if assignedBy is a valid user)
  if (request.assignedBy !== 'system') {
    await prisma.auditLog.create({
      data: {
        id: randomUUID(),
        userId: request.assignedBy,
        action: 'ROLE_ASSIGNED',
        entityType: 'UserRole',
        entityId: userRole.id,
        changes: JSON.stringify({
          userId: request.userId,
          roleId: request.roleId,
          roleName: role.name,
        }),
        timestamp: new Date(),
        ipAddress: null,
        userAgent: null,
      },
    });
  }

  return {
    id: userRole.id,
    roleId: userRole.roleId,
    roleName: userRole.roles.name,
    assignedAt: userRole.assignedAt,
    assignedBy: userRole.assignedBy || undefined,
    isActive: userRole.isActive,
  };
}

/**
 * Remove a role from a user
 */
export async function removeRoleFromUser(
  userId: string,
  roleId: string,
  removedBy: string
): Promise<{ success: boolean }> {
  const userRole = await prisma.user_roles.findFirst({
    where: {
      userId,
      roleId,
      isActive: true,
    },
    include: {
      roles: true,
    },
  });

  if (!userRole) {
    throw new Error('User does not have this role');
  }

  // Deactivate the role assignment
  await prisma.user_roles.update({
    where: { id: userRole.id },
    data: {
      isActive: false,
    },
  });

  // Log the removal in audit log (only if removedBy is a valid user)
  if (removedBy !== 'system') {
    await prisma.auditLog.create({
      data: {
        id: randomUUID(),
        userId: removedBy,
        action: 'ROLE_REMOVED',
        entityType: 'UserRole',
        entityId: userRole.id,
        changes: JSON.stringify({
          userId,
          roleId,
          roleName: userRole.roles.name,
        }),
        timestamp: new Date(),
        ipAddress: null,
        userAgent: null,
      },
    });
  }

  return { success: true };
}

/**
 * Get all available system roles
 */
export async function getAllRoles() {
  return await prisma.roles.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
}

/**
 * Get the role capability matrix
 * This defines what permissions each role has for each feature
 */
export function getRoleCapabilityMatrix(): RoleCapabilityMatrix {
  return {
    sections: [
      {
        name: 'Dashboard',
        features: [
          {
            name: 'View Dashboard',
            permissions: {
              Admin: PermissionLevel.FULL,
              'Gov Program Director': PermissionLevel.FULL,
              'Program Manager': PermissionLevel.FULL,
              'Departing Contractor': PermissionLevel.FULL,
              'Incoming Contractor': PermissionLevel.CONDITIONAL,
              'Security Officer': PermissionLevel.FULL,
              Observer: PermissionLevel.READ_ONLY,
              'Operational Support': PermissionLevel.FULL,
            },
          },
          {
            name: 'Executive Dashboard',
            permissions: {
              Admin: PermissionLevel.FULL,
              'Gov Program Director': PermissionLevel.FULL,
              'Program Manager': PermissionLevel.NO_ACCESS,
              'Departing Contractor': PermissionLevel.NO_ACCESS,
              'Incoming Contractor': PermissionLevel.NO_ACCESS,
              'Security Officer': PermissionLevel.NO_ACCESS,
              Observer: PermissionLevel.NO_ACCESS,
              'Operational Support': PermissionLevel.NO_ACCESS,
            },
          },
        ],
      },
      {
        name: 'Business Operations',
        features: [
          {
            name: 'View Operations',
            permissions: {
              Admin: PermissionLevel.FULL,
              'Gov Program Director': PermissionLevel.FULL,
              'Program Manager': PermissionLevel.FULL,
              'Departing Contractor': PermissionLevel.LIMITED,
              'Incoming Contractor': PermissionLevel.NO_ACCESS,
              'Security Officer': PermissionLevel.READ_ONLY,
              Observer: PermissionLevel.READ_ONLY,
              'Operational Support': PermissionLevel.READ_ONLY,
            },
          },
          {
            name: 'Create Transition',
            permissions: {
              Admin: PermissionLevel.FULL,
              'Gov Program Director': PermissionLevel.FULL,
              'Program Manager': PermissionLevel.FULL,
              'Departing Contractor': PermissionLevel.NO_ACCESS,
              'Incoming Contractor': PermissionLevel.NO_ACCESS,
              'Security Officer': PermissionLevel.NO_ACCESS,
              Observer: PermissionLevel.NO_ACCESS,
              'Operational Support': PermissionLevel.NO_ACCESS,
            },
          },
          {
            name: 'Edit Transition',
            permissions: {
              Admin: PermissionLevel.FULL,
              'Gov Program Director': PermissionLevel.FULL,
              'Program Manager': PermissionLevel.FULL,
              'Departing Contractor': PermissionLevel.LIMITED,
              'Incoming Contractor': PermissionLevel.NO_ACCESS,
              'Security Officer': PermissionLevel.NO_ACCESS,
              Observer: PermissionLevel.NO_ACCESS,
              'Operational Support': PermissionLevel.NO_ACCESS,
            },
          },
        ],
      },
      {
        name: 'Knowledge Management',
        features: [
          {
            name: 'View Knowledge',
            permissions: {
              Admin: PermissionLevel.FULL,
              'Gov Program Director': PermissionLevel.FULL,
              'Program Manager': PermissionLevel.FULL,
              'Departing Contractor': PermissionLevel.FULL,
              'Incoming Contractor': PermissionLevel.CONDITIONAL,
              'Security Officer': PermissionLevel.READ_ONLY,
              Observer: PermissionLevel.READ_ONLY,
              'Operational Support': PermissionLevel.FULL,
            },
          },
          {
            name: 'Upload Documents',
            permissions: {
              Admin: PermissionLevel.FULL,
              'Gov Program Director': PermissionLevel.FULL,
              'Program Manager': PermissionLevel.FULL,
              'Departing Contractor': PermissionLevel.FULL,
              'Incoming Contractor': PermissionLevel.NO_ACCESS,
              'Security Officer': PermissionLevel.NO_ACCESS,
              Observer: PermissionLevel.NO_ACCESS,
              'Operational Support': PermissionLevel.FULL,
            },
          },
        ],
      },
      {
        name: 'Artifact Vault',
        features: [
          {
            name: 'View Artifacts',
            permissions: {
              Admin: PermissionLevel.FULL,
              'Gov Program Director': PermissionLevel.FULL,
              'Program Manager': PermissionLevel.FULL,
              'Departing Contractor': PermissionLevel.FULL,
              'Incoming Contractor': PermissionLevel.CONDITIONAL,
              'Security Officer': PermissionLevel.FULL,
              Observer: PermissionLevel.READ_ONLY,
              'Operational Support': PermissionLevel.LIMITED,
            },
          },
          {
            name: 'Upload Artifact',
            permissions: {
              Admin: PermissionLevel.FULL,
              'Gov Program Director': PermissionLevel.FULL,
              'Program Manager': PermissionLevel.FULL,
              'Departing Contractor': PermissionLevel.FULL,
              'Incoming Contractor': PermissionLevel.NO_ACCESS,
              'Security Officer': PermissionLevel.NO_ACCESS,
              Observer: PermissionLevel.NO_ACCESS,
              'Operational Support': PermissionLevel.NO_ACCESS,
            },
          },
        ],
      },
      {
        name: 'Security & Access',
        features: [
          {
            name: 'View Security Settings',
            permissions: {
              Admin: PermissionLevel.FULL,
              'Gov Program Director': PermissionLevel.READ_ONLY,
              'Program Manager': PermissionLevel.LIMITED,
              'Departing Contractor': PermissionLevel.NO_ACCESS,
              'Incoming Contractor': PermissionLevel.NO_ACCESS,
              'Security Officer': PermissionLevel.FULL,
              Observer: PermissionLevel.NO_ACCESS,
              'Operational Support': PermissionLevel.NO_ACCESS,
            },
          },
          {
            name: 'Manage User Roles',
            permissions: {
              Admin: PermissionLevel.FULL,
              'Gov Program Director': PermissionLevel.NO_ACCESS,
              'Program Manager': PermissionLevel.NO_ACCESS,
              'Departing Contractor': PermissionLevel.NO_ACCESS,
              'Incoming Contractor': PermissionLevel.NO_ACCESS,
              'Security Officer': PermissionLevel.FULL,
              Observer: PermissionLevel.NO_ACCESS,
              'Operational Support': PermissionLevel.NO_ACCESS,
            },
          },
        ],
      },
      {
        name: 'Administration',
        features: [
          {
            name: 'System Settings',
            permissions: {
              Admin: PermissionLevel.FULL,
              'Gov Program Director': PermissionLevel.LIMITED,
              'Program Manager': PermissionLevel.LIMITED,
              'Departing Contractor': PermissionLevel.NO_ACCESS,
              'Incoming Contractor': PermissionLevel.NO_ACCESS,
              'Security Officer': PermissionLevel.LIMITED,
              Observer: PermissionLevel.NO_ACCESS,
              'Operational Support': PermissionLevel.NO_ACCESS,
            },
          },
        ],
      },
    ],
  };
}

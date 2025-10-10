import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

export interface ImpersonationSession {
  id: string;
  sessionId: string;
  actualUserId: string;
  impersonatedRole: string;
  startedAt: Date;
  endedAt?: Date | null;
  impersonationReason?: string | null;
  isActive: boolean;
}

export interface StartImpersonationRequest {
  sessionId: string;
  actualUserId: string;
  role: string;
  reason?: string;
}

export interface ImpersonationStatusResponse {
  isImpersonating: boolean;
  actualRole?: string;
  impersonatedRole?: string;
  actualUserId?: string;
  sessionId?: string;
}

/**
 * Start a role impersonation session
 * Only Admin users can impersonate roles
 */
export async function startImpersonation(
  request: StartImpersonationRequest
): Promise<ImpersonationSession> {
  // Verify the user exists and has Admin role
  const user = await prisma.user.findUnique({
    where: { id: request.actualUserId },
    include: {
      user_roles: {
        where: { isActive: true },
        include: { roles: true },
      },
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const isAdmin = user.user_roles.some(
    (ur) => ur.roles.name === 'Admin' && ur.isActive
  );

  if (!isAdmin) {
    throw new Error('Only Admin users can impersonate roles');
  }

  // Verify the session exists and belongs to the user
  const session = await prisma.user_sessions.findUnique({
    where: { id: request.sessionId },
  });

  if (!session || session.userId !== request.actualUserId) {
    throw new Error('Invalid session');
  }

  // End any existing active impersonation for this session
  await prisma.impersonation_sessions.updateMany({
    where: {
      sessionId: request.sessionId,
      isActive: true,
    },
    data: {
      isActive: false,
      endedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Create new impersonation session
  const impersonationSession = await prisma.impersonation_sessions.create({
    data: {
      id: randomUUID(),
      sessionId: request.sessionId,
      actualUserId: request.actualUserId,
      impersonatedRole: request.role,
      impersonationReason: request.reason,
      isActive: true,
      updatedAt: new Date(),
    },
  });

  // Log the impersonation action in audit log
  await prisma.auditLog.create({
    data: {
      id: randomUUID(),
      userId: request.actualUserId,
      action: 'IMPERSONATION_START',
      entityType: 'User',
      entityId: request.actualUserId,
      changes: JSON.stringify({
        impersonatedRole: request.role,
        reason: request.reason,
      }),
      timestamp: new Date(),
      ipAddress: null,
      userAgent: session.userAgent || null,
    },
  });

  return impersonationSession;
}

/**
 * End the current impersonation session
 */
export async function endImpersonation(
  sessionId: string,
  actualUserId: string
): Promise<{ success: boolean; restoredRole: string }> {
  // Find active impersonation session
  const impersonationSession = await prisma.impersonation_sessions.findFirst({
    where: {
      sessionId,
      actualUserId,
      isActive: true,
    },
    include: {
      actualUser: {
        include: {
          user_roles: {
            where: { isActive: true },
            include: { roles: true },
          },
        },
      },
    },
  });

  if (!impersonationSession) {
    throw new Error('No active impersonation session found');
  }

  // End the impersonation session
  await prisma.impersonation_sessions.update({
    where: { id: impersonationSession.id },
    data: {
      isActive: false,
      endedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Get the user's actual admin role
  const adminRole = impersonationSession.actualUser.user_roles.find(
    (ur) => ur.roles.name === 'Admin'
  );

  // Log the end of impersonation in audit log
  await prisma.auditLog.create({
    data: {
      id: randomUUID(),
      userId: actualUserId,
      action: 'IMPERSONATION_END',
      entityType: 'User',
      entityId: actualUserId,
      changes: JSON.stringify({
        impersonatedRole: impersonationSession.impersonatedRole,
        duration: Math.floor(
          (new Date().getTime() - impersonationSession.startedAt.getTime()) / 1000
        ),
      }),
      timestamp: new Date(),
      ipAddress: null,
      userAgent: null,
    },
  });

  return {
    success: true,
    restoredRole: adminRole?.roles.name || 'Admin',
  };
}

/**
 * Get the current impersonation status for a session
 */
export async function getImpersonationStatus(
  sessionId: string,
  actualUserId: string
): Promise<ImpersonationStatusResponse> {
  const impersonationSession = await prisma.impersonation_sessions.findFirst({
    where: {
      sessionId,
      actualUserId,
      isActive: true,
    },
    include: {
      actualUser: {
        include: {
          user_roles: {
            where: { isActive: true },
            include: { roles: true },
          },
        },
      },
    },
  });

  if (!impersonationSession) {
    return {
      isImpersonating: false,
    };
  }

  const actualRole = impersonationSession.actualUser.user_roles.find(
    (ur) => ur.roles.name === 'Admin'
  );

  return {
    isImpersonating: true,
    actualRole: actualRole?.roles.name || 'Admin',
    impersonatedRole: impersonationSession.impersonatedRole,
    actualUserId: impersonationSession.actualUserId,
    sessionId: impersonationSession.sessionId,
  };
}

/**
 * Check if a session has an active impersonation and return the impersonated role
 */
export async function getActiveImpersonation(
  sessionId: string
): Promise<string | null> {
  const impersonationSession = await prisma.impersonation_sessions.findFirst({
    where: {
      sessionId,
      isActive: true,
    },
    select: {
      impersonatedRole: true,
    },
  });

  return impersonationSession?.impersonatedRole || null;
}

/**
 * Automatically end impersonation sessions older than 1 hour
 */
export async function cleanupExpiredImpersonations(): Promise<number> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const result = await prisma.impersonation_sessions.updateMany({
    where: {
      isActive: true,
      startedAt: {
        lt: oneHourAgo,
      },
    },
    data: {
      isActive: false,
      endedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  return result.count;
}

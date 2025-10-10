import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  getUserRoles,
  assignRoleToUser,
  removeRoleFromUser,
  getAllRoles,
  getRoleCapabilityMatrix,
} from './role-management.service';
import { AuthUser } from '../auth/auth.service';

interface GetUserRolesRequest {
  Params: {
    userId: string;
  };
}

interface AssignRoleRequest {
  Params: {
    userId: string;
  };
  Body: {
    roleId: string;
  };
}

interface RemoveRoleRequest {
  Params: {
    userId: string;
    roleId: string;
  };
}

export async function roleManagementRoutes(
  fastify: FastifyInstance
): Promise<void> {
  /**
   * GET /api/users/:userId/roles
   * Get all roles assigned to a user
   */
  fastify.get<GetUserRolesRequest>(
    '/api/users/:userId/roles',
    {
      preHandler: fastify.authenticate,
    },
    async (
      request: FastifyRequest<GetUserRolesRequest>,
      reply: FastifyReply
    ) => {
      try {
        const { userId } = request.params;
        const roles = await getUserRoles(userId);

        return reply.status(200).send(roles);
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          error: 'Failed to get user roles',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * POST /api/users/:userId/roles
   * Assign a new role to a user
   */
  fastify.post<AssignRoleRequest>(
    '/api/users/:userId/roles',
    {
      preHandler: fastify.authenticate,
    },
    async (request: FastifyRequest<AssignRoleRequest>, reply: FastifyReply) => {
      try {
        const user = request.user as AuthUser;
        const { userId } = request.params;
        const { roleId } = request.body;

        // Verify the user has permission to assign roles (Admin or Security Officer)
        const hasPermission = user.roles.some(
          (role) => role === 'Admin' || role === 'Security Officer'
        );

        if (!hasPermission) {
          return reply.status(403).send({
            error: 'Insufficient permissions',
            message: 'Only Admin and Security Officer can assign roles',
          });
        }

        const userRole = await assignRoleToUser({
          userId,
          roleId,
          assignedBy: user.id,
        });

        return reply.status(201).send(userRole);
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          error: 'Failed to assign role',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * DELETE /api/users/:userId/roles/:roleId
   * Remove a role from a user
   */
  fastify.delete<RemoveRoleRequest>(
    '/api/users/:userId/roles/:roleId',
    {
      preHandler: fastify.authenticate,
    },
    async (request: FastifyRequest<RemoveRoleRequest>, reply: FastifyReply) => {
      try {
        const user = request.user as AuthUser;
        const { userId, roleId } = request.params;

        // Verify the user has permission to remove roles (Admin or Security Officer)
        const hasPermission = user.roles.some(
          (role) => role === 'Admin' || role === 'Security Officer'
        );

        if (!hasPermission) {
          return reply.status(403).send({
            error: 'Insufficient permissions',
            message: 'Only Admin and Security Officer can remove roles',
          });
        }

        const result = await removeRoleFromUser(userId, roleId, user.id);

        return reply.status(200).send(result);
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          error: 'Failed to remove role',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * GET /api/security/roles
   * Get all available system roles
   */
  fastify.get(
    '/api/security/roles',
    {
      preHandler: fastify.authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const roles = await getAllRoles();

        return reply.status(200).send(roles);
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          error: 'Failed to get roles',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * GET /api/security/roles/matrix
   * Get the complete role capability matrix
   */
  fastify.get(
    '/api/security/roles/matrix',
    {
      preHandler: fastify.authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const matrix = getRoleCapabilityMatrix();

        return reply.status(200).send(matrix);
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          error: 'Failed to get role matrix',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );
}

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  startImpersonation,
  endImpersonation,
  getImpersonationStatus,
} from './impersonation.service';
import { AuthUser } from '../auth/auth.service';

interface ImpersonationStartRequest {
  Body: {
    role: string;
    reason?: string;
  };
}

export async function impersonationRoutes(
  fastify: FastifyInstance
): Promise<void> {
  /**
   * POST /api/security/impersonation/start
   * Start a role impersonation session
   */
  fastify.post<ImpersonationStartRequest>(
    '/api/security/impersonation/start',
    {
      preHandler: fastify.authenticate,
    },
    async (
      request: FastifyRequest<ImpersonationStartRequest>,
      reply: FastifyReply
    ) => {
      try {
        const user = request.user as AuthUser;
        const { role, reason } = request.body;

        // Validate role
        const validRoles = [
          'Admin',
          'Gov Program Director',
          'Program Manager',
          'Departing Contractor',
          'Incoming Contractor',
          'Security Officer',
          'Observer',
          'Operational Support',
        ];

        if (!validRoles.includes(role)) {
          return reply.status(400).send({
            error: 'Invalid role',
            message: `Role must be one of: ${validRoles.join(', ')}`,
          });
        }

        // Get session ID from the request (assuming it's stored in the JWT or can be retrieved)
        const sessionId = request.user?.sessionId;
        if (!sessionId) {
          return reply.status(400).send({
            error: 'No session found',
            message: 'Unable to find active session',
          });
        }

        const impersonationSession = await startImpersonation({
          sessionId,
          actualUserId: user.id,
          role,
          reason,
        });

        return reply.status(200).send({
          success: true,
          impersonatedRole: impersonationSession.impersonatedRole,
          sessionId: impersonationSession.sessionId,
        });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          error: 'Failed to start impersonation',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * POST /api/security/impersonation/end
   * End the current impersonation session
   */
  fastify.post(
    '/api/security/impersonation/end',
    {
      preHandler: fastify.authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = request.user as AuthUser;
        const sessionId = request.user?.sessionId;

        if (!sessionId) {
          return reply.status(400).send({
            error: 'No session found',
            message: 'Unable to find active session',
          });
        }

        const result = await endImpersonation(sessionId, user.id);

        return reply.status(200).send(result);
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          error: 'Failed to end impersonation',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * GET /api/security/impersonation/status
   * Get the current impersonation status
   */
  fastify.get(
    '/api/security/impersonation/status',
    {
      preHandler: fastify.authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = request.user as AuthUser;
        const sessionId = request.user?.sessionId;

        if (!sessionId) {
          return reply.status(200).send({
            isImpersonating: false,
          });
        }

        const status = await getImpersonationStatus(sessionId, user.id);

        return reply.status(200).send(status);
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          error: 'Failed to get impersonation status',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );
}

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UserRegistrationService } from '../../services/user-registration.service';
import { authenticate, requireRoles } from '../auth/auth.middleware';
import { AuthUser } from '../auth/auth.service';

const registrationService = new UserRegistrationService();

// Interface for authenticated requests
interface AuthenticatedRequest extends FastifyRequest {
  user: AuthUser;
}

// Input validation schemas
const approveRegistrationSchema = {
  type: 'object',
  properties: {
    roles: {
      type: 'array',
      items: { type: 'string' },
      default: ['user'],
      minItems: 1,
      maxItems: 10
    },
    notes: {
      type: 'string',
      maxLength: 500
    }
  },
  additionalProperties: false
};

const rejectRegistrationSchema = {
  type: 'object',
  required: ['reason'],
  properties: {
    reason: {
      type: 'string',
      minLength: 10,
      maxLength: 500
    },
    notifyUser: {
      type: 'boolean',
      default: true
    }
  },
  additionalProperties: false
};

const paginationSchema = {
  type: 'object',
  properties: {
    page: {
      type: 'integer',
      minimum: 1,
      default: 1
    },
    limit: {
      type: 'integer',
      minimum: 1,
      maximum: 100,
      default: 20
    },
    sortBy: {
      type: 'string',
      enum: ['createdAt', 'email', 'firstName', 'lastName'],
      default: 'createdAt'
    },
    sortOrder: {
      type: 'string',
      enum: ['asc', 'desc'],
      default: 'desc'
    },
    search: {
      type: 'string',
      maxLength: 100
    }
  },
  additionalProperties: false
};

function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/[<>]/g, '');
}

function validateUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export async function registrationManagementRoutes(fastify: FastifyInstance) {
  // All routes require admin authentication
  fastify.addHook('preHandler', authenticate);
  fastify.addHook('preHandler', requireRoles(['admin']));

  // Health check for admin registration management
  fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    const authenticatedRequest = request as AuthenticatedRequest;
    return reply.code(200).send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      adminUser: {
        id: authenticatedRequest.user.id,
        username: authenticatedRequest.user.username,
        roles: authenticatedRequest.user.roles
      }
    });
  });

  // Get pending registration requests
  fastify.get('/pending-registrations', {
    schema: {
      querystring: paginationSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            registrations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  email: { type: 'string' },
                  organizationName: { type: ['string', 'null'] },
                  position: { type: ['string', 'null'] },
                  createdAt: { type: 'string' },
                  registrationIP: { type: ['string', 'null'] },
                  daysSincePending: { type: 'number' }
                }
              }
            },
            pagination: {
              type: 'object',
              properties: {
                currentPage: { type: 'number' },
                totalPages: { type: 'number' },
                totalRecords: { type: 'number' },
                limit: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authenticatedRequest = request as AuthenticatedRequest;
    try {
      const query = request.query as any;

      // Get all pending registrations (we'll handle pagination in-memory for now)
      const allRegistrations = await registrationService.getPendingRegistrations();

      // Apply search filter if provided
      let filteredRegistrations = allRegistrations;
      if (query.search) {
        const searchTerm = sanitizeInput(query.search).toLowerCase();
        filteredRegistrations = allRegistrations.filter(reg =>
          reg.firstName.toLowerCase().includes(searchTerm) ||
          reg.lastName.toLowerCase().includes(searchTerm) ||
          reg.email.toLowerCase().includes(searchTerm) ||
          (reg.organizationName && reg.organizationName.toLowerCase().includes(searchTerm))
        );
      }

      // Apply sorting
      filteredRegistrations.sort((a, b) => {
        let aValue: any, bValue: any;

        switch (query.sortBy) {
          case 'firstName':
            aValue = a.firstName.toLowerCase();
            bValue = b.firstName.toLowerCase();
            break;
          case 'lastName':
            aValue = a.lastName.toLowerCase();
            bValue = b.lastName.toLowerCase();
            break;
          case 'email':
            aValue = a.email.toLowerCase();
            bValue = b.email.toLowerCase();
            break;
          default: // createdAt
            aValue = new Date(a.createdAt).getTime();
            bValue = new Date(b.createdAt).getTime();
        }

        if (query.sortOrder === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });

      // Calculate pagination
      const page = query.page || 1;
      const limit = query.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;

      const paginatedRegistrations = filteredRegistrations.slice(startIndex, endIndex);

      // Add calculated fields
      const registrationsWithMetadata = paginatedRegistrations.map(reg => ({
        ...reg,
        daysSincePending: Math.floor((Date.now() - new Date(reg.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      }));

      const totalPages = Math.ceil(filteredRegistrations.length / limit);

      fastify.log.info(`Admin ${authenticatedRequest.user.id} fetched ${filteredRegistrations.length} pending registrations`);

      return reply.code(200).send({
        registrations: registrationsWithMetadata,
        pagination: {
          currentPage: page,
          totalPages,
          totalRecords: filteredRegistrations.length,
          limit
        }
      });
    } catch (error) {
      fastify.log.error(`Error fetching pending registrations for admin ${authenticatedRequest.user.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);

      return reply.code(500).send({
        error: 'Failed to fetch registrations',
        message: 'Unable to retrieve pending registrations. Please try again.'
      });
    }
  });

  // Get detailed information about a specific registration
  fastify.get('/registration/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authenticatedRequest = request as AuthenticatedRequest;
    try {
      const params = request.params as any;
      const registrationId = params.id;

      if (!validateUUID(registrationId)) {
        return reply.code(400).send({
          error: 'Invalid registration ID',
          message: 'Registration ID must be a valid UUID'
        });
      }

      // For now, we'll get all pending and filter by ID
      // In a real implementation, you'd add a method to get a specific registration
      const allRegistrations = await registrationService.getPendingRegistrations();
      const registration = allRegistrations.find(reg => reg.id === registrationId);

      if (!registration) {
        return reply.code(404).send({
          error: 'Registration not found',
          message: 'No pending registration found with the specified ID'
        });
      }

      const registrationWithMetadata = {
        ...registration,
        daysSincePending: Math.floor((Date.now() - new Date(registration.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      };

      return reply.code(200).send({
        registration: registrationWithMetadata
      });

    } catch (error) {
      fastify.log.error(`Error fetching registration details for admin ${authenticatedRequest.user.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);

      return reply.code(500).send({
        error: 'Failed to fetch registration',
        message: 'Unable to retrieve registration details. Please try again.'
      });
    }
  });

  // Approve registration request
  fastify.post('/approve-registration/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          }
        }
      },
      body: approveRegistrationSchema
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authenticatedRequest = request as AuthenticatedRequest;
    try {
      const params = request.params as any;
      const body = request.body as any;
      const registrationId = params.id;

      if (!validateUUID(registrationId)) {
        return reply.code(400).send({
          error: 'Invalid registration ID',
          message: 'Registration ID must be a valid UUID'
        });
      }

      // Validate roles
      const allowedRoles = ['user', 'admin', 'program_manager', 'viewer'];
      const roles = body.roles || ['user'];

      const invalidRoles = roles.filter((role: string) => !allowedRoles.includes(role));
      if (invalidRoles.length > 0) {
        return reply.code(400).send({
          error: 'Invalid roles',
          message: `Invalid roles: ${invalidRoles.join(', ')}. Allowed roles: ${allowedRoles.join(', ')}`
        });
      }

      // Ensure user role is always included
      if (!roles.includes('user')) {
        roles.push('user');
      }

      const adminId = authenticatedRequest.user.id;
      const result = await registrationService.approveRegistration(registrationId, adminId, roles);

      fastify.log.info(`Registration ${registrationId} approved by admin ${adminId} with roles: ${roles.join(', ')}`);

      return reply.code(200).send({
        message: result.message,
        userId: result.id,
        assignedRoles: roles
      });

    } catch (error) {
      fastify.log.error(`Error approving registration for admin ${authenticatedRequest.user.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);

      if (error instanceof Error) {
        if (error.message.includes('Registration request not found')) {
          return reply.code(404).send({
            error: 'Registration not found',
            message: error.message
          });
        }

        if (error.message.includes('Email must be verified') ||
            error.message.includes('not in pending status')) {
          return reply.code(400).send({
            error: 'Cannot approve registration',
            message: error.message
          });
        }
      }

      return reply.code(500).send({
        error: 'Approval failed',
        message: 'Unable to approve registration. Please try again.'
      });
    }
  });

  // Reject registration request
  fastify.post('/reject-registration/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          }
        }
      },
      body: rejectRegistrationSchema
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authenticatedRequest = request as AuthenticatedRequest;
    try {
      const params = request.params as any;
      const body = request.body as any;
      const registrationId = params.id;

      if (!validateUUID(registrationId)) {
        return reply.code(400).send({
          error: 'Invalid registration ID',
          message: 'Registration ID must be a valid UUID'
        });
      }

      const adminId = authenticatedRequest.user.id;
      const reason = sanitizeInput(body.reason);

      if (!reason || reason.length < 10) {
        return reply.code(400).send({
          error: 'Invalid rejection reason',
          message: 'Rejection reason must be at least 10 characters long'
        });
      }

      const result = await registrationService.rejectRegistration(registrationId, adminId, reason);

      fastify.log.info(`Registration ${registrationId} rejected by admin ${adminId}`);

      return reply.code(200).send({
        message: result.message,
        reason: reason
      });

    } catch (error) {
      fastify.log.error(`Error rejecting registration for admin ${authenticatedRequest.user.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);

      if (error instanceof Error && error.message.includes('Registration request not found')) {
        return reply.code(404).send({
          error: 'Registration not found',
          message: error.message
        });
      }

      return reply.code(500).send({
        error: 'Rejection failed',
        message: 'Unable to reject registration. Please try again.'
      });
    }
  });

  // Bulk operations endpoint
  fastify.post('/bulk-action', {
    schema: {
      body: {
        type: 'object',
        required: ['action', 'registrationIds'],
        properties: {
          action: {
            type: 'string',
            enum: ['approve', 'reject']
          },
          registrationIds: {
            type: 'array',
            items: {
              type: 'string',
              pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            },
            minItems: 1,
            maxItems: 50 // Limit bulk operations
          },
          roles: {
            type: 'array',
            items: { type: 'string' },
            default: ['user']
          },
          reason: {
            type: 'string',
            minLength: 10,
            maxLength: 500
          }
        },
        additionalProperties: false
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authenticatedRequest = request as AuthenticatedRequest;
    try {
      const body = request.body as any;
      const { action, registrationIds, roles, reason } = body;
      const adminId = authenticatedRequest.user.id;

      // Validate all UUIDs
      const invalidIds = registrationIds.filter((id: string) => !validateUUID(id));
      if (invalidIds.length > 0) {
        return reply.code(400).send({
          error: 'Invalid registration IDs',
          message: `Invalid UUIDs: ${invalidIds.join(', ')}`
        });
      }

      const results = {
        successful: [] as string[],
        failed: [] as { id: string; error: string }[]
      };

      // Process each registration
      for (const registrationId of registrationIds) {
        try {
          if (action === 'approve') {
            const approvalRoles = roles || ['user'];
            await registrationService.approveRegistration(registrationId, adminId, approvalRoles);
            results.successful.push(registrationId);
          } else if (action === 'reject') {
            if (!reason) {
              results.failed.push({ id: registrationId, error: 'Reason is required for rejection' });
              continue;
            }
            await registrationService.rejectRegistration(registrationId, adminId, reason);
            results.successful.push(registrationId);
          }
        } catch (error) {
          results.failed.push({
            id: registrationId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      fastify.log.info(`Bulk ${action} completed by admin ${adminId}: ${results.successful.length}/${registrationIds.length} successful`);

      return reply.code(200).send({
        message: `Bulk ${action} operation completed`,
        results: {
          total: registrationIds.length,
          successful: results.successful.length,
          failed: results.failed.length,
          details: results
        }
      });

    } catch (error) {
      fastify.log.error(`Error in bulk registration action for admin ${authenticatedRequest.user.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);

      return reply.code(500).send({
        error: 'Bulk operation failed',
        message: 'Unable to complete bulk operation. Please try again.'
      });
    }
  });

  // Registration statistics endpoint
  fastify.get('/statistics', async (request: FastifyRequest, reply: FastifyReply) => {
    const authenticatedRequest = request as AuthenticatedRequest;
    try {
      // This would require additional service methods to get statistics
      // For now, we'll provide basic pending count
      const pendingRegistrations = await registrationService.getPendingRegistrations();

      const stats = {
        pendingRegistrations: pendingRegistrations.length,
        registrationsByDay: pendingRegistrations.reduce((acc, reg) => {
          const date = new Date(reg.createdAt).toISOString().split('T')[0];
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        averagePendingDays: pendingRegistrations.length > 0
          ? Math.round(
              pendingRegistrations.reduce((sum, reg) =>
                sum + Math.floor((Date.now() - new Date(reg.createdAt).getTime()) / (1000 * 60 * 60 * 24))
              , 0) / pendingRegistrations.length
            )
          : 0
      };

      return reply.code(200).send({
        statistics: stats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      fastify.log.error(`Error fetching registration statistics for admin ${authenticatedRequest.user.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);

      return reply.code(500).send({
        error: 'Statistics fetch failed',
        message: 'Unable to fetch registration statistics.'
      });
    }
  });
}
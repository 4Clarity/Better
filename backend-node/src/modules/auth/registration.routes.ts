import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UserRegistrationService, RegistrationData } from '../../services/user-registration.service';
import { EmailService } from '../../services/email.service';

const registrationService = new UserRegistrationService();
const emailService = new EmailService();

// Input validation schemas
const registerSchema = {
  type: 'object',
  required: ['firstName', 'lastName', 'email', 'password'],
  properties: {
    firstName: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
      pattern: '^[a-zA-Z\\s\\-\\.\']+$' // Allow letters, spaces, hyphens, dots, and apostrophes
    },
    lastName: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
      pattern: '^[a-zA-Z\\s\\-\\.\']+$'
    },
    email: {
      type: 'string',
      format: 'email',
      maxLength: 255
    },
    password: {
      type: 'string',
      minLength: 8,
      maxLength: 128
    },
    organizationName: {
      type: 'string',
      maxLength: 255
    },
    position: {
      type: 'string',
      maxLength: 255
    }
  },
  additionalProperties: false
};

const emailSchema = {
  type: 'object',
  required: ['email'],
  properties: {
    email: {
      type: 'string',
      format: 'email',
      maxLength: 255
    }
  },
  additionalProperties: false
};

// Rate limiting storage (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string, maxRequests: number = 5, windowMs: number = 900000): boolean {
  const now = Date.now();
  const key = `${ip}`;

  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/[<>]/g, ''); // Basic XSS prevention
}

export async function registrationRoutes(fastify: FastifyInstance) {
  // Health check removed to avoid route conflict - use /api/auth/health from auth.routes.ts

  // User Registration Endpoint
  fastify.post('/register', {
    schema: {
      body: registerSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            id: { type: 'string' },
            requiresVerification: { type: 'boolean' },
            requiresApproval: { type: 'boolean' },
            isFirstUser: { type: 'boolean' },
            isAdmin: { type: 'boolean' }
          }
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            details: { type: 'array' }
          }
        },
        429: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            retryAfter: { type: 'number' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const clientIp = request.ip;

      // Rate limiting check
      if (!checkRateLimit(clientIp, 5, 900000)) { // 5 attempts per 15 minutes
        return reply.code(429).send({
          error: 'Too many registration attempts',
          message: 'Please wait 15 minutes before trying again',
          retryAfter: 900
        });
      }

      const body = request.body as any;

      // Sanitize input data
      const registrationData: RegistrationData = {
        firstName: sanitizeInput(body.firstName),
        lastName: sanitizeInput(body.lastName),
        email: sanitizeInput(body.email.toLowerCase()),
        password: body.password, // Don't sanitize password as it may affect valid characters
        organizationName: body.organizationName ? sanitizeInput(body.organizationName) : undefined,
        position: body.position ? sanitizeInput(body.position) : undefined,
        registrationIP: clientIp,
        userAgent: request.headers['user-agent'] || 'unknown'
      };

      // Additional validation
      if (registrationData.email.length === 0) {
        return reply.code(400).send({
          error: 'Invalid input',
          message: 'Email address cannot be empty'
        });
      }

      const result = await registrationService.registerUser(registrationData);

      fastify.log.info('User registration initiated', {
        email: registrationData.email,
        ip: clientIp,
        userAgent: registrationData.userAgent,
        timestamp: new Date().toISOString()
      });

      return reply.code(200).send({
        message: result.message,
        id: result.id,
        requiresVerification: result.requiresVerification,
        requiresApproval: result.requiresApproval,
        isFirstUser: result.isFirstUser,
        isAdmin: result.isAdmin
      });
    } catch (error) {
      fastify.log.error('Registration error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        timestamp: new Date().toISOString()
      });

      if (error instanceof Error) {
        if (error.message.includes('Email address already registered') ||
            error.message.includes('Registration request already pending')) {
          return reply.code(409).send({
            error: 'Registration conflict',
            message: error.message
          });
        }

        if (error.message.includes('Validation failed')) {
          return reply.code(400).send({
            error: 'Validation error',
            message: error.message
          });
        }
      }

      return reply.code(500).send({
        error: 'Registration failed',
        message: 'An error occurred during registration. Please try again later.'
      });
    }
  });

  // Email Verification Endpoint
  fastify.get('/verify-email', {
    schema: {
      querystring: {
        type: 'object',
        required: ['token'],
        properties: {
          token: {
            type: 'string',
            minLength: 32,
            maxLength: 64,
            pattern: '^[a-f0-9]+$' // Hex string validation
          }
        },
        additionalProperties: false
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as any;
      const token = sanitizeInput(query.token);

      if (!token) {
        return reply.code(400).send({
          error: 'Invalid token',
          message: 'Verification token is required'
        });
      }

      const result = await registrationService.verifyEmail(token);

      fastify.log.info('Email verification completed', {
        token: token.substring(0, 8) + '...', // Log partial token for security
        isFirstUser: result.isFirstUser,
        ip: request.ip,
        timestamp: new Date().toISOString()
      });

      return reply.code(200).send({
        message: result.message,
        id: result.id,
        requiresVerification: result.requiresVerification,
        requiresApproval: result.requiresApproval,
        isFirstUser: result.isFirstUser,
        isAdmin: result.isAdmin
      });
    } catch (error) {
      fastify.log.error('Email verification error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ip: request.ip,
        timestamp: new Date().toISOString()
      });

      if (error instanceof Error && error.message.includes('Invalid or expired')) {
        return reply.code(400).send({
          error: 'Invalid verification token',
          message: error.message
        });
      }

      return reply.code(500).send({
        error: 'Verification failed',
        message: 'An error occurred during email verification. Please try again or contact support.'
      });
    }
  });

  // Registration Status Check Endpoint
  fastify.get('/registration-status/:email', {
    schema: {
      params: {
        type: 'object',
        required: ['email'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            maxLength: 255
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = request.params as any;
      const email = sanitizeInput(params.email.toLowerCase());

      if (!email) {
        return reply.code(400).send({
          error: 'Invalid email',
          message: 'Valid email address is required'
        });
      }

      const status = await registrationService.getRegistrationStatus(email);

      if (!status) {
        return reply.code(404).send({
          error: 'Registration not found',
          message: 'No registration request found for this email address'
        });
      }

      // Don't expose sensitive details, just the status
      return reply.code(200).send({
        email: email,
        status: status.status,
        emailVerified: status.emailVerified,
        registrationDate: status.createdAt,
        expiresAt: status.expiresAt
      });
    } catch (error) {
      fastify.log.error('Registration status check error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email: (request.params as any)?.email,
        ip: request.ip,
        timestamp: new Date().toISOString()
      });

      return reply.code(500).send({
        error: 'Status check failed',
        message: 'Unable to check registration status. Please try again later.'
      });
    }
  });

  // Resend Verification Email Endpoint
  fastify.post('/resend-verification', {
    schema: {
      body: emailSchema
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const clientIp = request.ip;

      // More restrictive rate limiting for resend requests
      if (!checkRateLimit(`resend_${clientIp}`, 3, 900000)) { // 3 attempts per 15 minutes
        return reply.code(429).send({
          error: 'Too many resend attempts',
          message: 'Please wait 15 minutes before requesting another verification email',
          retryAfter: 900
        });
      }

      const body = request.body as any;
      const email = sanitizeInput(body.email.toLowerCase());

      if (!email) {
        return reply.code(400).send({
          error: 'Invalid email',
          message: 'Valid email address is required'
        });
      }

      // Check if registration exists and needs verification
      const status = await registrationService.getRegistrationStatus(email);

      if (!status) {
        // Don't reveal if email exists or not for security
        return reply.code(200).send({
          message: 'If a pending registration exists for this email, a new verification email has been sent.'
        });
      }

      if (status.emailVerified) {
        return reply.code(400).send({
          error: 'Email already verified',
          message: 'This email address has already been verified'
        });
      }

      if (status.status !== 'PENDING') {
        return reply.code(400).send({
          error: 'Registration not pending',
          message: 'This registration is not in a pending state'
        });
      }

      // Use the service method to resend verification email
      try {
        const result = await registrationService.resendVerificationEmail(email);

        fastify.log.info('Verification email resent successfully', {
          email: email,
          ip: clientIp,
          timestamp: new Date().toISOString()
        });

        return reply.code(200).send({
          message: result.message,
          id: result.id
        });
      } catch (serviceError) {
        // For security, don't reveal specific error details
        fastify.log.info('Verification email resend attempted', {
          email: email,
          ip: clientIp,
          error: serviceError instanceof Error ? serviceError.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });

        return reply.code(200).send({
          message: 'If a pending registration exists for this email, a new verification email has been sent.'
        });
      }

    } catch (error) {
      fastify.log.error('Resend verification error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ip: request.ip,
        timestamp: new Date().toISOString()
      });

      return reply.code(500).send({
        error: 'Resend failed',
        message: 'Unable to resend verification email. Please try again later.'
      });
    }
  });

  // Cleanup expired registrations (admin/system endpoint) - TEMPORARILY DISABLED
  /*
  fastify.post('/cleanup-expired', {
    preHandler: [fastify.authenticate, fastify.requireRoles(['admin'])]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const cleanedCount = await registrationService.cleanupExpiredRequests();

      fastify.log.info('Registration cleanup completed', {
        cleanedCount,
        adminId: request.user?.id,
        timestamp: new Date().toISOString()
      });

      return reply.code(200).send({
        message: `Successfully cleaned up ${cleanedCount} expired registration requests`,
        cleanedCount
      });
    } catch (error) {
      fastify.log.error('Registration cleanup error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        adminId: request.user?.id,
        timestamp: new Date().toISOString()
      });

      return reply.code(500).send({
        error: 'Cleanup failed',
        message: 'Unable to cleanup expired registrations'
      });
    }
  });
  */
}
import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { ZodError } from 'zod';
import { serializerCompiler, validatorCompiler } from 'fastify-zod';
import { transitionSchemas } from './modules/transition/transition-raw.service';
import { milestoneSchemas } from './modules/milestone/milestone.service';
import { taskSchemas } from './modules/task/task.service';
import transitionRoutes from './modules/transition/transition-raw.route';
import milestoneRoutes from './modules/milestone/milestone.route';
import businessOperationRoutes from './modules/business-operation/business-operation.route';
import contractRoutes from './modules/contract/contract.route';
import enhancedTransitionRoutes from './modules/transition/enhanced-transition.route';
import { userManagementRoutes } from './modules/user-management/user-management.routes';
import taskRoutes from './modules/task/task.route';
import { authRoutes, registerAuthDecorators } from './modules/auth';

export function buildServer() {
  const server = Fastify({
    logger: true,
  });

  // JWT for Keycloak (non-bypass mode)
  if (process.env.KEYCLOAK_JWT_PUBLIC_KEY) {
    server.register(jwt, {
      secret: {
        public: process.env.KEYCLOAK_JWT_PUBLIC_KEY.replace(/\\n/g, '\n'),
      },
      decode: { complete: false },
      sign: { algorithm: 'RS256' },
    });
  } else {
    server.log.warn('KEYCLOAK_JWT_PUBLIC_KEY not set. Protected routes require AUTH_BYPASS or x-auth-bypass header.');
  }

  // Add zod validation
  server.setValidatorCompiler(validatorCompiler);
  server.setSerializerCompiler(serializerCompiler);

  // Add schemas to the server instance
  for (const schema of [...transitionSchemas, ...milestoneSchemas, ...taskSchemas]) {
    server.addSchema(schema);
  }

  server.register(cors, {
    origin: '*', // In production, you should restrict this to your frontend's domain
  });

  // SECURITY FIX: Add rate limiting protection - TEMPORARILY DISABLED FOR DEVELOPMENT
  /*
  server.register(rateLimit, {
    max: 100, // Maximum 100 requests per timeWindow
    timeWindow: '15 minutes', // 15 minute window
    cache: 10000, // Cache 10,000 different IPs
    allowList: ['127.0.0.1', '::1'], // Allow localhost for development
    skipOnError: false, // Return 429 on error instead of allowing through
    keyGenerator: (request) => {
      // Rate limit by IP address and potentially by user if authenticated
      const ip = request.ip;
      const userAgent = request.headers['user-agent'] || '';
      return `${ip}:${userAgent}`;
    },
    errorResponseBuilder: (request, context) => {
      return {
        error: 'Rate limit exceeded',
        message: `Too many requests from this IP. Limit: ${context.max} requests per ${context.after}. Try again later.`,
        retryAfter: context.after,
        timestamp: new Date().toISOString()
      };
    },
    onExceeding: (request, key) => {
      // Log rate limit violations for security monitoring
      server.log.warn('Rate limit exceeded', {
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        url: request.url,
        method: request.method,
        key,
        timestamp: new Date().toISOString()
      });
    }
  });
  */

  // SECURITY FIX: Stricter rate limiting for authentication endpoints - TEMPORARILY DISABLED FOR DEVELOPMENT
  /*
  server.register(async function (server) {
    await server.register(rateLimit, {
      max: 20, // Allow more attempts for development (was 5)
      timeWindow: '5 minutes', // Longer window for development (was 1 minute)
      keyGenerator: (request) => {
        // Rate limit auth by IP + email combination
        const ip = request.ip;
        const email = (request.body as any)?.email || '';
        return `auth:${ip}:${email}`;
      },
      errorResponseBuilder: (request, context) => {
        return {
          error: 'Authentication rate limit exceeded',
          message: 'Too many authentication attempts. Please try again later.',
          retryAfter: context.after,
          timestamp: new Date().toISOString()
        };
      },
      onExceeding: (request, key) => {
        // Enhanced logging for authentication rate limits
        server.log.error('Authentication rate limit exceeded - potential attack', {
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          email: (request.body as any)?.email,
          url: request.url,
          key,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Apply stricter rate limiting only to authentication routes
    server.register(authRoutes);
  }, { prefix: '/api/auth' });
  */

  // Temporarily register auth routes without additional rate limiting
  server.register(authRoutes, { prefix: '/api/auth' });

  // Register authentication decorators
  server.register(registerAuthDecorators);

  // Global error handler for Zod validation errors
  server.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: error.flatten(),
      });
    } else {
      // For other errors, use the default error handler
      reply.send(error);
    }
  });

  // Register routes (auth routes already registered above with rate limiting)
  server.register(transitionRoutes, { prefix: '/api/transitions' });
  server.register(businessOperationRoutes, { prefix: '/api/business-operations' });
  server.register(contractRoutes, { prefix: '/api/contracts' });
  server.register(enhancedTransitionRoutes, { prefix: '/api/enhanced-transitions' });
  server.register(userManagementRoutes, { prefix: '/api/user-management' });
  
  // Register nested milestone routes under transitions
  server.register(async function (server) {
    server.register(milestoneRoutes, { prefix: '/:transitionId/milestones' });
    server.register(taskRoutes, { prefix: '/:transitionId/tasks' });
  }, { prefix: '/api/transitions' });

  // Health check endpoint
  server.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // API health alias for convenience when testing behind proxies
  server.get('/api/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  return server;
}

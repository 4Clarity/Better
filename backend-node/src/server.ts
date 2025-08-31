import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import cors from '@fastify/cors';
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

  // Register routes
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

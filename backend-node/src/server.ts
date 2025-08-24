import Fastify from 'fastify';
import cors from '@fastify/cors';
import { ZodError } from 'zod';
import { serializerCompiler, validatorCompiler } from 'fastify-zod';
import { transitionSchemas } from './modules/transition/transition-raw.service';
import { milestoneSchemas } from './modules/milestone/milestone.service';
import transitionRoutes from './modules/transition/transition-raw.route';
import milestoneRoutes from './modules/milestone/milestone.route';
import businessOperationRoutes from './modules/business-operation/business-operation.route';
import contractRoutes from './modules/contract/contract.route';
import enhancedTransitionRoutes from './modules/transition/enhanced-transition.route';

export function buildServer() {
  const server = Fastify({
    logger: true,
  });

  // Add zod validation
  server.setValidatorCompiler(validatorCompiler);
  server.setSerializerCompiler(serializerCompiler);

  // Add schemas to the server instance
  for (const schema of [...transitionSchemas, ...milestoneSchemas]) {
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
  
  // Register nested milestone routes under transitions
  server.register(async function (server) {
    server.register(milestoneRoutes, { prefix: '/:transitionId/milestones' });
  }, { prefix: '/api/transitions' });

  // Health check endpoint
  server.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  return server;
}
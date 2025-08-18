import Fastify from 'fastify';
import cors from '@fastify/cors';
import { ZodError } from 'zod';
import { serializerCompiler, validatorCompiler } from 'fastify-zod';
import { transitionSchemas } from './modules/transition/transition.service';
import transitionRoutes from './modules/transition/transition.route';

export function buildServer() {
  const server = Fastify({
    logger: true,
  });

  // Add zod validation
  server.setValidatorCompiler(validatorCompiler);
  server.setSerializerCompiler(serializerCompiler);

  // Add schemas to the server instance
  for (const schema of [...transitionSchemas]) {
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

  return server;
}
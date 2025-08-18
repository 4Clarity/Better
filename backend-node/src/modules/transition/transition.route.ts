import { FastifyInstance } from 'fastify';
import {
  createTransitionHandler,
  getTransitionsHandler,
  updateTransitionStatusHandler,
} from './transition.controller';
import { $ref } from './transition.service';

async function transitionRoutes(server: FastifyInstance) {
  server.post(
    '/',
    {
      schema: {
        body: $ref('createTransitionSchema'),
        response: {
          201: $ref('transitionResponseSchema'),
        },
      },
    },
    createTransitionHandler
  );

  server.get('/', getTransitionsHandler);

  server.patch(
    '/:id',
    {
      schema: {
        body: $ref('updateTransitionStatusSchema'),
        response: {
          200: $ref('transitionResponseSchema'),
        },
      },
    },
    updateTransitionStatusHandler
  );
}

export default transitionRoutes;
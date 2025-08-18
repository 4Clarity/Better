import { FastifyRequest, FastifyReply } from 'fastify';
import { createTransition, getTransitions, updateTransitionStatus } from './transition.service';
import { CreateTransitionInput, UpdateTransitionStatusInput } from './transition.service';

export async function createTransitionHandler(
  request: FastifyRequest<{ Body: CreateTransitionInput }>,
  reply: FastifyReply
) {
  try {
    const transition = await createTransition(request.body);
    return reply.code(201).send(transition);
  } catch (e) {
    console.error(e);
    return reply.code(500).send({ message: 'Internal Server Error' });
  }
}

export async function getTransitionsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const transitions = await getTransitions();
    return reply.code(200).send(transitions);
  } catch (e) {
    console.error(e);
    return reply.code(500).send({ message: 'Internal Server Error' });
  }
}

export async function updateTransitionStatusHandler(
  request: FastifyRequest<{ Body: UpdateTransitionStatusInput; Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const transition = await updateTransitionStatus(id, request.body);
    return reply.code(200).send(transition);
  } catch (e) {
    console.error(e);
    return reply.code(500).send({ message: 'Internal Server Error' });
  }
}
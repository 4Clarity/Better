import { FastifyRequest, FastifyReply } from 'fastify';
import {
  addStakeholder,
  removeStakeholder,
  getStakeholders,
  updateStakeholderRole,
  AddStakeholderInput,
} from './product-program.service';

export async function addStakeholderHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: AddStakeholderInput;
  }>,
  reply: FastifyReply
) {
  try {
    const productProgramId = request.params.id;
    const data = request.body;
    const userId = (request.user as any).id;

    const stakeholder = await addStakeholder(productProgramId, data, userId);

    return reply.status(201).send({
      success: true,
      data: stakeholder,
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: error.message,
    });
  }
}

export async function removeStakeholderHandler(
  request: FastifyRequest<{
    Params: { id: string; userId: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { id: productProgramId, userId } = request.params;
    const removedBy = (request.user as any).id;

    const result = await removeStakeholder(productProgramId, userId, removedBy);

    return reply.send(result);
  } catch (error: any) {
    request.log.error(error);
    return reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: error.message,
    });
  }
}

export async function getStakeholdersHandler(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply
) {
  try {
    const productProgramId = request.params.id;

    const stakeholders = await getStakeholders(productProgramId);

    return reply.send({
      success: true,
      data: stakeholders,
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: error.message,
    });
  }
}

export async function updateStakeholderRoleHandler(
  request: FastifyRequest<{
    Params: { id: string; userId: string };
    Body: { role: string | null };
  }>,
  reply: FastifyReply
) {
  try {
    const { id: productProgramId, userId } = request.params;
    const { role } = request.body;
    const updatedBy = (request.user as any).id;

    const stakeholder = await updateStakeholderRole(productProgramId, userId, role, updatedBy);

    return reply.send({
      success: true,
      data: stakeholder,
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: error.message,
    });
  }
}

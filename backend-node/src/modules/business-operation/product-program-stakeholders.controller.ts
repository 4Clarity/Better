import { FastifyRequest, FastifyReply } from 'fastify';
import {
  addStakeholder,
  removeStakeholder,
  getStakeholders,
  updateStakeholderRole,
  AddStakeholderInput,
} from './product-program.service';
import { getTransitionsByProductProgram } from '../transition/transition.service';

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

    // Transform the response to match frontend expectations
    const transformed = transformStakeholder(stakeholder);

    return reply.status(201).send({
      success: true,
      data: transformed,
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

// Helper function to transform stakeholder data
function transformStakeholder(stakeholder: any) {
  const userRelation = stakeholder.users_product_program_stakeholders_user_idTousers;
  const assignedByRelation = stakeholder.users_product_program_stakeholders_assigned_byTousers;

  return {
    id: stakeholder.id,
    productProgramId: stakeholder.product_program_id,
    userId: stakeholder.user_id,
    role: stakeholder.role,
    assignedAt: stakeholder.assigned_at,
    assignedBy: stakeholder.assigned_by,
    user: {
      id: userRelation.id,
      email: userRelation.person.primaryEmail,
      firstName: userRelation.person.firstName,
      lastName: userRelation.person.lastName,
      username: userRelation.username,
    },
    assignedByUser: {
      id: assignedByRelation.id,
      email: assignedByRelation.person.primaryEmail,
      firstName: assignedByRelation.person.firstName,
      lastName: assignedByRelation.person.lastName,
      username: assignedByRelation.username,
    },
  };
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

    // Transform all stakeholders
    const transformed = stakeholders.map(transformStakeholder);

    return reply.send({
      success: true,
      data: transformed,
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

// ============================================
// Transition Categorization Handler
// Story 4.2 - Phase 2
// ============================================

export async function getProductProgramTransitionsHandler(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply
) {
  try {
    const productProgramId = request.params.id;

    const transitions = await getTransitionsByProductProgram(productProgramId);

    return reply.send({
      success: true,
      data: transitions,
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

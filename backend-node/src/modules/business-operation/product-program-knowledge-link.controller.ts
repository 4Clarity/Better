import { FastifyRequest, FastifyReply } from 'fastify';
import {
  createKnowledgeLink,
  getKnowledgeLinkById,
  getKnowledgeLinksByProductProgram,
  updateKnowledgeLink,
  deleteKnowledgeLink,
  searchKnowledgeLinksByItemId,
  canModifyKnowledgeLink,
  CreateKnowledgeLinkInput,
  UpdateKnowledgeLinkInput,
} from './product-program-knowledge-link.service';

/**
 * Create a new knowledge link for a Product/Program
 * POST /api/business-operations/products-programs/:id/knowledge-links
 */
export async function createKnowledgeLinkHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: CreateKnowledgeLinkInput;
  }>,
  reply: FastifyReply
) {
  try {
    const { id: productProgramId } = request.params;

    // Get user from auth context (for now using a placeholder)
    // TODO: Replace with actual authenticated user from request context
    const linkedBy = (request as any).user?.id || 'demo-user-id';

    // Check permissions
    const userRoles = (request as any).user?.roles || ['Admin']; // Default to Admin for demo
    if (!canModifyKnowledgeLink(userRoles)) {
      return reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'You do not have permission to create knowledge links'
      });
    }

    const knowledgeLink = await createKnowledgeLink(productProgramId, request.body, linkedBy);
    return reply.code(201).send({ success: true, data: knowledgeLink });
  } catch (error: any) {
    console.error('Create knowledge link error:', error);

    if (error.message.includes('not found')) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: error.message
      });
    }

    if (error.message.includes('already linked')) {
      return reply.code(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: error.message
      });
    }

    return reply.code(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: error.message || 'Failed to create knowledge link'
    });
  }
}

/**
 * Get all knowledge links for a Product/Program
 * GET /api/business-operations/products-programs/:id/knowledge-links
 */
export async function getKnowledgeLinksHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id: productProgramId } = request.params;
    const knowledgeLinks = await getKnowledgeLinksByProductProgram(productProgramId);
    return reply.code(200).send({ success: true, data: knowledgeLinks });
  } catch (error: any) {
    console.error('Get knowledge links error:', error);

    if (error.message.includes('not found')) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: error.message
      });
    }

    return reply.code(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: error.message || 'Failed to fetch knowledge links'
    });
  }
}

/**
 * Get a specific knowledge link by ID
 * GET /api/business-operations/knowledge-links/:linkId
 */
export async function getKnowledgeLinkByIdHandler(
  request: FastifyRequest<{ Params: { linkId: string } }>,
  reply: FastifyReply
) {
  try {
    const { linkId } = request.params;
    const knowledgeLink = await getKnowledgeLinkById(linkId);
    return reply.code(200).send({ success: true, data: knowledgeLink });
  } catch (error: any) {
    console.error('Get knowledge link by ID error:', error);

    if (error.message === 'Knowledge link not found') {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: error.message
      });
    }

    return reply.code(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to fetch knowledge link'
    });
  }
}

/**
 * Update a knowledge link
 * PUT /api/business-operations/knowledge-links/:linkId
 */
export async function updateKnowledgeLinkHandler(
  request: FastifyRequest<{
    Params: { linkId: string };
    Body: UpdateKnowledgeLinkInput;
  }>,
  reply: FastifyReply
) {
  try {
    const { linkId } = request.params;

    // Get user from auth context
    const updatedBy = (request as any).user?.id || 'demo-user-id';

    // Check permissions
    const userRoles = (request as any).user?.roles || ['Admin'];
    if (!canModifyKnowledgeLink(userRoles)) {
      return reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'You do not have permission to update knowledge links'
      });
    }

    const knowledgeLink = await updateKnowledgeLink(linkId, request.body, updatedBy);
    return reply.code(200).send({ success: true, data: knowledgeLink });
  } catch (error: any) {
    console.error('Update knowledge link error:', error);

    if (error.message === 'Knowledge link not found') {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: error.message
      });
    }

    return reply.code(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: error.message || 'Failed to update knowledge link'
    });
  }
}

/**
 * Delete a knowledge link
 * DELETE /api/business-operations/knowledge-links/:linkId
 */
export async function deleteKnowledgeLinkHandler(
  request: FastifyRequest<{ Params: { linkId: string } }>,
  reply: FastifyReply
) {
  try {
    const { linkId } = request.params;

    // Get user from auth context
    const deletedBy = (request as any).user?.id || 'demo-user-id';

    // Check permissions
    const userRoles = (request as any).user?.roles || ['Admin'];
    if (!canModifyKnowledgeLink(userRoles)) {
      return reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'You do not have permission to delete knowledge links'
      });
    }

    const result = await deleteKnowledgeLink(linkId, deletedBy);
    return reply.code(200).send({ success: true, message: result.message });
  } catch (error: any) {
    console.error('Delete knowledge link error:', error);

    if (error.message === 'Knowledge link not found') {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: error.message
      });
    }

    return reply.code(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: error.message || 'Failed to delete knowledge link'
    });
  }
}

/**
 * Search knowledge links by knowledge item ID
 * GET /api/business-operations/knowledge-links/search?knowledgeItemId=xxx
 */
export async function searchKnowledgeLinksHandler(
  request: FastifyRequest<{ Querystring: { knowledgeItemId: string } }>,
  reply: FastifyReply
) {
  try {
    const { knowledgeItemId } = request.query;

    if (!knowledgeItemId) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'knowledgeItemId query parameter is required'
      });
    }

    const knowledgeLinks = await searchKnowledgeLinksByItemId(knowledgeItemId);
    return reply.code(200).send({ success: true, data: knowledgeLinks });
  } catch (error: any) {
    console.error('Search knowledge links error:', error);

    return reply.code(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: error.message || 'Failed to search knowledge links'
    });
  }
}

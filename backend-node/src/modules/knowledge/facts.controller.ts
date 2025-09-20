import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { FactsService } from './facts.service';
import {
  createFactSchema,
  updateFactSchema,
  getFactsQuerySchema,
} from './facts.route';

const factsService = new FactsService();

type CreateFactRequest = FastifyRequest<{
  Body: z.infer<typeof createFactSchema>;
}>;

type UpdateFactRequest = FastifyRequest<{
  Params: { id: string };
  Body: z.infer<typeof updateFactSchema>;
}>;

type GetFactsRequest = FastifyRequest<{
  Querystring: z.infer<typeof getFactsQuerySchema>;
}>;

type GetFactByIdRequest = FastifyRequest<{
  Params: { id: string };
}>;

type DeleteFactRequest = FastifyRequest<{
  Params: { id: string };
}>;

export async function createFactHandler(
  request: CreateFactRequest,
  reply: FastifyReply
) {
  try {
    // Validate request body
    const factData = createFactSchema.parse(request.body);

    // Extract user context
    const userContext = factsService.extractUserContext(request);

    // Validate user permissions
    if (!factsService.validateUserAccess(userContext.roles, factData.securityClassification, 'CREATE')) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions to create fact with this security classification',
      });
    }

    // Validate confidence score
    if (factData.confidence < 0.0 || factData.confidence > 1.0) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Confidence score must be between 0.0 and 1.0',
      });
    }

    // Validate source reference if provided
    if (factData.sourceEntityId && factData.sourceEntityType) {
      const sourceValidation = await factsService.validateSourceReference(
        factData.sourceEntityId,
        factData.sourceEntityType
      );
      if (!sourceValidation.valid) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: sourceValidation.error,
        });
      }
    }

    // Create fact
    const fact = await factsService.createFact(factData, userContext.userId);

    // Log audit trail
    await factsService.createAuditLog(
      userContext.userId,
      'CREATE',
      'km_facts',
      fact.id,
      undefined,
      fact
    );

    return reply.status(201).send(fact);
  } catch (error: any) {
    request.log.error(`Error creating fact: ${error.message}`);

    if (error.name === 'ZodError') {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Validation error: ' + error.message,
      });
    }

    if (error.message.includes('Duplicate entry')) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: error.message,
      });
    }

    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to create fact',
    });
  }
}

export async function getFactsHandler(
  request: GetFactsRequest,
  reply: FastifyReply
) {
  try {
    // Validate query parameters
    const queryParams = getFactsQuerySchema.parse(request.query);

    // Validate confidence range
    if (queryParams.minConfidence && queryParams.maxConfidence) {
      if (queryParams.minConfidence > queryParams.maxConfidence) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'minConfidence cannot be greater than maxConfidence',
        });
      }
    }

    // Extract user context
    const userContext = factsService.extractUserContext(request);

    // Get facts with security filtering
    const result = await factsService.getFacts(queryParams, userContext);

    return reply.status(200).send(result);
  } catch (error: any) {
    request.log.error(`Error getting facts: ${error.message}`);

    if (error.name === 'ZodError') {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Validation error: ' + error.message,
      });
    }

    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to retrieve facts',
    });
  }
}

export async function getFactByIdHandler(
  request: GetFactByIdRequest,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;

    // Extract user context
    const userContext = factsService.extractUserContext(request);

    // Get fact by ID
    const fact = await factsService.getFactById(id, userContext);

    if (!fact) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Fact not found',
      });
    }

    return reply.status(200).send(fact);
  } catch (error: any) {
    request.log.error(`Error getting fact by ID: ${error.message}`);

    if (error.message.includes('insufficient permissions')) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: error.message,
      });
    }

    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to retrieve fact',
    });
  }
}

export async function updateFactHandler(
  request: UpdateFactRequest,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;

    // Validate request body
    const updateData = updateFactSchema.parse(request.body);

    // Extract user context
    const userContext = factsService.extractUserContext(request);

    // Get existing fact for validation and audit log
    const existingFact = await factsService.getFactById(id, userContext);

    if (!existingFact) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Fact not found',
      });
    }

    // Validate user permissions for update
    const targetClassification = updateData.securityClassification || existingFact.securityClassification;
    if (!factsService.validateUserAccess(userContext.roles, targetClassification, 'UPDATE')) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions to update fact with this security classification',
      });
    }

    // Validate confidence score if provided
    if (updateData.confidence !== undefined) {
      if (updateData.confidence < 0.0 || updateData.confidence > 1.0) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Confidence score must be between 0.0 and 1.0',
        });
      }
    }

    // Validate approval status transitions
    if (updateData.approvalStatus) {
      const transitionValidation = factsService.validateApprovalStatusTransition(
        existingFact.approvalStatus,
        updateData.approvalStatus,
        userContext.roles
      );
      if (!transitionValidation.valid) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: transitionValidation.error,
        });
      }
    }

    // Validate rejection reason if rejecting
    if (updateData.approvalStatus === 'REJECTED' && !updateData.rejectionReason) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Rejection reason is required when setting approval status to REJECTED',
      });
    }

    // Update fact
    const updatedFact = await factsService.updateFact(id, updateData, userContext.userId);

    // Log audit trail
    await factsService.createAuditLog(
      userContext.userId,
      'UPDATE',
      'km_facts',
      id,
      existingFact,
      updatedFact
    );

    return reply.status(200).send(updatedFact);
  } catch (error: any) {
    request.log.error(`Error updating fact: ${error.message}`);

    if (error.name === 'ZodError') {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Validation error: ' + error.message,
      });
    }

    if (error.message.includes('not found')) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: error.message,
      });
    }

    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to update fact',
    });
  }
}

export async function deleteFactHandler(
  request: DeleteFactRequest,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;

    // Extract user context
    const userContext = factsService.extractUserContext(request);

    // Get existing fact for permissions check and audit log
    const existingFact = await factsService.getFactById(id, userContext);

    if (!existingFact) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Fact not found',
      });
    }

    // Validate user permissions for delete
    if (!factsService.validateUserAccess(userContext.roles, existingFact.securityClassification, 'DELETE')) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions to delete this fact',
      });
    }

    // Check if fact is approved - require special permissions to delete approved facts
    if (existingFact.approvalStatus === 'APPROVED' && !userContext.roles.includes('admin')) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Only administrators can delete approved facts',
      });
    }

    // Soft delete fact
    await factsService.deleteFact(id, userContext.userId);

    // Log audit trail
    await factsService.createAuditLog(
      userContext.userId,
      'DELETE',
      'km_facts',
      id,
      existingFact,
      { isActive: false }
    );

    return reply.status(200).send({
      message: 'Fact successfully deleted',
      id,
    });
  } catch (error: any) {
    request.log.error(`Error deleting fact: ${error.message}`);

    if (error.message.includes('not found')) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: error.message,
      });
    }

    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to delete fact',
    });
  }
}
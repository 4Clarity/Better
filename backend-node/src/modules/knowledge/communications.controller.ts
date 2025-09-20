import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { CommunicationsService } from './communications.service';
import {
  createCommunicationSchema,
  updateCommunicationSchema,
  getCommunicationsQuerySchema,
} from './communications.route';

const communicationsService = new CommunicationsService();

type CreateCommunicationRequest = FastifyRequest<{
  Body: z.infer<typeof createCommunicationSchema>;
}>;

type UpdateCommunicationRequest = FastifyRequest<{
  Params: { id: string };
  Body: z.infer<typeof updateCommunicationSchema>;
}>;

type GetCommunicationsRequest = FastifyRequest<{
  Querystring: z.infer<typeof getCommunicationsQuerySchema>;
}>;

type GetCommunicationByIdRequest = FastifyRequest<{
  Params: { id: string };
}>;

type DeleteCommunicationRequest = FastifyRequest<{
  Params: { id: string };
}>;

export async function createCommunicationHandler(
  request: CreateCommunicationRequest,
  reply: FastifyReply
) {
  try {
    // Validate request body
    const communicationData = createCommunicationSchema.parse(request.body);

    // Extract user context
    const userContext = communicationsService.extractUserContext(request);

    // Validate user permissions
    if (!communicationsService.validateUserAccess(userContext.roles, communicationData.securityClassification, 'CREATE')) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions to create communication with this security classification',
      });
    }

    // Create communication
    const communication = await communicationsService.createCommunication(communicationData, userContext.userId);

    // Log audit trail
    await communicationsService.createAuditLog(
      userContext.userId,
      'CREATE',
      'km_communications',
      communication.id,
      undefined,
      communication
    );

    return reply.status(201).send(communication);
  } catch (error: any) {
    request.log.error(`Error creating communication: ${error.message}`);

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
      message: 'Failed to create communication',
    });
  }
}

export async function getCommunicationsHandler(
  request: GetCommunicationsRequest,
  reply: FastifyReply
) {
  try {
    // Validate query parameters
    const queryParams = getCommunicationsQuerySchema.parse(request.query);

    // Extract user context
    const userContext = communicationsService.extractUserContext(request);

    // Get communications with security filtering
    const result = await communicationsService.getCommunications(queryParams, userContext);

    return reply.status(200).send(result);
  } catch (error: any) {
    request.log.error(`Error getting communications: ${error.message}`);

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
      message: 'Failed to retrieve communications',
    });
  }
}

export async function getCommunicationByIdHandler(
  request: GetCommunicationByIdRequest,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;

    // Extract user context
    const userContext = communicationsService.extractUserContext(request);

    // Get communication by ID
    const communication = await communicationsService.getCommunicationById(id, userContext);

    if (!communication) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Communication not found',
      });
    }

    return reply.status(200).send(communication);
  } catch (error: any) {
    request.log.error(`Error getting communication by ID: ${error.message}`);

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
      message: 'Failed to retrieve communication',
    });
  }
}

export async function updateCommunicationHandler(
  request: UpdateCommunicationRequest,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;

    // Validate request body
    const updateData = updateCommunicationSchema.parse(request.body);

    // Extract user context
    const userContext = communicationsService.extractUserContext(request);

    // Get existing communication for audit log
    const existingCommunication = await communicationsService.getCommunicationById(id, userContext);

    if (!existingCommunication) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Communication not found',
      });
    }

    // Validate user permissions for update
    const targetClassification = updateData.securityClassification || existingCommunication.securityClassification;
    if (!communicationsService.validateUserAccess(userContext.roles, targetClassification, 'UPDATE')) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions to update communication with this security classification',
      });
    }

    // Update communication
    const updatedCommunication = await communicationsService.updateCommunication(id, updateData, userContext.userId);

    // Log audit trail
    await communicationsService.createAuditLog(
      userContext.userId,
      'UPDATE',
      'km_communications',
      id,
      existingCommunication,
      updatedCommunication
    );

    return reply.status(200).send(updatedCommunication);
  } catch (error: any) {
    request.log.error(`Error updating communication: ${error.message}`);

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
      message: 'Failed to update communication',
    });
  }
}

export async function deleteCommunicationHandler(
  request: DeleteCommunicationRequest,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;

    // Extract user context
    const userContext = communicationsService.extractUserContext(request);

    // Get existing communication for permissions check and audit log
    const existingCommunication = await communicationsService.getCommunicationById(id, userContext);

    if (!existingCommunication) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Communication not found',
      });
    }

    // Validate user permissions for delete
    if (!communicationsService.validateUserAccess(userContext.roles, existingCommunication.securityClassification, 'DELETE')) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions to delete this communication',
      });
    }

    // Soft delete communication
    await communicationsService.deleteCommunication(id, userContext.userId);

    // Log audit trail
    await communicationsService.createAuditLog(
      userContext.userId,
      'DELETE',
      'km_communications',
      id,
      existingCommunication,
      { isActive: false }
    );

    return reply.status(200).send({
      message: 'Communication successfully deleted',
      id,
    });
  } catch (error: any) {
    request.log.error(`Error deleting communication: ${error.message}`);

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
      message: 'Failed to delete communication',
    });
  }
}
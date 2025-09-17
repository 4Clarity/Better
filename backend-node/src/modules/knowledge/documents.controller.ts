import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { DocumentsService } from './documents.service';
import {
  createDocumentSchema,
  updateDocumentSchema,
  getDocumentsQuerySchema,
} from './documents.route';

const documentsService = new DocumentsService();

type CreateDocumentRequest = FastifyRequest<{
  Body: z.infer<typeof createDocumentSchema>;
}>;

type UpdateDocumentRequest = FastifyRequest<{
  Params: { id: string };
  Body: z.infer<typeof updateDocumentSchema>;
}>;

type GetDocumentsRequest = FastifyRequest<{
  Querystring: z.infer<typeof getDocumentsQuerySchema>;
}>;

type GetDocumentByIdRequest = FastifyRequest<{
  Params: { id: string };
}>;

type DeleteDocumentRequest = FastifyRequest<{
  Params: { id: string };
}>;

export async function createDocumentHandler(
  request: CreateDocumentRequest,
  reply: FastifyReply
) {
  try {
    // Validate request body
    const documentData = createDocumentSchema.parse(request.body);

    // Extract user context
    const userContext = documentsService.extractUserContext(request);

    // Validate user permissions
    if (!documentsService.validateUserAccess(userContext.roles, documentData.securityClassification, 'CREATE')) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions to create document with this security classification',
      });
    }

    // Create document
    const document = await documentsService.createDocument(documentData, userContext.userId);

    // Log audit trail
    await documentsService.createAuditLog(
      userContext.userId,
      'CREATE',
      'km_documents',
      document.id,
      undefined,
      document
    );

    return reply.status(201).send(document);
  } catch (error: any) {
    request.log.error(`Error creating document: ${error.message}`);

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
      message: 'Failed to create document',
    });
  }
}

export async function getDocumentsHandler(
  request: GetDocumentsRequest,
  reply: FastifyReply
) {
  try {
    // Validate query parameters
    const queryParams = getDocumentsQuerySchema.parse(request.query);

    // Extract user context
    const userContext = documentsService.extractUserContext(request);

    // Get documents with security filtering
    const result = await documentsService.getDocuments(queryParams, userContext);

    return reply.status(200).send(result);
  } catch (error: any) {
    request.log.error(`Error getting documents: ${error.message}`);

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
      message: 'Failed to retrieve documents',
    });
  }
}

export async function getDocumentByIdHandler(
  request: GetDocumentByIdRequest,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;

    // Extract user context
    const userContext = documentsService.extractUserContext(request);

    // Get document by ID
    const document = await documentsService.getDocumentById(id, userContext);

    if (!document) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Document not found',
      });
    }

    return reply.status(200).send(document);
  } catch (error: any) {
    request.log.error(`Error getting document by ID: ${error.message}`);

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
      message: 'Failed to retrieve document',
    });
  }
}

export async function updateDocumentHandler(
  request: UpdateDocumentRequest,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;

    // Validate request body
    const updateData = updateDocumentSchema.parse(request.body);

    // Extract user context
    const userContext = documentsService.extractUserContext(request);

    // Get existing document for audit log
    const existingDocument = await documentsService.getDocumentById(id, userContext);

    if (!existingDocument) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Document not found',
      });
    }

    // Validate user permissions for update
    const targetClassification = updateData.securityClassification || existingDocument.securityClassification;
    if (!documentsService.validateUserAccess(userContext.roles, targetClassification, 'UPDATE')) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions to update document with this security classification',
      });
    }

    // Update document
    const updatedDocument = await documentsService.updateDocument(id, updateData, userContext.userId);

    // Log audit trail
    await documentsService.createAuditLog(
      userContext.userId,
      'UPDATE',
      'km_documents',
      id,
      existingDocument,
      updatedDocument
    );

    return reply.status(200).send(updatedDocument);
  } catch (error: any) {
    request.log.error(`Error updating document: ${error.message}`);

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
      message: 'Failed to update document',
    });
  }
}

export async function deleteDocumentHandler(
  request: DeleteDocumentRequest,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;

    // Extract user context
    const userContext = documentsService.extractUserContext(request);

    // Get existing document for permissions check and audit log
    const existingDocument = await documentsService.getDocumentById(id, userContext);

    if (!existingDocument) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Document not found',
      });
    }

    // Validate user permissions for delete
    if (!documentsService.validateUserAccess(userContext.roles, existingDocument.securityClassification, 'DELETE')) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions to delete this document',
      });
    }

    // Soft delete document
    await documentsService.deleteDocument(id, userContext.userId);

    // Log audit trail
    await documentsService.createAuditLog(
      userContext.userId,
      'DELETE',
      'km_documents',
      id,
      existingDocument,
      { isActive: false }
    );

    return reply.status(200).send({
      message: 'Document successfully deleted',
      id,
    });
  } catch (error: any) {
    request.log.error(`Error deleting document: ${error.message}`);

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
      message: 'Failed to delete document',
    });
  }
}
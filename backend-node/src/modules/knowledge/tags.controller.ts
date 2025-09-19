import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { TagsService } from './tags.service';
import {
  createTagSchema,
  updateTagSchema,
  getTagsQuerySchema,
} from './tags.route';

const tagsService = new TagsService();

type CreateTagRequest = FastifyRequest<{
  Body: z.infer<typeof createTagSchema>;
}>;

type UpdateTagRequest = FastifyRequest<{
  Params: { id: string };
  Body: z.infer<typeof updateTagSchema>;
}>;

type GetTagsRequest = FastifyRequest<{
  Querystring: z.infer<typeof getTagsQuerySchema>;
}>;

type GetTagByIdRequest = FastifyRequest<{
  Params: { id: string };
}>;

type DeleteTagRequest = FastifyRequest<{
  Params: { id: string };
}>;

export async function createTagHandler(
  request: CreateTagRequest,
  reply: FastifyReply
) {
  try {
    // Validate request body
    const tagData = createTagSchema.parse(request.body);

    // Extract user context
    const userContext = tagsService.extractUserContext(request);

    // Validate user permissions
    if (!tagsService.validateUserAccess(userContext.roles, 'UNCLASSIFIED', 'CREATE')) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions to create tags',
      });
    }

    // Validate tag name uniqueness
    const uniquenessCheck = await tagsService.validateTagUniqueness(tagData.name);
    if (!uniquenessCheck.valid) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: uniquenessCheck.error,
      });
    }

    // Validate tag type and metadata consistency
    const typeValidation = tagsService.validateTagTypeConsistency(tagData.type, tagData.metadata);
    if (!typeValidation.valid) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: typeValidation.error,
      });
    }

    // Create tag
    const tag = await tagsService.createTag(tagData, userContext.userId);

    // Log audit trail
    await tagsService.createAuditLog(
      userContext.userId,
      'CREATE',
      'km_tags',
      tag.id,
      undefined,
      tag
    );

    return reply.status(201).send(tag);
  } catch (error: any) {
    request.log.error(`Error creating tag: ${error.message}`);

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
      message: 'Failed to create tag',
    });
  }
}

export async function getTagsHandler(
  request: GetTagsRequest,
  reply: FastifyReply
) {
  try {
    // Validate query parameters
    const queryParams = getTagsQuerySchema.parse(request.query);

    // Validate entity relationship query if specified
    if (queryParams.entityId && !queryParams.entityType) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'entityType is required when entityId is specified',
      });
    }

    // Extract user context
    const userContext = tagsService.extractUserContext(request);

    // Get tags with usage statistics and optional tag cloud
    const result = await tagsService.getTags(queryParams, userContext);

    return reply.status(200).send(result);
  } catch (error: any) {
    request.log.error(`Error getting tags: ${error.message}`);

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
      message: 'Failed to retrieve tags',
    });
  }
}

export async function getTagByIdHandler(
  request: GetTagByIdRequest,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;

    // Extract user context
    const userContext = tagsService.extractUserContext(request);

    // Get tag by ID
    const tag = await tagsService.getTagById(id, userContext);

    if (!tag) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Tag not found',
      });
    }

    return reply.status(200).send(tag);
  } catch (error: any) {
    request.log.error(`Error getting tag by ID: ${error.message}`);

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
      message: 'Failed to retrieve tag',
    });
  }
}

export async function updateTagHandler(
  request: UpdateTagRequest,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;

    // Validate request body
    const updateData = updateTagSchema.parse(request.body);

    // Extract user context
    const userContext = tagsService.extractUserContext(request);

    // Get existing tag for validation and audit log
    const existingTag = await tagsService.getTagById(id, userContext);

    if (!existingTag) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Tag not found',
      });
    }

    // Validate user permissions for update
    if (!tagsService.validateUserAccess(userContext.roles, 'UNCLASSIFIED', 'UPDATE')) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions to update tags',
      });
    }

    // Validate tag name uniqueness if name is being changed
    if (updateData.name && updateData.name !== existingTag.name) {
      const uniquenessCheck = await tagsService.validateTagUniqueness(updateData.name, id);
      if (!uniquenessCheck.valid) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: uniquenessCheck.error,
        });
      }
    }

    // Validate tag type and metadata consistency if type is being changed
    if (updateData.type || updateData.metadata) {
      const targetType = updateData.type || existingTag.tagType;
      const targetMetadata = updateData.metadata !== undefined ? updateData.metadata : existingTag.metadata;

      const typeValidation = tagsService.validateTagTypeConsistency(targetType, targetMetadata);
      if (!typeValidation.valid) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: typeValidation.error,
        });
      }
    }

    // Check if tag is in use and warn about significant changes
    if (updateData.type && updateData.type !== existingTag.tagType) {
      const usageCheck = await tagsService.checkTagUsage(id);
      if (usageCheck.inUse && !userContext.roles.includes('admin')) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: `Cannot change type of tag that is in use by ${usageCheck.usageCount} entities. Only administrators can modify tags in use.`,
        });
      }
    }

    // Update tag
    const updatedTag = await tagsService.updateTag(id, updateData, userContext.userId);

    // Log audit trail
    await tagsService.createAuditLog(
      userContext.userId,
      'UPDATE',
      'km_tags',
      id,
      existingTag,
      updatedTag
    );

    return reply.status(200).send(updatedTag);
  } catch (error: any) {
    request.log.error(`Error updating tag: ${error.message}`);

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
      message: 'Failed to update tag',
    });
  }
}

export async function deleteTagHandler(
  request: DeleteTagRequest,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;

    // Extract user context
    const userContext = tagsService.extractUserContext(request);

    // Get existing tag for permissions check and audit log
    const existingTag = await tagsService.getTagById(id, userContext);

    if (!existingTag) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Tag not found',
      });
    }

    // Validate user permissions for delete
    if (!tagsService.validateUserAccess(userContext.roles, 'UNCLASSIFIED', 'DELETE')) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions to delete tags',
      });
    }

    // Check if tag is in use
    const usageCheck = await tagsService.checkTagUsage(id);
    if (usageCheck.inUse && !userContext.roles.includes('admin')) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: `Cannot delete tag that is in use by ${usageCheck.usageCount} entities. Only administrators can delete tags in use.`,
      });
    }

    // Check if tag is a system tag (certain types might be protected)
    if (existingTag.tagType === 'STATUS' && !userContext.roles.includes('admin')) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Status tags can only be deleted by administrators',
      });
    }

    // Soft delete tag with relationship cleanup
    const deleteResult = await tagsService.deleteTag(id, userContext.userId);

    // Log audit trail
    await tagsService.createAuditLog(
      userContext.userId,
      'DELETE',
      'km_tags',
      id,
      existingTag,
      { isActive: false, removedRelationships: deleteResult.removedRelationships }
    );

    return reply.status(200).send({
      message: 'Tag successfully deleted',
      id,
      removedRelationships: deleteResult.removedRelationships,
    });
  } catch (error: any) {
    request.log.error(`Error deleting tag: ${error.message}`);

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
      message: 'Failed to delete tag',
    });
  }
}
import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { CategoriesService } from './categories.service';
import {
  createCategorySchema,
  updateCategorySchema,
  getCategoriesQuerySchema,
} from './categories.route';

const categoriesService = new CategoriesService();

type CreateCategoryRequest = FastifyRequest<{
  Body: z.infer<typeof createCategorySchema>;
}>;

type UpdateCategoryRequest = FastifyRequest<{
  Params: { id: string };
  Body: z.infer<typeof updateCategorySchema>;
}>;

type GetCategoriesRequest = FastifyRequest<{
  Querystring: z.infer<typeof getCategoriesQuerySchema>;
}>;

type GetCategoryByIdRequest = FastifyRequest<{
  Params: { id: string };
}>;

type DeleteCategoryRequest = FastifyRequest<{
  Params: { id: string };
}>;

export async function createCategoryHandler(
  request: CreateCategoryRequest,
  reply: FastifyReply
) {
  try {
    // Validate request body
    const categoryData = createCategorySchema.parse(request.body);

    // Extract user context
    const userContext = categoriesService.extractUserContext(request);

    // Validate user permissions
    if (!categoriesService.validateUserAccess(userContext.roles, 'UNCLASSIFIED', 'CREATE')) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions to create categories',
      });
    }

    // Validate parent category if specified
    if (categoryData.parentId) {
      const parentValidation = await categoriesService.validateParentCategory(categoryData.parentId);
      if (!parentValidation.valid) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: parentValidation.error,
        });
      }

      // Check for circular reference
      const circularCheck = await categoriesService.checkCircularReference(categoryData.parentId, null);
      if (!circularCheck.valid) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: circularCheck.error,
        });
      }
    }

    // Validate category name uniqueness within parent
    const uniquenessCheck = await categoriesService.validateCategoryUniqueness(
      categoryData.name,
      categoryData.parentId
    );
    if (!uniquenessCheck.valid) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: uniquenessCheck.error,
      });
    }

    // Create category
    const category = await categoriesService.createCategory(categoryData, userContext.userId);

    // Log audit trail
    await categoriesService.createAuditLog(
      userContext.userId,
      'CREATE',
      'km_categories',
      category.id,
      undefined,
      category
    );

    return reply.status(201).send(category);
  } catch (error: any) {
    request.log.error(`Error creating category: ${error.message}`);

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
      message: 'Failed to create category',
    });
  }
}

export async function getCategoriesHandler(
  request: GetCategoriesRequest,
  reply: FastifyReply
) {
  try {
    // Validate query parameters
    const queryParams = getCategoriesQuerySchema.parse(request.query);

    // Extract user context
    const userContext = categoriesService.extractUserContext(request);

    // Get categories with optional tree structure
    const result = await categoriesService.getCategories(queryParams, userContext);

    return reply.status(200).send(result);
  } catch (error: any) {
    request.log.error(`Error getting categories: ${error.message}`);

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
      message: 'Failed to retrieve categories',
    });
  }
}

export async function getCategoryByIdHandler(
  request: GetCategoryByIdRequest,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;

    // Extract user context
    const userContext = categoriesService.extractUserContext(request);

    // Get category by ID
    const category = await categoriesService.getCategoryById(id, userContext);

    if (!category) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Category not found',
      });
    }

    return reply.status(200).send(category);
  } catch (error: any) {
    request.log.error(`Error getting category by ID: ${error.message}`);

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
      message: 'Failed to retrieve category',
    });
  }
}

export async function updateCategoryHandler(
  request: UpdateCategoryRequest,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;

    // Validate request body
    const updateData = updateCategorySchema.parse(request.body);

    // Extract user context
    const userContext = categoriesService.extractUserContext(request);

    // Get existing category for validation and audit log
    const existingCategory = await categoriesService.getCategoryById(id, userContext);

    if (!existingCategory) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Category not found',
      });
    }

    // Validate user permissions for update
    if (!categoriesService.validateUserAccess(userContext.roles, 'UNCLASSIFIED', 'UPDATE')) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions to update categories',
      });
    }

    // Validate parent category change if specified
    if (updateData.parentId !== undefined) {
      if (updateData.parentId === id) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Category cannot be its own parent',
        });
      }

      if (updateData.parentId) {
        const parentValidation = await categoriesService.validateParentCategory(updateData.parentId);
        if (!parentValidation.valid) {
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: parentValidation.error,
          });
        }

        // Check for circular reference
        const circularCheck = await categoriesService.checkCircularReference(updateData.parentId, id);
        if (!circularCheck.valid) {
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: circularCheck.error,
          });
        }
      }
    }

    // Validate category name uniqueness if name is being changed
    if (updateData.name && updateData.name !== existingCategory.name) {
      const uniquenessCheck = await categoriesService.validateCategoryUniqueness(
        updateData.name,
        updateData.parentId || existingCategory.parentId,
        id
      );
      if (!uniquenessCheck.valid) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: uniquenessCheck.error,
        });
      }
    }

    // Update category
    const updatedCategory = await categoriesService.updateCategory(id, updateData, userContext.userId);

    // Log audit trail
    await categoriesService.createAuditLog(
      userContext.userId,
      'UPDATE',
      'km_categories',
      id,
      existingCategory,
      updatedCategory
    );

    return reply.status(200).send(updatedCategory);
  } catch (error: any) {
    request.log.error(`Error updating category: ${error.message}`);

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
      message: 'Failed to update category',
    });
  }
}

export async function deleteCategoryHandler(
  request: DeleteCategoryRequest,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;

    // Extract user context
    const userContext = categoriesService.extractUserContext(request);

    // Get existing category for permissions check and audit log
    const existingCategory = await categoriesService.getCategoryById(id, userContext);

    if (!existingCategory) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Category not found',
      });
    }

    // Validate user permissions for delete
    if (!categoriesService.validateUserAccess(userContext.roles, 'UNCLASSIFIED', 'DELETE')) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions to delete categories',
      });
    }

    // Check if category has children
    const hasChildren = await categoriesService.hasChildCategories(id);
    if (hasChildren && !userContext.roles.includes('admin')) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Cannot delete category with child categories. Only administrators can perform cascade deletes.',
      });
    }

    // Check if category is in use
    const usageCheck = await categoriesService.checkCategoryUsage(id);
    if (usageCheck.inUse && !userContext.roles.includes('admin')) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: `Category is in use by ${usageCheck.usageCount} items. Only administrators can delete categories in use.`,
      });
    }

    // Soft delete category with cascade handling
    const deleteResult = await categoriesService.deleteCategory(id, userContext.userId);

    // Log audit trail
    await categoriesService.createAuditLog(
      userContext.userId,
      'DELETE',
      'km_categories',
      id,
      existingCategory,
      { isActive: false, affectedChildren: deleteResult.affectedChildren }
    );

    return reply.status(200).send({
      message: 'Category successfully deleted',
      id,
      affectedChildren: deleteResult.affectedChildren,
    });
  } catch (error: any) {
    request.log.error(`Error deleting category: ${error.message}`);

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
      message: 'Failed to delete category',
    });
  }
}
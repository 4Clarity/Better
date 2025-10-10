import { FastifyRequest, FastifyReply } from 'fastify';
import {
  createProductProgram,
  getProductProgramById,
  getAllProductPrograms,
  updateProductProgram,
  deleteProductProgram,
  CreateProductProgramInput,
  UpdateProductProgramInput,
  GetProductProgramsQuery,
} from './product-program.service';

/**
 * Handler for creating a new Product/Program
 * POST /api/business-operations/products-programs
 * Requires: Admin, Gov Program Director, Gov Program Manager roles
 */
export async function createProductProgramHandler(
  request: FastifyRequest<{ Body: CreateProductProgramInput }>,
  reply: FastifyReply
) {
  try {
    const userId = (request.user as any)?.id;

    if (!userId) {
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'User authentication required',
      });
    }

    const productProgram = await createProductProgram(request.body, userId);
    return reply.code(201).send({
      success: true,
      data: productProgram,
    });
  } catch (error: any) {
    console.error('Create product/program error:', error);

    if (error.message.includes('not found') || error.message.includes('required')) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: error.message,
      });
    }

    return reply.code(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to create product/program',
    });
  }
}

/**
 * Handler for getting all Product/Programs with filtering and pagination
 * GET /api/business-operations/products-programs
 * Requires: All authenticated users
 */
export async function getProductProgramsHandler(
  request: FastifyRequest<{ Querystring: GetProductProgramsQuery }>,
  reply: FastifyReply
) {
  try {
    const userId = (request.user as any)?.id;

    if (!userId) {
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'User authentication required',
      });
    }

    const result = await getAllProductPrograms(userId, request.query);
    return reply.code(200).send({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Get product/programs error:', error);
    return reply.code(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to fetch product/programs',
    });
  }
}

/**
 * Handler for getting a single Product/Program by ID
 * GET /api/business-operations/products-programs/:id
 * Requires: All authenticated users
 */
export async function getProductProgramByIdHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const userId = (request.user as any)?.id;
    const { id } = request.params;

    if (!userId) {
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'User authentication required',
      });
    }

    const productProgram = await getProductProgramById(id, userId);
    return reply.code(200).send({
      success: true,
      data: productProgram,
    });
  } catch (error: any) {
    console.error('Get product/program by ID error:', error);

    if (error.message.includes('not found')) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: error.message,
      });
    }

    return reply.code(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to fetch product/program',
    });
  }
}

/**
 * Handler for updating an existing Product/Program
 * PUT /api/business-operations/products-programs/:id
 * Requires: Admin, Gov Program Director, Gov Program Manager roles
 */
export async function updateProductProgramHandler(
  request: FastifyRequest<{ Body: UpdateProductProgramInput; Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const userId = (request.user as any)?.id;
    const { id } = request.params;

    if (!userId) {
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'User authentication required',
      });
    }

    const productProgram = await updateProductProgram(id, request.body, userId);
    return reply.code(200).send({
      success: true,
      data: productProgram,
    });
  } catch (error: any) {
    console.error('Update product/program error:', error);

    if (error.message.includes('not found')) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: error.message,
      });
    }

    if (error.message.includes('required')) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: error.message,
      });
    }

    return reply.code(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to update product/program',
    });
  }
}

/**
 * Handler for deleting a Product/Program
 * DELETE /api/business-operations/products-programs/:id
 * Requires: Admin, Gov Program Director, Gov Program Manager roles
 */
export async function deleteProductProgramHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const userId = (request.user as any)?.id;
    const { id } = request.params;

    if (!userId) {
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'User authentication required',
      });
    }

    const result = await deleteProductProgram(id, userId);
    return reply.code(200).send(result);
  } catch (error: any) {
    console.error('Delete product/program error:', error);

    if (error.message.includes('not found')) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: error.message,
      });
    }

    return reply.code(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to delete product/program',
    });
  }
}

import { FastifyRequest, FastifyReply } from 'fastify';
import {
  createTask,
  getTaskById,
  getTasksByProductProgram,
  updateTask,
  deleteTask,
  markTaskComplete,
  canModifyTask,
  canCompleteTask,
  CreateTaskInput,
  UpdateTaskInput,
} from './product-program-task.service';

/**
 * Create a new task for a Product/Program
 * POST /api/business-operations/products-programs/:id/tasks
 */
export async function createTaskHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: CreateTaskInput;
  }>,
  reply: FastifyReply
) {
  try {
    const { id: productProgramId } = request.params;

    // Get user from auth context (for now using a placeholder)
    // TODO: Replace with actual authenticated user from request context
    const createdBy = (request as any).user?.id || 'demo-user-id';

    // Check permissions
    const userRoles = (request as any).user?.roles || ['Admin']; // Default to Admin for demo
    if (!canModifyTask(userRoles)) {
      return reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'You do not have permission to create tasks'
      });
    }

    const task = await createTask(productProgramId, request.body, createdBy);
    return reply.code(201).send({ success: true, data: task });
  } catch (error: any) {
    console.error('Create task error:', error);

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
      message: error.message || 'Failed to create task'
    });
  }
}

/**
 * Get all tasks for a Product/Program
 * GET /api/business-operations/products-programs/:id/tasks
 */
export async function getTasksHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id: productProgramId } = request.params;
    const tasks = await getTasksByProductProgram(productProgramId);
    return reply.code(200).send({ success: true, data: tasks });
  } catch (error: any) {
    console.error('Get tasks error:', error);

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
      message: error.message || 'Failed to fetch tasks'
    });
  }
}

/**
 * Get a specific task by ID
 * GET /api/business-operations/tasks/:taskId
 */
export async function getTaskByIdHandler(
  request: FastifyRequest<{ Params: { taskId: string } }>,
  reply: FastifyReply
) {
  try {
    const { taskId } = request.params;
    const task = await getTaskById(taskId);
    return reply.code(200).send({ success: true, data: task });
  } catch (error: any) {
    console.error('Get task by ID error:', error);

    if (error.message === 'Task not found') {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: error.message
      });
    }

    return reply.code(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Failed to fetch task'
    });
  }
}

/**
 * Update a task
 * PUT /api/business-operations/tasks/:taskId
 */
export async function updateTaskHandler(
  request: FastifyRequest<{
    Params: { taskId: string };
    Body: UpdateTaskInput;
  }>,
  reply: FastifyReply
) {
  try {
    const { taskId } = request.params;

    // Get user from auth context
    const updatedBy = (request as any).user?.id || 'demo-user-id';

    // Check permissions
    const userRoles = (request as any).user?.roles || ['Admin'];
    if (!canModifyTask(userRoles)) {
      return reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'You do not have permission to update tasks'
      });
    }

    const task = await updateTask(taskId, request.body, updatedBy);
    return reply.code(200).send({ success: true, data: task });
  } catch (error: any) {
    console.error('Update task error:', error);

    if (error.message === 'Task not found') {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: error.message
      });
    }

    return reply.code(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: error.message || 'Failed to update task'
    });
  }
}

/**
 * Delete a task
 * DELETE /api/business-operations/tasks/:taskId
 */
export async function deleteTaskHandler(
  request: FastifyRequest<{ Params: { taskId: string } }>,
  reply: FastifyReply
) {
  try {
    const { taskId } = request.params;

    // Get user from auth context
    const deletedBy = (request as any).user?.id || 'demo-user-id';

    // Check permissions
    const userRoles = (request as any).user?.roles || ['Admin'];
    if (!canModifyTask(userRoles)) {
      return reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'You do not have permission to delete tasks'
      });
    }

    const result = await deleteTask(taskId, deletedBy);
    return reply.code(200).send({ success: true, message: result.message });
  } catch (error: any) {
    console.error('Delete task error:', error);

    if (error.message === 'Task not found') {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: error.message
      });
    }

    return reply.code(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: error.message || 'Failed to delete task'
    });
  }
}

/**
 * Mark a task as complete
 * PATCH /api/business-operations/tasks/:taskId/complete
 */
export async function markTaskCompleteHandler(
  request: FastifyRequest<{ Params: { taskId: string } }>,
  reply: FastifyReply
) {
  try {
    const { taskId } = request.params;

    // Get user from auth context
    const userId = (request as any).user?.id || 'demo-user-id';

    // Get task to check assigned user
    const existingTask = await getTaskById(taskId);

    // Check permissions
    const userRoles = (request as any).user?.roles || ['Admin'];
    if (!canCompleteTask(userRoles, userId, existingTask.assignedTo)) {
      return reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'You do not have permission to complete this task'
      });
    }

    const task = await markTaskComplete(taskId, userId);
    return reply.code(200).send({ success: true, data: task });
  } catch (error: any) {
    console.error('Mark task complete error:', error);

    if (error.message === 'Task not found') {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: error.message
      });
    }

    if (error.message === 'Task is already completed') {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: error.message
      });
    }

    return reply.code(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: error.message || 'Failed to mark task as complete'
    });
  }
}

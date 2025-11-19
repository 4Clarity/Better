import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  dueDate: z.string().optional(), // ISO date string
  assignedTo: z.string().optional(), // User ID
});

export const updateTaskSchema = createTaskSchema.partial();

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

// Transform database snake_case to API camelCase
function transformTaskResponse(dbTask: any) {
  return {
    id: dbTask.id,
    productProgramId: dbTask.product_program_id,
    title: dbTask.title,
    description: dbTask.description,
    status: dbTask.status,
    dueDate: dbTask.due_date,
    assignedTo: dbTask.assigned_to,
    completedAt: dbTask.completed_at,
    createdAt: dbTask.created_at,
    updatedAt: dbTask.updated_at,
    createdBy: dbTask.created_by,
    updatedBy: dbTask.updated_by,
    // Include relations if present
    assignedUser: dbTask.users_product_program_tasks_assigned_toTousers,
    createdByUser: dbTask.users_product_program_tasks_created_byTousers,
    updatedByUser: dbTask.users_product_program_tasks_updated_byTousers,
  };
}

/**
 * Create a new task for a Product/Program
 */
export async function createTask(
  productProgramId: string,
  data: CreateTaskInput,
  createdBy: string
) {
  try {
    // Validate that the product/program exists
    const productProgram = await prisma.product_programs.findUnique({
      where: { id: productProgramId },
      select: { id: true, name: true }
    });

    if (!productProgram) {
      throw new Error('Product/Program not found');
    }

    // Validate assignedTo user exists if provided
    if (data.assignedTo) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: data.assignedTo }
      });
      if (!assignedUser) {
        throw new Error(`User with ID "${data.assignedTo}" not found`);
      }
    }

    const createData: any = {
      product_program_id: productProgramId,
      title: data.title,
      description: data.description,
      status: data.status || 'TODO',
      due_date: data.dueDate ? new Date(data.dueDate) : null,
      assigned_to: data.assignedTo || null,
      created_by: createdBy,
      updated_by: createdBy,
    };

    const task = await prisma.product_program_tasks.create({
      data: createData,
      include: {
        users_product_program_tasks_assigned_toTousers: {
          select: {
            id: true,
            person: {
              select: { firstName: true, lastName: true, primaryEmail: true }
            }
          }
        },
        users_product_program_tasks_created_byTousers: {
          select: {
            id: true,
            person: {
              select: { firstName: true, lastName: true, primaryEmail: true }
            }
          }
        },
        users_product_program_tasks_updated_byTousers: {
          select: {
            id: true,
            person: {
              select: { firstName: true, lastName: true, primaryEmail: true }
            }
          }
        }
      }
    });

    return transformTaskResponse(task);
  } catch (error: any) {
    console.error('Create task error:', error);
    throw new Error(error.message || 'Failed to create task');
  }
}

/**
 * Get a task by ID
 */
export async function getTaskById(taskId: string) {
  const task = await prisma.product_program_tasks.findUnique({
    where: { id: taskId },
    include: {
      users_product_program_tasks_assigned_toTousers: {
        select: {
          id: true,
          person: {
            select: { firstName: true, lastName: true, primaryEmail: true }
          }
        }
      },
      users_product_program_tasks_created_byTousers: {
        select: {
          id: true,
          person: {
            select: { firstName: true, lastName: true, primaryEmail: true }
          }
        }
      },
      users_product_program_tasks_updated_byTousers: {
        select: {
          id: true,
          person: {
            select: { firstName: true, lastName: true, primaryEmail: true }
          }
        }
      }
    }
  });

  if (!task) {
    throw new Error('Task not found');
  }

  return transformTaskResponse(task);
}

/**
 * Get all tasks for a Product/Program
 */
export async function getTasksByProductProgram(productProgramId: string) {
  try {
    // Validate that the product/program exists
    const productProgram = await prisma.product_programs.findUnique({
      where: { id: productProgramId },
      select: { id: true }
    });

    if (!productProgram) {
      throw new Error('Product/Program not found');
    }

    const tasks = await prisma.product_program_tasks.findMany({
      where: { product_program_id: productProgramId },
      include: {
        users_product_program_tasks_assigned_toTousers: {
          select: {
            id: true,
            person: {
              select: { firstName: true, lastName: true, primaryEmail: true }
            }
          }
        },
        users_product_program_tasks_created_byTousers: {
          select: {
            id: true,
            person: {
              select: { firstName: true, lastName: true, primaryEmail: true }
            }
          }
        }
      },
      orderBy: [
        { status: 'asc' },
        { due_date: 'asc' },
        { created_at: 'desc' }
      ]
    });

    return tasks.map(task => transformTaskResponse(task));
  } catch (error: any) {
    console.error('Get tasks by product/program error:', error);
    throw new Error(error.message || 'Failed to get tasks');
  }
}

/**
 * Update a task
 */
export async function updateTask(
  taskId: string,
  data: UpdateTaskInput,
  updatedBy: string
) {
  try {
    // Verify task exists
    await getTaskById(taskId);

    // Validate assignedTo user exists if provided
    if (data.assignedTo) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: data.assignedTo }
      });
      if (!assignedUser) {
        throw new Error(`User with ID "${data.assignedTo}" not found`);
      }
    }

    const updateData: any = {
      updated_by: updatedBy,
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.dueDate !== undefined) updateData.due_date = data.dueDate ? new Date(data.dueDate) : null;
    if (data.assignedTo !== undefined) updateData.assigned_to = data.assignedTo || null;

    const task = await prisma.product_program_tasks.update({
      where: { id: taskId },
      data: updateData,
      include: {
        users_product_program_tasks_assigned_toTousers: {
          select: {
            id: true,
            person: {
              select: { firstName: true, lastName: true, primaryEmail: true }
            }
          }
        },
        users_product_program_tasks_created_byTousers: {
          select: {
            id: true,
            person: {
              select: { firstName: true, lastName: true, primaryEmail: true }
            }
          }
        },
        users_product_program_tasks_updated_byTousers: {
          select: {
            id: true,
            person: {
              select: { firstName: true, lastName: true, primaryEmail: true }
            }
          }
        }
      }
    });

    return transformTaskResponse(task);
  } catch (error: any) {
    console.error('Update task error:', error);
    throw new Error(error.message || 'Failed to update task');
  }
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: string, deletedBy: string) {
  try {
    // Verify task exists
    await getTaskById(taskId);

    await prisma.product_program_tasks.delete({
      where: { id: taskId }
    });

    return { message: 'Task deleted successfully' };
  } catch (error: any) {
    console.error('Delete task error:', error);
    throw new Error(error.message || 'Failed to delete task');
  }
}

/**
 * Mark a task as complete
 */
export async function markTaskComplete(taskId: string, completedBy: string) {
  try {
    const task = await getTaskById(taskId);

    if (task.status === 'COMPLETED') {
      throw new Error('Task is already completed');
    }

    const updatedTask = await prisma.product_program_tasks.update({
      where: { id: taskId },
      data: {
        status: 'COMPLETED',
        completed_at: new Date(),
        updated_by: completedBy,
      },
      include: {
        users_product_program_tasks_assigned_toTousers: {
          select: {
            id: true,
            person: {
              select: { firstName: true, lastName: true, primaryEmail: true }
            }
          }
        },
        users_product_program_tasks_created_byTousers: {
          select: {
            id: true,
            person: {
              select: { firstName: true, lastName: true, primaryEmail: true }
            }
          }
        },
        users_product_program_tasks_updated_byTousers: {
          select: {
            id: true,
            person: {
              select: { firstName: true, lastName: true, primaryEmail: true }
            }
          }
        }
      }
    });

    return transformTaskResponse(updatedTask);
  } catch (error: any) {
    console.error('Mark task complete error:', error);
    throw new Error(error.message || 'Failed to mark task as complete');
  }
}

/**
 * Check if user has permission to modify tasks
 * Admin, Gov Program Director, Gov Program Manager can modify
 * Assigned user can mark complete
 */
export function canModifyTask(userRoles: string[]): boolean {
  const authorizedRoles = ['Admin', 'Gov Program Director', 'Gov Program Manager'];
  return userRoles.some(role =>
    authorizedRoles.some(authRole =>
      role.toLowerCase() === authRole.toLowerCase()
    )
  );
}

/**
 * Check if user can mark task complete
 * Admin, Gov Program Director, Gov Program Manager, or assigned user
 */
export function canCompleteTask(userRoles: string[], userId: string, assignedTo: string | null): boolean {
  // Authorized roles can always complete
  if (canModifyTask(userRoles)) {
    return true;
  }

  // Assigned user can complete their own task
  if (assignedTo && userId === assignedTo) {
    return true;
  }

  return false;
}

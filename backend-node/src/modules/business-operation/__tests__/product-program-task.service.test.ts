import {
  createTask,
  getTaskById,
  getTasksByProductProgram,
  updateTask,
  deleteTask,
  markTaskComplete,
  canModifyTask,
  canCompleteTask,
  createTaskSchema,
  updateTaskSchema,
} from '../product-program-task.service';
import { PrismaClient } from '@prisma/client';

// Mock Prisma Client
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    user: {
      findUnique: jest.fn(),
    },
    product_programs: {
      findUnique: jest.fn(),
    },
    product_program_tasks: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

const prisma = new PrismaClient();

describe('ProductProgramTaskService', () => {
  const mockUserId = 'test-user-id';
  const mockProductProgramId = 'test-product-program-id';
  const mockTaskId = 'test-task-id';

  const mockUser = {
    id: mockUserId,
    person: {
      firstName: 'Test',
      lastName: 'User',
      primaryEmail: 'test@example.com',
    },
  };

  const mockProductProgram = {
    id: mockProductProgramId,
    name: 'Test Product/Program',
  };

  const mockTask = {
    id: mockTaskId,
    product_program_id: mockProductProgramId,
    title: 'Test Task',
    description: 'Test description',
    status: 'TODO',
    due_date: new Date('2025-12-31'),
    assigned_to: mockUserId,
    completed_at: null,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
    created_by: mockUserId,
    updated_by: mockUserId,
    users_product_program_tasks_assigned_toTousers: mockUser,
    users_product_program_tasks_created_byTousers: mockUser,
    users_product_program_tasks_updated_byTousers: mockUser,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Validation Schemas', () => {
    describe('createTaskSchema', () => {
      it('should validate correct task data', () => {
        const validData = {
          title: 'Test Task',
          description: 'Test description',
          status: 'TODO',
          dueDate: '2025-12-31',
          assignedTo: mockUserId,
        };

        const result = createTaskSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should validate task data with minimal fields', () => {
        const validData = {
          title: 'Test Task',
        };

        const result = createTaskSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should reject task with missing title', () => {
        const invalidData = {
          description: 'Test description',
        };

        const result = createTaskSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it('should reject task with empty title', () => {
        const invalidData = {
          title: '',
        };

        const result = createTaskSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it('should reject title exceeding 200 characters', () => {
        const invalidData = {
          title: 'A'.repeat(201),
        };

        const result = createTaskSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it('should reject invalid status', () => {
        const invalidData = {
          title: 'Test Task',
          status: 'INVALID_STATUS',
        };

        const result = createTaskSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });
    });

    describe('updateTaskSchema', () => {
      it('should validate partial updates', () => {
        const validData = {
          title: 'Updated Task',
        };

        const result = updateTaskSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should allow empty update object', () => {
        const result = updateTaskSchema.safeParse({});
        expect(result.success).toBe(true);
      });
    });
  });

  describe('createTask', () => {
    const createData = {
      title: 'Test Task',
      description: 'Test description',
      status: 'TODO' as const,
      dueDate: '2025-12-31',
      assignedTo: mockUserId,
    };

    it('should create a task successfully', async () => {
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.product_program_tasks.create as jest.Mock).mockResolvedValue(mockTask);

      const result = await createTask(mockProductProgramId, createData, mockUserId);

      expect(prisma.product_programs.findUnique).toHaveBeenCalledWith({
        where: { id: mockProductProgramId },
        select: { id: true, name: true },
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUserId },
      });
      expect(prisma.product_program_tasks.create).toHaveBeenCalled();
      expect(result.id).toBe(mockTaskId);
      expect(result.title).toBe('Test Task');
    });

    it('should create task without optional fields', async () => {
      const minimalData = { title: 'Minimal Task' };
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
      (prisma.product_program_tasks.create as jest.Mock).mockResolvedValue({
        ...mockTask,
        description: null,
        due_date: null,
        assigned_to: null,
      });

      const result = await createTask(mockProductProgramId, minimalData, mockUserId);

      expect(result.description).toBeNull();
      expect(result.dueDate).toBeNull();
      expect(result.assignedTo).toBeNull();
    });

    it('should throw error if product/program not found', async () => {
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(createTask(mockProductProgramId, createData, mockUserId)).rejects.toThrow(
        'Product/Program not found'
      );
    });

    it('should throw error if assigned user not found', async () => {
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(createTask(mockProductProgramId, createData, mockUserId)).rejects.toThrow(
        `User with ID "${mockUserId}" not found`
      );
    });

    it('should handle database errors', async () => {
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.product_program_tasks.create as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await expect(createTask(mockProductProgramId, createData, mockUserId)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('getTaskById', () => {
    it('should fetch a task by ID successfully', async () => {
      (prisma.product_program_tasks.findUnique as jest.Mock).mockResolvedValue(mockTask);

      const result = await getTaskById(mockTaskId);

      expect(prisma.product_program_tasks.findUnique).toHaveBeenCalledWith({
        where: { id: mockTaskId },
        include: expect.any(Object),
      });
      expect(result.id).toBe(mockTaskId);
      expect(result.title).toBe('Test Task');
    });

    it('should throw error if task not found', async () => {
      (prisma.product_program_tasks.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getTaskById('invalid-id')).rejects.toThrow('Task not found');
    });
  });

  describe('getTasksByProductProgram', () => {
    const mockTasks = [mockTask];

    it('should fetch all tasks for a product/program successfully', async () => {
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
      (prisma.product_program_tasks.findMany as jest.Mock).mockResolvedValue(mockTasks);

      const result = await getTasksByProductProgram(mockProductProgramId);

      expect(prisma.product_programs.findUnique).toHaveBeenCalledWith({
        where: { id: mockProductProgramId },
        select: { id: true },
      });
      expect(prisma.product_program_tasks.findMany).toHaveBeenCalledWith({
        where: { product_program_id: mockProductProgramId },
        include: expect.any(Object),
        orderBy: [{ status: 'asc' }, { due_date: 'asc' }, { created_at: 'desc' }],
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockTaskId);
    });

    it('should return empty array if no tasks found', async () => {
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
      (prisma.product_program_tasks.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getTasksByProductProgram(mockProductProgramId);

      expect(result).toEqual([]);
    });

    it('should throw error if product/program not found', async () => {
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getTasksByProductProgram(mockProductProgramId)).rejects.toThrow(
        'Product/Program not found'
      );
    });

    it('should handle database errors', async () => {
      (prisma.product_programs.findUnique as jest.Mock).mockResolvedValue(mockProductProgram);
      (prisma.product_program_tasks.findMany as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await expect(getTasksByProductProgram(mockProductProgramId)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('updateTask', () => {
    const updateData = {
      title: 'Updated Task',
      description: 'Updated description',
      status: 'IN_PROGRESS' as const,
    };

    it('should update a task successfully', async () => {
      (prisma.product_program_tasks.findUnique as jest.Mock).mockResolvedValue(mockTask);
      (prisma.product_program_tasks.update as jest.Mock).mockResolvedValue({
        ...mockTask,
        ...updateData,
      });

      const result = await updateTask(mockTaskId, updateData, mockUserId);

      expect(prisma.product_program_tasks.findUnique).toHaveBeenCalled();
      expect(prisma.product_program_tasks.update).toHaveBeenCalledWith({
        where: { id: mockTaskId },
        data: expect.objectContaining({
          title: 'Updated Task',
          description: 'Updated description',
          status: 'IN_PROGRESS',
          updated_by: mockUserId,
        }),
        include: expect.any(Object),
      });
      expect(result.title).toBe('Updated Task');
    });

    it('should update task with undefined fields unchanged', async () => {
      const partialUpdate = { title: 'New Title' };
      (prisma.product_program_tasks.findUnique as jest.Mock).mockResolvedValue(mockTask);
      (prisma.product_program_tasks.update as jest.Mock).mockResolvedValue({
        ...mockTask,
        title: 'New Title',
      });

      await updateTask(mockTaskId, partialUpdate, mockUserId);

      expect(prisma.product_program_tasks.update).toHaveBeenCalledWith({
        where: { id: mockTaskId },
        data: expect.objectContaining({
          title: 'New Title',
          updated_by: mockUserId,
        }),
        include: expect.any(Object),
      });
    });

    it('should throw error if task not found', async () => {
      (prisma.product_program_tasks.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(updateTask('invalid-id', updateData, mockUserId)).rejects.toThrow(
        'Task not found'
      );
    });

    it('should throw error if assigned user not found', async () => {
      const dataWithInvalidUser = { ...updateData, assignedTo: 'invalid-user' };
      (prisma.product_program_tasks.findUnique as jest.Mock).mockResolvedValue(mockTask);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(updateTask(mockTaskId, dataWithInvalidUser, mockUserId)).rejects.toThrow(
        'User with ID "invalid-user" not found'
      );
    });

    it('should handle database errors', async () => {
      (prisma.product_program_tasks.findUnique as jest.Mock).mockResolvedValue(mockTask);
      (prisma.product_program_tasks.update as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await expect(updateTask(mockTaskId, updateData, mockUserId)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('deleteTask', () => {
    it('should delete a task successfully', async () => {
      (prisma.product_program_tasks.findUnique as jest.Mock).mockResolvedValue(mockTask);
      (prisma.product_program_tasks.delete as jest.Mock).mockResolvedValue(mockTask);

      const result = await deleteTask(mockTaskId, mockUserId);

      expect(prisma.product_program_tasks.findUnique).toHaveBeenCalled();
      expect(prisma.product_program_tasks.delete).toHaveBeenCalledWith({
        where: { id: mockTaskId },
      });
      expect(result.message).toBe('Task deleted successfully');
    });

    it('should throw error if task not found', async () => {
      (prisma.product_program_tasks.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(deleteTask('invalid-id', mockUserId)).rejects.toThrow('Task not found');
    });

    it('should handle database errors', async () => {
      (prisma.product_program_tasks.findUnique as jest.Mock).mockResolvedValue(mockTask);
      (prisma.product_program_tasks.delete as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await expect(deleteTask(mockTaskId, mockUserId)).rejects.toThrow('Database error');
    });
  });

  describe('markTaskComplete', () => {
    it('should mark task as complete successfully', async () => {
      const completedTask = {
        ...mockTask,
        status: 'COMPLETED',
        completed_at: new Date(),
      };
      (prisma.product_program_tasks.findUnique as jest.Mock).mockResolvedValue(mockTask);
      (prisma.product_program_tasks.update as jest.Mock).mockResolvedValue(completedTask);

      const result = await markTaskComplete(mockTaskId, mockUserId);

      expect(prisma.product_program_tasks.update).toHaveBeenCalledWith({
        where: { id: mockTaskId },
        data: {
          status: 'COMPLETED',
          completed_at: expect.any(Date),
          updated_by: mockUserId,
        },
        include: expect.any(Object),
      });
      expect(result.status).toBe('COMPLETED');
      expect(result.completedAt).toBeDefined();
    });

    it('should throw error if task already completed', async () => {
      const completedTask = { ...mockTask, status: 'COMPLETED' };
      (prisma.product_program_tasks.findUnique as jest.Mock).mockResolvedValue(completedTask);

      await expect(markTaskComplete(mockTaskId, mockUserId)).rejects.toThrow(
        'Task is already completed'
      );
    });

    it('should throw error if task not found', async () => {
      (prisma.product_program_tasks.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(markTaskComplete('invalid-id', mockUserId)).rejects.toThrow('Task not found');
    });

    it('should handle database errors', async () => {
      (prisma.product_program_tasks.findUnique as jest.Mock).mockResolvedValue(mockTask);
      (prisma.product_program_tasks.update as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await expect(markTaskComplete(mockTaskId, mockUserId)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('Permission Functions', () => {
    describe('canModifyTask', () => {
      it('should return true for Admin role', () => {
        expect(canModifyTask(['Admin'])).toBe(true);
      });

      it('should return true for Gov Program Director role', () => {
        expect(canModifyTask(['Gov Program Director'])).toBe(true);
      });

      it('should return true for Gov Program Manager role', () => {
        expect(canModifyTask(['Gov Program Manager'])).toBe(true);
      });

      it('should be case-insensitive', () => {
        expect(canModifyTask(['admin'])).toBe(true);
        expect(canModifyTask(['GOV PROGRAM DIRECTOR'])).toBe(true);
        expect(canModifyTask(['gov program manager'])).toBe(true);
      });

      it('should return true if user has multiple roles with one authorized', () => {
        expect(canModifyTask(['User', 'Admin', 'Viewer'])).toBe(true);
      });

      it('should return false for unauthorized roles', () => {
        expect(canModifyTask(['User'])).toBe(false);
        expect(canModifyTask(['Viewer'])).toBe(false);
        expect(canModifyTask(['Guest'])).toBe(false);
      });

      it('should return false for empty roles array', () => {
        expect(canModifyTask([])).toBe(false);
      });
    });

    describe('canCompleteTask', () => {
      it('should return true for Admin role', () => {
        expect(canCompleteTask(['Admin'], 'user-1', 'user-2')).toBe(true);
      });

      it('should return true for Gov Program Director role', () => {
        expect(canCompleteTask(['Gov Program Director'], 'user-1', 'user-2')).toBe(true);
      });

      it('should return true for Gov Program Manager role', () => {
        expect(canCompleteTask(['Gov Program Manager'], 'user-1', 'user-2')).toBe(true);
      });

      it('should return true if user is assigned to the task', () => {
        const userId = 'assigned-user-id';
        expect(canCompleteTask(['User'], userId, userId)).toBe(true);
      });

      it('should return false if user is not assigned and not authorized', () => {
        expect(canCompleteTask(['User'], 'user-1', 'user-2')).toBe(false);
      });

      it('should return false for unassigned task with unauthorized role', () => {
        expect(canCompleteTask(['User'], 'user-1', null)).toBe(false);
      });

      it('should return true for authorized role even with unassigned task', () => {
        expect(canCompleteTask(['Admin'], 'user-1', null)).toBe(true);
      });
    });
  });
});
